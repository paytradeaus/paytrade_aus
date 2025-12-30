import { Args, Context, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PtFaqService } from './pt-faq.service';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { UseGuards } from '@nestjs/common';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { AddFaQInput } from './dto/add-faq.dto';
import { ptFaQResponse } from './response/faq.response';
import { ptFaQListResponse } from './response/faq-list.response';
import { UpdateFaQInput } from './dto/update-faq.dto ';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';
import { UpdateOrderInput } from './dto/update-order.dto';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { StringResponse } from 'src/api/users/signup/response/auth.response';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';

@Resolver()
export class PtFaqResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly ptFaqService: PtFaqService,
    private readonly jwtInternalService: JwtInternalService,
    private activityLogService: ActivityLogService,
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
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Mutation(() => ptFaQResponse, {
    name: 'adminAddFAQ',
    description: 'Adds a new FAQ by admin.',
  })
  async adminAddFAQ(
    @Context() context,
    @Args('addFaQInput', {
      description:
        'Input payload containing FAQ details such as question, answer, category, status, and visibility settings.',
    })
    addFaQInput: AddFaQInput,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for adding a new FAQ with payload: ${addFaQInput}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const newFaQ = await this.ptFaqService.create(addFaQInput);
      if (newFaQ) {
        //Generating blog resource link.
        const faqLink =
          `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[34]}` +
          newFaQ.id +
          '?mode=edit' +
          `&from=log`;

        const createActivityLogInput: CreateActivityLogInput = {
          event_template_id: 165,
          admin_id: decoded?.userId,
          dynamic_values: {
            // faqCategoryName: newFaQ.question,
            faqLink,
          },
          is_admin: true,
          created_by: decoded?.userId,
        };
        await this.activityLogService.insertActivityLog(createActivityLogInput);
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          newFaQ,
        );
      } else {
        throw new Error(`Add FAQ failed`);
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

  @Public()
  @Query(() => ptFaQListResponse, {
    name: 'adminListAllFaq',
    description: 'Lists all FAQs.',
  })
  async adminListAllFaq(
    @Args('keyword', {
      nullable: true,
      description: 'Search keyword to filter FAQs by question or answer text.',
    })
    keyword: string,

    @Args('category', {
      nullable: true,
      description: 'Category name to filter FAQs.',
    })
    category: string,

    @Args('faqstatus', {
      nullable: true,
      description: 'Status of the FAQ (e.g., Active, Inactive).',
    })
    faqstatus: string,

    @Args('show_in_home', {
      nullable: true,
      description:
        'Flag to filter FAQs that are marked to be shown on the home page.',
    })
    show_in_home: boolean,

    @Args('page', {
      type: () => Int,
      defaultValue: null,
      nullable: true,
      description: 'Page number for pagination.',
    })
    page: number,

    @Args('perPage', {
      type: () => Int,
      defaultValue: null,
      nullable: true,
      description: 'Number of FAQs to be returned per page.',
    })
    perPage: number,
  ): Promise<any> {
    try {
      this.logger.log(`Request received for listing all FAQs`);
      const skip = (page - 1) * perPage;
      const take = perPage;
      const { FAQs, totalCount, showInHomeCount } =
        await this.ptFaqService.listFAQs(
          keyword,
          category,
          faqstatus,
          show_in_home,
          skip,
          take,
        );
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        { FAQs, totalCount, showInHomeCount },
      );
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
  @Query(() => ptFaQResponse, {
    name: 'adminGetFaqById',
    description: 'Fetches FAQ details by ID.',
  })
  async adminGetFaqById(
    @Args('faq_id', {
      description: 'Unique identifier of the FAQ to be retrieved.',
    })
    faq_id: string,
  ): Promise<any> {
    try {
      const faq = await this.ptFaqService.getFAQbyId(faq_id);
      return framedResponse(
        'SUCCESS',
        `Response successfully sent back to the client`,
        faq,
      );
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
  @Mutation(() => ptFaQResponse, {
    name: 'adminUpdateFaq',
    description: 'Updates or deletes an FAQ by admin.',
  })
  async adminUpdateFaq(
    @Context() context,
    @Args('updateFaqInput', {
      description:
        'Input payload containing updated FAQ details, including status changes or category updates.',
    })
    updateFaqInput: UpdateFaQInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const faq = await this.ptFaqService.updateFAQ(updateFaqInput);
      let responseMessage = '';
      let templateId, action;
      if (faq.faq_status === 'Deleted') {
        templateId = 166;
        action = 'Deleted';
        responseMessage = 'FAQ has been successfully deleted.';
      } else {
        if (
          updateFaqInput.faq_status === 'Active' &&
          !updateFaqInput.categoryId
        ) {
          templateId = 167;
          action = 'Active';
        } else if (
          updateFaqInput.faq_status === 'Inactive' &&
          !updateFaqInput.categoryId
        ) {
          templateId = 167;
          action = 'Inactive';
        } else {
          templateId = 166;
          action = 'Edited';
        }
        responseMessage = 'FAQ has been successfully updated.';
      }
      //Generating blog resource link.
      const faqLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[34]}` +
        faq.id +
        '?mode=edit' +
        `&from=log`;

      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: templateId,
        admin_id: decoded?.userId,
        dynamic_values: {
          action: action,
          faqCategoryName: faq.category.value,
          faqLink,
        },
        is_admin: true,
        created_by: decoded?.userId,
      };
      await this.activityLogService.insertActivityLog(createActivityLogInput);
      return framedResponse('SUCCESS', responseMessage, faq);
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
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'adminUpdateFAQOrder',
    description: 'Updates the display order of FAQs.',
  })
  async adminUpdateFaqOrder(
    @Context() context,
    @Args('updateOrderInput', {
      description: 'Input payload specifying the new display order for FAQs.',
    })
    updateOrderInput: UpdateOrderInput,
  ): Promise<any> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);

      const updateOrder =
        await this.ptFaqService.updateFAQOrder(updateOrderInput);
      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 168,
        admin_id: decoded?.userId,
        is_admin: true,
        created_by: decoded?.userId,
      };
      await this.activityLogService.insertActivityLog(createActivityLogInput);
      return framedResponse('SUCCESS', `Order of the FAQs updated`);
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
}
