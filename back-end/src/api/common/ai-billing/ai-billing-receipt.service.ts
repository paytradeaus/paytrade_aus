import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as puppeteer from 'puppeteer';

import { AiCreditPurchase } from 'src/entities/ai-credit-purchase.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';
import { getStripeInstance } from 'src/libs/@stripe-helper/stripe-helper';

const RECEIPT_EMAIL_TYPE = 'ai_credit_topup_receipt';

const TRIGGER_LABELS: Record<string, string> = {
  manual: 'Manual top-up',
  auto_topup: 'Automatic top-up',
  admin: 'Admin-initiated top-up',
};

// Task #188 — Australian tax-invoice supplier details. Only used for AUD
// charges so the receipt renders a GST-compliant tax invoice instead of the
// generic "tax invoice on request" disclaimer from Task #168.
const SUPPLIER_LEGAL_NAME = 'Pay Trade Pty Ltd';
const SUPPLIER_ABN = '46 665 189 015';
const SUPPLIER_CONTACT_EMAIL = 'support@paytrade.app';
// Registered office address for the AUD tax invoice. Defaults to the
// Sydney registered office on file; can be overridden per-environment via
// PAYTRADE_SUPPLIER_ADDRESS without a code deploy if it ever moves.
// Multi-line addresses are supported by separating lines with `\n` (or a
// literal "\n" sequence in the env var) — each line is rendered on its
// own row in the TAX INVOICE block so longer registered addresses stay
// readable rather than wrapping mid-street.
const SUPPLIER_ADDRESS =
  process.env.PAYTRADE_SUPPLIER_ADDRESS ||
  'Level 1, 5 Martin Place\nSydney NSW 2000\nAustralia';

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderSupplierAddressHtml = (raw: string): string =>
  raw
    .replace(/\\n/g, '\n')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(escapeHtml)
    .join('<br>');

/**
 * Task #161 / #168 — Generates a receipt PDF for a successful AI credit
 * top-up, uploads it to Cloudflare R2, persists the public URL on the
 * purchase row, and emails it to the company billing contact via the
 * existing inline `header-footer-email` queue path.
 *
 * The email body is rendered from the admin-editable `email_templates`
 * row keyed by `email_type = 'ai_credit_topup_receipt'` (seeded in
 * `email-templates-seeder.service.ts`). If that row is missing for any
 * reason we fall back to a minimal inline body so receipts still go out.
 *
 * Mirrors the Puppeteer + R2 pattern in
 * `users/notices/notice-gen-doc.service.ts` so we share the same Chromium
 * launch flags and storage helpers.
 */
@Injectable()
export class AiBillingReceiptService {
  private readonly logger = new PaytradeLogger('AI_BILLING_RECEIPT');

  constructor(
    @InjectRepository(AiCreditPurchase)
    private readonly purchaseRepo: Repository<AiCreditPurchase>,
    @InjectRepository(CompanyDetails)
    private readonly companyRepo: Repository<CompanyDetails>,
    @InjectRepository(EmailTemplates)
    private readonly emailTemplatesRepo: Repository<EmailTemplates>,
    private readonly emailQueue: EmailQueueProducer,
    private readonly objectStorageService: ObjectStorageService,
  ) {}

  async handlePurchaseSucceeded(purchase: AiCreditPurchase): Promise<void> {
    try {
      const company = await this.companyRepo.findOne({
        where: { company_id: purchase.company_id } as any,
      });
      const billingEmail =
        (company as any)?.company_email_id ||
        (company as any)?.billing_email ||
        null;

      // Render the PDF body from the same data the email uses, so the PDF
      // and inbox copy stay visually aligned.
      // Best-effort lookup of the card brand/last-4 from Stripe so the
      // receipt shows the actual card customers used. Failures are
      // swallowed — the placeholder falls back to "—".
      const cardLast4 = await this.lookupCardLast4(purchase);

      // Resolve the admin-editable template once and reuse it for both
      // the email body and the PDF body so the inbox copy and the
      // downloadable PDF stay visually aligned.
      const template = await this.emailTemplatesRepo
        .findOne({ where: { email_type: RECEIPT_EMAIL_TYPE } })
        .catch(() => null);

      const placeholders = this.buildPlaceholders(
        purchase,
        company,
        null,
        cardLast4,
      );
      const pdfBody = this.renderBodyFromTemplate(placeholders, template);
      const pdfHtml = this.wrapForPdf(pdfBody);

      const objectPath = `ai-credit-receipts/${purchase.id}.pdf`;
      let receiptUrl: string | null = null;
      try {
        const pdfBuffer = await this.renderPdfBuffer(pdfHtml);
        const uploaded = await this.objectStorageService.uploadFileDirect(
          objectPath,
          pdfBuffer,
          'application/pdf',
        );
        if (uploaded) {
          receiptUrl = this.objectStorageService.getPublicUrl(objectPath);
        } else {
          this.logger.error(
            `Receipt upload returned false for purchase ${purchase.id}`,
          );
        }
      } catch (pdfErr) {
        this.logger.error(
          `Receipt PDF render failed for purchase ${purchase.id}: ${pdfErr}`,
        );
      }

      if (receiptUrl) purchase.receipt_pdf_url = receiptUrl;
      purchase.receipt_emailed_at = new Date();
      await this.purchaseRepo.save(purchase);

      if (!billingEmail) {
        this.logger.log(
          `Skipping receipt email for purchase ${purchase.id}: no billing email on company ${purchase.company_id}`,
        );
        return;
      }

      const emailPlaceholders = this.buildPlaceholders(
        purchase,
        company,
        receiptUrl,
        cardLast4,
      );
      const mailBody = this.renderBodyFromTemplate(
        emailPlaceholders,
        template,
      );
      const subject = this.renderString(
        template?.email_subject ||
          `Pay Trade — AI credits receipt #{{receipt_id_short}}`,
        emailPlaceholders,
      );

      await this.emailQueue.emailQueueProducer({
        toEmail: billingEmail,
        subject,
        mailBody,
        template: 'header-footer-email',
        mail_type: 'AI_CREDIT_RECEIPT',
      });
    } catch (err) {
      this.logger.error(
        `Failed to dispatch receipt for purchase ${purchase.id}: ${err}`,
      );
    }
  }

  private buildPlaceholders(
    p: AiCreditPurchase,
    company: any,
    receiptUrl: string | null,
    cardLast4: string | null,
  ): Record<string, string> {
    const currency = (p.currency || 'usd').toUpperCase();
    const fmt = (v: any) => `$${Number(v ?? 0).toFixed(2)}`;
    const receiptUrlBlock = receiptUrl
      ? `<p style="margin-top:18px;"><a href="${receiptUrl}" style="display:inline-block;background:#0d3b66;color:#fff;text-decoration:none;padding:10px 18px;border-radius:4px;font-size:13px;">Download PDF receipt</a></p>`
      : '';
    // Task #188 — For AUD charges expand the prior "tax invoice on request"
    // disclaimer (Task #168) into an actual GST-compliant tax invoice block:
    // supplier name + ABN, invoice number/date, and a GST-exclusive subtotal
    // with the GST line broken out (1/11th of the GST-inclusive total). The
    // generic receipt is unchanged for non-AUD currencies.
    const totalIncGst = Number(p.amount_charged_usd ?? 0);
    const gstAmount = totalIncGst / 11;
    const subtotalExGst = totalIncGst - gstAmount;
    const invoiceNumber = `PT-${p.id.slice(0, 8).toUpperCase()}`;
    const invoiceDate = p.created_on
      ? new Date(p.created_on).toUTCString()
      : new Date().toUTCString();
    const gstDisclaimerBlock =
      currency === 'AUD'
        ? [
            '<div style="margin-top:20px;padding:14px 16px;border:1px solid #d8dde3;border-radius:6px;background:#fafbfc;">',
            '<p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#0d3b66;letter-spacing:0.5px;">TAX INVOICE</p>',
            '<p style="margin:0 0 4px;font-size:12px;color:#555;line-height:1.5;">',
            `<strong>${SUPPLIER_LEGAL_NAME}</strong><br>`,
            `ABN ${SUPPLIER_ABN}<br>`,
            `${renderSupplierAddressHtml(SUPPLIER_ADDRESS)}<br>`,
            `<a href="mailto:${SUPPLIER_CONTACT_EMAIL}" style="color:#0d3b66;">${SUPPLIER_CONTACT_EMAIL}</a>`,
            '</p>',
            `<p style="margin:8px 0 4px;font-size:12px;color:#555;">Invoice <strong>${invoiceNumber}</strong> · ${invoiceDate}</p>`,
            '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin-top:8px;font-size:12px;color:#333;">',
            `<tr><td style="padding:4px 0;width:65%;">Subtotal (ex GST)</td><td style="padding:4px 0;text-align:right;">${fmt(subtotalExGst)} AUD</td></tr>`,
            `<tr><td style="padding:4px 0;">GST (10%)</td><td style="padding:4px 0;text-align:right;">${fmt(gstAmount)} AUD</td></tr>`,
            `<tr><td style="padding:6px 0;border-top:1px solid #d8dde3;font-weight:bold;">Total (incl GST)</td><td style="padding:6px 0;border-top:1px solid #d8dde3;text-align:right;font-weight:bold;">${fmt(totalIncGst)} AUD</td></tr>`,
            '</table>',
            '</div>',
          ].join('')
        : '';

    return {
      company_name:
        (company as any)?.company_name ||
        (company as any)?.business_name ||
        'there',
      receipt_id: p.id,
      receipt_id_short: p.id.slice(0, 8),
      receipt_date: p.created_on
        ? new Date(p.created_on).toUTCString()
        : new Date().toUTCString(),
      trigger_label: TRIGGER_LABELS[p.trigger_type] || p.trigger_type,
      credits_amount: fmt(p.credits_purchased_usd),
      stripe_fee: fmt(p.stripe_fee_usd),
      total_charged: fmt(p.amount_charged_usd),
      currency,
      card_last4: cardLast4 ? `•••• ${cardLast4}` : '—',
      stripe_payment_id: p.stripe_payment_intent_id ?? '—',
      receipt_url_block: receiptUrlBlock,
      gst_disclaimer_block: gstDisclaimerBlock,
    };
  }

  private renderBodyFromTemplate(
    placeholders: Record<string, string>,
    template: EmailTemplates | null,
  ): string {
    const content = template?.email_content || this.fallbackBody();
    return this.renderString(content, placeholders);
  }

  private renderString(
    input: string,
    placeholders: Record<string, string>,
  ): string {
    let out = input || '';
    for (const [key, value] of Object.entries(placeholders)) {
      out = out.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value ?? '');
    }
    return out;
  }

  private fallbackBody(): string {
    return [
      '<h2 style="margin:0 0 12px;">AI credits top-up receipt</h2>',
      '<p>Hi {{company_name}},</p>',
      '<p>Thanks for topping up your Pay Trade AI credit balance.</p>',
      '<p><strong>Credits added:</strong> {{credits_amount}} {{currency}}<br>',
      '<strong>Stripe fee:</strong> {{stripe_fee}} {{currency}}<br>',
      '<strong>Total charged:</strong> {{total_charged}} {{currency}}</p>',
      '<p style="font-size:12px;color:#555;">Receipt ID: {{receipt_id}}<br>',
      'Stripe payment ID: {{stripe_payment_id}}<br>',
      'Date: {{receipt_date}}</p>',
      '{{receipt_url_block}}{{gst_disclaimer_block}}',
    ].join('');
  }

  private async lookupCardLast4(
    p: AiCreditPurchase,
  ): Promise<string | null> {
    // Task #187 — prefer the value persisted at charge time on the
    // purchase row. Fall back to a live Stripe lookup so older rows
    // (pre-migration) still render the card number.
    if (p.card_last4) return p.card_last4;
    if (!p.stripe_payment_method_id) return null;
    try {
      const stripe = getStripeInstance(!!p.is_sandbox);
      const pm = await stripe.paymentMethods.retrieve(
        p.stripe_payment_method_id,
      );
      if (pm && pm.type === 'card' && pm.card) {
        return pm.card.last4 ?? null;
      }
      return null;
    } catch (err) {
      this.logger.log(
        `Could not resolve card last-4 for purchase ${p.id}: ${err}`,
      );
      return null;
    }
  }

  private wrapForPdf(bodyHtml: string): string {
    return `<!doctype html><html><head><meta charset="utf-8"><style>
      body { font-family: Arial, sans-serif; color: #222; padding: 24px; }
    </style></head><body>${bodyHtml}</body></html>`;
  }

  private async renderPdfBuffer(html: string): Promise<Buffer> {
    const chromiumPath =
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium';
    const browser = await puppeteer.launch({
      executablePath: chromiumPath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', bottom: '30px', left: '20px', right: '20px' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close().catch(() => undefined);
    }
  }
}
