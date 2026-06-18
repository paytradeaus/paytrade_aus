import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

/**
 * Generates draft SEO landing-page copy (HTML) for a keyword using OpenAI,
 * grounded in the PayTrade system guide and the BIF Act / project trust
 * account framework. Mirrors the OpenAI setup used by AiSupportService.
 */
@Injectable()
export class SeoDraftService {
  private logger = new PaytradeLogger('SEO_DRAFT_SERVICE');
  private openai: OpenAI | null = null;
  private systemGuideContent = '';
  private bifReferenceContent = '';

  // Defaults to gpt-5.1 (best-quality flagship). Override with SEO_DRAFT_MODEL
  // (e.g. gpt-5-pro for maximum reasoning, or gpt-4o to revert).
  private readonly model = process.env.SEO_DRAFT_MODEL || 'gpt-5.1';

  constructor() {
    // Guard like the other OpenAI services (ai-support, community-bot,
    // openai.llm-provider): the OpenAI v4 SDK throws when apiKey is missing,
    // and an unguarded throw in a boot-loaded provider constructor crashes the
    // whole Nest app on startup (manifesting as a failed Railway healthcheck).
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } else {
      this.logger.warn(
        'OPENAI_API_KEY not set — SEO draft generation will refuse to run.',
      );
    }
    this.loadSystemGuide();
    this.loadBifReference();
  }

  /**
   * Reads a doc file, trying several candidate locations so grounding works
   * regardless of whether the process runs from the backend dir, the repo root,
   * or the compiled dist tree. Returns '' (and warns) if none resolve.
   */
  private readDoc(fileName: string): string {
    const candidates = [
      path.join(process.cwd(), fileName), // backend cwd (prod startup)
      path.join(process.cwd(), '..', fileName), // repo root (system guide lives here)
      path.join(process.cwd(), 'back-end', fileName), // run from repo root
      path.join(__dirname, '..', '..', '..', '..', fileName), // dist/../back-end
    ];
    try {
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          return fs.readFileSync(candidate, 'utf-8');
        }
      }
      this.logger.warn(
        `${fileName} not found for SEO drafting (legal grounding will be reduced)`,
      );
    } catch (error) {
      this.logger.error(`Failed to load ${fileName}: ${error.message}`);
    }
    return '';
  }

  private loadSystemGuide() {
    this.systemGuideContent = this.readDoc('PayTrade-System-Guide.md');
  }

  private loadBifReference() {
    this.bifReferenceContent = this.readDoc('BIF-Act-Reference.md');
  }

  /**
   * GPT-5 family and the o-series reasoning models only accept the default
   * temperature (1) — passing a custom temperature returns a 400. Detect them
   * so the completion call can omit unsupported params.
   */
  private isReasoningModel(): boolean {
    return /^(gpt-5|o1|o3|o4)/i.test(this.model);
  }

  private buildSystemPrompt(): string {
    return [
      'You are an expert SEO content writer and an Australian construction-industry',
      'payment, security-of-payment and compliance specialist writing for PayTrade,',
      'a construction trust accounting and payment platform.',
      '',
      'Write helpful, people-first, genuinely useful landing-page body copy that answers',
      'real search intent for the given keyword. Be specific and practical, not generic',
      'marketing fluff. Do NOT keyword stuff: use the keyword and close variants naturally',
      'in the intro and headings only where it improves clarity.',
      '',
      'GROUNDING RULES (important):',
      '- For any legal or compliance statement about Queensland construction payments,',
      '  the BIF Act, project trust accounts or retention trust accounts, rely ONLY on the',
      '  "BIF ACT LEGAL REFERENCE" block below. Do not invent sections, figures, penalties',
      '  or timeframes that are not in that reference.',
      '- When you state a legal point, cite the relevant section in-text (e.g. "under s 76',
      '  of the BIF Act") so the content is credible and verifiable.',
      '- If the reference does not cover a detail, speak generally and add a light qualifier',
      '  (e.g. "generally", "in most cases") rather than guessing.',
      '- Include at least one section that explains, concretely, HOW PayTrade helps the reader',
      '  meet the relevant obligation (use the PayTrade system knowledge below for accuracy).',
      '',
      'STRICT OUTPUT RULES:',
      '- Output valid semantic HTML only. No markdown, no code fences, no <html>, <head> or <body> tags.',
      '- Do NOT include an <h1> (the page already renders one).',
      '- Start with a short intro <p> explaining the problem.',
      '- Then 4-6 <h2> sections (optionally <h3> sub-points) covering subtopics and questions.',
      '- Use <p>, <ul>/<li> and <strong> for structure and readability.',
      '- End with a brief FAQ-style section of 2-3 <h3> questions each followed by a <p> answer.',
      '- Aim for roughly 600-900 words of readable Australian English.',
      '- This is general information, not legal advice; keep statements factual and add light qualifiers where appropriate.',
      this.bifReferenceContent
        ? `\n=== BIF ACT LEGAL REFERENCE (authoritative — ground all legal claims here and cite sections) ===\n${this.bifReferenceContent.substring(0, 60000)}`
        : '',
      this.systemGuideContent
        ? `\n=== PAYTRADE SYSTEM KNOWLEDGE (use for accurate product/compliance context) ===\n${this.systemGuideContent.substring(0, 80000)}`
        : '',
    ].join('\n');
  }

  private stripFences(html: string): string {
    return html
      .replace(/^```(?:html)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
  }

  async generateDraft(input: {
    keyword: string;
    page_title?: string;
    meta_description?: string;
    tags?: string[];
  }): Promise<string> {
    if (!this.openai) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    const userPrompt = [
      `Primary keyword: ${input.keyword}`,
      input.page_title ? `Page title: ${input.page_title}` : '',
      input.meta_description ? `Meta description: ${input.meta_description}` : '',
      input.tags && input.tags.length
        ? `Related keywords/tags: ${input.tags.join(', ')}`
        : '',
      '',
      'Write the landing page body content (HTML) for this keyword now.',
    ]
      .filter(Boolean)
      .join('\n');

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      // GPT-5 / o-series reasoning models reject a custom temperature.
      ...(this.isReasoningModel() ? {} : { temperature: 0.7 }),
      messages: [
        { role: 'system', content: this.buildSystemPrompt() },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || '';
    const html = this.stripFences(raw);
    if (!html) {
      throw new Error('OpenAI returned an empty draft.');
    }
    return html;
  }
}
