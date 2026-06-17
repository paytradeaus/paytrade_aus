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
  private openai: OpenAI;
  private systemGuideContent = '';

  // Defaults to gpt-4o (proven in this codebase). Override with SEO_DRAFT_MODEL.
  private readonly model = process.env.SEO_DRAFT_MODEL || 'gpt-4o';

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.loadSystemGuide();
  }

  private loadSystemGuide() {
    try {
      const guidePath = path.join(process.cwd(), '..', 'PayTrade-System-Guide.md');
      if (fs.existsSync(guidePath)) {
        this.systemGuideContent = fs.readFileSync(guidePath, 'utf-8');
      } else {
        const altPath = path.join(process.cwd(), 'PayTrade-System-Guide.md');
        if (fs.existsSync(altPath)) {
          this.systemGuideContent = fs.readFileSync(altPath, 'utf-8');
        } else {
          this.logger.warn('PayTrade-System-Guide.md not found for SEO drafting');
        }
      }
    } catch (error) {
      this.logger.error(`Failed to load system guide: ${error.message}`);
    }
  }

  private buildSystemPrompt(): string {
    return [
      'You are an expert SEO content writer and an Australian construction-industry',
      'payment, security-of-payment and compliance specialist writing for PayTrade,',
      'a construction trust accounting and payment platform.',
      '',
      'Write helpful, people-first, genuinely useful landing-page body copy that answers',
      'real search intent for the given keyword. Where accurate and relevant, reference',
      'the Building Industry Fairness (Security of Payment) Act 2017 (the BIF Act) and the',
      'Queensland project trust account framework. Be specific and practical, not generic',
      'marketing fluff. Do NOT keyword stuff: use the keyword and close variants naturally',
      'in the intro and headings only where it improves clarity.',
      '',
      'STRICT OUTPUT RULES:',
      '- Output valid semantic HTML only. No markdown, no code fences, no <html>, <head> or <body> tags.',
      '- Do NOT include an <h1> (the page already renders one).',
      '- Start with a short intro <p> explaining the problem.',
      '- Then 4-6 <h2> sections (optionally <h3> sub-points) covering subtopics and questions.',
      '- Use <p>, <ul>/<li> and <strong> for structure and readability.',
      '- End with a brief FAQ-style section of 2-3 <h3> questions each followed by a <p> answer.',
      '- Aim for roughly 600-900 words of readable Australian English.',
      '- Do not invent legal advice; keep statements factual and add light qualifiers where appropriate.',
      this.systemGuideContent
        ? `\nPAYTRADE SYSTEM KNOWLEDGE (use for accurate product/compliance context):\n${this.systemGuideContent.substring(0, 50000)}`
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
    if (!process.env.OPENAI_API_KEY) {
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
      temperature: 0.7,
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
