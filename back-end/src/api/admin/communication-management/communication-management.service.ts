import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { CommunicationEmails } from 'src/entities/communication-emails.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { MasterTypes, categoryStatus } from 'src/entities/master-types.entity';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { FetchAllSystemEmailsInput } from './dto/fetch-all-system-emails.input';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';
import { SendSystemEmailInput } from './dto/create-communication-management.input';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
// import { EmailQueueProducer } from 'src/libs/@email-services/email-queuers/producer';
import {
  CreateCommonSettingInput,
  CreateCurrencyMasterInput,
  CreateMasterTypeInput,
} from './dto/create-master-type.input';
import {
  UpdateCommonSettingsInput,
  UpdateCurrencyMasterInput,
  UpdateMasterTypeInput,
} from './dto/update-master-type.input';
import {
  CurrencyMaster,
  currencyStatus,
} from 'src/entities/currency-master.entity';
import { EmailService } from 'src/libs/@email-services/email.service';
import { CommonSettings } from './response/pt-master-types.response';
import { settingStatus } from 'src/entities/common-settings.entity';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { SortingOrder } from '../pt-admin/dto/add-admin.dto';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { EmailTypeEnum } from 'src/entities/email-logs.entity';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class CommunicationManagementService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(CommunicationEmails)
    private communicationEmails: Repository<CommunicationEmails>,
    @InjectRepository(FileAttachments)
    private fileAttachments: Repository<FileAttachments>,
    @InjectRepository(MasterTypes)
    private masterTypes: Repository<MasterTypes>,
    @InjectRepository(CurrencyMaster)
    private currencyMaster: Repository<CurrencyMaster>,
    @InjectRepository(CommonSettings)
    private commonSettings: Repository<CommonSettings>,
    private emailServices: EmailService,
    private activityLogService: ActivityLogService,
    // private emailQueuerProducer: EmailQueueProducer,
    private emailQueueProducer: EmailQueueProducer,
    private readonly objectStorageService: ObjectStorageService,
  ) {
    this.logger = new PaytradeLogger('ADMIN_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async sendSystemEmailToTheClients(
    decoded,
    emailDetails: SendSystemEmailInput,
  ) {
    try {
      this.logger.log(
        `Handling request for sending system emails to the clients with data: ${JSON.stringify(emailDetails)}`,
      );

      const attachmentIds = emailDetails.attachmentIds;
      const createdEmail = await this.communicationEmails.create({
        ...emailDetails,
        status: 'SUCCESS',
      });
      const createdEmailResponse =
        await this.communicationEmails.save(createdEmail);
      this.logger.log(`Email successfully saved.`);

      let attachments = [];
      if (emailDetails.attachmentIds?.length) {
        for (let attachmentId of attachmentIds) {
          let attachmentDetails = await this.fileAttachments.findOne({
            where: { id: attachmentId },
            select: ['file_path', 'file_name'],
          });
          if (!attachmentDetails)
            throw `Invalid attachmentId. Cannot find any attachment with id: ${attachmentId}`;
          attachments.push({
            filePath: attachmentDetails.file_path,
            fileName: attachmentDetails.file_name,
          });
        }
      }

      delete emailDetails.attachmentIds;

      this.emailQueueProducer.emailQueueProducer({
        ...{
          toEmail: emailDetails.toEmails,
          ccMail: emailDetails.emailCcIds,
          subject: emailDetails.subject,
          mailBody: emailDetails.body,
        },
        template: 'header-footer-email',
        attachments,
        mail_type: EmailTypeEnum.communicationManagement,
      });

      // this.emailServices.sendMail({
      //   ...{
      //     toEmail: emailDetails.toEmails,
      //     ccMail: emailDetails.emailCcIds,
      //     subject: emailDetails.subject,
      //     mailBody: emailDetails.body,
      //   },
      //   template: 'header-footer-email',
      //   attachments,
      //   mail_type: EmailTypeEnum.communicationManagement,
      // });

      //Generating link to view inserted master type details.
      const emailLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[37]}` +
        `${createdEmail.id}` +
        `?from=log`;

      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: 151,
        admin_id: decoded?.userId,
        dynamic_values: {
          userMail: emailDetails.toEmails,
          emailLink,
        },
        is_admin: true,
        created_by: decoded?.userId,
      };
      await this.activityLogService.insertActivityLog(createActivityLogInput);

      return framedResponse(
        'SUCCESS',
        `Email sent successfully.`,
        createdEmailResponse,
      );
    } catch (error) {
      this.logger.error(
        `Errored while sending system email to the clients with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async fetchDetailsOfASystemEmail(communicationManagementEmailId: string) {
    try {
      this.logger.log(
        `Request received for fetching details of a system email with id: ${communicationManagementEmailId}`,
      );

      const fetchedEmailDetails = await this.communicationEmails.findOne({
        where: { id: communicationManagementEmailId },
        select: [
          'id',
          'emailFromId',
          'subject',
          'body',
          'type',
          'toEmails',
          'emailCcIds',
          'attachmentIds',
          'status',
          'created_on',
          'created_by',
        ],
      });

      const attachmentIds = fetchedEmailDetails.attachmentIds;
      let attachments = [];
      if (attachmentIds) {
        for (const attachmentId of attachmentIds) {
          const attachmentDetails = await this.fileAttachments.findOne({
            where: { id: attachmentId },
            select: [
              'id',
              'attachment_type',
              'file_name',
              // 'user_id',
              // 'company_id',
              'file_path',
              'file_type',
            ],
          });
          if (attachmentDetails && attachmentDetails.file_path) {
            try {
              const fileBuffer = await this.objectStorageService.downloadFile(attachmentDetails.file_path);
              if (fileBuffer) {
                const attachmentImage = `data: ${attachmentDetails.file_type};base64,${fileBuffer.toString('base64')}`;
                attachments.push({ ...attachmentDetails, attachmentImage });
              }
            } catch (fileError) {
              this.logger.error(`Failed to read file from storage: ${fileError.message}`);
            }
          }
        }
      }
      delete fetchedEmailDetails.attachmentIds;
      fetchedEmailDetails['attachments'] = attachments;

      this.logger.log(
        `Details of the system email successfully fetched: ${JSON.stringify(fetchedEmailDetails)}`,
      );

      return framedResponse(
        'SUCCESS',
        `Email details successfully fetched.`,
        fetchedEmailDetails,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching email details with message: ${error}`,
      );
      throw new Error(`${error}`);
    }
  }

  async fetchAllSystemEmailsSentByAdmin(
    data: FetchAllSystemEmailsInput,
    timezone,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all system emails sent by admin with data: ${JSON.stringify(data)}`,
      );

      const {
        page,
        itemsPerPage,
        emailSentDateFrom,
        emailSentDateTo,
        date_filter,
      } = data;
      const skip = itemsPerPage ? (page - 1) * itemsPerPage : (page - 1) * 10;
      const take = itemsPerPage ? itemsPerPage : 10;
      const whereConditions: any = {};

      if (date_filter && timezone) {
        let startDate, endDate;
        if (date_filter === 'Custom' && emailSentDateFrom && emailSentDateTo) {
          startDate = moment
            .tz(emailSentDateFrom, timezone)
            .startOf('day')
            .utc()
            .toDate();
          endDate = moment
            .tz(emailSentDateTo, timezone)
            .endOf('day')
            .utc()
            .toDate();
        } else if (date_filter === 'This Month') {
          startDate = moment.tz(timezone).startOf('month').utc().toDate();
          endDate = moment.tz(timezone).endOf('month').utc().toDate();
        } else if (date_filter === 'Last Month') {
          startDate = moment
            .tz(timezone)
            .subtract(1, 'month')
            .startOf('month')
            .utc()
            .toDate();
          endDate = moment
            .tz(timezone)
            .subtract(1, 'month')
            .endOf('month')
            .utc()
            .toDate();
        }
        whereConditions.created_on = Between(startDate, endDate);
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      let order_by: any = { created_on: sorting_order };

      if (data.sorting_field) {
        switch (data.sorting_field) {
          case 'created_on':
            {
              order_by = { created_on: sorting_order };
            }
            break;
          case 'subject':
            {
              order_by = { subject: sorting_order };
            }
            break;
          case 'toEmails':
            {
              order_by = { toEmails: sorting_order };
            }
            break;
        }
      }

      const [results, total_count] =
        await this.communicationEmails.findAndCount({
          where: whereConditions ? whereConditions : {},
          select: [
            'id',
            'emailFromId',
            'subject',
            'body',
            'type',
            'toEmails',
            'emailCcIds',
            'status',
            'created_on',
            'created_by',
          ],
          order: order_by,
          skip: skip,
          take: take,
        });

      const emails_list = results.map((result) => {
        return {
          id: result.id,
          emailFromId: result.emailFromId,
          subject: result.subject,
          body: result.body,
          type: result.type,
          toEmails: result.toEmails,
          emailCcIds: result.emailCcIds,
          status: result.status,
          created_on: result.created_on,
          created_by: result.created_by,
        };
      });
      this.logger.log(
        `All system emails successfully fetched with data: ${JSON.stringify(emails_list)}`,
      );
      return framedResponse(
        'SUCCESS',
        `All system emails sent by the admin were successfully fetched.`,
        { total_count, emails_list },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all system emails sent by admin with message: ${error}`,
      );
      throw new Error(`${error}`);
    }
  }

  async getMasterTypeDetails(masterType: string) {
    try {
      this.logger.log(
        `Handling request for sending master type details with type: ${masterType}`,
      );
      const masterTypes = await this.masterTypes.find({
        where: masterType
          ? { master_type: masterType, status: 'Active' }
          : { status: 'Active' },
        order: { value: 'ASC' },
      });
      if (masterTypes.length === 0) {
        throw new Error(`master type data not found`);
      } else {
        this.logger.log(`Types fetched successfully`);
        return masterTypes;
      }
    } catch (error) {
      this.logger.error(`Errored while fetching master type data ${error}`);
      throw new Error(error);
    }
  }

  //new service with pagination
  async getMasterTypesDetails(
    masterType: string,
    keyword: string,
    status: categoryStatus | null,
    page: number,
    perPage: number,
    sorting_field: string,
    sorting_order: SortingOrder | 'ASC',
  ): Promise<{ MasterTypeDetails: any[]; totalCount: number }> {
    try {
      this.logger.log(
        `Handling request for sending master type details with type: ${masterType}`,
      );
      const queryBuilder = this.masterTypes.createQueryBuilder('master');

      if (
        !sorting_order ||
        sorting_order.trim() === '' ||
        !sorting_order.includes(sorting_order as SortingOrder)
      ) {
        sorting_order = 'ASC';
      }

      if (masterType) {
        queryBuilder.andWhere('master.master_type = :masterType', {
          masterType,
        });
      }

      if (status) {
        queryBuilder.andWhere('master.status = :status', { status });
      }

      if (keyword) {
        queryBuilder.andWhere(`(LOWER(master.value) LIKE :keyword)`, {
          keyword: `%${keyword.toLowerCase()}%`,
        });
      }

      if (!sorting_field) {
        queryBuilder.orderBy(
          `LOWER(master.value)`,
          sorting_order as 'ASC' | 'DESC',
        );
      }
      if (sorting_field) {
        switch (sorting_field) {
          case 'master_type':
            {
              queryBuilder.orderBy(
                `LOWER(master.master_type)`,
                sorting_order as 'ASC' | 'DESC',
              );
            }
            break;
          case 'status':
            {
              queryBuilder.orderBy({ 'master.status': sorting_order });
            }
            break;
          case 'value':
            {
              queryBuilder.orderBy(
                `LOWER(master.value)`,
                sorting_order as 'ASC' | 'DESC',
              );
            }
            break;
          case 'description':
            {
              queryBuilder.orderBy(
                `LOWER(master.description)`,
                sorting_order as 'ASC' | 'DESC',
              );
            }
            break;
        }
      }

      const [allMasterTypeDetails, totalCount] = await Promise.all([
        queryBuilder.getMany(),
        queryBuilder.getCount(),
      ]);

      const page_number = page;
      const items_per_page = perPage;

      const startIndex =
        page_number && items_per_page ? (page_number - 1) * items_per_page : 0;
      const endIndex =
        page_number && items_per_page
          ? Math.min(
              (page_number - 1) * items_per_page + items_per_page,
              totalCount,
            )
          : totalCount;
      // Slice the results array to get the results for the current page
      const MasterTypeDetails = allMasterTypeDetails?.slice(
        startIndex,
        endIndex,
      );

      return { MasterTypeDetails, totalCount };
    } catch (error) {
      this.logger.error(`Errored while fetching master type data ${error}`);
      throw new Error(error);
    }
  }

  async getMasters() {
    try {
      this.logger.log(`Handling request for sending master`);

      const masterTypes = await this.masterTypes
        .createQueryBuilder('masterTypes')
        .select('DISTINCT masterTypes.master_type', 'master_type')
        .where('masterTypes.status = :status', { status: 'Active' })
        .orderBy({ 'masterTypes.master_type': 'ASC' })
        .getRawMany();

      if (masterTypes.length === 0) {
        throw new Error(`master type data not found`);
      } else {
        this.logger.log(`Types fetched successfully`);
        const masters = masterTypes.map(({ master_type }) => master_type);
        return masters;
      }
    } catch (error) {
      this.logger.error(`Errored while fetching master type data ${error}`);
      throw new Error(error);
    }
  }

  async getCategoryByName(master_type: string, category: string) {
    try {
      this.logger.log(
        `Handling request for checking the category existance :category : ${category}`,
      );
      const masterCategory = await this.masterTypes.findOne({
        where: { master_type: master_type, value: category },
      });
      if (!masterCategory) {
        throw new NotFoundException(
          `category not found in the given master-type`,
        );
      } else {
        this.logger.log(`Category already exists`);
        return masterCategory;
      }
    } catch (error) {
      this.logger.error(`Errored while fetching category data ${error}`);
      throw new Error(error);
    }
  }

  async getMasterTypebyId(id: string) {
    try {
      this.logger.log(
        `Handling request for getting a category by ID :id : ${id}`,
      );
      const masterCategory = await this.masterTypes.findOne({
        where: { id: id },
      });
      if (!masterCategory) {
        throw new NotFoundException(
          `category not found in the given master-type`,
        );
      } else {
        this.logger.log(`Category already exists`);
        return masterCategory;
      }
    } catch (error) {
      this.logger.error(`Errored while fetching category data ${error}`);
      throw new Error(error);
    }
  }

  async adminAddMasterTypes(masterTypeInput: CreateMasterTypeInput) {
    try {
      this.logger.log(
        `Handling request for adding new master type details: ${masterTypeInput}`,
      );

      const NameCheckMasterType = await this.masterTypes.findOne({
        where: {
          master_type: masterTypeInput.master_type,
          value: masterTypeInput.value,
        },
      });

      if (NameCheckMasterType) {
        throw new Error('Category type already exists');
      } else {
        const masterType = this.masterTypes.create(masterTypeInput);
        this.logger.log(`new master category created successfully`);
        return await this.masterTypes.save(masterType);
      }
    } catch (error) {
      this.logger.error(`Errored while adding master type data ${error}`);
      throw new Error(error);
    }
  }

  async adminUpdateMasterTypes(masterTypeUpdate: UpdateMasterTypeInput) {
    try {
      this.logger.log(
        `Handling request for update master type details: ${masterTypeUpdate}`,
      );

      const masterType = await this.masterTypes.findOne({
        where: { id: masterTypeUpdate.id },
      });

      if (!masterType) {
        throw new NotFoundException(`Master Category not found`);
      }

      const updatedmasterType = { ...masterType, ...masterTypeUpdate };
      updatedmasterType.master_type =
        masterTypeUpdate.master_type || masterType.master_type;
      updatedmasterType.value = masterTypeUpdate.value || masterType.value;
      updatedmasterType.description =
        masterTypeUpdate.description || masterType.description;
      updatedmasterType.status = masterTypeUpdate.status || masterType.status;

      this.logger.log(`master category updated successfully`);
      return await this.masterTypes.save(updatedmasterType);
    } catch (error) {
      this.logger.error(`Errored while fetching master type data ${error}`);
      throw new Error(error);
    }
  }

  async adminAddCurrencyMaster(currencyMasterInput: CreateCurrencyMasterInput) {
    try {
      this.logger.log(
        `Handling request for adding new master type details: ${currencyMasterInput}`,
      );
      const currencyMaster = this.currencyMaster.create(currencyMasterInput);
      this.logger.log(`new currency master created successfully`);
      return await this.currencyMaster.save(currencyMaster);
    } catch (error) {
      this.logger.error(`Errored while adding currency master data ${error}`);
      throw new Error(error);
    }
  }

  async getCurrencyMasterList(
    keyword: string,
    status: currencyStatus | null,
    page: number,
    perPage: number,
    sorting_field: string,
    sorting_order: SortingOrder | 'DESC',
  ): Promise<{ currencyMasters: any[]; totalCount: number }> {
    try {
      this.logger.log(`Handling request for sending all the currency details`);
      const queryBuilder = this.currencyMaster.createQueryBuilder('currency');

      if (status) {
        queryBuilder.andWhere('currency.status = :status', { status });
      }

      if (keyword) {
        queryBuilder.andWhere(`(LOWER(currency.currency_name) LIKE :keyword)`, {
          keyword: `%${keyword.toLowerCase()}%`,
        });
      }

      if (!sorting_field) {
        queryBuilder.orderBy({ 'currency.created_on': sorting_order });
      }
      if (sorting_field) {
        switch (sorting_field) {
          case 'currency_name':
            {
              queryBuilder.orderBy({
                'LOWER(currency.currency_name)': sorting_order,
              });
            }
            break;
          case 'short_code':
            {
              queryBuilder.orderBy({
                'LOWER(currency.short_code)': sorting_order,
              });
            }
            break;
          case 'symbol':
            {
              queryBuilder.orderBy('LOWER(currency.symbol)', sorting_order);
            }
            break;
          case 'status':
            {
              queryBuilder.orderBy({
                'LOWER(CAST(currency.status AS text))': sorting_order,
              });
            }
            break;
        }
      }

      const [allCurrencyMasters, totalCount] = await Promise.all([
        queryBuilder.getMany(),
        queryBuilder.getCount(),
      ]);

      const page_number = page;
      const items_per_page = perPage;

      const startIndex =
        page_number && items_per_page ? (page_number - 1) * items_per_page : 0;
      const endIndex =
        page_number && items_per_page
          ? Math.min(
              (page_number - 1) * items_per_page + items_per_page,
              totalCount,
            )
          : totalCount;
      // Slice the results array to get the results for the current page
      const currencyMasters = allCurrencyMasters?.slice(startIndex, endIndex);

      return { currencyMasters, totalCount };
    } catch (error) {
      this.logger.error(`Errored while fetching master type data ${error}`);
      throw new Error(error);
    }
  }

  async adminUpdateCurrencyMasters(
    currencyMasterUpdate: UpdateCurrencyMasterInput,
  ) {
    try {
      this.logger.log(
        `Handling request for update master type details: ${currencyMasterUpdate}`,
      );

      const currencyMaster = await this.currencyMaster.findOne({
        where: { id: currencyMasterUpdate.id },
      });

      if (!currencyMaster) {
        throw new NotFoundException(`Master Category not found`);
      }

      const updatedCUrrencyMaster = {
        ...currencyMaster,
        ...currencyMasterUpdate,
      };
      updatedCUrrencyMaster.currency_name =
        currencyMasterUpdate.currency_name || currencyMaster.currency_name;
      updatedCUrrencyMaster.short_code =
        currencyMasterUpdate.short_code || currencyMaster.short_code;
      updatedCUrrencyMaster.symbol =
        currencyMasterUpdate.symbol || currencyMaster.symbol;
      updatedCUrrencyMaster.status =
        currencyMasterUpdate.status || currencyMaster.status;

      this.logger.log(`master category updated successfully`);
      return await this.currencyMaster.save(updatedCUrrencyMaster);
    } catch (error) {
      this.logger.error(`Errored while fetching master type data ${error}`);
      throw new Error(error);
    }
  }

  async getCurrencyMasterbyId(id: string) {
    try {
      this.logger.log(
        `Handling request for getting a currency by ID :id : ${id}`,
      );
      const CurrencyMaster = await this.currencyMaster.findOne({
        where: { id: id },
      });
      if (!CurrencyMaster) {
        throw new NotFoundException(`currency not found.`);
      } else {
        this.logger.log(`Currency details fetched`);
        return CurrencyMaster;
      }
    } catch (error) {
      this.logger.error(`Errored while fetching currency data ${error}`);
      throw new Error(error);
    }
  }

  async checkCurrencyName(currency: string) {
    try {
      this.logger.log(
        `Handling request for getting a currency by name: currency : ${currency}`,
      );
      const NameCheckCurrencyMaster = await this.currencyMaster.findOne({
        where: { currency_name: currency },
      });

      if (!NameCheckCurrencyMaster) {
        throw new NotFoundException(`currency not found.`);
      } else {
        this.logger.log(`Currency name already exists`);
        return NameCheckCurrencyMaster;
      }
    } catch (error) {
      this.logger.error(`Errored while fetching currency data ${error}`);
      throw new Error(error);
    }
  }

  async checkCurrencyCode(currency_code: string) {
    try {
      this.logger.log(
        `Handling request for getting a currency by name: currency : ${currency_code}`,
      );
      const NameCheckCurrencyMaster = await this.currencyMaster.findOne({
        where: { short_code: currency_code },
      });

      if (!NameCheckCurrencyMaster) {
        throw new NotFoundException(`currency not found.`);
      } else {
        this.logger.log(`Currency name already exists`);
        return NameCheckCurrencyMaster;
      }
    } catch (error) {
      this.logger.error(`Errored while fetching currency data ${error}`);
      throw new Error(error);
    }
  }

  async adminAddCommonSettings(commonSettingInput: CreateCommonSettingInput) {
    try {
      this.logger.log(
        `Handling request for adding settings details: ${commonSettingInput}`,
      );
      const commonSetting = this.commonSettings.create(commonSettingInput);
      this.logger.log(`new default setting created successfully`);
      return await this.commonSettings.save(commonSetting);
    } catch (error) {
      this.logger.error(`Errored while adding settings data ${error}`);
      throw new Error(error);
    }
  }

  async adminUpdateCommonSettings(
    commonSettingUpdate: UpdateCommonSettingsInput,
  ) {
    try {
      this.logger.log(
        `Handling request for update settings details: ${commonSettingUpdate}`,
      );

      const commonSetting = await this.commonSettings.findOne({
        where: { id: commonSettingUpdate.id },
      });

      if (!commonSetting) {
        throw new NotFoundException(`Setting not found`);
      }

      const updatedCommonSetting = {
        ...commonSetting,
        ...commonSettingUpdate,
      };
      updatedCommonSetting.setting_name =
        commonSettingUpdate.setting_name || commonSetting.setting_name;
      updatedCommonSetting.setting_option =
        commonSettingUpdate.setting_option || commonSetting.setting_option;
      updatedCommonSetting.status =
        commonSettingUpdate.status || commonSetting.status;

      this.logger.log(`settings updated successfully`);
      return await this.commonSettings.save(updatedCommonSetting);
    } catch (error) {
      this.logger.error(`Errored while editing settings data ${error}`);
      throw new Error(error);
    }
  }

  async getCommonSettingsList(
    keyword: string,
    status: settingStatus | null,
    skip: number,
    take: number,
  ): Promise<{ commonSettings: any[]; totalCount: number }> {
    try {
      this.logger.log(`Handling request for sending all the settings details`);
      const queryBuilder = this.commonSettings.createQueryBuilder('settings');

      if (status) {
        queryBuilder.andWhere('settings.status = :status', { status });
      }

      if (keyword) {
        queryBuilder.andWhere(`(LOWER(settings.setting_name) LIKE :keyword)`, {
          keyword: `%${keyword.toLowerCase()}%`,
        });
      }

      const [commonSettings, totalCount] = await Promise.all([
        queryBuilder
          .orderBy({ created_on: 'DESC' })
          .skip(skip)
          .take(take)
          .getMany(),
        queryBuilder.getCount(),
      ]);

      return { commonSettings, totalCount };
    } catch (error) {
      this.logger.error(`Errored while fetching settings data ${error}`);
      throw new Error(error);
    }
  }

  async getCommonSettingsbyId(id: string) {
    try {
      this.logger.log(
        `Handling request for getting a setting by ID :id : ${id}`,
      );
      const CommonSettings = await this.commonSettings.findOne({
        where: { id: id },
      });
      if (!CommonSettings) {
        throw new NotFoundException(`settings not found.`);
      } else {
        this.logger.log(`setting details fetched`);
        return CommonSettings;
      }
    } catch (error) {
      this.logger.error(`Errored while fetching settings data ${error}`);
      throw new Error(error);
    }
  }

  async checkSettingName(settingName: string) {
    try {
      this.logger.log(
        `Handling request for getting a setting name : ${settingName}`,
      );
      const CommonSettings = await this.commonSettings.findOne({
        where: { setting_name: settingName },
      });
      if (!CommonSettings) {
        throw new NotFoundException(`settings not found.`);
      } else {
        this.logger.log(`setting details fetched`);
        return CommonSettings;
      }
    } catch (error) {
      this.logger.error(`Errored while fetching settings data ${error}`);
      throw new Error(error);
    }
  }
}
