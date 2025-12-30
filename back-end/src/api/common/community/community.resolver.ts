import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { CommunityService } from './community.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import {
  discussionIdeaResponse,
  discussionIdeaShortResponse,
  discussionIdeaTextResponse,
  listAnsCommentsResponse,
} from './response/discussion-idea.response';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import {
  AddDiscussionIdeaInput,
  UpdateDiscussionIdeaInput,
} from './dto/discussion-idea.dto';
import { answerCommentResponse } from './response/answer-comment.response';
import {
  AddAnswerCommentInput,
  UpdateAnswerCommentInput,
} from './dto/answer-comment.dto';
import { VoteLikeFlagInput } from './dto/vote-like-flag.dto';
import { voteLikeFlagResponse } from './response/vote-like-flag.response';
import { EmailService } from 'src/libs/@email-services/email.service';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';
import {
  categoriesListResponse,
  discussionIdeaListResponse,
  likeVoteFlagListResponse,
} from './response/list-disc-idea.response';
import {
  getAnsCommentInput,
  ListCommunityFlagsInput,
  ListDiscussionIdeaInput,
} from './dto/list-discussion-idea.dto';
import { cmtyType } from 'src/entities/cmty-discussion-idea.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { EmailTypeEnum } from 'src/entities/email-logs.entity';

@Resolver()
export class CommunityResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly emailServices: EmailService,
    private readonly communityService: CommunityService,
    // private activityLogService: ActivityLogService,
    private emailQueueProducer: EmailQueueProducer,
  ) {
    this.logger = new PaytradeLogger('ADMIN_RESOLVER');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @Public()
  @Query(() => discussionIdeaListResponse, {
    name: 'listAllDiscussionIdeas',
    description: 'Retrieve list of all discussion ideas.',
  })
  async listAllDiscussionIdeas(
    @Args('listDiscussionIdeasInput', {
      description:
        'Input parameters for listing discussion ideas, including filters, sorting, and pagination options.',
    })
    listDiscussionIdeasInput: ListDiscussionIdeaInput,
  ): Promise<discussionIdeaListResponse> {
    try {
      const { discussionIdeas, totalCount } =
        await this.communityService.listAllDiscussionIdeas(
          listDiscussionIdeasInput,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        { discussionIdeas, totalCount },
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking the user existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @Public()
  @Query(() => discussionIdeaResponse, {
    name: 'getDiscussionIdea',
    description: 'Fetch the complete details of a specific discussion idea.',
  })
  async getDiscussionIdea(
    @Context() context,
    @Args('id', {
      description: 'Unique identifier of the discussion idea to be retrieved.',
    })
    id: string,
  ): Promise<any> {
    try {
      const decoded =
        (await this.jwtInternalService.decodeJwtToken(context)) || null;

      const discussionIdea = await this.communityService.getDiscussionIdea(
        decoded,
        id,
      );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        discussionIdea,
      );
    } catch (error) {
      this.logger.error(`Errored while getting  message: ${error.message}`);
      return framedResponse('ERROR', error.message);
    }
  }

  @Public()
  @Query(() => listAnsCommentsResponse, {
    name: 'listAnswerComments',
    description:
      'Fetch all answers and comments for a specific discussion idea.',
  })
  async listAnswerComments(
    @Context() context,
    @Args('listAnsCmtInput', {
      description:
        'Input payload containing discussion idea ID, pagination, and filters to retrieve answers and comments.',
    })
    listAnsCmtInput: getAnsCommentInput,
  ): Promise<any> {
    try {
      const decoded =
        (await this.jwtInternalService.decodeJwtToken(context)) || null;

      const commentList = await this.communityService.listAnswerComments(
        decoded,
        listAnsCmtInput,
      );

      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        commentList,
      );
    } catch (error) {
      this.logger.error(`Errored while getting  message: ${error.message}`);
      return framedResponse('ERROR', error.message);
    }
  }

  @Public()
  @Query(() => categoriesListResponse, {
    name: 'getCategoryWiseDiscIdeaCount',
    description:
      'Fetch the total count of discussions and ideas categorized by content type.',
  })
  async getCategoryWiseDiscIdeaCount(
    @Args('content_type', {
      description:
        'Type of content for which discussion and idea counts are requested.',
    })
    content_type: cmtyType,
  ): Promise<any> {
    try {
      const discussionIdea =
        await this.communityService.getCategoryWiseCount(content_type);
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        discussionIdea,
      );
    } catch (error) {
      this.logger.error(`Errored while getting  message: ${error.message}`);
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.PORTAL_ADMIN,
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.PRIMARY_ADMIN,
  )
  @Mutation(() => discussionIdeaShortResponse, {
    name: 'addDiscussionIdea',
    description:
      'Create a new discussion or idea and notify administrators via email if configured.',
  })
  async AddDiscussionIdea(
    @Context() context,
    @Args('addDiscussionIdeaInput', {
      description:
        'Input payload containing title, description, category, and metadata required to create a new discussion or idea.',
    })
    addDiscussionIdeaInput: AddDiscussionIdeaInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const newDiscussionIdea = await this.communityService.create(
        decoded,
        addDiscussionIdeaInput,
      );
      if (newDiscussionIdea) {
        const mailTemplate =
          await this.communityService.getMailTemplateByMailType(
            'new-idea-discussion',
          );

        if (!mailTemplate) {
          this.logger.error(
            `Mail template not found for type: new-idea-discussion`,
          );
          return;
        }

        const Keys = mailTemplate.selected_dynamic || [];
        const dynamicData: { [key: string]: any } = {};

        Keys.forEach((key) => {
          dynamicData[key] = newDiscussionIdea[key];
        });

        const mailbody = await this.replaceVariables(
          mailTemplate.email_content,
          dynamicData,
        );

        const mailDetails = {
          toEmail: process.env.COMMUNITY_EMAIL,
          subject: mailTemplate.email_subject,
          template: 'header-footer-email',
          mailBody: mailbody,
          mail_type: EmailTypeEnum.newIdeaDiscussion,
        };

        this.emailQueueProducer.emailQueueProducer(mailDetails);
        // this.emailServices.sendMail(mailDetails);
        this.logger.log(`Email sent successfully`);

        return framedResponse(
          'SUCCESS',
          `New discussion / idea added.`,
          newDiscussionIdea,
        );
      } else {
        throw new HttpException(
          'Failed to add new content',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      this.logger.error(
        `Errored while adding a new disc / idea: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @Public()
  @Mutation(() => discussionIdeaTextResponse, {
    name: 'viewCountUpdateDiscussionIdea',
    description:
      'Increment the view count of a discussion idea to track engagement.',
  })
  async viewCountUpdateDiscussionIdea(
    @Args('id', {
      description:
        'Unique identifier of the discussion idea whose view count will be incremented.',
    })
    id: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for updating content view count details with payload: ${JSON.stringify(id)}`,
      );

      await this.communityService.viewCountUpdateDiscussionIdea(id);

      return framedResponse('SUCCESS', `Discussion / Idea view count updated`);
    } catch (error) {
      this.logger.error(
        `Errored while checking the idea-discussion existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.PORTAL_ADMIN,
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.PRIMARY_ADMIN,
  )
  @Mutation(() => discussionIdeaShortResponse, {
    name: 'updateDiscussionIdeaInput',
    description:
      'Update the content and metadata of an existing discussion idea.',
  })
  async UpdateDiscussionIdeaInput(
    @Context() context,
    @Args('updateContentInput', {
      description:
        'Input payload containing updated content, metadata, and identifiers for an existing discussion or idea.',
    })
    updateDiscussionIdeaInput: UpdateDiscussionIdeaInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for updating content details with payload: ${JSON.stringify(updateDiscussionIdeaInput)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const content = await this.communityService.updateDiscussionIdea(
        decoded,
        updateDiscussionIdeaInput,
      );

      return framedResponse('SUCCESS', `Discussion / Idea updated`, content);
    } catch (error) {
      this.logger.error(
        `Errored while checking the idea-discussion existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RESTRICTED_PORTAL_ADMIN, Role.PORTAL_ADMIN, Role.PRIMARY_ADMIN)
  @Query(() => likeVoteFlagListResponse, {
    name: 'AdminListCommunityFlags',
    description:
      'Retrieve a list of community content that has been flagged for moderation.',
  })
  async AdminListCommunityFlags(
    @Context() context,
    @Args('listCommunityFlagsInput', {
      description:
        'Input parameters for listing community flags, including filters, pagination, and sorting options',
    })
    listCommunityFlagsInput: ListCommunityFlagsInput,
  ): Promise<any> {
    try {
      const decoded =
        (await this.jwtInternalService.decodeJwtToken(context)) || null;

      const { flagsList, total_count } =
        await this.communityService.adminListCommunityFlags(
          decoded,
          listCommunityFlagsInput,
        );

      const flagListwithCount = { flagsList, total_count };

      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        flagListwithCount,
      );
    } catch (error) {
      this.logger.error(`Errored while getting  message: ${error.message}`);
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.PORTAL_ADMIN,
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.PRIMARY_ADMIN,
  )
  @Mutation(() => answerCommentResponse, {
    name: 'addAnswerComment',
    description:
      'Post a new answer or comment to a discussion idea and notify relevant participants.',
  })
  async AddAnswerComment(
    @Context() context,
    @Args('addAnswerCommentInput', {
      description:
        'Input payload containing discussion idea ID, content, and metadata to add a new answer or comment.',
    })
    addAnswerCommentInput: AddAnswerCommentInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const newAnswerComment = await this.communityService.addAnswerComment(
        decoded,
        addAnswerCommentInput,
      );

      if (newAnswerComment.mail_ids.length) {
        await this.sendCommunityMail(
          'comments - discussionIdea mail - detailed',
          newAnswerComment.mail_ids,
          newAnswerComment,
        );
      }

      if (
        newAnswerComment.discIdea_owner_mail &&
        newAnswerComment?.isCommunityEmailEnabled
      ) {
        await this.sendCommunityMail(
          'community - new response',
          newAnswerComment.discIdea_owner_mail,
          newAnswerComment,
        );
      }

      if (newAnswerComment) {
        return framedResponse(
          'SUCCESS',
          `New answer/comment added`,
          newAnswerComment,
        );
      } else {
        throw new HttpException(
          'Failed to add new comment',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      this.logger.error(
        `Errored while adding new comment/answer with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  async sendCommunityMail(
    mailType: string,
    recipient: string | string[],
    data: any,
  ) {
    const mailTemplate =
      await this.communityService.getMailTemplateByMailType(mailType);

    if (!mailTemplate) {
      this.logger.error(`Mail template not found for type: ${mailType}`);
      return;
    }

    const Keys = mailTemplate.selected_dynamic || [];
    const dynamicData: { [key: string]: any } = {};

    Keys.forEach((key) => {
      dynamicData[key] = data[key];
    });

    const mailbody = await this.replaceVariables(
      mailTemplate.email_content,
      dynamicData,
    );

    const mailTypeObj = {
      'comments - discussionIdea mail - detailed':
        EmailTypeEnum.discussionIdeaDetail,
      'community - new response': EmailTypeEnum.newResponse,
    };

    const mailDetails = {
      toEmail: Array.isArray(recipient) ? recipient : [recipient],
      subject: mailTemplate.email_subject,
      template: 'header-footer-email',
      mailBody: mailbody,
      mail_type: mailTypeObj?.[mailType],
    };

    this.emailQueueProducer.emailQueueProducer(mailDetails);
    // this.emailServices.sendMail(mailDetails);
    this.logger.log(`Email sent successfully to ${recipient}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.PORTAL_ADMIN,
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.PRIMARY_ADMIN,
  )
  @Mutation(() => answerCommentResponse, {
    name: 'updateAnswerComment',
    description:
      'Modify an existing answer or comment within a discussion idea.',
  })
  async UpdateAnswerComment(
    @Context() context,
    @Args('updateAnswerCommentInput', {
      description:
        'Input payload containing updated text and identifiers for an existing answer or comment.',
    })
    updateAnswerCommentInput: UpdateAnswerCommentInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for updating answer / comment details with payload: ${JSON.stringify(updateAnswerCommentInput)}`,
      );

      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const answerComment = await this.communityService.updateAnswerComment(
        decoded,
        updateAnswerCommentInput,
      );

      return framedResponse(
        'SUCCESS',
        `Discussion / Idea updated`,
        answerComment,
      );
    } catch (error) {
      this.logger.error(
        `Errored while checking the answer-comment existence with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.RESTRICTED_PORTAL_ADMIN,
    Role.PORTAL_ADMIN,
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.PRIMARY_ADMIN,
  )
  @Mutation(() => voteLikeFlagResponse, {
    name: 'AddUpdateVoteLikeFlag',
    description:
      'Add or update a vote, like, or flag for a discussion idea or comment.',
  })
  async AddUpdateVoteLikeFlag(
    @Context() context,
    @Args('voteLikeFlagInput', {
      description:
        'Input payload specifying the target entity, reaction type (vote, like, or flag), and action to be performed.',
    })
    voteLikeFlagInput: VoteLikeFlagInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const newVoteLikeFlag = await this.communityService.addUpdateVoteLikeFlag(
        decoded,
        voteLikeFlagInput,
      );

      if (newVoteLikeFlag) {
        return framedResponse(
          'SUCCESS',
          `vote/like/Flag recorded`,
          newVoteLikeFlag,
        );
      } else {
        throw new HttpException('Failed to react', HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      this.logger.error(
        `Errored while reacting to a discussion or idea with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  async replaceVariables(template: string, variables: Record<string, string>) {
    return new Promise(async (resolve, reject) => {
      let result = template;
      if (Object.keys(result).length !== 0) {
        for (const [key, value] of Object.entries(variables)) {
          result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
      }
      resolve(result);
    });
  }
}
