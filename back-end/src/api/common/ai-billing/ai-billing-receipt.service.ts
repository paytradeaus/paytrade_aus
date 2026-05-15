import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as puppeteer from 'puppeteer';

import { AiCreditPurchase } from 'src/entities/ai-credit-purchase.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';

/**
 * Task #161 — Generates a receipt PDF for a successful AI credit top-up,
 * uploads it to Cloudflare R2, persists the public URL on the purchase row,
 * and emails it to the company billing contact via the existing inline
 * `header-footer-email` queue path. Mirrors the Puppeteer + R2 pattern in
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

      const html = this.renderHtml(purchase, company);

      // Render PDF via Puppeteer and upload to R2 (with Replit fallback).
      const objectPath = `ai-credit-receipts/${purchase.id}.pdf`;
      let receiptUrl: string | null = null;
      try {
        const pdfBuffer = await this.renderPdfBuffer(html);
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

      if (billingEmail) {
        const subject = `Pay Trade — AI credits receipt #${purchase.id.slice(0, 8)}`;
        const linkBlock = receiptUrl
          ? `<p><a href="${receiptUrl}">Download PDF receipt</a></p>`
          : '';
        await this.emailQueue.emailQueueProducer({
          to: billingEmail,
          subject,
          html: `${html}${linkBlock}`,
          mail_type: 'AI_CREDIT_RECEIPT',
          template: 'header-footer-email',
        });
      } else {
        this.logger.log(
          `Skipping receipt email for purchase ${purchase.id}: no billing email on company ${purchase.company_id}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to dispatch receipt for purchase ${purchase.id}: ${err}`,
      );
    }
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

  private renderHtml(p: AiCreditPurchase, company: any): string {
    const fmt = (v: any) =>
      `$${Number(v).toFixed(2)} ${p.currency.toUpperCase()}`;
    return `
      <!doctype html>
      <html><head><meta charset="utf-8"><style>
        body { font-family: Arial, sans-serif; color: #222; padding: 24px; }
        h2 { margin: 0 0 12px; }
        table { border-collapse: collapse; width: 100%; max-width: 560px; margin-top: 12px; }
        td { border: 1px solid #ddd; padding: 8px 10px; font-size: 13px; }
        td.label { background: #f7f7f7; width: 220px; }
        .total td { font-weight: bold; }
      </style></head><body>
        <h2>AI credits receipt</h2>
        <p>Hi ${company?.company_name ?? 'there'},</p>
        <p>Thanks for topping up your Pay Trade AI credit balance. Below is a receipt for your records.</p>
        <table>
          <tr><td class="label">Receipt ID</td><td>${p.id}</td></tr>
          <tr><td class="label">Date</td><td>${p.created_on.toISOString()}</td></tr>
          <tr><td class="label">Trigger</td><td>${p.trigger_type}</td></tr>
          <tr><td class="label">Credits added</td><td>${fmt(p.credits_purchased_usd)}</td></tr>
          <tr><td class="label">Stripe processing fee</td><td>${fmt(p.stripe_fee_usd)}</td></tr>
          <tr class="total"><td class="label">Total charged</td><td>${fmt(p.amount_charged_usd)}</td></tr>
          <tr><td class="label">Stripe payment ID</td><td>${p.stripe_payment_intent_id ?? '—'}</td></tr>
        </table>
        <p style="margin-top:16px; font-size:12px; color:#555;">
          AI credits do not roll over — any unused balance is reset at the start of each calendar month per your subscription plan.
        </p>
      </body></html>
    `;
  }
}
