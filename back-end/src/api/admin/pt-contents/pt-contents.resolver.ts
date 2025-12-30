import { Args, Context, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PtContentsService } from './pt-contents.service';
import { HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { AddContentInput } from './dto/add-content.dto';
import { ptContentResponse } from './response/content.response';
import {
  ptContentListResponse,
  ptContentsPerPageResponse,
  ptPageContents,
} from './response/content-list.response';
import { UpdateContentInput } from './dto/update-content.dto';
import { ptMailTemplateResponse } from './response/email-template.response';
import { ptMailTemplateListResponse } from './response/email-template-list.response';
import { UpdateMailTemplateInput } from './dto/update-mail-template.dto';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';
import {
  embeddedUrlResponse,
  ptBlogResourceResponse,
  ptBlogResourceShortResponse,
} from './response/blog-resource.response';
import { AddBlogResourceInput } from './dto/add-blog-resource.dto';
import {
  ptBlogResAuthorsListResponse,
  ptBlogResourceCategoryWiseListResponse,
  ptBlogResourceListResponse,
} from './response/blog-resource-list.response';
import { ListBlogResourceInput } from './dto/list-blog-resource.dto';
import { UpdateBlogResourceInput } from './dto/update-blog-resource.dto';
import { ptBlogWithSuggestionResponse } from './response/blog-resource-suggestion.response';
import { AddBlogCommentInput } from './dto/add-blog-comment.dto';
import {
  ptBlogCommentsListResponse,
  ptBlogCommentsResponse,
} from './response/blog-comment-list.response';
import { ManageBlogCommentInput } from './dto/manage-blog-comment.dto';
import { commentStatus } from 'src/entities/admin-blog-comments.entity';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { handleError } from 'src/api/common/error-handler';
import { ListBlogCommentsInput } from './dto/list-blog-comments.dto';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { SortingOrder } from '../pt-admin/dto/add-admin.dto';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';

@Resolver()
export class PtContentsResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly ptContentsService: PtContentsService,
    private readonly activityLogService: ActivityLogService,
  ) {
    this.logger = new PaytradeLogger('USER_SIGNUP');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => ptContentResponse, {
    name: 'adminAddContents',
    description: 'Adds new content by admin.',
  })
  async adminAddContents(
    @Args('addContentInput', {
      description:
        'Input payload containing details of the content to be created.',
    })
    addContentInput: AddContentInput,
  ): Promise<any> {
    try {
      const newContent = await this.ptContentsService.create(addContentInput);
      if (newContent) {
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          newContent,
        );
      } else {
        throw new HttpException(
          'Failed to add new content',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => ptContentListResponse, {
    name: 'adminListAllContents',
    description: 'Lists all contents.',
  })
  async adminListAllContents(
    @Args('keyword', {
      nullable: true,
      description: 'Keyword to search content by title or body.',
    })
    keyword: string,

    @Args('pageType', {
      nullable: true,
      description: 'Page type to filter content (e.g., ABOUT_US, TERMS).',
    })
    pageType: string,

    @Args('page', {
      type: () => Int,
      nullable: true,
      defaultValue: null,
      description: 'Page number for pagination.',
    })
    page: number,

    @Args('perPage', {
      type: () => Int,
      nullable: true,
      defaultValue: null,
      description: 'Number of records per page.',
    })
    perPage: number,

    @Args('sortingField', {
      nullable: true,
      description: 'Field name to sort the content list by.',
    })
    sorting_field: string,

    @Args('sortingOrder', {
      nullable: true,
      defaultValue: 'DESC',
      description: 'Sorting order: ASC or DESC.',
    })
    sorting_order: SortingOrder,
  ): Promise<any> {
    try {
      const { Contents, totalCount } =
        await this.ptContentsService.listContents(
          keyword,
          pageType,
          page,
          perPage,
          sorting_field,
          sorting_order,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        { Contents, totalCount },
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @Public()
  @Query(() => ptContentResponse, {
    name: 'adminGetContentById',
    description: 'Fetches content details by ID.',
  })
  async adminGetContentById(
    @Args('content_id', {
      description: 'Unique identifier of the content.',
    })
    content_id: string,
  ): Promise<any> {
    try {
      const content = await this.ptContentsService.getContentById(content_id);
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        content,
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @Public()
  @Query(() => ptContentResponse, {
    name: 'adminGetContentByHead',
    description: 'Fetches content details by heading.',
  })
  async adminGetContentByHead(
    @Args('content_heading', {
      description: 'Heading/title of the content.',
    })
    content_heading: string,
  ): Promise<any> {
    try {
      const content =
        await this.ptContentsService.getContentByHead(content_heading);
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        content,
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @Public()
  @Query(() => ptContentsPerPageResponse, {
    name: 'adminGetContentsByPage',
    description: 'Fetches contents for a specific page type.',
  })
  async adminGetContentsByPage(
    @Args('pageType', {
      description: 'Page type to fetch contents for.',
    })
    pageType: string,
  ): Promise<any> {
    try {
      const content =
        await this.ptContentsService.getContentsByPageType(pageType);
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        content,
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => ptContentResponse, {
    name: 'adminUpdateContent',
    description: 'Updates content details by admin.',
  })
  async adminUpdateContent(
    @Context() context,
    @Args('updateContentInput', {
      description: 'Input payload containing updated content details.',
    })
    updateContentInput: UpdateContentInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for updating content details by admin with payload: ${JSON.stringify(updateContentInput)}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const content =
        await this.ptContentsService.updateContent(updateContentInput);

      //Generating content link.
      const contentLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[23]}` +
        content.id +
        `?from=log`;

      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 152,
        admin_id: decoded?.userId,
        dynamic_values: {
          contentName: content.heading,
          contentLink,
        },
        is_admin: true,
        created_by: decoded?.userId,
      };
      await this.activityLogService.insertActivityLog(createActivityLogInput);

      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        content,
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => ptMailTemplateResponse, {
    name: 'adminGetMailTemplateById',
    description: 'Fetches mail template by ID.',
  })
  async adminGetMailTemplateById(
    @Args('mail_template_id', {
      description: 'Unique identifier of the mail template.',
    })
    mail_template_id: string,
  ): Promise<any> {
    try {
      const mail_template =
        await this.ptContentsService.getMailTemplateById(mail_template_id);
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        mail_template,
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @Public()
  @Query(() => embeddedUrlResponse, {
    name: 'convertToEmbedUrl',
    description: 'Converts video URL to embeddable link.',
  })
  async convertToEmbedUrl(
    @Args('video_url', {
      description: 'Original video URL (YouTube, Vimeo, etc.).',
    })
    video_url: string,
  ): Promise<any> {
    try {
      const embed_url =
        await this.ptContentsService.convertToEmbedUrl(video_url);
      return framedResponse(
        'SUCCESS',
        `Video embedding link generated`,
        embed_url,
      );
    } catch (error) {
      this.logger.error(
        `Errored while video url conversion with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => ptMailTemplateListResponse, {
    name: 'adminListAllMailTemplates',
    description: 'Lists all mail templates.',
  })
  async adminListAllMailTemplates(
    @Args('keyword', {
      nullable: true,
      description: 'Keyword to search mail templates.',
    })
    keyword: string,

    @Args('category', {
      nullable: true,
      description: 'Category of mail template.',
    })
    category: string,

    @Args('mailType', {
      nullable: true,
      description: 'Mail type identifier.',
    })
    mailType: string,

    @Args('page', {
      type: () => Int,
      nullable: true,
      defaultValue: null,
      description: 'Page number for pagination.',
    })
    page: number,

    @Args('perPage', {
      type: () => Int,
      nullable: true,
      defaultValue: null,
      description: 'Number of templates per page.',
    })
    perPage: number,

    @Args('sortingField', {
      nullable: true,
      description: 'Field to sort mail templates by.',
    })
    sorting_field: string,

    @Args('sortingOrder', {
      nullable: true,
      defaultValue: 'DESC',
      description: 'Sorting order: ASC or DESC.',
    })
    sorting_order: SortingOrder,
  ): Promise<any> {
    try {
      const { mailTemplates, totalCount } =
        await this.ptContentsService.listMailTemplates(
          keyword,
          category,
          mailType,
          page,
          perPage,
          sorting_field,
          sorting_order,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        { mailTemplates, totalCount },
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => ptMailTemplateResponse, {
    name: 'adminUpdateMailTemplate',
    description: 'Updates a mail template by admin.',
  })
  async adminUpdateMailTemplate(
    @Context() context,
    @Args('updateMailtemplateInput', {
      description:
        'Input payload containing updated mail template details such as subject, content, and dynamic variables.',
    })
    updateMailtemplateInput: UpdateMailTemplateInput,
  ): Promise<ptMailTemplateResponse> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const mailTemplate = await this.ptContentsService.updateMailTemplate(
        updateMailtemplateInput,
      );
      //Generating link to view inserted master type details.
      const emailTemplateLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[35]}` +
        `${mailTemplate.id}` +
        `?from=log`;

      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 153,
        admin_id: decoded?.userId,
        dynamic_values: {
          emailTemplateLink,
        },
        is_admin: true,
        created_by: decoded?.userId,
      };
      await this.activityLogService.insertActivityLog(createActivityLogInput);
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        mailTemplate,
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => ptBlogResourceResponse, {
    name: 'adminAddBlogResource',
    description: 'Adds a new blog or resource.',
  })
  async adminAddBlogResource(
    @Context() context,
    @Args('addBlogResourceInput', {
      description:
        'Input payload containing details of the blog or resource to be added.',
    })
    addBlogResourceInput: AddBlogResourceInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const newBlogResource = await this.ptContentsService.createBlogResource(
        decoded,
        addBlogResourceInput,
      );
      if (newBlogResource) {
        //Generating blog resource link.
        const blogLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[24]}` +
          newBlogResource.id +
          `?from=log`;

        const resourceLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[25]}` +
          newBlogResource.id +
          `?from=log`;

        let eventTemplateId;
        if (newBlogResource.content_type === 'Blog') {
          eventTemplateId = 169;
        } else if (
          newBlogResource.content_type === 'Resource' ||
          'howToGuide'
        ) {
          eventTemplateId = 160;
        }

        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: eventTemplateId,
          admin_id: decoded?.userId,
          dynamic_values: {
            blogName: newBlogResource.title,
            blogLink,
            resourceLink,
          },
          is_admin: true,
          created_by: decoded?.userId,
        };
        await this.activityLogService.insertActivityLog(createActivityLogInput);

        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          newBlogResource,
        );
      } else {
        throw new HttpException(
          'Failed to add new blog/resource',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Query(() => ptBlogResourceShortResponse, {
    name: 'checkBlogResourceNameExistence',
    description: 'Checks if a blog/resource name exists.',
  })
  async checkBlogResourceNameExistence(
    @Args('blog_res_name', {
      description: 'Blog or resource title to check existence.',
    })
    blog_res_name: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: blog_res_name:: ${blog_res_name}`,
      );
      const blogResDetails =
        await this.ptContentsService.getBlogResourceByName(blog_res_name);
      // this.logger.log(
      //   `Response recieved while leaving the client: ${JSON.stringify(groupDetails)}`,
      // );
      if (blogResDetails) {
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          blogResDetails,
        );
      } else {
        throw new HttpException(
          'Blog or Resource not found',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored inside the client with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => ptBlogResourceResponse, {
    name: 'adminGetBlogResourceById',
    description: 'Fetches blog/resource details by ID.',
  })
  async adminGetBlogResourceById(
    @Args('blog_id', {
      description: 'Unique identifier of the blog or resource.',
    })
    blog_id: string,
  ): Promise<any> {
    try {
      const blogResource =
        await this.ptContentsService.getBlogResourceById(blog_id);
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        blogResource,
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @Public()
  @Query(() => ptBlogWithSuggestionResponse, {
    name: 'getBlogResourceByIdSlug',
    description: 'Fetches blog/resource by slug or ID with suggestions.',
  })
  async getBlogResourceByIdSlug(
    @Args('slug_or_id', {
      description: 'Slug or unique ID of the blog/resource.',
    })
    slug_or_id: string,
  ): Promise<any> {
    try {
      const blogResource =
        await this.ptContentsService.getBlogResourceWithRecommByIdSlug(
          slug_or_id,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        blogResource,
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => ptBlogResourceListResponse, {
    name: 'adminListAllBlogResources',
    description: 'Lists all blogs/resources.',
  })
  async adminListAllBlogResources(
    @Context() context,
    @Args('listBlogResourceInput', {
      description:
        'Input parameters for listing blog resources, including filters, pagination, and sorting options',
    })
    listBlogResourceInput: ListBlogResourceInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.token || 'UTC';
      const { blogResources, totalCount } =
        await this.ptContentsService.adminlistBlogResources(
          listBlogResourceInput,
          timezone,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        { blogResources, totalCount },
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => ptBlogResAuthorsListResponse, {
    name: 'adminListAllBlogResAuthors',
    description: 'Lists all blog/resource authors.',
  })
  async adminListAllBlogResAuthors(): Promise<any> {
    try {
      const { blogResAuthors, totalCount } =
        await this.ptContentsService.adminlistBlogResAuthors();
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        { blogResAuthors, totalCount },
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @Public()
  @Query(() => ptBlogResourceListResponse, {
    name: 'listAllPublishedBlogResources',
    description: 'Lists all published blogs/resources.',
  })
  async listAllPublishedBlogResources(
    @Args('listBlogResourceInput', {
      description:
        'Input parameters for listing published blog/resources, including pagination and filters.',
    })
    listBlogResourceInput: ListBlogResourceInput,
  ): Promise<ptBlogResourceListResponse> {
    try {
      const { blogResources, totalCount } =
        await this.ptContentsService.listPublishedBlogResources(
          listBlogResourceInput,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        { blogResources, totalCount },
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @Public()
  @Query(() => ptBlogResourceCategoryWiseListResponse, {
    name: 'listAllPublishedBlogResourcesCategoryWise',
    description: 'Lists all published blogs/resources by category.',
  })
  async listAllPublishedBlogResourcesCategoryWise(
    @Args('content_type', {
      description:
        'Specifies the content type to filter published items (e.g., BLOG or RESOURCE).',
    })
    content_type: string,
  ): Promise<ptBlogResourceCategoryWiseListResponse> {
    try {
      const { blogResources, totalCount } =
        await this.ptContentsService.listPublishedBlogResourcesCategoryWise(
          content_type,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        { blogResources, totalCount },
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => ptBlogResourceResponse, {
    name: 'adminUpdateBlogResource',
    description: 'Updates a blog/resource by admin.',
  })
  async adminUpdateBlogResource(
    @Context() context,
    @Args('updateBlogResourceInput', {
      description:
        'Input payload containing updated details of a blog or resource.',
    })
    updateBlogResourceInput: UpdateBlogResourceInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const pvsStatus = (
        await this.ptContentsService.getBlogResourceById(
          updateBlogResourceInput.id,
        )
      ).blog_status;

      const blogResource = await this.ptContentsService.updateBlogResource(
        updateBlogResourceInput,
      );
      let blogLink;
      let resourceGuideLink;
      let templateId;

      //Generating blog resource link.
      switch (blogResource.content_type) {
        case 'Blog':
          {
            blogLink =
              `${process.env.LOG_BASE_URL}` +
              `${linkExtensions[24]}` +
              `${blogResource.id}` +
              `?from=log`;
          }
          break;
        case 'Resource':
          {
            resourceGuideLink =
              `${process.env.LOG_BASE_URL}` +
              `${linkExtensions[25]}` +
              `${blogResource.id}` +
              `?from=log`;
          }
          break;
      }

      if (
        updateBlogResourceInput.blog_status &&
        blogResource.blog_status !== pvsStatus &&
        updateBlogResourceInput.blog_status === 'Deleted'
      ) {
        templateId = updateBlogResourceInput.content_type == 'Blog' ? 172 : 162;

        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: templateId,
          admin_id: decoded?.userId,
          dynamic_values: {
            resourceGuideName: blogResource.title,
            blogName: blogResource.title,
            blogLink,
            resourceGuideLink,
          },
          is_admin: true,
          created_by: decoded?.userId,
        };
        await this.activityLogService.insertActivityLog(createActivityLogInput);
      } else {
        if (
          updateBlogResourceInput.blog_status &&
          blogResource.blog_status !== pvsStatus
        ) {
          if (updateBlogResourceInput.blog_status === 'Published') {
            templateId =
              updateBlogResourceInput.content_type == 'Blog' ? 171 : 163;
          } else if (updateBlogResourceInput.blog_status === 'Unpublished') {
            templateId =
              updateBlogResourceInput.content_type == 'Blog' ? 173 : 164;
          } else {
            templateId =
              updateBlogResourceInput.content_type == 'Blog' ? 170 : 161;
          }
          const createActivityLogInput: CreateActivityLogInput = {
            event_template_id: templateId,
            admin_id: decoded?.userId,
            dynamic_values: {
              resourceGuideName: blogResource.title,
              blogName: blogResource.title,
              blogLink,
              resourceGuideLink,
            },
            is_admin: true,
            created_by: decoded?.userId,
          };
          await this.activityLogService.insertActivityLog(
            createActivityLogInput,
          );
        } else {
          templateId =
            updateBlogResourceInput.content_type == 'Blog' ? 170 : 161;

          const createActivityLogInput: CreateActivityLogInput = {
            event_template_id: templateId,
            admin_id: decoded?.userId,
            dynamic_values: {
              resourceGuideName: blogResource.title,
              blogName: blogResource.title,
              blogLink,
              resourceGuideLink,
            },
            is_admin: true,
            created_by: decoded?.userId,
          };
          await this.activityLogService.insertActivityLog(
            createActivityLogInput,
          );
        }
      }

      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        blogResource,
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.PORTAL_ADMIN,
    Role.ADMIN,
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.PRIMARY_ADMIN,
  )
  @Mutation(() => ptBlogCommentsResponse, {
    name: 'addBlogComment',
    description: 'Adds a comment to a blog/resource.',
  })
  async addBlogComment(
    @Context() context,
    @Args('addBlogCommentInput', {
      description: 'Input payload containing blog or resource comment details.',
    })
    addBlogCommentInput: AddBlogCommentInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const newBlogComment = await this.ptContentsService.createBlogComment(
        decoded,
        addBlogCommentInput,
      );
      if (newBlogComment) {
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          newBlogComment,
        );
      } else {
        throw new HttpException(
          'Failed to add comment to the blog',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Mutation(() => ptBlogCommentsResponse, {
    name: 'adminManageBlogComment',
    description: 'Approves or deletes a blog comment.',
  })
  async adminmanageBlogComment(
    @Context() context,
    @Args('manageBlogCommentInput', {
      description:
        'Input payload to approve or delete a blog or resource comment.',
    })
    manageBlogCommentInput: ManageBlogCommentInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const blogComment = await this.ptContentsService.adminManageBlogComment(
        decoded,
        manageBlogCommentInput,
      );
      if (blogComment) {
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          blogComment,
        );
      } else {
        throw new HttpException(
          'Failed to approve/delete comment',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN)
  @Query(() => ptBlogCommentsListResponse, {
    name: 'adminListAllBlogComments',
    description: 'Lists all blog comments.',
  })
  async adminListAllBlogComments(
    @Context() context,
    @Args('listBlogResourceInput', {
      description:
        'Input parameters for listing blog comments, including filters, pagination, and sorting options',
    })
    listBlogCommentsInput: ListBlogCommentsInput,
  ): Promise<ptBlogCommentsListResponse> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const timezone = decoded?.token || 'UTC';
      const { blogDetails, comments, totalCount } =
        await this.ptContentsService.adminlistBlogComments(
          listBlogCommentsInput,
          timezone,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        { blogDetails, comments, totalCount },
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }
}
