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
import { AddSeoKeywordInput } from './dto/add-seo-keyword.dto';
import { UpdateSeoKeywordInput } from './dto/update-seo-keyword.dto';
import { ListSeoKeywordsInput } from './dto/list-seo-keywords.dto';
import {
  SeoKeywordResponse,
  SeoKeywordListResponse,
  SeoKeywordDeleteResponse,
} from './response/seo-keyword.response';

@Resolver()
export class SeoKeywordsResolver {
  private logger = new PaytradeLogger('SEO_KEYWORDS_RESOLVER');

  constructor(private readonly seoKeywordsService: SeoKeywordsService) {}

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
      return framedResponse('SUCCESS', 'SEO keywords retrieved.', {
        seoKeywords,
        totalCount,
      });
    } catch (error) {
      this.logger.error(`Error listing SEO keywords: ${error.message}`);
      return framedResponse('ERROR', error.message);
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
      return framedResponse('SUCCESS', 'Active SEO keywords retrieved.', {
        seoKeywords,
        totalCount: seoKeywords.length,
      });
    } catch (error) {
      this.logger.error(`Error getting active SEO keywords: ${error.message}`);
      return framedResponse('ERROR', error.message);
    }
  }
}
