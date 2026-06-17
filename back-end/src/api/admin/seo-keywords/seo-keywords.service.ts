import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { SeoKeyword } from 'src/entities/seo-keyword.entity';
import { CmtyDiscussionsIdeas } from 'src/entities/cmty-discussion-idea.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import { AddSeoKeywordInput } from './dto/add-seo-keyword.dto';
import { UpdateSeoKeywordInput } from './dto/update-seo-keyword.dto';
import { ListSeoKeywordsInput } from './dto/list-seo-keywords.dto';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import slugify from 'slugify';

interface RelatedItem {
  type: string;
  title: string;
  excerpt: string;
  url: string;
  category: string | null;
  meta: string | null;
}

@Injectable()
export class SeoKeywordsService {
  private logger = new PaytradeLogger('SEO_KEYWORDS_SERVICE');

  constructor(
    @InjectRepository(SeoKeyword)
    private seoKeywordRepo: Repository<SeoKeyword>,
    @InjectRepository(CmtyDiscussionsIdeas)
    private cmtyRepo: Repository<CmtyDiscussionsIdeas>,
    @InjectRepository(BlogResource)
    private blogRepo: Repository<BlogResource>,
  ) {}

  async create(input: AddSeoKeywordInput): Promise<SeoKeyword> {
    const slug = slugify(input.slug || input.keyword, {
      lower: true,
      strict: true,
    });

    const existing = await this.seoKeywordRepo.findOne({ where: { slug } });
    if (existing) {
      throw new Error(`SEO keyword with slug "${slug}" already exists.`);
    }

    const seoKeyword = this.seoKeywordRepo.create({
      ...input,
      slug,
    });

    return await this.seoKeywordRepo.save(seoKeyword);
  }

  async update(input: UpdateSeoKeywordInput): Promise<SeoKeyword> {
    const seoKeyword = await this.seoKeywordRepo.findOne({
      where: { id: input.id },
    });

    if (!seoKeyword) {
      throw new Error(`SEO keyword with id "${input.id}" not found.`);
    }

    if (input.slug && input.slug !== seoKeyword.slug) {
      const newSlug = slugify(input.slug, { lower: true, strict: true });
      const existing = await this.seoKeywordRepo.findOne({
        where: { slug: newSlug },
      });
      if (existing && existing.id !== input.id) {
        throw new Error(`SEO keyword with slug "${newSlug}" already exists.`);
      }
      input.slug = newSlug;
    }

    Object.keys(input).forEach((key) => {
      if (key !== 'id' && input[key] !== undefined) {
        seoKeyword[key] = input[key];
      }
    });

    return await this.seoKeywordRepo.save(seoKeyword);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.seoKeywordRepo.delete(id);
    return result.affected > 0;
  }

  async list(
    input: ListSeoKeywordsInput,
  ): Promise<{ seoKeywords: SeoKeyword[]; totalCount: number }> {
    const queryBuilder = this.seoKeywordRepo.createQueryBuilder('seo');

    if (input.search) {
      queryBuilder.andWhere(
        '(LOWER(seo.keyword) LIKE :search OR LOWER(seo.slug) LIKE :search)',
        { search: `%${input.search.toLowerCase()}%` },
      );
    }

    if (input.status) {
      queryBuilder.andWhere('seo.status = :status', { status: input.status });
    }

    const sortOrder = input.sorting_order || 'DESC';
    const sortField = input.sorting_field || 'created_on';

    const ALLOWED_SORT_FIELDS = ['keyword', 'slug', 'status', 'created_on', 'updated_on'];
    const safeSortField = ALLOWED_SORT_FIELDS.includes(sortField) ? sortField : 'created_on';

    switch (safeSortField) {
      case 'keyword':
        queryBuilder.orderBy('LOWER(seo.keyword)', sortOrder);
        break;
      case 'slug':
        queryBuilder.orderBy('LOWER(seo.slug)', sortOrder);
        break;
      default:
        queryBuilder.orderBy(`seo.${safeSortField}`, sortOrder);
    }

    const totalCount = await queryBuilder.getCount();

    if (input.page && input.perPage) {
      queryBuilder.skip((input.page - 1) * input.perPage);
      queryBuilder.take(input.perPage);
    }

    const seoKeywords = await queryBuilder.getMany();

    return { seoKeywords, totalCount };
  }

  async findBySlug(slug: string): Promise<SeoKeyword | null> {
    return await this.seoKeywordRepo.findOne({
      where: { slug, status: 'Active' },
    });
  }

  async findById(id: string): Promise<SeoKeyword | null> {
    return await this.seoKeywordRepo.findOne({ where: { id } });
  }

  async getActiveKeywords(): Promise<SeoKeyword[]> {
    return await this.seoKeywordRepo.find({
      where: { status: 'Active' },
      order: { created_on: 'DESC' },
    });
  }

  async getAllKeywords(): Promise<SeoKeyword[]> {
    return await this.seoKeywordRepo.find({
      order: { created_on: 'DESC' },
    });
  }

  private makeExcerpt(html: string | null, max = 260): string {
    if (!html) return '';
    const text = html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length <= max) return text;
    return text.substring(0, max).replace(/\s+\S*$/, '') + '…';
  }

  private buildSearchTerms(keyword: SeoKeyword): string[] {
    const terms = [keyword.keyword, ...(keyword.tags || [])]
      .map((t) => (t || '').trim())
      .filter((t) => t.length > 2);
    return Array.from(new Set(terms));
  }

  private async findRelatedCommunity(terms: string[]): Promise<RelatedItem[]> {
    if (!terms.length) return [];
    const qb = this.cmtyRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.category', 'category')
      .where('c.discussion_idea_status = :status', { status: 'Active' })
      .andWhere(
        new Brackets((b) => {
          terms.forEach((t, i) => {
            b.orWhere(`c.title ILIKE :ct${i}`, { [`ct${i}`]: `%${t}%` });
            b.orWhere(`c.content ILIKE :cc${i}`, { [`cc${i}`]: `%${t}%` });
          });
        }),
      )
      .orderBy('c.view_count', 'DESC')
      .addOrderBy('c.created_on', 'DESC')
      .take(6);

    const rows = await qb.getMany();
    return rows.map((r) => {
      const pageLink = r.cmty_content_type === 'Idea' ? 'product-ideas' : 'discussions';
      const cat = slugify(r.category?.value || 'All', { lower: true, strict: true });
      const titleSlug = slugify(r.title || '', { lower: true, strict: true });
      const replies = r.answer_comment_count || 0;
      return {
        type: 'community',
        title: r.title,
        excerpt: this.makeExcerpt(r.content),
        url: `/community/${pageLink}/${cat}/${titleSlug}/${r.id}`,
        category: r.category?.value || null,
        meta: `${replies} ${replies === 1 ? 'reply' : 'replies'}`,
      };
    });
  }

  private async findRelatedGuides(terms: string[]): Promise<RelatedItem[]> {
    if (!terms.length) return [];
    const qb = this.blogRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.category', 'category')
      .where('b.blog_status = :status', { status: 'Published' })
      .andWhere('b.content_type IN (:...types)', {
        types: ['howToGuide', 'Blog'],
      })
      .andWhere(
        new Brackets((bb) => {
          terms.forEach((t, i) => {
            bb.orWhere(`b.title ILIKE :bt${i}`, { [`bt${i}`]: `%${t}%` });
            bb.orWhere(`b.content ILIKE :bc${i}`, { [`bc${i}`]: `%${t}%` });
          });
        }),
      )
      .orderBy('b.published_on', 'DESC')
      .addOrderBy('b.created_on', 'DESC')
      .take(6);

    const rows = await qb.getMany();
    return rows.map((r) => {
      const cat = slugify(r.category?.value || 'All', { lower: true, strict: true });
      const itemSlug =
        (r.urlSlug && r.urlSlug.trim()) ||
        slugify(r.title || '', { lower: true, strict: true });
      const base = r.content_type === 'howToGuide' ? 'how-to-guides' : 'blog';
      return {
        type: 'guide',
        title: r.title,
        excerpt: this.makeExcerpt(r.content),
        url: `/${base}/${cat}/${itemSlug}/${r.id}`,
        category: r.category?.value || null,
        meta: r.content_type === 'howToGuide' ? 'How-to guide' : 'Article',
      };
    });
  }

  async getPageData(slug: string): Promise<{
    keyword: SeoKeyword;
    community: RelatedItem[];
    guides: RelatedItem[];
  } | null> {
    const keyword = await this.findBySlug(slug);
    if (!keyword) return null;

    const terms = this.buildSearchTerms(keyword);
    const [community, guides] = await Promise.all([
      this.findRelatedCommunity(terms),
      this.findRelatedGuides(terms),
    ]);

    return { keyword, community, guides };
  }
}
