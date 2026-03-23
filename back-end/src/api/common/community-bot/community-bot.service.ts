import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import OpenAI from 'openai';
import { CmtyDiscussionsIdeas } from 'src/entities/cmty-discussion-idea.entity';
import { CmtyAnswersComments } from 'src/entities/cmty-answers-comments.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { SeoKeyword } from 'src/entities/seo-keyword.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import * as bcrypt from 'bcryptjs';

const DEFAULT_TOPICS = [
  'Project Trust Accounts in the Australian Construction Industry',
  'Building Industry Fairness (Security of Payment) Act',
  'Trust accounting obligations for head contractors',
  'Retention trust accounts in Queensland construction',
  'Security of payment rights for subcontractors in Australia',
  'QBCC compliance requirements for project trust accounts',
  'How to set up a project trust account for construction projects',
  'Cash flow management for construction businesses under BIF Act',
  'Subcontractor payment protection under BIF Act',
  'Progress payment claims in the construction industry',
  'Adjudication of payment disputes under BIF Act',
  'Best practices for construction payment management with trust accounts',
  'Understanding retention money in building contracts under BIF Act',
  'Construction industry payment reform in Queensland',
  'Digital trust accounting solutions for builders',
];

const AUSTRALIAN_LOCATIONS = [
  { address: 'Brisbane CBD, QLD', region: 'Queensland', country: 'Australia', lat: '-27.4698', lng: '153.0251', place_id: 'ChIJM9KBrP9ZkWsRDMKKSF1GfOg' },
  { address: 'Gold Coast, QLD', region: 'Queensland', country: 'Australia', lat: '-28.0167', lng: '153.4000', place_id: 'ChIJ6Z2MG011kWsRoM-gdTGnLpg' },
  { address: 'Sunshine Coast, QLD', region: 'Queensland', country: 'Australia', lat: '-26.6500', lng: '153.0667', place_id: 'ChIJfXIwm7tQkWsRn5xciNHHOZI' },
  { address: 'Townsville, QLD', region: 'Queensland', country: 'Australia', lat: '-19.2590', lng: '146.8169', place_id: 'ChIJt_UGkbPz1GsRFAOEGBMnl70' },
  { address: 'Cairns, QLD', region: 'Queensland', country: 'Australia', lat: '-16.9186', lng: '145.7781', place_id: 'ChIJr5Y3eFuaeWsRIHjW1BQ5log' },
  { address: 'Toowoomba, QLD', region: 'Queensland', country: 'Australia', lat: '-27.5598', lng: '151.9507', place_id: 'ChIJJd0bHEcSkWsRwbFCw-bBBhk' },
  { address: 'Sydney, NSW', region: 'New South Wales', country: 'Australia', lat: '-33.8688', lng: '151.2093', place_id: 'ChIJP3Sa8ziYEmsRUKgyFmh9AQM' },
  { address: 'Melbourne, VIC', region: 'Victoria', country: 'Australia', lat: '-37.8136', lng: '144.9631', place_id: 'ChIJ90260rVG1moRkM2MIXVWBAQ' },
  { address: 'Perth, WA', region: 'Western Australia', country: 'Australia', lat: '-31.9505', lng: '115.8605', place_id: 'ChIJPwLjP196MioRkMZCGSP6gSM' },
  { address: 'Adelaide, SA', region: 'South Australia', country: 'Australia', lat: '-34.9285', lng: '138.6007', place_id: 'ChIJ1-4miA3KsGoRwgHSU15ROAQ' },
];

const BOT_BATCH_SIZE = 10;

@Injectable()
export class CommunityBotService {
  private logger = new PaytradeLogger('COMMUNITY_BOT');
  private openai: OpenAI | null = null;

  constructor(
    @InjectRepository(CmtyDiscussionsIdeas)
    private discussionsIdeas: Repository<CmtyDiscussionsIdeas>,
    @InjectRepository(CmtyAnswersComments)
    private answerComments: Repository<CmtyAnswersComments>,
    @InjectRepository(MasterTypes)
    private masterTypes: Repository<MasterTypes>,
    @InjectRepository(SeoKeyword)
    private seoKeywords: Repository<SeoKeyword>,
    @InjectRepository(UserDetails)
    private userDetails: Repository<UserDetails>,
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
    if (!this.openai) return;
    if (process.env.COMMUNITY_BOT_ENABLED === 'false') return;

    try {
      this.logger.log('Starting scheduled community content generation');
      await this.runContentBatch();
    } catch (error) {
      this.logger.error(`Scheduled content generation failed: ${error.message}`);
    }
  }

  async runContentBatch(): Promise<{
    questionsCreated: number;
    answersCreated: number;
    botsCreated: number;
  }> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Set OPENAI_API_KEY environment variable.');
    }

    const questionCount = this.randomBetween(2, 7);
    this.logger.log(`This run will create ${questionCount} questions`);

    const category = await this.getDiscussionCategory();
    const existingTitles = await this.getRecentTitles();

    let totalQuestions = 0;
    let totalAnswers = 0;
    let totalBotsCreated = 0;
    const usedQuestionerIds: string[] = [];
    const usedAnswererIds: string[] = [];

    for (let q = 0; q < questionCount; q++) {
      try {
        const questionUser = await this.getEligibleBot('question', [...usedQuestionerIds]);
        if (!questionUser) {
          this.logger.warn(`No eligible questioner bot available for question ${q + 1}, creating batch`);
          const created = await this.createBotBatch(BOT_BATCH_SIZE);
          totalBotsCreated += created;
          const retryUser = await this.getEligibleBot('question', [...usedQuestionerIds]);
          if (!retryUser) {
            this.logger.error(`Still no eligible questioner after batch creation, skipping question ${q + 1}`);
            continue;
          }
          Object.assign(questionUser || {}, retryUser);
          if (!questionUser) continue;
        }
        usedQuestionerIds.push(questionUser.id);

        const topic = await this.selectTopic();
        const generated = await this.generateQAndA(topic, existingTitles);
        if (!generated) {
          this.logger.error(`Failed to generate Q&A for question ${q + 1}`);
          continue;
        }

        const discussion = this.discussionsIdeas.create({
          title: generated.questionTitle,
          content: generated.questionContent,
          cmty_content_type: 'Discussion',
          discussion_idea_status: 'Active',
          author: questionUser,
          category: category || undefined,
          enable_comments: true,
          created_group: 'USER',
          updated_group: 'USER',
        });

        const savedDiscussion = await this.discussionsIdeas.save(discussion);
        savedDiscussion.discussion_idea_id = Number(savedDiscussion.discussion_idea_id) + 10000000;
        const finalDiscussion = await this.discussionsIdeas.save(savedDiscussion);
        existingTitles.push(finalDiscussion.title);
        totalQuestions++;

        this.logger.log(`Question ${q + 1}/${questionCount}: "${finalDiscussion.title}" by ${questionUser.first_name} ${questionUser.last_name}`);

        const answerCount = this.randomBetween(1, 3);
        let answersForThisQuestion = 0;

        for (let a = 0; a < answerCount; a++) {
          const excludeIds = [...usedAnswererIds, questionUser.id];
          let answerUser = await this.getEligibleBot('answer', excludeIds);
          if (!answerUser) {
            this.logger.warn(`No eligible answerer bot for answer ${a + 1} on question ${q + 1}, creating batch`);
            const created = await this.createBotBatch(BOT_BATCH_SIZE);
            totalBotsCreated += created;
            answerUser = await this.getEligibleBot('answer', excludeIds);
            if (!answerUser) {
              this.logger.error(`Still no eligible answerer after batch creation, skipping answer`);
              continue;
            }
          }
          usedAnswererIds.push(answerUser.id);

          let answerContent: string;
          if (a === 0) {
            answerContent = generated.answerContent;
          } else {
            const additionalAnswer = await this.generateAdditionalAnswer(
              finalDiscussion.title,
              generated.questionContent,
              generated.answerContent,
            );
            if (!additionalAnswer) continue;
            answerContent = additionalAnswer;
          }

          const answer = this.answerComments.create({
            answer_comment: answerContent,
            answer_comment_status: 'Approved',
            discussionIdea: finalDiscussion,
            author: answerUser,
            created_group: 'USER',
            updated_group: 'USER',
          });

          const savedAnswer = await this.answerComments.save(answer);
          savedAnswer.answer_comment_id = Number(savedAnswer.answer_comment_id) + 10000000;
          await this.answerComments.save(savedAnswer);
          answersForThisQuestion++;
          totalAnswers++;

          this.logger.log(`  Answer ${a + 1}/${answerCount} by ${answerUser.first_name} ${answerUser.last_name}`);
        }

        await this.discussionsIdeas.update(
          { id: finalDiscussion.id },
          { answer_comment_count: answersForThisQuestion },
        );
      } catch (error) {
        this.logger.error(`Error creating question ${q + 1}: ${error.message}`);
      }
    }

    this.logger.log(`Batch complete: ${totalQuestions} questions, ${totalAnswers} answers, ${totalBotsCreated} new bots created`);
    return { questionsCreated: totalQuestions, answersCreated: totalAnswers, botsCreated: totalBotsCreated };
  }

  private async getEligibleBot(
    role: 'question' | 'answer',
    excludeIds: string[],
  ): Promise<UserDetails | null> {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const allBots = await this.userDetails.find({
      where: { is_bot: true, user_status: 'Active' },
    });

    if (allBots.length === 0) return null;

    let usedBotUserIds: number[];

    if (role === 'question') {
      const usedBots = await this.discussionsIdeas
        .createQueryBuilder('d')
        .select('d.author_id', 'author_id')
        .innerJoin('d.author', 'author')
        .where('author.is_bot = true')
        .andWhere('d.created_on >= :monthStart', { monthStart })
        .groupBy('d.author_id')
        .getRawMany();
      usedBotUserIds = usedBots.map((b) => b.author_id);
    } else {
      const usedBots = await this.answerComments
        .createQueryBuilder('a')
        .select('a.author_id', 'author_id')
        .innerJoin('a.author', 'author')
        .where('author.is_bot = true')
        .andWhere('a.created_on >= :monthStart', { monthStart })
        .groupBy('a.author_id')
        .getRawMany();
      usedBotUserIds = usedBots.map((b) => b.author_id);
    }

    const eligible = allBots.filter(
      (bot) =>
        !usedBotUserIds.includes(bot.user_id) &&
        !excludeIds.includes(bot.id),
    );

    if (eligible.length === 0) return null;

    return eligible[Math.floor(Math.random() * eligible.length)];
  }

  private async createBotBatch(count: number): Promise<number> {
    let created = 0;
    this.logger.log(`Creating batch of ${count} bot users`);

    for (let i = 0; i < count; i++) {
      const bot = await this.createBotUser();
      if (bot) created++;
    }

    this.logger.log(`Batch creation complete: ${created}/${count} bots created`);
    return created;
  }

  private async createBotUser(): Promise<UserDetails | null> {
    try {
      const persona = await this.generateBotPersona();
      if (!persona) return null;

      const existingEmail = await this.userDetails.findOne({
        where: { email_id: persona.email },
      });
      if (existingEmail) {
        this.logger.warn(`Bot email already exists: ${persona.email}, skipping`);
        return null;
      }

      const location = AUSTRALIAN_LOCATIONS[Math.floor(Math.random() * AUSTRALIAN_LOCATIONS.length)];
      const hashedPassword = await bcrypt.hash(`bot_${Date.now()}_${Math.random()}`, 10);

      const botUser = this.userDetails.create({
        first_name: persona.firstName,
        last_name: persona.lastName,
        email_id: persona.email,
        position_title: persona.positionTitle,
        company_name: persona.companyName,
        occupation: persona.occupation,
        user_phone_no: '0400000000',
        user_address: location.address,
        country: location.country,
        region: location.region,
        latitude: location.lat,
        longitude: location.lng,
        place_id: location.place_id,
        password: hashedPassword,
        user_status: 'Active',
        user_role: Role.BASIC_USER,
        is_verified: true,
        is_bot: true,
        user_mode: 'Normal',
        show_popup: false,
        created_group: 'SYSTEM',
        updated_group: 'SYSTEM',
      });

      const saved = await this.userDetails.save(botUser);
      this.logger.log(`Created bot user: ${saved.first_name} ${saved.last_name} (${saved.email_id})`);
      return saved;
    } catch (error) {
      this.logger.error(`Failed to create bot user: ${error.message}`);
      return null;
    }
  }

  private async generateBotPersona(): Promise<{
    firstName: string;
    lastName: string;
    email: string;
    positionTitle: string;
    companyName: string;
    occupation: string;
  } | null> {
    if (!this.openai) return null;

    try {
      const response = await this.openai.responses.create({
        model: 'gpt-4o',
        instructions: `Generate a realistic Australian construction industry professional persona. The person works in the construction industry in Queensland or another Australian state. They would realistically use a project trust accounting platform.

Create a believable persona with:
- A common Australian name (mix of Anglo, European, Asian-Australian backgrounds)
- A realistic construction industry job title (e.g., Project Manager, Site Supervisor, Contracts Administrator, Quantity Surveyor, Construction Manager, Estimator, Building Supervisor, Procurement Manager)
- A realistic Australian construction company name (not a real company - make one up)
- A professional email that looks realistic using the company name domain

Return ONLY a JSON object:
{
  "firstName": "...",
  "lastName": "...",
  "email": "...",
  "positionTitle": "...",
  "companyName": "...",
  "occupation": "Construction"
}`,
        input: 'Generate one construction professional persona.',
      });

      let cleanText = response.output_text.trim();
      if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
      if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
      if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
      cleanText = cleanText.trim();

      const parsed = JSON.parse(cleanText);
      if (!parsed.firstName || !parsed.lastName || !parsed.email) {
        this.logger.error('Persona generation missing required fields');
        return null;
      }

      return parsed;
    } catch (error) {
      this.logger.error(`Persona generation error: ${error.message}`);
      return null;
    }
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

  private async generateQAndA(
    topic: string,
    existingTitles: string[],
  ): Promise<{ questionTitle: string; questionContent: string; answerContent: string } | null> {
    try {
      const titlesContext = existingTitles.length > 0
        ? `\n\nExisting discussion titles (do NOT duplicate these):\n${existingTitles.slice(0, 30).map((t) => `- ${t}`).join('\n')}`
        : '';

      const response = await this.openai.responses.create({
        model: 'gpt-4o',
        tools: [{ type: 'web_search_preview' }],
        instructions: `You are helping create community discussion content for PayTrade, an Australian platform for managing project trust accounts under the Building Industry Fairness (Security of Payment) Act (BIF Act).

ALL content MUST be specifically about:
- Project trust accounts and how they work in construction
- The BIF Act and its requirements for head contractors, subcontractors, and principals
- QBCC compliance and trust accounting obligations
- Retention trust accounts in Queensland
- Security of payment for subcontractors
- Payment claims, adjudication, and payment schedules under BIF Act
- How PayTrade helps manage these obligations

The content should sound like it comes from real construction industry professionals in Australia who are navigating trust accounting requirements.

The question should sound like a genuine community member seeking practical advice.
The answer should be detailed, helpful, and demonstrate expertise in BIF Act compliance and project trust accounting.

Use web search to find the latest information about BIF Act regulations and trust accounting requirements to ensure accuracy.`,
        input: `Create a community Q&A pair about the topic: "${topic}"

The QUESTION should:
- Sound like a real construction professional asking for practical guidance
- Be specific to project trust accounts or BIF Act compliance
- Target the keyword/topic naturally without keyword stuffing
- Be concise but clear (100-200 words of content in the body)
- Have a clear, searchable title

The ANSWER should:
- Be detailed and genuinely helpful (300-600 words)
- Reference specific BIF Act sections or QBCC requirements where relevant
- Provide practical, actionable advice
- Sound like an experienced trust accounting professional
- Use HTML formatting (paragraphs, lists where appropriate)
${titlesContext}

Respond with ONLY this JSON:
{
  "questionTitle": "Clear, specific title for the discussion",
  "questionContent": "<p>The question body in HTML...</p>",
  "answerContent": "<p>The detailed answer in HTML...</p>"
}`,
      });

      let cleanText = response.output_text.trim();
      if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
      if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
      if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
      cleanText = cleanText.trim();

      const parsed = JSON.parse(cleanText);

      if (!parsed.questionTitle || !parsed.questionContent || !parsed.answerContent) {
        this.logger.error('Generated Q&A missing required fields');
        return null;
      }

      const existingPost = await this.discussionsIdeas.findOne({
        where: { title: parsed.questionTitle },
      });

      if (existingPost) {
        parsed.questionTitle = `${parsed.questionTitle} - ${new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}`;
      }

      return parsed;
    } catch (error) {
      this.logger.error(`Q&A generation error: ${error.message}`);
      return null;
    }
  }

  private async generateAdditionalAnswer(
    questionTitle: string,
    questionContent: string,
    existingAnswer: string,
  ): Promise<string | null> {
    try {
      const response = await this.openai.responses.create({
        model: 'gpt-4o',
        tools: [{ type: 'web_search_preview' }],
        instructions: `You are a knowledgeable Australian construction industry professional responding to a community discussion about project trust accounts and the BIF Act. You are providing an additional perspective that differs from an existing answer.

Your answer MUST be specifically about project trust accounts, BIF Act compliance, QBCC requirements, or related construction payment topics. Sound like a real industry professional with practical experience.`,
        input: `Provide an additional answer to this community discussion:

Title: "${questionTitle}"
Question: ${questionContent}

An existing answer has already been given (provide a DIFFERENT perspective, additional tips, or supplementary information — do NOT repeat the same points):
${existingAnswer}

Your answer should:
- Be 200-400 words
- Offer a different angle, additional practical tips, or personal experience perspective
- Reference specific regulations or requirements where relevant
- Use HTML formatting
- Sound natural, like a real community member contributing

Return ONLY the HTML answer content, no JSON wrapping.`,
      });

      const answerText = response.output_text.trim();
      if (!answerText || answerText.length < 50) {
        this.logger.error('Additional answer too short or empty');
        return null;
      }

      return answerText;
    } catch (error) {
      this.logger.error(`Additional answer generation error: ${error.message}`);
      return null;
    }
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async triggerManualGeneration(): Promise<{
    questionsCreated: number;
    answersCreated: number;
    botsCreated: number;
  } | null> {
    this.logger.log('Manual content generation triggered');
    return this.runContentBatch();
  }

  async getBotStats(): Promise<{
    totalBotPosts: number;
    totalBotAnswers: number;
    totalBotUsers: number;
    eligibleQuestionersThisMonth: number;
    eligibleAnswerersThisMonth: number;
    lastPostDate: Date | null;
    botEnabled: boolean;
    openaiConfigured: boolean;
    botUsers: { id: string; name: string; company: string; position: string; questionsThisMonth: number; answersThisMonth: number }[];
  }> {
    const botUsers = await this.userDetails.find({
      where: { is_bot: true },
    });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const botUserDetails = [];
    let eligibleQuestioners = 0;
    let eligibleAnswerers = 0;

    for (const bot of botUsers) {
      const questionsThisMonth = await this.discussionsIdeas
        .createQueryBuilder('d')
        .where('d.author_id = :id', { id: bot.user_id })
        .andWhere('d.created_on >= :monthStart', { monthStart })
        .getCount();

      const answersThisMonth = await this.answerComments
        .createQueryBuilder('a')
        .where('a.author_id = :id', { id: bot.user_id })
        .andWhere('a.created_on >= :monthStart', { monthStart })
        .getCount();

      if (questionsThisMonth === 0) eligibleQuestioners++;
      if (answersThisMonth === 0) eligibleAnswerers++;

      botUserDetails.push({
        id: bot.id,
        name: `${bot.first_name} ${bot.last_name}`,
        company: bot.company_name || '',
        position: bot.position_title || '',
        questionsThisMonth,
        answersThisMonth,
      });
    }

    const botUserIds = botUsers.map((b) => b.user_id);
    let totalBotPosts = 0;
    let totalBotAnswers = 0;
    let lastPostDate: Date | null = null;

    if (botUserIds.length > 0) {
      totalBotPosts = await this.discussionsIdeas
        .createQueryBuilder('d')
        .where('d.author_id IN (:...ids)', { ids: botUserIds })
        .getCount();

      totalBotAnswers = await this.answerComments
        .createQueryBuilder('a')
        .where('a.author_id IN (:...ids)', { ids: botUserIds })
        .getCount();

      const lastPost = await this.discussionsIdeas
        .createQueryBuilder('d')
        .where('d.author_id IN (:...ids)', { ids: botUserIds })
        .orderBy('d.created_on', 'DESC')
        .getOne();
      lastPostDate = lastPost?.created_on || null;
    }

    return {
      totalBotPosts,
      totalBotAnswers,
      totalBotUsers: botUsers.length,
      eligibleQuestionersThisMonth: eligibleQuestioners,
      eligibleAnswerersThisMonth: eligibleAnswerers,
      lastPostDate,
      botEnabled: process.env.COMMUNITY_BOT_ENABLED !== 'false',
      openaiConfigured: !!this.openai,
      botUsers: botUserDetails,
    };
  }
}
