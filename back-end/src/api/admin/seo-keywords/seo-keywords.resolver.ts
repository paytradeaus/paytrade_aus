import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { SeoKeywordsService } from './seo-keywords.service';
import { SeoDraftService } from './seo-draft.service';
import { AddSeoKeywordInput } from './dto/add-seo-keyword.dto';
import { UpdateSeoKeywordInput } from './dto/update-seo-keyword.dto';
import { ListSeoKeywordsInput } from './dto/list-seo-keywords.dto';
import {
  SeoKeywordResponse,
  SeoKeywordListResponse,
  SeoKeywordDeleteResponse,
} from './response/seo-keyword.response';
import {
  SeoKeywordPageResponse,
  SeoDraftResponse,
  SeoBulkDraftResponse,
  SeoBulkDraftResultItem,
} from './response/seo-keyword-page.response';

@Resolver()
export class SeoKeywordsResolver {
  private logger = new PaytradeLogger('SEO_KEYWORDS_RESOLVER');

  constructor(
    private readonly seoKeywordsService: SeoKeywordsService,
    private readonly seoDraftService: SeoDraftService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => SeoKeywordResponse, {
    name: 'adminAddSeoKeyword',
    description: 'Add a new SEO keyword with landing page configuration.',
  })
  async adminAddSeoKeyword(
    @Args('addSeoKeywordInput', {
      description: 'Input payload for creating a new SEO keyword.',
    })
    addSeoKeywordInput: AddSeoKeywordInput,
  ): Promise<SeoKeywordResponse> {
    try {
      const result = await this.seoKeywordsService.create(addSeoKeywordInput);
      return framedResponse('SUCCESS', 'SEO keyword added successfully.', result);
    } catch (error) {
      this.logger.error(`Error adding SEO keyword: ${error.message}`);
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => SeoKeywordResponse, {
    name: 'adminUpdateSeoKeyword',
    description: 'Update an existing SEO keyword.',
  })
  async adminUpdateSeoKeyword(
    @Args('updateSeoKeywordInput', {
      description: 'Input payload for updating an SEO keyword.',
    })
    updateSeoKeywordInput: UpdateSeoKeywordInput,
  ): Promise<SeoKeywordResponse> {
    try {
      const result = await this.seoKeywordsService.update(updateSeoKeywordInput);
      return framedResponse('SUCCESS', 'SEO keyword updated successfully.', result);
    } catch (error) {
      this.logger.error(`Error updating SEO keyword: ${error.message}`);
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => SeoKeywordDeleteResponse, {
    name: 'adminDeleteSeoKeyword',
    description: 'Delete an SEO keyword.',
  })
  async adminDeleteSeoKeyword(
    @Args('id', { description: 'ID of the SEO keyword to delete.' })
    id: string,
  ): Promise<SeoKeywordDeleteResponse> {
    try {
      const deleted = await this.seoKeywordsService.delete(id);
      if (deleted) {
        return framedResponse('SUCCESS', 'SEO keyword deleted successfully.');
      }
      return framedResponse('ERROR', 'SEO keyword not found.');
    } catch (error) {
      this.logger.error(`Error deleting SEO keyword: ${error.message}`);
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => SeoKeywordListResponse, {
    name: 'adminListSeoKeywords',
    description: 'List all SEO keywords with filtering and pagination.',
  })
  async adminListSeoKeywords(
    @Args('listSeoKeywordsInput', {
      description: 'Input payload for listing SEO keywords.',
    })
    listSeoKeywordsInput: ListSeoKeywordsInput,
  ): Promise<SeoKeywordListResponse> {
    try {
      const { seoKeywords, totalCount } =
        await this.seoKeywordsService.list(listSeoKeywordsInput);
      return {
        status: 'SUCCESS',
        message: 'SEO keywords retrieved.',
        seoKeywords,
        totalCount,
      };
    } catch (error) {
      this.logger.error(`Error listing SEO keywords: ${error.message}`);
      return {
        status: 'ERROR',
        message: error.message,
        seoKeywords: [],
        totalCount: 0,
      };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => SeoKeywordResponse, {
    name: 'adminGetSeoKeyword',
    description: 'Get a single SEO keyword by ID.',
  })
  async adminGetSeoKeyword(
    @Args('id', { description: 'ID of the SEO keyword.' })
    id: string,
  ): Promise<SeoKeywordResponse> {
    try {
      const result = await this.seoKeywordsService.findById(id);
      if (!result) {
        return framedResponse('ERROR', 'SEO keyword not found.');
      }
      return framedResponse('SUCCESS', 'SEO keyword retrieved.', result);
    } catch (error) {
      this.logger.error(`Error getting SEO keyword: ${error.message}`);
      return framedResponse('ERROR', error.message);
    }
  }

  @Public()
  @Query(() => SeoKeywordResponse, {
    name: 'getSeoKeywordBySlug',
    description: 'Get an active SEO keyword by its URL slug (public).',
  })
  async getSeoKeywordBySlug(
    @Args('slug', { description: 'URL slug of the SEO keyword.' })
    slug: string,
  ): Promise<SeoKeywordResponse> {
    try {
      const result = await this.seoKeywordsService.findBySlug(slug);
      if (!result) {
        return framedResponse('ERROR', 'SEO keyword not found.');
      }
      return framedResponse('SUCCESS', 'SEO keyword retrieved.', result);
    } catch (error) {
      this.logger.error(`Error getting SEO keyword by slug: ${error.message}`);
      return framedResponse('ERROR', error.message);
    }
  }

  @Public()
  @Query(() => SeoKeywordListResponse, {
    name: 'getActiveSeoKeywords',
    description: 'Get all active SEO keywords (public).',
  })
  async getActiveSeoKeywords(): Promise<SeoKeywordListResponse> {
    try {
      const seoKeywords = await this.seoKeywordsService.getActiveKeywords();
      return {
        status: 'SUCCESS',
        message: 'Active SEO keywords retrieved.',
        seoKeywords,
        totalCount: seoKeywords.length,
      };
    } catch (error) {
      this.logger.error(`Error getting active SEO keywords: ${error.message}`);
      return {
        status: 'ERROR',
        message: error.message,
        seoKeywords: [],
        totalCount: 0,
      };
    }
  }

  @Public()
  @Query(() => SeoKeywordPageResponse, {
    name: 'getSeoKeywordPageData',
    description:
      'Get an active SEO keyword by slug along with keyword-matched community posts and how-to guides/blogs for SSR landing pages (public).',
  })
  async getSeoKeywordPageData(
    @Args('slug', { description: 'URL slug of the SEO keyword.' })
    slug: string,
  ): Promise<SeoKeywordPageResponse> {
    try {
      const result = await this.seoKeywordsService.getPageData(slug);
      if (!result) {
        return { status: 'ERROR', message: 'SEO keyword not found.' };
      }
      return {
        status: 'SUCCESS',
        message: 'SEO keyword page data retrieved.',
        data: result.keyword,
        community: result.community,
        guides: result.guides,
      };
    } catch (error) {
      this.logger.error(`Error getting SEO keyword page data: ${error.message}`);
      return { status: 'ERROR', message: error.message };
    }
  }

  @Public()
  @Query(() => SeoKeywordPageResponse, {
    name: 'getRelatedContentForKeyword',
    description:
      'Get community posts and how-to guides/blogs closely aligned with a full keyword phrase (phrase match or all significant words, not per-word OR). Used by the static SEO money pages (public).',
  })
  async getRelatedContentForKeyword(
    @Args('keyword', { description: 'Full keyword phrase to align against.' })
    keyword: string,
  ): Promise<SeoKeywordPageResponse> {
    try {
      const result =
        await this.seoKeywordsService.getRelatedContentForKeyword(keyword);
      return {
        status: 'SUCCESS',
        message: 'Related content retrieved.',
        community: result.community,
        guides: result.guides,
      };
    } catch (error) {
      this.logger.error(
        `Error getting related content for keyword: ${error.message}`,
      );
      return { status: 'ERROR', message: error.message };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => SeoDraftResponse, {
    name: 'adminGenerateSeoKeywordDraft',
    description:
      'Generate AI draft page_content HTML for a keyword. When save is true, the generated copy overwrites the stored page_content.',
  })
  async adminGenerateSeoKeywordDraft(
    @Args('id', {
      nullable: true,
      description:
        'ID of an existing SEO keyword to draft content for. Omit to draft from inline fields (add form).',
    })
    id?: string,
    @Args('save', {
      nullable: true,
      description:
        'When true, persist the generated draft as the keyword page_content (overwrites existing). Requires id.',
    })
    save?: boolean,
    @Args('keyword', { nullable: true }) keyword?: string,
    @Args('page_title', { nullable: true }) page_title?: string,
    @Args('meta_description', { nullable: true }) meta_description?: string,
    @Args('tags', { type: () => [String], nullable: true }) tags?: string[],
  ): Promise<SeoDraftResponse> {
    try {
      if (save && !id) {
        return {
          status: 'ERROR',
          message: 'Cannot save a draft without an existing keyword id.',
        };
      }

      let draftInput = { keyword, page_title, meta_description, tags };

      if (id) {
        const existing = await this.seoKeywordsService.findById(id);
        if (!existing) {
          return { status: 'ERROR', message: 'SEO keyword not found.' };
        }
        // Use persisted values as the base, but let any inline fields
        // (e.g. unsaved edits in the form) override them.
        draftInput = {
          keyword: keyword ?? existing.keyword,
          page_title: page_title ?? existing.page_title,
          meta_description: meta_description ?? existing.meta_description,
          tags: tags ?? existing.tags,
        };
      }

      if (!draftInput.keyword) {
        return {
          status: 'ERROR',
          message: 'A keyword is required to generate a draft.',
        };
      }

      const draft = await this.seoDraftService.generateDraft({
        keyword: draftInput.keyword,
        page_title: draftInput.page_title,
        meta_description: draftInput.meta_description,
        tags: draftInput.tags,
      });

      if (save && id) {
        await this.seoKeywordsService.update({ id, page_content: draft });
      }

      return {
        status: 'SUCCESS',
        message: save
          ? 'Draft generated and saved.'
          : 'Draft generated.',
        draft,
      };
    } catch (error) {
      this.logger.error(`Error generating SEO draft: ${error.message}`);
      return { status: 'ERROR', message: error.message };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => SeoBulkDraftResponse, {
    name: 'adminGenerateAllSeoKeywordDrafts',
    description:
      'Regenerate AI draft page_content for ALL SEO keywords, overwriting every existing page_content. Returns a per-keyword success/failure summary.',
  })
  async adminGenerateAllSeoKeywordDrafts(): Promise<SeoBulkDraftResponse> {
    try {
      const keywords = await this.seoKeywordsService.getAllKeywords();
      const results: SeoBulkDraftResultItem[] = [];
      let succeeded = 0;
      let failed = 0;

      for (const kw of keywords) {
        try {
          const draft = await this.seoDraftService.generateDraft({
            keyword: kw.keyword,
            page_title: kw.page_title,
            meta_description: kw.meta_description,
            tags: kw.tags,
          });
          await this.seoKeywordsService.update({ id: kw.id, page_content: draft });
          succeeded += 1;
          results.push({
            id: kw.id,
            keyword: kw.keyword,
            status: 'SUCCESS',
            message: 'Regenerated.',
          });
        } catch (itemError) {
          failed += 1;
          this.logger.error(
            `Error generating draft for keyword ${kw.id} (${kw.keyword}): ${itemError.message}`,
          );
          results.push({
            id: kw.id,
            keyword: kw.keyword,
            status: 'ERROR',
            message: itemError.message,
          });
        }
      }

      return {
        status: failed === 0 ? 'SUCCESS' : 'PARTIAL',
        message: `Processed ${keywords.length} keyword(s): ${succeeded} succeeded, ${failed} failed.`,
        total: keywords.length,
        succeeded,
        failed,
        results,
      };
    } catch (error) {
      this.logger.error(`Error generating all SEO drafts: ${error.message}`);
      return { status: 'ERROR', message: error.message };
    }
  }
}
