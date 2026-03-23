import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeoKeyword } from 'src/entities/seo-keyword.entity';
import { AddSeoKeywordInput } from './dto/add-seo-keyword.dto';
import { UpdateSeoKeywordInput } from './dto/update-seo-keyword.dto';
import { ListSeoKeywordsInput } from './dto/list-seo-keywords.dto';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import slugify from 'slugify';

@Injectable()
export class SeoKeywordsService {
  private logger = new PaytradeLogger('SEO_KEYWORDS_SERVICE');

  constructor(
    @InjectRepository(SeoKeyword)
    private seoKeywordRepo: Repository<SeoKeyword>,
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
}
