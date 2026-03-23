import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import OpenAI from 'openai';
import {
  CmtyDiscussionsIdeas,
} from 'src/entities/cmty-discussion-idea.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { SeoKeyword } from 'src/entities/seo-keyword.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

const DEFAULT_TOPICS = [
  'Project Trust Accounts in the Australian Construction Industry',
  'Building Industry Fairness (Security of Payment) Act',
  'Trust accounting obligations for head contractors',
  'Retention trust accounts in Queensland construction',
  'Security of payment rights for subcontractors in Australia',
  'QBCC compliance requirements for project trust accounts',
  'How to set up a project trust account for construction projects',
  'Cash flow management for construction businesses',
  'Subcontractor payment protection under BIF Act',
  'Progress payment claims in the construction industry',
  'Adjudication of payment disputes in construction',
  'Best practices for construction payment management',
  'Understanding retention money in building contracts',
  'Construction industry payment reform in Queensland',
  'Digital trust accounting solutions for builders',
];

@Injectable()
export class CommunityBotService {
  private logger = new PaytradeLogger('COMMUNITY_BOT');
  private openai: OpenAI | null = null;

  constructor(
    @InjectRepository(CmtyDiscussionsIdeas)
    private discussionsIdeas: Repository<CmtyDiscussionsIdeas>,
    @InjectRepository(AdminDetails)
    private adminDetails: Repository<AdminDetails>,
    @InjectRepository(MasterTypes)
    private masterTypes: Repository<MasterTypes>,
    @InjectRepository(SeoKeyword)
    private seoKeywords: Repository<SeoKeyword>,
  ) {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.logger.log('OpenAI client initialized for community bot');
    } else {
      this.logger.warn('OPENAI_API_KEY not set - community bot will not generate content');
    }
  }

  @Cron('0 9 * * 1,3,5')
  async scheduledContentGeneration() {
    if (!this.openai) {
      return;
    }

    const botEnabled = process.env.COMMUNITY_BOT_ENABLED !== 'false';
    if (!botEnabled) {
      return;
    }

    try {
      this.logger.log('Starting scheduled community content generation');
      await this.generateAndPostContent();
    } catch (error) {
      this.logger.error(`Scheduled content generation failed: ${error.message}`);
    }
  }

  async generateAndPostContent(): Promise<CmtyDiscussionsIdeas | null> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Set OPENAI_API_KEY environment variable.');
    }

    const topic = await this.selectTopic();
    const botAdmin = await this.getBotAdmin();

    if (!botAdmin) {
      this.logger.error('No admin found to author bot posts. Ensure at least one active admin exists.');
      return null;
    }

    const category = await this.getDiscussionCategory();

    const existingTitles = await this.getRecentTitles();

    const generated = await this.generateContent(topic, existingTitles);

    if (!generated) {
      this.logger.error('Failed to generate content');
      return null;
    }

    const post = this.discussionsIdeas.create({
      title: generated.title,
      content: generated.content,
      cmty_content_type: 'Discussion',
      discussion_idea_status: 'Active',
      admin_author: botAdmin,
      category: category || undefined,
      enable_comments: true,
      created_group: 'ADMIN',
      updated_group: 'ADMIN',
    });

    const savedPost = await this.discussionsIdeas.save(post);
    savedPost.discussion_idea_id = Number(savedPost.discussion_idea_id) + 10000000;
    const finalPost = await this.discussionsIdeas.save(savedPost);

    this.logger.log(`Bot generated post: "${finalPost.title}" (ID: ${finalPost.id})`);
    return finalPost;
  }

  private async selectTopic(): Promise<string> {
    const activeKeywords = await this.seoKeywords.find({
      where: { status: 'Active' as const },
    });

    if (activeKeywords.length > 0) {
      const keyword = activeKeywords[Math.floor(Math.random() * activeKeywords.length)];
      return keyword.keyword;
    }

    return DEFAULT_TOPICS[Math.floor(Math.random() * DEFAULT_TOPICS.length)];
  }

  private async getBotAdmin(): Promise<AdminDetails | null> {
    const botAdminId = process.env.COMMUNITY_BOT_ADMIN_ID;

    if (botAdminId) {
      const admin = await this.adminDetails.findOne({
        where: { id: botAdminId, admin_status: 'Active' },
      });
      if (admin) return admin;
    }

    const admin = await this.adminDetails.findOne({
      where: { admin_status: 'Active' },
      order: { admin_id: 'ASC' },
    });

    return admin;
  }

  private async getDiscussionCategory(): Promise<MasterTypes | null> {
    const category = await this.masterTypes.findOne({
      where: { master_type: 'Discussion Topic' },
    });
    return category;
  }

  private async getRecentTitles(): Promise<string[]> {
    const recent = await this.discussionsIdeas.find({
      select: ['title'],
      order: { created_on: 'DESC' },
      take: 50,
    });
    return recent.map((p) => p.title);
  }

  private async generateContent(
    topic: string,
    existingTitles: string[],
  ): Promise<{ title: string; content: string } | null> {
    try {
      const titlesContext = existingTitles.length > 0
        ? `\n\nExisting post titles (do NOT duplicate these):\n${existingTitles.slice(0, 20).map((t) => `- ${t}`).join('\n')}`
        : '';

      const response = await this.openai.responses.create({
        model: 'gpt-4o',
        tools: [{ type: 'web_search_preview' }],
        instructions: `You are a knowledgeable expert on Australian construction industry payment practices, trust accounting, and the Building Industry Fairness (Security of Payment) Act. You write engaging, informative community discussion posts for PayTrade, a platform that helps manage project trust accounts and construction payments.

Your posts should:
- Be informative and practical for construction industry professionals
- Reference current regulations and best practices
- Be written in a professional but approachable tone
- Include specific, actionable insights
- Be between 400-800 words
- Use HTML formatting for the content (paragraphs, headings, lists)
- Search the web for the latest information on the topic when relevant`,
        input: `Write a community discussion post about: "${topic}"

Create a unique, engaging title and detailed content.${titlesContext}

Respond in this exact JSON format:
{
  "title": "Your unique post title here",
  "content": "<p>Your HTML formatted content here...</p>"
}

Return ONLY the JSON object, no markdown code blocks or other text.`,
      });

      const outputText = response.output_text;
      let cleanText = outputText.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.slice(7);
      }
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.slice(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.slice(0, -3);
      }
      cleanText = cleanText.trim();

      const parsed = JSON.parse(cleanText);

      if (!parsed.title || !parsed.content) {
        this.logger.error('Generated content missing title or content');
        return null;
      }

      const existingPost = await this.discussionsIdeas.findOne({
        where: { title: parsed.title },
      });

      if (existingPost) {
        this.logger.warn(`Title already exists: "${parsed.title}", retrying with modified title`);
        parsed.title = `${parsed.title} - ${new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}`;
      }

      return parsed;
    } catch (error) {
      this.logger.error(`OpenAI content generation error: ${error.message}`);
      return null;
    }
  }

  async triggerManualGeneration(): Promise<CmtyDiscussionsIdeas | null> {
    this.logger.log('Manual content generation triggered');
    return this.generateAndPostContent();
  }

  async getBotStats(): Promise<{
    totalBotPosts: number;
    lastPostDate: Date | null;
    botEnabled: boolean;
    openaiConfigured: boolean;
  }> {
    const botAdmin = await this.getBotAdmin();

    let totalBotPosts = 0;
    let lastPostDate: Date | null = null;

    if (botAdmin) {
      const [posts, count] = await this.discussionsIdeas.findAndCount({
        where: { admin_author: { admin_id: botAdmin.admin_id } },
        order: { created_on: 'DESC' },
        take: 1,
      });
      totalBotPosts = count;
      lastPostDate = posts.length > 0 ? posts[0].created_on : null;
    }

    return {
      totalBotPosts,
      lastPostDate,
      botEnabled: process.env.COMMUNITY_BOT_ENABLED !== 'false',
      openaiConfigured: !!this.openai,
    };
  }
}
