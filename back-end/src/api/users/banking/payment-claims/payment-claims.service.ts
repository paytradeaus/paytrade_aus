import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BankAccounts,
  PaymentClaimInvoices,
  PaymentClaims,
} from 'src/entities/banking.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { Repository, EntityManager, In, Not } from 'typeorm';
import {
  AddPaymentClaimInput,
  ChangeStatusOfAPaymentClaimInput,
  CheckCompletionStatusOfAssociatedRetentionClaimsInput,
  EditDetailsOfAPaymentClaimInput,
  FetchAllPaymentClaimsOfACompanyInput,
  FetchAutoPopulatableFieldsOfARetentionClaimInput,
  FetchDetailsOfAPaymentClaimInput,
  FetchPaymentToAccountListOfSelectedSupplierInput,
  FetchSubContractorClaimsInput,
  GenerateS75NoticeInput,
} from './payment-claims.input';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { ContractDetails } from 'src/entities/contract-details.entity';
import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import { PaymentDetails } from 'src/entities/payment-details.entity';
import { RetentionDetails } from 'src/entities/retention-details.entity';
import { StatusService } from '../ui-status.service';
import { VariationDetails } from 'src/entities/variation-details.entity';
import { JournalEntries } from 'src/entities/journal-entries.entity';
import { JournalType } from 'src/entities/journal-type.entity';
import { AddJournalInput } from '../journals/journals.input';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { SubPayments } from 'src/entities/sub-payments.entity';
import {
  formatCurrency,
  formatCurrencyWithoutDollars,
} from 'src/libs/@currency-formattor/currency-formattor';
import { NoticeDetails } from 'src/entities/notices-details.entity';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { generatePaymentClaimLink } from './payment-claims.activity';
import { HolidayDetails } from 'src/entities/holiday-details.entity';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';
import {
  FetchAllPaymentClaims,
  FetchSubContractorClaim,
  s75TemplateFileDetailsResponse,
} from './payment-claims.response';
import { NoticeTemplates } from 'src/entities/notices-templates.entity';
import { NoticeGenDocService } from '../../notices/notice-gen-doc.service';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import { FileUploadService } from '../../file-upload/file-upload.service';
import { CompliancesService } from '../../compliances/compliances.service';
import { NoticesService } from '../../notices/notices.service';
import { EmailTypeEnum } from 'src/entities/email-logs.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class PaymentClaimsService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(PaymentClaims)
    private paymentClaimsRepo: Repository<PaymentClaims>,
    @InjectRepository(PaymentClaimInvoices)
    private paymentClaimInvoicesRepo: Repository<PaymentClaimInvoices>,
    @InjectRepository(PaymentDetails)
    private paymentDetailsRepo: Repository<PaymentDetails>,
    @InjectRepository(VariationDetails)
    private variationDetails: Repository<VariationDetails>,
    @InjectRepository(BankAccounts)
    private bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(ProjectDetails)
    private projectsRepo: Repository<ProjectDetails>,
    @InjectRepository(ContractDetails)
    private contractsRepo: Repository<ContractDetails>,
    @InjectRepository(ClientSuppliersDetails)
    private clientSuppliersRepo: Repository<ClientSuppliersDetails>,
    @InjectRepository(RetentionDetails)
    private retentionDetailsRepo: Repository<RetentionDetails>,
    @InjectRepository(JournalEntries)
    private journalEntriesRepo: Repository<JournalEntries>,
    @InjectRepository(JournalType)
    private journalTypeRepo: Repository<JournalType>,
    @InjectRepository(NoticeTemplates)
    private noticesTemplatesRepo: Repository<NoticeTemplates>,
    @InjectRepository(SubPayments)
    private subPaymentsRepo: Repository<SubPayments>,
    @InjectRepository(HolidayDetails)
    private holidayDetails: Repository<HolidayDetails>,
    @InjectRepository(CompanyUserRoles)
    private readonly companyUserRolesRepo: Repository<CompanyUserRoles>,
    @InjectRepository(UserDetails)
    private userDetails: Repository<UserDetails>,
    @InjectRepository(CompanyDetails)
    private companyDetails: Repository<CompanyDetails>,
    @InjectRepository(SubscriptionDetails)
    private companySubscriptionPlan: Repository<SubscriptionDetails>,
    private readonly statusService: StatusService,
    private readonly genDocNoticeServices: NoticeGenDocService,
    private entityManager: EntityManager,
    private activityLogService: ActivityLogService,
    private readonly fileUploadService: FileUploadService,
    readonly complianceService: CompliancesService,
    private readonly noticeService: NoticesService,
    private emailQueueProducer: EmailQueueProducer,
    private readonly objectStorageService: ObjectStorageService,
  ) {
    this.logger = new PaytradeLogger('PAYMENT_CLAIMS_SERVICE');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async addPaymentClaim(
    decoded,
    data: AddPaymentClaimInput,
    created_by?: number,
  ) {
    try {
      const response = await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          this.logger.log(
            `Request received for adding payment claim with details: ${JSON.stringify({ ...data, ...{ created_by } })}`,
          );
          //Notices should be sent to the client as per the notices list depending on payment into account type.
          //Subscription type determines the notices automation process.

          const {
            claim_type,
            cash_retention_type,
            associated_retention_sub_payment_id,
            retention_id,
            status,
            company_id,
            beneficiary_type,
            payment_id,
            payment_type,
            claim_amount,
            is_gst_optional,
          } = data;

          let showJournalMessage = false;
          data.retention_amount_with_gst = data.retention_amount
            ? is_gst_optional
              ? data.retention_amount * 1.1
              : data.retention_amount
            : null;

          delete data.client_supplier_type;
          const addedPaymentClaim = await transactionalEntityManager.save(
            this.paymentClaimsRepo.create({
              ...data,
              created_by,
              list_status: status === 'Draft' ? 'Draft' : 'Add payment',
              pending_claims_with_reason: data.pending_claims_with_reason ?? [],
            }),
          );

          const payment_claim_id =
            100000 + Number(addedPaymentClaim.payment_claim_id);

          await transactionalEntityManager
            .createQueryBuilder()
            .update(PaymentClaims)
            .set({ payment_claim_id })
            .where(`payment_claim_id = :payment_claim_id`, {
              payment_claim_id: addedPaymentClaim.payment_claim_id,
            })
            .execute();

          const paymentClaim = await transactionalEntityManager
            .createQueryBuilder(PaymentClaims, 'pc')
            .select([
              'pc.id as id',
              'pc.payment_claim_id as payment_claim_id',
              'pc.claim_type as claim_type',
              'pc.sent_date as sent_date',
              'pc.received_date as received_date',
              'pc.compulsory_attachment_ids as compulsory_attachment_ids',
              'pc.optional_attachment_ids as optional_attachment_ids',
            ])
            .where('pc.payment_claim_id = :payment_claim_id', {
              payment_claim_id: payment_claim_id,
            })
            .getRawOne();

          // renaming the attachment name
          if (data?.optional_supporting_statement_attachment_ids?.length) {
            await this.fileUploadService.updateFileName({
              attachment_type: 'Optional_supporting_statement_attachments',
              attachment_ids:
                data?.optional_supporting_statement_attachment_ids,
              module_detail: paymentClaim,
              decoded,
            });
          }

          if (data?.compulsory_attachment_ids?.length) {
            await this.fileUploadService.updateFileName({
              attachment_type: 'Compulsory_attachments',
              attachment_ids: data?.compulsory_attachment_ids,
              module_detail: paymentClaim,
              decoded,
            });
          }

          if (data?.optional_attachment_ids?.length) {
            await this.fileUploadService.updateFileName({
              attachment_type: 'Optional_attachments',
              attachment_ids: data?.optional_attachment_ids,
              module_detail: paymentClaim,
              decoded,
            });
          }

          if (data.invoices && data.invoices.length > 0) {
            for (let invoice of data.invoices) {
              invoice.payment_claim_id = payment_claim_id;
              invoice.created_by = created_by;
            }

            //Creation of invoices.
            await transactionalEntityManager
              .createQueryBuilder()
              .insert()
              .into(PaymentClaimInvoices)
              .values(data.invoices)
              .execute();
          }
          //Updation of Retention list status.
          if (status == 'Confirmed' || status == 'Draft') {
            await transactionalEntityManager
              .createQueryBuilder()
              .update(RetentionDetails)
              .set({ retention_status: 'Claim generated' })
              .where(`retention_id = :retention_id`, {
                retention_id,
              })
              .execute();
          }
          if (data.claim_type === 'Billable' && status == 'Confirmed') {
            if (data.cash_retention_type === 'Claim') {
              const contract_Details = data.contract_id
                ? await transactionalEntityManager.findOne(ContractDetails, {
                    where: { contract_id: data.contract_id },
                    relations: ['contractPaymentFromAccount'],
                  })
                : null;
              if (
                contract_Details &&
                contract_Details.payment_from_account &&
                contract_Details.contractPaymentFromAccount &&
                contract_Details.contractPaymentFromAccount.account_type &&
                (contract_Details.contractPaymentFromAccount.account_type ===
                  'Project Trust Account' ||
                  contract_Details.contractPaymentFromAccount.account_type ===
                    'Cash Account')
              ) {
                await this.createJournalEntries(
                  transactionalEntityManager,
                  3,
                  data,
                  contract_Details.payment_from_account,
                  payment_claim_id,
                  null,
                  created_by,
                );
              }
            } else if (data.cash_retention_type === 'Retention claim') {
              const beneficiary_type = (
                await transactionalEntityManager.findOne(RetentionDetails, {
                  where: { retention_id },
                })
              )?.beneficiary_type;
              if (beneficiary_type && beneficiary_type === 'Other supplier') {
                const contract_Details = data.contract_id
                  ? await transactionalEntityManager.findOne(ContractDetails, {
                      where: { contract_id: data.contract_id },
                      relations: ['contractRetentionFromAccount'],
                    })
                  : null;
                if (
                  contract_Details &&
                  contract_Details.retention_from_account &&
                  contract_Details.contractRetentionFromAccount &&
                  contract_Details.contractRetentionFromAccount.account_type &&
                  (contract_Details.contractRetentionFromAccount
                    .account_type === 'Retention Trust Account' ||
                    contract_Details.contractRetentionFromAccount
                      .account_type === 'Cash Account')
                ) {
                  await this.createJournalEntries(
                    transactionalEntityManager,
                    44,
                    data,
                    contract_Details.retention_from_account,
                    payment_claim_id,
                    null,
                    created_by,
                  );
                }
              }
            }
          }
          if (
            Array.isArray(data.pending_claims_with_reason) &&
            data.pending_claims_with_reason.length > 0
          ) {
            const generateS75payload = {
              project_id: data.project_id,
              new_claim_id: payment_claim_id,
              claims_with_reason: data.pending_claims_with_reason,
            };
            await this.generateS75Pdf(
              generateS75payload,
              decoded,
              transactionalEntityManager,
            );
          }

          await this.maybeAutoUpliftForHourlyContract(
            transactionalEntityManager,
            decoded,
            {
              contract_id: data.contract_id,
              project_id: data.project_id,
              company_id: data.company_id,
              claim_type: data.claim_type,
              status: data.status,
              claim_amount: Number(data.claim_amount),
            },
            payment_claim_id,
            created_by,
          );

          let noticeResult = null;
          if (data?.claim_type === 'Receivable' && data?.status !== 'Draft') {
            noticeResult =
              await this.noticeService.handleTriggerPaymentClaimNotices(
                decoded,
                {
                  payment_claim_id: payment_claim_id,
                  view_preview: true,
                },
                transactionalEntityManager,
              );
            if (noticeResult?.status === 'ERROR') {
              throw new Error('Notice generation failed');
            }
          }

          const updateClaimButtons =
            await this.statusService.getUiStatusAndActionButtonsForClaimsTransaction(
              transactionalEntityManager,
              {
                payment_claim_id,
              },
            );
          this.logger.log(`updateClaimButtons: : ${JSON.stringify(updateClaimButtons)}`);

          const clientSupplierDetails =
            await transactionalEntityManager.findOne(ClientSuppliersDetails, {
              where: { client_supplier_id: data.client_supplier_id },
            });

          //Generating payment claim link to view created payment claim.
          const paymentClaimLink = generatePaymentClaimLink({
            cash_retention_type,
            claim_type,
            payment_claim_id,
            beneficiary_type,
            payment_type,
            payment_id,
          });
          this.logger.log(`paymentClaimLink*: ${JSON.stringify(paymentClaimLink)}`);

          //Create activity log as soon a payment claim is created.
          const createActivityLogInput: CreateActivityLogInput = {
            event_template_id: claim_type === 'Receivable' ? 74 : 83,
            admin_id:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.admin_id
                : null,
            to_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.userId
                : null,
            from_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? null
                : decoded?.userId,
            company_id: company_id,
            dynamic_values: {
              paymentClaimLink,
              claimId: payment_claim_id,
              claimAmount: formatCurrency(claim_amount),
              clientSupplierName: clientSupplierDetails?.client_supplier_name,
            },
            is_admin: false,
            created_by: decoded?.userId,
          };
          //this.logger.log(`createActivityLogInput: ${JSON.stringify(createActivityLogInput)}`);
          const x = await this.activityLogService.insertActivityLog(
            createActivityLogInput,
          );

          return {
            showJournalMessage,
            payment_claim_id,
            cash_retention_type,
            client_supplier_type: clientSupplierDetails.client_supplier_type,
            status: addedPaymentClaim.status,
            id: addedPaymentClaim?.id,
            notices: noticeResult?.data,
          };
        },
      );

      if (response) {
        const getClaimIp = {
          company_id: data.company_id,
          payment_claim_id: response?.payment_claim_id,
        };
        const clm = await this.fetchDetailsOfAPaymentClaim(
          getClaimIp,
          decoded?.timezone || 'UTC',
        );

        if (response.notices?.mails_to_sent.length) {
          for (let i = 0; i < response.notices?.mails_to_sent.length; i++) {
            const mailDetails = response.notices?.mails_to_sent[i];
            const updatePayload = response.notices?.update_notice_inputs[i];

            // 1. SEND THE MAIL
            await this.emailQueueProducer.emailQueueProducer({
              ...mailDetails,
              mail_type: EmailTypeEnum.notice,
            });

            // 2. UPDATE THE NOTICE
            await this.noticeService.handleUpdateNotice(decoded, updatePayload);
          }
        }

        if (clm?.data?.project_id) {
          this.logger.log(`project_id: ${clm?.data?.project_id}`);
          const compliance_pta_init = await this.complianceService
            .fetchComplianceResultsOfAProject({
              project_id: clm?.data?.project_id,
              bank_account_type: 'Project Trust Account',
              failedFilter: false,
            })
            .catch((err) =>
              this.logger.error('PTA compliance check failed: ' + err.message),
            );

          const compliance_rta_init = await this.complianceService
            .fetchComplianceResultsOfAProject({
              project_id: clm?.data?.project_id,
              bank_account_type: 'Retention Trust Account',
              failedFilter: false,
            })
            .catch((err) =>
              this.logger.error('RTA compliance check failed: ' + err.message),
            );
        }
      }

      const responseWithNotice = {
        ...response,
        // notices: notices?.data,
      };

      return responseWithNotice;
    } catch (error) {
      this.logger.error(
        `Errored while adding payment claim with message: ${error.message}`,
      );
      throw new Error(
        `Errored while adding payment claim with message: ${error.message}`,
      );
    }
  }

  async downloadS75Template(
    userId: number,
  ): Promise<s75TemplateFileDetailsResponse> {
    try {
      this.logger.log(`Handling request for downloading template`);

      //function to fetch file path according to the fin ins

      const st5Template = await this.noticesTemplatesRepo.findOne({
        where: { notice_template_name: 'S75 supporting document' },
        relations: ['notice_template'],
      });

      const baseUrl = (process.env.UPLOAD_BASE_URL || '').replace(/\/+$/, '');
      const normalizedPath = st5Template.notice_template.file_path.replace(/\\/g, '/').replace(/^\/+/, '');
      const filePath = baseUrl + '/' + normalizedPath;

      const fileType = 'application/pdf';
      let base64Data: string = null;
      try {
        const fileBuffer = await this.objectStorageService.downloadFile(st5Template.notice_template.file_path);
        if (fileBuffer) {
          base64Data = `data:${fileType};base64,${fileBuffer.toString('base64')}`;
        }
      } catch (fileError) {
        this.logger.error(`Failed to read file from storage: ${fileError.message}`);
      }

      // const file_base_64 = await readFileSync(st5Template.notice_template.file_path, {
      //   encoding: 'base64',
      // });
      // const s75Template = `data: ${fileType};base64,${file_base_64}`;

      const template_details = {
        id: '5458790',
        file_path: filePath,
        file_name: 's75-support-doc-template.pdf',
        file: base64Data,
      };

      if (!template_details) throw new Error(`Details of template not found`);
      this.logger.log(
        `Details of a transaction fetched successfully with data: ${JSON.stringify(template_details)}`,
      );

      return framedResponse(
        'SUCCESS',
        `Template fetched successfully.`,
        template_details,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching template with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async generateS75Pdf(
    payload: GenerateS75NoticeInput,
    decoded: any,
    manager?: EntityManager,
  ): Promise<any> {
    const { project_id, claims_with_reason } = payload;

    const timezone = decoded?.timezone || 'UTC';

    // const claimIdList = claims_with_reason.map(c => c.payment_claim_id);

    const claimsRepo = manager
      ? manager.getRepository(PaymentClaims)
      : this.paymentClaimsRepo;

    const new_claim = await claimsRepo.findOne({
      where: { payment_claim_id: payload.new_claim_id },
      relations: ['contractDetails', 'companyDetails', 'clientSupplierDetails'],
    });

    if (!new_claim) throw new Error('Claim not found');

    const {
      contractDetails: contract,
      companyDetails: company,
      clientSupplierDetails: clientSupplier,
    } = new_claim;

    const companyUserRole = await this.companyUserRolesRepo.findOne({
      where: {
        company_id: new_claim.company_id,
        company_role: In(['PRIMARY ADMIN']),
        status: 'Active',
      },
    });

    const subscription = await this.companySubscriptionPlan.findOne({
      where: { company_id: new_claim.company_id },
    });

    const companyAdmin = companyUserRole
      ? await this.userDetails.findOne({
          where: { user_id: companyUserRole.user_id },
        })
      : null;

    const { payment_claims } =
      await this.fetchSubContractorClaimsByHeadContractor({
        project_id: project_id,
      });

    const claimsWithReasons = payment_claims.map((claim) => {
      const reasonEntry = claims_with_reason.find(
        (r) => r.payment_claim_id == claim.payment_claim_id,
      );
      return {
        ...claim,
        reason: reasonEntry?.reason || '',
        formatted_claim_date: dateFormatter(claim.claim_date),
        foramtted_contract_date: dateFormatter(claim.contract_date),
      };
    });

    // Step 4: Prepare pdfData
    const pdfData = {
      fromDetails: {
        name: companyAdmin.first_name + ' ' + companyAdmin.last_name,
        company: company?.company_name || '',
      },
      toDetails: {
        name: clientSupplier?.client_supplier_name || '',
        company: clientSupplier?.business_name || '',
      },
      claimDetails: {
        contract_name: contract?.contract_name || '',
        payment_claim_id: new_claim.payment_claim_id,
        payment_claim_date: dateFormatter(new_claim.created_on),
        claims: claimsWithReasons, // array of unpaid claims with reason
      },
      sign: subscription.signature,
    };

    function dateFormatter(
      inputDate: string | Date,
      format: 'dmy' | 'ddmmyyyy' = 'dmy',
    ): string {
      const date = moment.tz(inputDate, timezone);

      if (!date.isValid()) {
        throw new Error('Invalid date input');
      }

      return format === 'ddmmyyyy'
        ? date.format('DD-MM-YYYY_HH:mm')
        : date.format('DD/MM/YYYY');
    }

    const noticeId = new_claim.payment_claim_id;
    const noticeType = 'S75 Supporting Statement';
    const noticeDate = moment.tz(new Date(), timezone).utc().toDate();

    const pdfPath = await this.genDocNoticeServices.generatePDFfromHTML(
      pdfData,
      {},
      decoded,
      noticeId,
      noticeType,
      dateFormatter(noticeDate, 'ddmmyyyy'),
      manager,
    );
  }

  async editDetailsOfAPaymentClaim(
    decoded,
    data: EditDetailsOfAPaymentClaimInput,
    updated_by?: number,
  ) {
    try {
      const { beneficiary_type, payment_type, payment_id } = data;
      // this.logger.log(`decoded: ${JSON.stringify(decoded)}`);
      const invoices = data.invoices || null;
      delete data.client_supplier_type;
      const response = await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          this.logger.log(
            `Request received for editing the details of a payment claim with data: ${JSON.stringify(data)}`,
          );

          const { payment_claim_id, status, is_gst_optional } = data;

          let showJournalMessage = false;

          const claimDetails = await transactionalEntityManager.findOne(
            PaymentClaims,
            {
              where: { payment_claim_id },
              relations: ['clientSupplierDetails'],
            },
          );

          if (!claimDetails)
            throw `Payment claim details not found. Please provide a valid payment_claim_id.`;

          data.previous_status =
            data.status === 'Draft' ? null : claimDetails.status;

          data.retention_amount_with_gst = data.retention_amount
            ? is_gst_optional
              ? data.retention_amount * 1.1
              : data.retention_amount
            : null;

          if (data.invoices) {
            const queryBuilder = await transactionalEntityManager
              .createQueryBuilder(PaymentClaimInvoices, 'pc')
              .where('pc.payment_claim_id = :payment_claim_id', {
                payment_claim_id,
              });
            const entriesToRemove = await queryBuilder.getMany();

            await Promise.all(
              entriesToRemove.map(async (entry) => {
                await queryBuilder
                  .delete()
                  .where('payment_claim_id = :payment_claim_id', {
                    payment_claim_id: entry.payment_claim_id,
                  })
                  .execute();
              }),
            );

            await transactionalEntityManager
              .createQueryBuilder(PaymentClaimInvoices, 'i')
              .insert()
              .into(PaymentClaimInvoices)
              .values(data.invoices)
              .execute();
            delete data.invoices;
          }

          await transactionalEntityManager
            .createQueryBuilder()
            .update(PaymentClaims)
            .set({
              ...data,
              ...{ updated_by },
              ...{ list_status: status === 'Draft' ? 'Draft' : 'Add payment' },
            })
            .where('payment_claim_id = :payment_claim_id', { payment_claim_id })
            .execute();

          data.invoices = invoices;
          const updatedClaimDetails = await transactionalEntityManager.findOne(
            PaymentClaims,
            {
              where: { payment_claim_id },
            },
          );

          if (claimDetails.claim_type === 'Billable' && status == 'Confirmed') {
            if (
              Number(updatedClaimDetails.claim_amount) !==
              Number(claimDetails.claim_amount)
            ) {
              updatedClaimDetails['old_claim_amount'] =
                claimDetails.claim_amount;
            }

            if (
              new Date(updatedClaimDetails.received_date) !==
              new Date(claimDetails.received_date)
            ) {
              updatedClaimDetails['old_received_date'] =
                claimDetails.received_date;
            }
            if (claimDetails.cash_retention_type === 'Claim') {
              const contract_Details = data.contract_id
                ? await transactionalEntityManager.findOne(ContractDetails, {
                    where: { contract_id: data.contract_id },
                    relations: ['contractPaymentFromAccount'],
                  })
                : null;
              if (
                contract_Details &&
                contract_Details.payment_from_account &&
                contract_Details.contractPaymentFromAccount &&
                contract_Details.contractPaymentFromAccount.account_type &&
                (contract_Details.contractPaymentFromAccount.account_type ===
                  'Project Trust Account' ||
                  contract_Details.contractPaymentFromAccount.account_type ===
                    'Cash Account')
              ) {
                if (claimDetails.status === 'Confirmed') {
                  await this.createJournalEntries(
                    transactionalEntityManager,
                    22,
                    updatedClaimDetails,
                    contract_Details.payment_from_account,
                    payment_claim_id,
                    null,
                    updated_by,
                  );
                }
                await this.createJournalEntries(
                  transactionalEntityManager,
                  3,
                  updatedClaimDetails,
                  contract_Details.payment_from_account,
                  payment_claim_id,
                  null,
                  updated_by,
                );
              }
            } else if (claimDetails.cash_retention_type === 'Retention claim') {
              const beneficiary_type = claimDetails?.retention_id
                ? (
                    await transactionalEntityManager.findOne(RetentionDetails, {
                      where: { retention_id: claimDetails.retention_id },
                    })
                  )?.beneficiary_type
                : null;
              if (beneficiary_type && beneficiary_type === 'Other supplier') {
                const contract_Details = data.contract_id
                  ? await transactionalEntityManager.findOne(ContractDetails, {
                      where: { contract_id: data.contract_id },
                      relations: ['contractRetentionFromAccount'],
                    })
                  : null;
                if (
                  contract_Details &&
                  contract_Details.retention_from_account &&
                  contract_Details.contractRetentionFromAccount &&
                  contract_Details.contractRetentionFromAccount.account_type &&
                  (contract_Details.contractRetentionFromAccount
                    .account_type === 'Retention Trust Account' ||
                    contract_Details.contractRetentionFromAccount
                      .account_type === 'Cash Account')
                ) {
                  if (claimDetails.status === 'Confirmed') {
                    await this.createJournalEntries(
                      transactionalEntityManager,
                      41,
                      updatedClaimDetails,
                      contract_Details.retention_from_account,
                      payment_claim_id,
                      null,
                      updated_by,
                    );
                  }
                  await this.createJournalEntries(
                    transactionalEntityManager,
                    44,
                    updatedClaimDetails,
                    contract_Details.retention_from_account,
                    payment_claim_id,
                    null,
                    updated_by,
                  );
                }
              }
            }
          }

          const paymentClaim = await transactionalEntityManager
            .createQueryBuilder(PaymentClaims, 'pc')
            .select([
              'pc.id as id',
              'pc.payment_claim_id as payment_claim_id',
              'pc.claim_type as claim_type',
              'pc.sent_date as sent_date',
              'pc.received_date as received_date',
              'pc.compulsory_attachment_ids as compulsory_attachment_ids',
              'pc.optional_attachment_ids as optional_attachment_ids',
            ])
            .where('pc.payment_claim_id = :payment_claim_id', {
              payment_claim_id: payment_claim_id,
            })
            .getRawOne();

          // renaming the attachment name
          if (data?.optional_supporting_statement_attachment_ids?.length) {
            await this.fileUploadService.updateFileName({
              attachment_type: 'Optional_supporting_statement_attachments',
              attachment_ids:
                data?.optional_supporting_statement_attachment_ids,
              module_detail: paymentClaim,
              decoded,
            });
          }

          if (data?.compulsory_attachment_ids?.length) {
            await this.fileUploadService.updateFileName({
              attachment_type: 'Compulsory_attachments',
              attachment_ids: data?.compulsory_attachment_ids,
              module_detail: paymentClaim,
              decoded,
            });
          }

          if (data?.optional_attachment_ids?.length) {
            await this.fileUploadService.updateFileName({
              attachment_type: 'Optional_attachments',
              attachment_ids: data?.optional_attachment_ids,
              module_detail: paymentClaim,
              decoded,
            });
          }

          this.logger.log(
            `Details of a payment claim has been updated successfully.`,
          );

          const notices = await transactionalEntityManager.find(NoticeDetails, {
            where: {
              payment_claim_id: payment_claim_id,
              notice_type: 'Client Payment Claim Notice',
            },
            lock: { mode: 'pessimistic_write' },
          });

          if (notices && notices.length > 0) {
            notices.forEach((notice) => {
              notice.status =
                notice.status === 'Sent' ? 'Delete-Sent' : 'Delete-Unsent';
              notice.updated_on = moment().tz('UTC');
              notice.updated_group = 'USER';
            });
            await transactionalEntityManager.save(notices);
          }
          if (
            claimDetails.claim_type === 'Receivable' &&
            data.status !== 'Draft' &&
            Array.isArray(data.pending_claims_with_reason) &&
            data.pending_claims_with_reason.length > 0
          ) {
            const generateS75payload = {
              project_id: data.project_id,
              new_claim_id: updatedClaimDetails.payment_claim_id,
              claims_with_reason: data.pending_claims_with_reason,
            };

            await this.generateS75Pdf(
              generateS75payload,
              decoded,
              transactionalEntityManager,
            );
          }

          await this.maybeAutoUpliftForHourlyContract(
            transactionalEntityManager,
            decoded,
            {
              contract_id: data.contract_id,
              project_id: data.project_id,
              company_id: data.company_id,
              claim_type: claimDetails.claim_type,
              status: data.status,
              claim_amount: Number(data.claim_amount),
            },
            updatedClaimDetails.payment_claim_id,
            updated_by,
          );

          let noticesResult = null;

          if (
            claimDetails.claim_type === 'Receivable' &&
            data.status !== 'Draft'
          ) {
            noticesResult =
              await this.noticeService.handleTriggerPaymentClaimNotices(
                decoded,
                {
                  payment_claim_id: updatedClaimDetails.payment_claim_id,
                  view_preview: true,
                },
                transactionalEntityManager,
              );

            if (noticesResult?.status === 'ERROR') {
              throw new Error('Notice generation failed');
            }
          }

          const updateClaimButtons =
            await this.statusService.getUiStatusAndActionButtonsForClaimsTransaction(
              transactionalEntityManager,
              {
                payment_claim_id,
              },
            );
          // this.logger.log(`updateClaimButtons: : ${JSON.stringify(updateClaimButtons)}`);

          //Generating payment claim link to view edited payment claim.
          const paymentClaimLink = generatePaymentClaimLink({
            cash_retention_type: claimDetails.cash_retention_type,
            claim_type: claimDetails.claim_type,
            payment_claim_id,
            beneficiary_type,
            payment_type,
            payment_id,
          });
          // this.logger.log(`paymentClaimLink: ${JSON.stringify(paymentClaimLink)}`);

          //Create activity log as soon a payment claim is created.
          const createActivityLogInput: CreateActivityLogInput = {
            event_template_id:
              claimDetails.claim_type === 'Receivable' ? 75 : 84,
            admin_id:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.admin_id
                : null,
            to_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.userId
                : null,
            from_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? null
                : decoded?.userId,
            company_id: claimDetails.company_id,
            dynamic_values: {
              paymentClaimLink,
              claimAmount: formatCurrency(claimDetails.claim_amount),
              claimId: payment_claim_id,
              clientSupplierName:
                claimDetails.clientSupplierDetails?.client_supplier_name,
            },
            is_admin: false,
            created_by: decoded?.userId,
          };
          //this.logger.log(`createActivityLogInput: ${JSON.stringify(createActivityLogInput)}`);
          await this.activityLogService.insertActivityLog(
            createActivityLogInput,
          );

          return {
            showJournalMessage,
            data: updatedClaimDetails,
            client_supplier_type:
              claimDetails.clientSupplierDetails?.client_supplier_type,
            payment_claim_id: claimDetails.payment_claim_id,
            cash_retention_type: claimDetails.cash_retention_type,
            status: claimDetails.status,
            id: claimDetails?.id,
            notices: noticesResult?.data,
          };
        },
      );

      // let notices;

      if (response) {
        const getClaimIp = {
          company_id: data?.company_id,
          payment_claim_id: data?.payment_claim_id,
        };
        const clm = await this.fetchDetailsOfAPaymentClaim(
          getClaimIp,
          decoded?.timezone || 'UTC',
        );

        // console.log("respone-notice-mail", response.notices?.mails_to_sent)

        if (response.notices?.mails_to_sent.length) {
          for (let i = 0; i < response.notices?.mails_to_sent.length; i++) {
            const mailDetails = response.notices?.mails_to_sent[i];
            const updatePayload = response.notices?.update_notice_inputs[i];

            // 1. SEND THE MAIL
            await this.emailQueueProducer.emailQueueProducer({
              ...mailDetails,
              mail_type: EmailTypeEnum.notice,
            });

            // 2. UPDATE THE NOTICE
            await this.noticeService.handleUpdateNotice(decoded, updatePayload);
          }
        }

        if (clm?.data?.project_id) {
          const compliance_pta_init =
            this.complianceService.fetchComplianceResultsOfAProject({
              project_id: clm?.data?.project_id,
              bank_account_type: 'Project Trust Account',
              failedFilter: false,
            });

          const compliance_rta_init =
            this.complianceService.fetchComplianceResultsOfAProject({
              project_id: clm?.data?.project_id,
              bank_account_type: 'Retention Trust Account',
              failedFilter: false,
            });
        }

        // if (
        //   clm?.data?.claim_type === 'Receivable' &&
        //   response.data.status !== 'Draft'
        // ) {
        //   if (
        //     Array.isArray(data.pending_claims_with_reason) &&
        //     data.pending_claims_with_reason.length > 0
        //   ) {
        //     const generateS75payload = {
        //       project_id: data.project_id,
        //       new_claim_id: response?.payment_claim_id,
        //       claims_with_reason: data.pending_claims_with_reason,
        //     };
        //     await this.generateS75Pdf(generateS75payload, decoded);
        //   }

        //   notices = await this.noticeService.handleTriggerPaymentClaimNotices(
        //     decoded,
        //     { payment_claim_id: response.payment_claim_id, view_preview: true },
        //   );
        // }
      }

      const responseWithNotice = {
        ...response,
        // notices: notices?.data,
      };

      return responseWithNotice;
    } catch (error) {
      this.logger.error(
        `Errored while editing the details of a payment claim with message: ${error.message}`,
      );
      throw new Error(
        `Errored while editing the details of a payment claim with message: ${error.message}`,
      );
    }
  }

  async changeStatusOfAPaymentClaim(
    decoded,
    data: ChangeStatusOfAPaymentClaimInput,
    updated_by?: number,
  ) {
    try {
      const response = await this.entityManager.transaction(
        async (transactionalEntityManager) => {
          this.logger.log(
            `Request received for changing the status of a payment claim with data: ${JSON.stringify(data)}`,
          );

          const { payment_claim_id, status } = data;

          let showJournalMessage = false;

          const claimDetails = await transactionalEntityManager.findOne(
            PaymentClaims,
            {
              where: { payment_claim_id },
              relations: ['clientSupplierDetails'],
            },
          );
          if (!claimDetails)
            throw `Payment claim details not found. Please provide a valid payment_claim_id.`;

          data.previous_status = claimDetails.status;
          let listStatus = '';
          if (status === 'Draft') {
            listStatus = 'Draft';
          } else if (status === 'Confirmed') {
            listStatus = 'Add payment';
          } else if (status === 'Deleted') {
            listStatus = 'Void';
          }

          await transactionalEntityManager
            .createQueryBuilder(PaymentClaims, 'pc')
            .update(PaymentClaims)
            .set({
              previous_status: data.previous_status,
              status,
              list_status: listStatus,
              updated_by,
            })
            .where('payment_claim_id = :payment_claim_id', { payment_claim_id })
            .execute();

          const updateClaimButtons =
            await this.statusService.getUiStatusAndActionButtonsForClaimsTransaction(
              transactionalEntityManager,
              {
                payment_claim_id,
              },
            );
          // this.logger.log(`updateClaimButtons: : ${JSON.stringify(updateClaimButtons)}`);
          this.logger.log(
            `Status of a payment claim with id: ${payment_claim_id} has changed successfully.`,
          );

          if (status === 'Deleted') {
            const notices = await transactionalEntityManager.find(
              NoticeDetails,
              {
                where: {
                  payment_claim_id: payment_claim_id,
                  notice_type: 'Client Payment Claim Notice',
                },
                lock: { mode: 'pessimistic_write' },
              },
            );

            if (notices && notices.length > 0) {
              notices.forEach((notice) => {
                notice.status =
                  notice.status === 'Sent' ? 'Delete-Sent' : 'Delete-Unsent';
                notice.updated_on = moment().tz('UTC');
                notice.updated_group = 'USER';
              });
              await transactionalEntityManager.save(notices);
            }

            //Generating payment claim link to view edited payment claim.
            const paymentClaimLink = generatePaymentClaimLink({
              cash_retention_type: claimDetails.cash_retention_type,
              claim_type: claimDetails.claim_type,
              payment_claim_id,
            });
            this.logger.log(`paymentClaimLink: ${JSON.stringify(paymentClaimLink)}`);

            //Create activity log as soon a payment claim is created.
            const createActivityLogInput: CreateActivityLogInput = {
              event_template_id:
                claimDetails.claim_type === 'Receivable' ? 76 : 85,
              admin_id:
                decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                  ? decoded?.admin_id
                  : null,
              to_user:
                decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                  ? decoded?.userId
                  : null,
              from_user:
                decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                  ? null
                  : decoded?.userId,
              company_id: claimDetails.company_id,
              dynamic_values: {
                paymentClaimLink,
                claimAmount: formatCurrency(claimDetails.claim_amount),
                claimId: payment_claim_id,
                clientSupplierName:
                  claimDetails.clientSupplierDetails?.client_supplier_name,
              },
              is_admin: false,
              created_by: decoded?.userId,
            };
            //this.logger.log(`createActivityLogInput: ${JSON.stringify(createActivityLogInput)}`);
            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );
          }

          //Change the status of the entry in the retention list to the previous state as 'Retained'.
          const retention_claim_details =
            await transactionalEntityManager.findOne(PaymentClaims, {
              where: { payment_claim_id },
              select: ['retention_id', 'cash_retention_type'],
            });
          if (
            status == 'Deleted' &&
            retention_claim_details.cash_retention_type == 'Retention claim'
          ) {
            await transactionalEntityManager
              .createQueryBuilder(RetentionDetails, 'rd')
              .update(RetentionDetails)
              .set({ retention_status: 'Retained' })
              .where('retention_id = :retention_id', {
                retention_id: retention_claim_details.retention_id,
              })
              .execute();
          }

          if (claimDetails.claim_type === 'Billable' && status == 'Deleted') {
            if (claimDetails.cash_retention_type === 'Claim') {
              const contract_Details = claimDetails.contract_id
                ? await transactionalEntityManager.findOne(ContractDetails, {
                    where: { contract_id: claimDetails.contract_id },
                    relations: ['contractPaymentFromAccount'],
                  })
                : null;
              if (
                contract_Details &&
                contract_Details.payment_from_account &&
                contract_Details.contractPaymentFromAccount &&
                contract_Details.contractPaymentFromAccount.account_type &&
                (contract_Details.contractPaymentFromAccount.account_type ===
                  'Project Trust Account' ||
                  contract_Details.contractPaymentFromAccount.account_type ===
                    'Cash Account')
              ) {
                await this.createJournalEntries(
                  transactionalEntityManager,
                  22,
                  claimDetails,
                  contract_Details.payment_from_account,
                  payment_claim_id,
                  null,
                  updated_by,
                );
              }
            } else if (claimDetails.cash_retention_type === 'Retention claim') {
              const beneficiary_type = claimDetails?.retention_id
                ? (
                    await transactionalEntityManager.findOne(RetentionDetails, {
                      where: { retention_id: claimDetails.retention_id },
                    })
                  )?.beneficiary_type
                : null;
              if (beneficiary_type && beneficiary_type === 'Other supplier') {
                const contract_Details = claimDetails.contract_id
                  ? await transactionalEntityManager.findOne(ContractDetails, {
                      where: { contract_id: claimDetails.contract_id },
                      relations: ['contractRetentionFromAccount'],
                    })
                  : null;
                if (
                  contract_Details &&
                  contract_Details.retention_from_account &&
                  contract_Details.contractRetentionFromAccount &&
                  contract_Details.contractRetentionFromAccount.account_type &&
                  (contract_Details.contractRetentionFromAccount
                    .account_type === 'Retention Trust Account' ||
                    contract_Details.contractRetentionFromAccount
                      .account_type === 'Cash Account')
                ) {
                  await this.createJournalEntries(
                    transactionalEntityManager,
                    41,
                    claimDetails,
                    contract_Details.retention_from_account,
                    payment_claim_id,
                    null,
                    updated_by,
                  );
                }
              }
            }
          }

          this.logger.log(
            `Status of the retained amount entry in retention list has been reverted successfully.`,
          );

          return {
            showJournalMessage,
            data: claimDetails,
            client_supplier_type:
              claimDetails.clientSupplierDetails?.client_supplier_type,
            payment_claim_id: claimDetails.payment_claim_id,
            cash_retention_type: claimDetails.cash_retention_type,
            status: claimDetails.status,
            id: claimDetails?.id,
          };
        },
      );

      if (response) {
        if (data?.payment_claim_id) {
          const clm = await this.getPaymentClaimByClaimId(
            data?.payment_claim_id,
          );
          if (clm.project_id) {
            const compliance_pta_init =
              await this.complianceService.fetchComplianceResultsOfAProject({
                project_id: clm.project_id,
                bank_account_type: 'Project Trust Account',
                failedFilter: false,
              });
            const compliance_rta_init =
              await this.complianceService.fetchComplianceResultsOfAProject({
                project_id: clm.project_id,
                bank_account_type: 'Retention Trust Account',
                failedFilter: false,
              });
          }
        }
      }
      return response;
    } catch (error) {
      this.logger.error(
        `Errored while changing the status of a payment claim with message: ${error.message}`,
      );
      throw new Error(
        `Errored while changing the status of a payment claim with message: ${error.message}`,
      );
    }
  }

  async fetchAllPaymentClaims(
    data: FetchAllPaymentClaimsOfACompanyInput,
    timezone: string,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all payment claim with details: ${JSON.stringify(data)}`,
      );
      const {
        company_id,
        claim_type,
        cash_retention_type,
        status,
        project_id,
        contract_id,
        client_supplier_id,
        page,
        items_per_page,
        search,
      } = data;

      const confirmedPaymentClaims = await this.paymentClaimsRepo.find({
        where: { status: 'Confirmed', company_id },
      });
      if (
        confirmedPaymentClaims &&
        confirmedPaymentClaims[0] !== null &&
        confirmedPaymentClaims.length > 0
      ) {
        for (const result of confirmedPaymentClaims) {
          const checkDateConditionsAndFetchStatusRes =
            await this.checkDateConditionsAndFetchStatus(
              result.claim_type,
              result.claim_type === 'Billable'
                ? result.received_date
                : result.sent_date,
              timezone,
              result.due_date,
            );
          const response = await this.paymentClaimsRepo
            .createQueryBuilder()
            .update(PaymentClaims)
            .set({
              list_status: checkDateConditionsAndFetchStatusRes?.list_status
                ? checkDateConditionsAndFetchStatusRes?.list_status
                : result.list_status,
              updated_on: moment.tz('UTC'),
            })
            .where(`payment_claim_id = :payment_claim_id`, {
              payment_claim_id: result?.payment_claim_id,
            })
            .execute();
        }
      }

      // Queried all the payment claims belonging to the company along with the payments belonging to the claim.
      let queryBuilder = await this.paymentClaimsRepo
        .createQueryBuilder('pc')
        .select([
          'pc.cash_retention_type AS cash_retention_type',
          'pc.payment_claim_id AS payment_claim_id',
          'pc.claim_type AS claim_type',
          'pc.client_supplier_id AS client_supplier_id',
          'pc.associated_retention_sub_payment_id AS associated_retention_sub_payment_id',
          'pc.retention_id AS retention_id',
          'pc.project_id AS project_id',
          'pc.contract_id AS contract_id',
          'pc.due_date AS due_date',
          'pc.sent_date AS sent_date',
          'pc.received_date AS received_date',
          `CASE WHEN pc.claim_type = 'Billable' THEN pc.received_date ELSE pc.sent_date END AS claim_date`,
          'pc.claim_amount AS claim_amount',
          'pc.list_status AS list_status',
          'pc.claim_list_buttons AS claim_list_buttons',
          'pc.status AS status',
          // `CASE WHEN pc.status = 'Confirmed' THEN 'Approved' WHEN pc.status = 'Deleted' THEN 'Void' ELSE pc.status END AS status`,
          'cs.client_supplier_name AS client_supplier_name',
          'pr.project_name AS project_name',
          'co.contract_name AS contract_name',
        ])
        .leftJoin('pc.clientSupplierDetails', 'cs')
        .leftJoin('pc.projectDetails', 'pr')
        .leftJoin('pc.contractDetails', 'co')
        .leftJoin('co.contractPaymentFromAccount', 'cpf')
        .leftJoin('co.contractPaymentToAccount', 'cpt')
        .leftJoin('co.contractRetentionFromAccount', 'crf')
        .where('pc.company_id = :company_id', { company_id });

      // Subquery to aggregate payments into a single array per claim
      queryBuilder.addSelect((subQuery) => {
        return subQuery
          .select(
            "json_agg(json_build_object('payment_id', p.payment_id, 'payment_type', p.payment_type))",
            'payments',
          )
          .from(PaymentDetails, 'p')
          .where('p.payment_claim_id = pc.payment_claim_id')
          .andWhere("p.current_status != 'Deleted'")
          .andWhere(
            `p.payment_type NOT IN ('Overpayment from client',
            'Underpayment from client','Overpayment to supplier',
            'Underpayment to supplier')`,
          );
      }, 'payments');

      queryBuilder.addSelect((subQuery) => {
        return subQuery
          .select(
            `JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'payment_id', pd.payment_id,
                'payment_type', pd.payment_type,
                'cash_retention', pd.cash_retention,
                'payment_status', pd.current_status,
                'payless_amount', pd.payless_amount,
                'total_amount', pd.total_amount
              )
              ORDER BY pd.created_on DESC
            )`,
            'payment_list',
          )
          .from(PaymentDetails, 'pd')
          .where('pd.payment_claim_id = pc.payment_claim_id')
          .andWhere("pd.current_status != 'Deleted'")
          .andWhere(
            `pd.payment_type NOT IN ('Overpayment from client',
            'Underpayment from client','Overpayment to supplier',
            'Underpayment to supplier')`,
          );
      }, 'payment_list');

      // Subquery to aggregate notices (if applicable)
      queryBuilder.addSelect((subQuery) => {
        return subQuery
          .select(
            "json_agg(json_build_object('notice_id', n.id, 'notice_type', n.notice_type, 'status', n.status))",
            'notices',
          )
          .from(NoticeDetails, 'n')
          .where('n.payment_claim_id = pc.payment_claim_id');
        // .andWhere(
        //   "n.status NOT IN ('Delete-Sent', 'Delete-Unsent', 'Delete-Received')",
        // );
      }, 'notices');

      if (claim_type) {
        queryBuilder.andWhere('pc.claim_type = :claim_type', { claim_type });
      }
      if (cash_retention_type) {
        queryBuilder.andWhere('pc.cash_retention_type = :cash_retention_type', {
          cash_retention_type,
        });
      }
      if (status && status === ('Archived' as any)) {
        queryBuilder.andWhere(`pc.list_status = 'Void'`);
      } else if (status && status != ('Archived' as any)) {
        queryBuilder.andWhere('pc.list_status = :status', {
          status,
        });
      } else {
        queryBuilder.andWhere(`pc.list_status != 'Void'`);
      }

      if (project_id) {
        queryBuilder.andWhere('pc.project_id = :project_id', { project_id });
      }
      if (contract_id) {
        queryBuilder.andWhere('pc.contract_id = :contract_id', { contract_id });
      }

      if (client_supplier_id) {
        queryBuilder.andWhere('pc.client_supplier_id = :client_supplier_id', {
          client_supplier_id,
        });
      }

      if (search) {
        queryBuilder.andWhere(
          `(CAST(pc.payment_claim_id AS TEXT) ILIKE :keyword OR 
           CAST(pc.company_id AS TEXT) ILIKE :keyword OR 
           CAST(pc.claim_type AS TEXT) ILIKE :keyword OR 
           CAST(pc.cash_retention_type AS TEXT) ILIKE :keyword OR 
           CAST(pc.status AS TEXT) ILIKE :keyword OR 
           CAST(pc.list_status AS TEXT) ILIKE :keyword OR 
           CAST(pc.project_id AS TEXT) ILIKE :keyword OR 
           CAST(pc.contract_id AS TEXT) ILIKE :keyword OR 
           CAST(pc.client_supplier_id AS TEXT) ILIKE :keyword OR 
           TO_CHAR(pc.due_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
           TO_CHAR(pc.sent_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
           TO_CHAR(pc.received_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
           CAST(pc.claim_reference AS TEXT) ILIKE :keyword OR 
           CAST(pc.claim_amount AS TEXT) ILIKE :keyword OR 
           CAST(pc.memo AS TEXT) ILIKE :keyword OR 
           CAST(cs.client_supplier_name AS TEXT) ILIKE :keyword OR 
           CAST(cs.business_name AS TEXT) ILIKE :keyword OR 
           CAST(cs.client_supplier_type AS TEXT) ILIKE :keyword OR 
           CAST(cs.client_supplier_status AS TEXT) ILIKE :keyword OR 
           CAST(cs.related_entity AS TEXT) ILIKE :keyword OR 
           CAST(cs.entity_type AS TEXT) ILIKE :keyword OR 
           CAST(cs.client_supplier_address AS TEXT) ILIKE :keyword OR 
           CAST(cs.payment_terms AS TEXT) ILIKE :keyword OR 
           CAST(pr.project_name AS TEXT) ILIKE :keyword OR 
           CAST(pr.project_role AS TEXT) ILIKE :keyword OR 
           TO_CHAR(pr.project_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
           CAST(pr.project_description AS TEXT) ILIKE :keyword OR 
           CAST(pr.site_address AS TEXT) ILIKE :keyword OR 
           CAST(pr.head_contract_sum AS TEXT) ILIKE :keyword OR 
           CAST(pr.retention_type AS TEXT) ILIKE :keyword OR 
           CAST(pr.number_of_units AS TEXT) ILIKE :keyword OR 
           CAST(pr.pta_eligibility AS TEXT) ILIKE :keyword OR 
           CAST(pr.rta_eligibility AS TEXT) ILIKE :keyword OR 
           CAST(pr.pta_compliance AS TEXT) ILIKE :keyword OR 
           CAST(pr.rta_compliance AS TEXT) ILIKE :keyword OR 
           CAST(pr.project_status AS TEXT) ILIKE :keyword OR 
           CAST(co.contract_name AS TEXT) ILIKE :keyword OR 
           CAST(co.client_supplier_role AS TEXT) ILIKE :keyword OR 
           CAST(co.contract_type AS TEXT) ILIKE :keyword OR 
           CAST(co.contract_status AS TEXT) ILIKE :keyword OR 
           TO_CHAR(co.contract_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
           CAST(co.payment_terms AS TEXT) ILIKE :keyword OR 
           CAST(co.initial_contract_sum AS TEXT) ILIKE :keyword OR 
           TO_CHAR(co.contract_start_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
           TO_CHAR(co.defect_liability_end_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
           CAST(co.payment_from_account AS TEXT) ILIKE :keyword OR 
           CAST(co.retention_from_account AS TEXT) ILIKE :keyword OR 
           CAST(co.payment_to_account AS TEXT) ILIKE :keyword OR 
           CAST(cpf.account_name AS TEXT) ILIKE :keyword OR 
           CAST(cpf.account_type AS TEXT) ILIKE :keyword OR 
           CAST(cpf.account_number AS TEXT) ILIKE :keyword OR 
           CAST(cpf.bsb_number AS TEXT) ILIKE :keyword OR 
           CAST(cpf.apca_number AS TEXT) ILIKE :keyword OR 
           CAST(cpt.account_name AS TEXT) ILIKE :keyword OR 
           CAST(cpt.account_type AS TEXT) ILIKE :keyword OR 
           CAST(cpt.account_number AS TEXT) ILIKE :keyword OR 
           CAST(cpt.bsb_number AS TEXT) ILIKE :keyword OR 
           CAST(cpt.apca_number AS TEXT) ILIKE :keyword OR 
           CAST(crf.account_name AS TEXT) ILIKE :keyword OR 
           CAST(crf.account_type AS TEXT) ILIKE :keyword OR 
           CAST(crf.account_number AS TEXT) ILIKE :keyword OR 
           CAST(crf.bsb_number AS TEXT) ILIKE :keyword OR 
           CAST(crf.apca_number AS TEXT) ILIKE :keyword OR 
           EXISTS (SELECT 1 FROM payment_claim_invoices pci WHERE pci.payment_claim_id = pc.payment_claim_id AND (
            CAST(pci.description AS TEXT) ILIKE :keyword OR  
            CAST(pci.quantity AS TEXT) ILIKE :keyword OR 
            CAST(pci.unit_price AS TEXT) ILIKE :keyword OR 
            CAST(pci.gst AS TEXT) ILIKE :keyword OR 
            CAST(pci.total_amount_including_gst AS TEXT) ILIKE :keyword  
            )) OR 
           EXISTS (SELECT 1 FROM payment_details pd WHERE pd.payment_claim_id = pc.payment_claim_id AND (
            CAST(pd.payment_id AS TEXT) ILIKE :keyword OR  
            CAST(pd.payment_type AS TEXT) ILIKE :keyword OR 
            CAST(pd.cash_retention AS TEXT) ILIKE :keyword OR 
            CAST(pd.current_status AS TEXT) ILIKE :keyword OR 
            CAST(pd.list_status AS TEXT) ILIKE :keyword OR 
            CAST(pd.payless_amount AS TEXT) ILIKE :keyword OR 
            CAST(pd.total_amount AS TEXT) ILIKE :keyword OR 
            TO_CHAR(pd.payment_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
            TO_CHAR(pd.retention_release_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
            CAST(pd.memo AS TEXT) ILIKE :keyword OR 
            CAST(pd.withhold_payment_reason AS TEXT) ILIKE :keyword OR 
            CAST(pd.third_party_payment_reason AS TEXT) ILIKE :keyword 
            )) OR 
            EXISTS (SELECT 1 FROM journal_entries je left join journal_type jt on je.journal_process_id = jt.process_id WHERE je.audit_id = pc.payment_claim_id AND (
            CAST(je.journal_number AS TEXT) ILIKE :keyword OR  
            CAST('#' || je.journal_number AS TEXT) ILIKE :keyword OR 
            CAST(je.audit_id AS TEXT) ILIKE :keyword OR 
            CAST(je.journal_description AS TEXT) ILIKE :keyword OR 
            CAST(je.dynamic_values AS TEXT) ILIKE :keyword OR 
            CAST(je.transaction_account_id AS TEXT) ILIKE :keyword OR 
            CAST(je.debit_amount AS TEXT) ILIKE :keyword OR 
            CAST(je.credit_amount AS TEXT) ILIKE :keyword OR 
            TO_CHAR(je.journal_date::date, 'DD/MM/YYYY') ILIKE :keyword OR 
            CAST(je.journal_process_id AS TEXT) ILIKE :keyword OR 
            CAST(je.entry_type AS TEXT) ILIKE :keyword OR 
            CAST(jt.process_type AS TEXT) ILIKE :keyword OR 
            CAST(jt.process_name AS TEXT) ILIKE :keyword OR 
            CAST(jt.process_description AS TEXT) ILIKE :keyword
            )))`,
          {
            keyword: `%${search}%`,
            tz: timezone,
          },
        );
      }

      if (data.date_filter && timezone) {
        let startDate, endDate;
        if (data.date_filter === 'Custom' && data.start_date && data.end_date) {
          startDate = moment(data.start_date).startOf('day').toDate();
          endDate = moment(data.end_date).endOf('day').toDate();
        } else if (data.date_filter === 'This Month') {
          startDate = moment().startOf('month').toDate();
          endDate = moment().endOf('month').toDate();
        } else if (data.date_filter === 'Last Month') {
          startDate = moment().subtract(1, 'month').startOf('month').toDate();
          endDate = moment().subtract(1, 'month').endOf('month').toDate();
        }
        queryBuilder.andWhere(
          `CASE WHEN pc.claim_type = 'Billable' THEN pc.received_date::date ELSE pc.sent_date::date END BETWEEN :start_date AND :end_date`,
          {
            start_date: startDate,
            end_date: endDate,
          },
        );
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      if (!data.sorting_field) {
        queryBuilder.orderBy({ 'pc.created_on': sorting_order });
        if (data.page && data.items_per_page) {
          queryBuilder
            .offset((data.page - 1) * data.items_per_page)
            .limit(data.items_per_page);
        }
      }
      if (data.sorting_field) {
        switch (data.sorting_field) {
          case 'cash_retention_type':
            {
              queryBuilder.orderBy({ 'pc.cash_retention_type': sorting_order });
            }
            break;
          case 'claim_type':
            {
              queryBuilder.orderBy({ 'pc.claim_type': sorting_order });
            }
            break;
          case 'client_supplier_name':
            {
              queryBuilder.orderBy({
                'LOWER(cs.client_supplier_name)': sorting_order,
              });
            }
            break;
          case 'project_name':
            {
              queryBuilder.orderBy({ 'LOWER(pr.project_name)': sorting_order });
            }
            break;
          case 'contract_name':
            {
              queryBuilder.orderBy({
                'LOWER(co.contract_name)': sorting_order,
              });
            }
            break;
          case 'due_date':
            {
              queryBuilder.orderBy({ 'pc.due_date': sorting_order });
            }
            break;
          case 'claim_amount':
            {
              queryBuilder.orderBy({ 'pc.claim_amount': sorting_order });
            }
            break;
          case 'list_status':
            {
              queryBuilder.orderBy({ 'pc.list_status': sorting_order });
            }
            break;
          case 'claim_date':
            {
              queryBuilder.orderBy({
                "CASE WHEN pc.claim_type = 'Billable' THEN pc.received_date ELSE pc.sent_date END":
                  sorting_order,
              });
            }
            break;
        }
        if (data.page && data.items_per_page) {
          queryBuilder
            .offset((data.page - 1) * data.items_per_page)
            .limit(data.items_per_page);
        }
      }

      let [rawResults, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      // this.logger.log(`rawResults: ${JSON.stringify(rawResults)}`);

      // Formatted results to match the desired structure
      const payment_claims = rawResults.map((result) => ({
        cash_retention_type: result.cash_retention_type,
        payment_claim_id: result.payment_claim_id,
        claim_type: result.claim_type,
        client_supplier_id: result.client_supplier_id,
        project_id: result.project_id,
        contract_id: result.contract_id,
        due_date: result.due_date,
        sent_date: result.sent_date,
        received_date: result.received_date,
        claim_date: result.claim_date,
        claim_amount: result.claim_amount,
        formatted_claim_amount: formatCurrencyWithoutDollars(
          result.claim_amount,
        ),
        status: result.status,
        list_status: result.list_status,
        client_supplier_name: result.client_supplier_name,
        project_name: result.project_name,
        contract_name: result.contract_name,
        payments: result.payments,
        associated_retention_sub_payment_id:
          result.associated_retention_sub_payment_id,
        retention_id: result.retention_id,
        notices: result.notices,
        payment_list: result.payment_list,
        claim_list_buttons: result.claim_list_buttons,
      })) as any;

      for (const result of payment_claims) {
        if (result.cash_retention_type == 'Retention claim') {
          const retention_details = await this.retentionDetailsRepo.findOne({
            where: {
              retention_id: result.retention_id,
            },
            select: ['beneficiary_type'],
          });
          if (!retention_details)
            throw 'Retention list entry not found for the associated retention sub payment details present in claim.';

          result.beneficiary_type = retention_details.beneficiary_type;
        }

        if (result.notices && result.notices.length) {
          const requiredNoticeDetails = result.notices.map((notice) => {
            return {
              notice_id: notice.notice_id,
              notice_type: notice.notice_type,
              status: notice.status,
            };
          });
          result.notices = requiredNoticeDetails;
        }
      }

      this.logger.log(
        `All payment claims fetched successfully with data: ${JSON.stringify(payment_claims)}`,
      );

      //Notices should be sent to the client as per the notices list depending on payment into account type.
      //Subscription type determines the notices automation process.

      return framedResponse(
        'SUCCESS',
        `All payment claims fetched successfully.`,
        { payment_claims, total_count },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all payment claims with message: ${error}`,
      );
      throw new Error(
        `Errored while fetching all payment claims with message: ${error}`,
      );
    }
  }

  async getPaymentClaimByClaimId(payment_claim_id: number) {
    return await this.paymentClaimsRepo.findOne({
      where: { payment_claim_id },
    });
  }

  async fetchSubContractorClaimsByHeadContractor(
    data: FetchSubContractorClaimsInput,
  ): Promise<{
    payment_claims: FetchSubContractorClaim[];
    total_count: number;
  }> {
    const { project_id, claim_id, page, items_per_page } = data;

    if (!project_id) throw new Error('Project ID is required');

    // Step 1: Get subcontractor contracts under the project
    const subcontractorContracts = await this.contractsRepo.find({
      where: {
        project_id,
        client_supplier_role: In([
          'Sub Contractor',
          'Related Entity Sub Contractor',
        ]),
      },
      select: ['contract_id'],
    });

    const contractIds = subcontractorContracts.map((c) => c.contract_id);
    if (!contractIds.length) {
      return { payment_claims: [], total_count: 0 };
    }

    // Step 2: Query payment claims on those contracts
    const queryBuilder = this.paymentClaimsRepo
      .createQueryBuilder('pc')
      .leftJoin('pc.clientSupplierDetails', 'cs')
      .leftJoin('pc.contractDetails', 'co')
      .leftJoin('pc.projectDetails', 'pr')
      .select([
        'pc.payment_claim_id AS payment_claim_id',
        'pc.claim_type AS claim_type',
        'pc.cash_retention_type AS cash_retention_type',
        'pc.client_supplier_id AS client_supplier_id',
        'cs.client_supplier_name AS client_supplier_name',
        'pc.project_id AS project_id',
        'pr.project_name AS project_name',
        'pc.contract_id AS contract_id',
        'co.contract_name AS contract_name',
        'co.contract_date AS contract_date',
        'co.client_supplier_role AS client_supplier_role',
        'pc.due_date AS due_date',
        'pc.claim_amount AS claim_amount',
        'pc.status AS status',
        'pc.list_status AS list_status',
        `CASE WHEN pc.claim_type = 'Billable' THEN pc.received_date ELSE pc.sent_date END AS claim_date`,
        'pc.received_date AS received_date',
        'pc.sent_date AS sent_date',
      ])
      .where('pc.contract_id IN (:...contractIds)', { contractIds })
      .andWhere(`pc.claim_type = 'Billable'`)
      .andWhere(`pc.cash_retention_type = 'Claim'`)
      .andWhere(`pc.status NOT IN ('Deleted','Draft')`)
      .andWhere(`pc.list_status NOT IN ('Completed', 'Reconcile')`);

    if (page && items_per_page) {
      queryBuilder.offset((page - 1) * items_per_page).limit(items_per_page);
    }

    const [rawResults, total_count] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    const payment_claims: FetchSubContractorClaim[] = rawResults.map(
      (result) => ({
        payment_claim_id: result.payment_claim_id,
        claim_type: result.claim_type,
        cash_retention_type: result.cash_retention_type,
        client_supplier_id: result.client_supplier_id,
        client_supplier_name: result.client_supplier_name,
        project_id: result.project_id,
        project_name: result.project_name,
        contract_id: result.contract_id,
        contract_date: result.contract_date,
        contract_name: result.contract_name,
        client_supplier_role: result.client_supplier_role,
        due_date: result.due_date,
        claim_amount: result.claim_amount,
        formatted_claim_amount: formatCurrencyWithoutDollars(
          result.claim_amount,
        ),
        status: result.status,
        list_status: result.list_status,
        claim_date: result.claim_date,
      }),
    );

    const unpaidClaims: FetchSubContractorClaim[] = [];

    for (const result of payment_claims) {
      const payments = await this.paymentDetailsRepo.find({
        where: {
          payment_claim_id: result.payment_claim_id,
          current_status: Not('Deleted'),
        },
        select: ['payment_id', 'payment_type', 'payless_amount'],
      });

      const paymentIds = payments.map((p) => p.payment_id);

      let amount_paid = 0;
      let retained_amount = 0;
      let withheld_amount = 0;

      if (paymentIds.length) {
        const subpaymentSumResult = await this.subPaymentsRepo
          .createQueryBuilder('subpayment')
          .select('SUM(ABS(subpayment.amount))', 'total_paid')
          .where('subpayment.payment_id IN (:...paymentIds)', { paymentIds })
          .andWhere('subpayment.sub_payment_type = :subType', {
            subType: 'Payment',
          })
          .andWhere('subpayment.is_paid_confirmed = :confirmed', {
            confirmed: true,
          })
          // .andWhere('subpayment.amount < 0') // Only consider negative (paid) amounts
          .getRawOne();

        amount_paid = subpaymentSumResult?.total_paid
          ? parseFloat(subpaymentSumResult.total_paid)
          : 0;

        const retentionSumResult = await this.subPaymentsRepo
          .createQueryBuilder('subpayment')
          .select('SUM(ABS(subpayment.amount))', 'total_retained')
          .innerJoin('subpayment.paymentDetails', 'payment')
          .innerJoin('payment.contractDetails', 'contract')
          .where('subpayment.payment_id IN (:...paymentIds)', { paymentIds })
          .andWhere('subpayment.sub_payment_type = :subType', {
            subType: 'Retention Out',
          })
          .andWhere('subpayment.is_retention_confirmed = :confirmed', {
            confirmed: true,
          })
          .andWhere('contract.defect_liability_end_date >= NOW()')
          .getRawOne();

        // await this.retentionDetailsRepo
        //   .createQueryBuilder('retention')
        //   .select('SUM(retention.retained_amount)', 'total_retained')
        //   .innerJoin('retention.paymentDetails', 'payment') // join payment
        //   .innerJoin('payment.contractDetails', 'contract') // join contract
        //   .where('retention.payment_id IN (:...paymentIds)', { paymentIds })
        //   .andWhere('retention.retention_status != :deleted', { deleted: 'Deleted' })
        //   .andWhere('retention.beneficiary_type = :beneficiary', {
        //     beneficiary: 'Current supplier',
        //   })
        //   .andWhere('contract.defect_liability_end_date >= NOW()') // liability date of contract not passed
        //   .getRawOne();

        retained_amount = retentionSumResult?.total_retained
          ? parseFloat(retentionSumResult.total_retained)
          : 0;

        const paylessPayments = payments.filter(
          (p) =>
            p.payment_type === 'Pay Less - Full' ||
            p.payment_type === 'Pay Less - Part',
        );
        if (paylessPayments.length) {
          withheld_amount =
            result.claim_amount - paylessPayments[0].payless_amount;

          // Prevent negative withheld (in case of data errors)
          if (withheld_amount < 0) withheld_amount = 0;
        }
      }

      const effectiveClaimAmount = result.claim_amount - withheld_amount;

      const totalPaidIncludingRetention = amount_paid + retained_amount;

      const unpaidAmount = effectiveClaimAmount - totalPaidIncludingRetention;

      // console.log("___ unpaid", unpaidAmount, "__claim", result.claim_amount, "retention--", retained_amount, "paid:", amount_paid)

      // Skip if fully paid / paid more
      if (unpaidAmount <= 0) continue;

      result.amount_paid = formatCurrencyWithoutDollars(amount_paid);
      result.unpaid_amount = formatCurrencyWithoutDollars(unpaidAmount);

      unpaidClaims.push(result);
    }

    if (claim_id) {
      const claim = await this.paymentClaimsRepo.findOne({
        where: { payment_claim_id: claim_id },
        select: ['pending_claims_with_reason'],
      });

      const claimReasons: { payment_claim_id: number; reason?: string }[] =
        claim?.pending_claims_with_reason ?? [];

      for (const uc of unpaidClaims) {
        const matched = claimReasons.find(
          (r) => r.payment_claim_id === Number(uc.payment_claim_id),
        );
        uc.unpaid_reason = matched?.reason ?? '';
      }
    }

    return { payment_claims: unpaidClaims, total_count: unpaidClaims.length };
  }

  async fetchDetailsOfAPaymentClaim(
    data: FetchDetailsOfAPaymentClaimInput,
    timezone: string,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all payment claim with details: ${JSON.stringify(data)}`,
      );

      const { company_id, payment_claim_id } = data;

      const fetchedDetailsOfPaymentClaim = await this.paymentClaimsRepo
        .createQueryBuilder('pc')
        .select([
          'pc.payment_claim_id AS payment_claim_id',
          'pc.claim_type AS claim_type',
          'pc.cash_retention_type AS cash_retention_type',
          'pc.status AS status',
          'pc.list_status AS list_status',
          'pc.claim_overview_buttons AS claim_overview_buttons',
          'pc.project_id AS project_id',
          'pc.contract_id AS contract_id',
          'pc.client_supplier_id AS client_supplier_id',
          'pc.is_gst_optional AS is_gst_optional',
          'pc.due_date AS due_date',
          'pc.sent_date AS sent_date',
          'pc.received_date AS received_date',
          'pc.claim_reference AS claim_reference',
          'pc.all_subcontracts_paid AS all_subcontracts_paid',
          'pc.s75_applicable AS s75_applicable',
          'pc.claim_amount AS claim_amount',
          'pc.cash_retention AS cash_retention',
          'pc.retention_amount AS retention_amount',
          'pc.retention_percentage AS retention_percentage',
          'pc.retention_amount_with_gst AS retention_amount_with_gst',
          'pc.notice_ids AS notice_ids',
          'pc.memo AS memo',
          'pc.created_on AS created_on',
          'pc.associated_retention_sub_payment_id AS associated_retention_sub_payment_id',
          'pc.retention_id AS retention_id',
          'rd.retained_amount AS retained_amount',
          'rd.beneficiary_type AS beneficiary_type',
          'c.payment_from_account AS payment_from_account',
          'c.payment_to_account AS payment_to_account',
          'c.client_supplier_role AS client_supplier_role',
          'p.project_role AS project_role',
        ])
        .leftJoin('pc.contractDetails', 'c')
        .leftJoin('pc.projectDetails', 'p')
        .leftJoin(RetentionDetails, 'rd', 'rd.retention_id = pc.retention_id')
        .where('pc.payment_claim_id = :payment_claim_id', { payment_claim_id })
        .andWhere('pc.company_id = :company_id', { company_id })
        .getRawOne();
      if (!fetchedDetailsOfPaymentClaim)
        throw `Payment claim not found. Please provide valid details.`;

      //Updating the retention_amount based on the presence of commpleted claims.
      const claim_amounts = [];
      const considerableCompletedClaimStatuses = [
        'Paid - Matched',
        'Received - Matched',
        'Unconfirmed - Matched',
        'Paid - Payment Unmatched - Retention Out Matched - Retention In Unmatched',
        'Paid - Payment Unmatched - Retention Out Matched - Retention In Matched',
        'Paid - Payment Unmatched - Retention Out Unmatched - Retention In Matched',
        'Paid - Payment Matched - Retention Out Unmatched - Retention In Matched',
        'Paid - Payment Matched - Retention Out Matched - Retention In Unmatched',
        'Paid - Payment Matched - Retention Out Unmatched - Retention In Unmatched',
        'Paid - Unmatched',
        'Received - Unmatched',
      ];
      const presence_of_claims = await this.paymentClaimsRepo
        .createQueryBuilder('pc')
        .select([
          'pc.status AS status, pc.claim_amount AS claim_amount, pc.payment_claim_id AS payment_claim_id',
        ])
        .where(`pc.retention_id = :retention_list_id`, {
          retention_list_id: fetchedDetailsOfPaymentClaim.retention_id,
        })
        .andWhere(`pc.status IN(:...considerableCompletedClaimStatuses)`, {
          considerableCompletedClaimStatuses,
        })
        .andWhere(`pc.status != 'Deleted'`)
        .getRawMany();
      this.logger.log(`presence_of_claims: ${JSON.stringify(presence_of_claims)}`);

      if (presence_of_claims && presence_of_claims.length) {
        //Pushing the claim amounts.
        presence_of_claims.forEach((claim) =>
          claim_amounts.push(Number(claim.claim_amount)),
        );
      }
      const sum_of_claim_amounts = claim_amounts.reduce(
        (acc, curr) => acc + curr,
        0,
      );
      this.logger.log(`sum_of_claim_amounts: ${JSON.stringify(sum_of_claim_amounts)}`);
      fetchedDetailsOfPaymentClaim.retained_amount =
        fetchedDetailsOfPaymentClaim.retained_amount - sum_of_claim_amounts;
      this.logger.log(
        `fetchedDetailsOfAPaymentClaim: ${JSON.stringify(fetchedDetailsOfPaymentClaim)}`,
      );

      let projectDetails = {};
      let contractDetails = {} as any;
      let variationDetails = {} as any;
      let clientSupplierDetails = {};
      let claimDetails = {} as any;
      let previous_claim_amount = 0;
      let fetchedPaymentFromAccountDetails = {};
      let fetchedPaymentToAccountDetails = {};
      let expectedCalculations = {};
      if (fetchedDetailsOfPaymentClaim.project_id) {
        projectDetails = await this.projectsRepo
          .createQueryBuilder('pr')
          .select(['pr.project_name AS project_name'])
          .where('pr.project_id = :project_id', {
            project_id: fetchedDetailsOfPaymentClaim.project_id,
          })
          .getRawOne();
      }
      if (fetchedDetailsOfPaymentClaim.contract_id) {
        if (fetchedDetailsOfPaymentClaim.cash_retention_type == 'Claim') {
          contractDetails = await this.contractsRepo
            .createQueryBuilder('c')
            .select([
              'c.contract_name AS contract_name',
              'c.payment_terms AS payment_terms',
              'c.payment_from_account AS payment_from_account',
              'c.payment_to_account AS payment_to_account',
              'c.initial_contract_sum AS initial_contract_sum',
            ])
            .where('c.contract_id = :contract_id', {
              contract_id: fetchedDetailsOfPaymentClaim.contract_id,
            })
            .getRawOne();
        } else if (
          fetchedDetailsOfPaymentClaim.cash_retention_type == 'Retention claim'
        ) {
          contractDetails = await this.contractsRepo
            .createQueryBuilder('c')
            .select([
              'c.contract_name AS contract_name',
              'c.payment_terms AS payment_terms',
              'c.retention_from_account AS retention_from_account',
              'c.payment_to_account AS payment_to_account',
              'c.initial_contract_sum AS initial_contract_sum',
            ])
            .where('c.contract_id = :contract_id', {
              contract_id: fetchedDetailsOfPaymentClaim.contract_id,
            })
            .getRawOne();
        }
        variationDetails = await this.variationDetails
          .createQueryBuilder('v')
          .select('v.contract_id', 'contract_id')
          .addSelect('SUM(v.variation_amount)::numeric', 'variation_amount')
          .where("v.variation_status = 'Agreed'")
          .andWhere('v.contract_id = :contract_id', {
            contract_id: fetchedDetailsOfPaymentClaim.contract_id,
          })
          .groupBy('v.contract_id')
          .getRawOne();
        claimDetails = await this.paymentClaimsRepo
          .createQueryBuilder('pc')
          .select('ARRAY_AGG(pc.payment_claim_id)', 'payment_claim_id_array')
          .distinct(true)
          .where("pc.status NOT IN('Draft', 'Deleted')")
          .andWhere('pc.contract_id = :contract_id', {
            contract_id: fetchedDetailsOfPaymentClaim.contract_id,
          })
          .andWhere('pc.payment_claim_id != :payment_claim_id', {
            payment_claim_id,
          })
          .getRawOne();

        if (
          claimDetails &&
          claimDetails.payment_claim_id_array &&
          claimDetails.payment_claim_id_array.length > 0
        ) {
          const fetchedInvoiceDetailsOfClaims =
            await this.paymentClaimInvoicesRepo
              .createQueryBuilder('i')
              .select([
                'i.description AS description',
                'i.quantity AS quantity',
                'i.unit_price AS unit_price',
                'i.gst AS gst',
                'i.total_amount_including_gst AS total_amount_including_gst',
                'i.payment_claim_id AS payment_claim_id',
              ])
              .where('i.payment_claim_id IN (:...payment_claim_id)', {
                payment_claim_id: claimDetails.payment_claim_id_array,
              })
              .getRawMany();

          if (
            fetchedInvoiceDetailsOfClaims &&
            fetchedInvoiceDetailsOfClaims.length
          ) {
            const subTotalSummaries = [];
            await fetchedInvoiceDetailsOfClaims.map((invoice) => {
              subTotalSummaries.push(invoice.quantity * invoice.unit_price);
            });
            previous_claim_amount = subTotalSummaries.reduce(
              (acc, curr) => acc + curr,
              0,
            );
          }
        }
      }
      if (fetchedDetailsOfPaymentClaim.client_supplier_id) {
        clientSupplierDetails = await this.clientSuppliersRepo
          .createQueryBuilder('cs')
          .select([
            'cs.client_supplier_name AS client_supplier_name',
            'cs.client_supplier_address AS client_supplier_address',
            'cs.client_supplier_type AS client_supplier_type',
          ])
          .where('cs.client_supplier_id = :client_supplier_id', {
            client_supplier_id: fetchedDetailsOfPaymentClaim.client_supplier_id,
          })
          .getRawOne();
      }

      fetchedDetailsOfPaymentClaim.created_on = new Date(
        fetchedDetailsOfPaymentClaim.created_on,
      );

      const fetchedInvoiceDetails = await this.paymentClaimInvoicesRepo
        .createQueryBuilder('i')
        .select([
          'i.description AS description',
          'i.quantity AS quantity',
          'i.unit_price AS unit_price',
          'i.gst AS gst',
          'i.total_amount_including_gst AS total_amount_including_gst',
          'i.payment_claim_id AS payment_claim_id',
        ])
        .where('i.payment_claim_id = :payment_claim_id', { payment_claim_id })
        .getRawMany();

      if (fetchedInvoiceDetails && fetchedInvoiceDetails.length) {
        const subTotalSummaries = [];
        const gsts = [];
        await fetchedInvoiceDetails.map((invoice) => {
          subTotalSummaries.push(invoice.quantity * invoice.unit_price);
          gsts.push(+invoice.gst);
        });

        expectedCalculations = {
          sub_total_summary: subTotalSummaries.reduce(
            (acc, curr) => acc + curr,
            0,
          ),
          gst_summary: gsts.reduce((acc, curr) => acc + curr, 0),
        };
      }

      let paymentDetails;
      if (
        fetchedDetailsOfPaymentClaim.cash_retention_type == 'Retention claim'
      ) {
        paymentDetails = await this.subPaymentsRepo
          .createQueryBuilder('sp')
          .select([
            'sp.payment_id AS payment_id',
            'p.retention_account AS payment_from_account',
            'p.payment_to_account AS payment_to_account',
          ])
          .leftJoin(PaymentDetails, 'p', 'sp.payment_id = p.payment_id')
          .where('sp.sub_payment_id = :sub_payment_id', {
            sub_payment_id:
              fetchedDetailsOfPaymentClaim.associated_retention_sub_payment_id,
          })
          .getRawOne();
        // this.logger.log(`-------paymentDetails: ${JSON.stringify(paymentDetails)}`);
      }

      if (
        fetchedDetailsOfPaymentClaim.contract_id &&
        fetchedDetailsOfPaymentClaim.claim_type == 'Billable'
      ) {
        const contract_details = await this.contractsRepo.findOne({
          where: { contract_id: fetchedDetailsOfPaymentClaim.contract_id },
        });
        // this.logger.log(`-------contract_details: ${JSON.stringify(contract_details)}`);

        const payment_from_account_id =
          fetchedDetailsOfPaymentClaim.cash_retention_type == 'Claim'
            ? fetchedDetailsOfPaymentClaim.payment_from_account
            : paymentDetails.payment_from_account;

        fetchedPaymentFromAccountDetails = await this.bankAccountsRepo
          .createQueryBuilder('ba')
          .select([
            'ba.account_name AS payment_from_account_name',
            'ba.account_type AS payment_from_account_type',
            'ba.account_number AS payment_from_account_number',
            'ba.bsb_number AS payment_from_account_bsb_number',
          ])
          .where('ba.bank_account_id = :bank_account_id', {
            bank_account_id: payment_from_account_id,
          })
          .getRawOne();

        if (!fetchedPaymentFromAccountDetails)
          throw `Payment from account id present in the contracts entity is invalid or not present in the bank accounts entity.`;
      }

      const payment_to_account_id =
        fetchedDetailsOfPaymentClaim.cash_retention_type == 'Claim'
          ? fetchedDetailsOfPaymentClaim.payment_to_account
          : paymentDetails.payment_to_account;

      if (payment_to_account_id) {
        fetchedPaymentToAccountDetails = await this.bankAccountsRepo
          .createQueryBuilder('b')
          .select([
            'b.account_name AS payment_to_account_name',
            'b.bsb_number AS payment_to_account_bsb_number',
            'b.account_number AS payment_to_account_number',
            'b.account_type AS payment_to_account_type',
          ])
          .where('b.bank_account_id = :bank_account_id', {
            bank_account_id: payment_to_account_id,
          })
          .getRawOne();
        this.logger.log(
          `fetchedPaymentToAccountDetails: ${JSON.stringify(fetchedPaymentToAccountDetails)}`,
        );

        if (!fetchedPaymentToAccountDetails)
          throw `Payment to account id present in the contracts entity is invalid or not present in the bank accounts entity.`;
      }

      const uiStatusDetails =
        await this.statusService.getUiStatusAndActionButtonsForClaims({
          payment_claim_id: payment_claim_id,
        });

      const statusDetails = {
        status_in_ui: uiStatusDetails?.status_in_ui,
        // claim_overview_buttons: uiStatusDetails?.claim_overview_buttons,
      };

      if (fetchedDetailsOfPaymentClaim.status === 'Confirmed') {
        this.logger.log(
          `fetchedDetailsOfPaymentClaim.sent_date: ${fetchedDetailsOfPaymentClaim.sent_date}`,
        );
        this.logger.log(
          `fetchedDetailsOfPaymentClaim.received_date: ${fetchedDetailsOfPaymentClaim.received_date}`,
        );
        const checkDateConditionsAndFetchStatusRes =
          await this.checkDateConditionsAndFetchStatus(
            fetchedDetailsOfPaymentClaim.claim_type,
            fetchedDetailsOfPaymentClaim.claim_type === 'Billable'
              ? fetchedDetailsOfPaymentClaim.received_date
              : fetchedDetailsOfPaymentClaim.sent_date,
            timezone,
            fetchedDetailsOfPaymentClaim.due_date,
          );
        statusDetails.status_in_ui =
          checkDateConditionsAndFetchStatusRes?.overview_status
            ? checkDateConditionsAndFetchStatusRes?.overview_status
            : statusDetails.status_in_ui;
      }

      delete fetchedDetailsOfPaymentClaim.payment_from_account;
      delete fetchedDetailsOfPaymentClaim.payment_to_account;

      let fetchedAllDetailsOfAPaymentClaim = {
        ...projectDetails,
        ...contractDetails,
        ...clientSupplierDetails,
        ...fetchedDetailsOfPaymentClaim,
        ...fetchedPaymentFromAccountDetails,
        ...fetchedPaymentToAccountDetails,
        ...{
          invoices: fetchedInvoiceDetails.length ? fetchedInvoiceDetails : null,
        },
        ...expectedCalculations,
        ...statusDetails,
        ...{ variation_amount: variationDetails?.variation_amount || 0 },
        ...{ previous_claim_amount: previous_claim_amount || 0 },
      };

      fetchedAllDetailsOfAPaymentClaim.memo =
        fetchedAllDetailsOfAPaymentClaim.memo == null ||
        fetchedAllDetailsOfAPaymentClaim.memo == 'null'
          ? ''
          : fetchedAllDetailsOfAPaymentClaim.memo;

      this.logger.log(
        `All payment claims fetched successfully with data: ${JSON.stringify(fetchedAllDetailsOfAPaymentClaim)}`,
      );

      return framedResponse(
        'SUCCESS',
        `Details of a payment claim has been fetched successfully.`,
        fetchedAllDetailsOfAPaymentClaim,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching details of a payment claim with message: ${error}`,
      );
      throw new Error(
        `Errored while fetching details of a payment claim with message: ${error}`,
      );
    }
  }

  async fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier(
    data: FetchPaymentToAccountListOfSelectedSupplierInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching payment from account details and payment to account list of selected supplier with data: ${JSON.stringify(data)}`,
      );

      const { client_supplier_id, contract_id, payment_id } = data;
      this.logger.log(`data: ${JSON.stringify(data)}`);
      const relatedEntityDetails = await this.clientSuppliersRepo.findOne({
        where: { client_supplier_id },
        select: ['related_entity', 'client_supplier_address'],
      });
      this.logger.log(`relatedEntityDetails: ${JSON.stringify(relatedEntityDetails)}`);
      if (!relatedEntityDetails)
        throw `Provided client_supplier_id is invalid or not present.`;

      let bankAccountsToBeFetched;
      if (
        relatedEntityDetails &&
        relatedEntityDetails.related_entity == 'Yes'
      ) {
        bankAccountsToBeFetched = ['Cash Account', 'Project Trust Account'];
      } else {
        bankAccountsToBeFetched = ['Cash Account'];
      }
      this.logger.log(`bankAccountsToBeFetched: ${JSON.stringify(bankAccountsToBeFetched)}`);

      const fetchedPaymentToAccountsList = await this.bankAccountsRepo
        .createQueryBuilder('ba')
        .select([
          'ba.account_name AS payment_to_account_name',
          'ba.bank_account_id AS payment_to_account_id',
          'ba.account_type AS payment_to_account_type',
          'ba.bsb_number AS payment_to_account_bsb_number',
          'ba.account_number AS payment_to_account_number',
        ])
        .where(`ba.account_type IN(:...bankAccountsToBeFetched)`, {
          bankAccountsToBeFetched,
        })
        .andWhere(`ba.added_by_client_supplier = :added_by_client_supplier`, {
          added_by_client_supplier: true,
        })
        .andWhere(`ba.client_supplier_id = :client_supplier_id`, {
          client_supplier_id,
        })
        .getRawMany();
      this.logger.log(`fetchedPaymentToAccountsList: ${JSON.stringify(fetchedPaymentToAccountsList)}`);

      this.logger.log(
        `All payment to accounts list fetched successfully with data: ${JSON.stringify(fetchedPaymentToAccountsList)}`,
      );

      const paymentDetails = await this.paymentDetailsRepo.findOne({
        where: { payment_id },
        select: ['payment_from_account'],
      });
      this.logger.log(`paymentDetails: ${JSON.stringify(paymentDetails)}`);

      const bank_account_id = paymentDetails.payment_from_account;
      this.logger.log(`bank_account_id: ${JSON.stringify(bank_account_id)}`);

      const payment_from_account_details = await this.bankAccountsRepo
        .createQueryBuilder('ba')
        .select([
          'ba.account_name AS payment_from_account_name',
          'ba.account_type AS payment_from_account_type',
          'ba.bsb_number AS payment_from_account_bsb_number',
          'ba.bank_account_id AS payment_from_account_id',
          'ba.account_number AS payment_from_account_number',
        ])
        .where('ba.bank_account_id = :bank_account_id', {
          bank_account_id,
        })
        .getRawOne();
      this.logger.log(`payment_from_account_details: ${JSON.stringify(payment_from_account_details)}`);

      this.logger.log(
        `Payment from account details of contract fetched successfully with data: ${JSON.stringify(payment_from_account_details)}`,
      );

      return framedResponse(
        'SUCCESS',
        `All bank accounts fetched successfully.`,
        {
          payment_from_account_details,
          payment_to_accounts_list: fetchedPaymentToAccountsList,
          client_supplier_address: relatedEntityDetails.client_supplier_address,
        },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching payment from account details and payment to account list of selected supplier with message: ${error}`,
      );
      throw new Error(`${error}`);
    }
  }

  async checkCompletionStatusOfAssociatedRetentionClaims(
    data: CheckCompletionStatusOfAssociatedRetentionClaimsInput,
  ) {
    try {
      this.logger.log(
        `Request received for checking the completion status of associated retention claims with message: ${JSON.stringify(data)}`,
      );

      const { retention_id } = data;
      const payment_claims = await this.paymentClaimsRepo
        .createQueryBuilder('pc')
        .select([
          'pc.payment_claim_id AS payment_claim_id',
          'pc.claim_amount AS claim_amount',
        ])
        .where(`pc.retention_id = :retention_id`, {
          retention_id,
        })
        .andWhere(`pc.status != 'Deleted'`)
        .getRawMany();

      let is_previous_claims_completed;
      if (payment_claims && payment_claims.length) {
        //Looping through the payments of all the claims created against a retention In payment.
        for (const paymentClaim of payment_claims) {
          const allPayments = await this.paymentDetailsRepo
            .createQueryBuilder('pd')
            .select([
              'pd.total_amount AS total_amount',
              'pd.current_status AS current_status',
              'pd.payment_type AS payment_type',
            ])
            .where(`pd.payment_claim_id = :payment_claim_id`, {
              payment_claim_id: paymentClaim.payment_claim_id,
            })
            .andWhere(`pd.current_status != 'Deleted'`)
            .getRawMany();
          this.logger.log(`allPayments: ${JSON.stringify(allPayments)}`);

          if (allPayments && allPayments.length) {
            const total_payment_amounts = [];
            //Looping through the payments created against a claim.
            for (const payment of allPayments) {
              //Bypass if the payment type is Pay - Zero
              this.logger.log(`payment: ${JSON.stringify(payment)}`);
              if (payment.payment_type != 'Pay - Zero') {
                if (
                  payment.status != 'Paid - Matched' ||
                  payment.status != 'Received - Matched'
                ) {
                  if (payment.total_amount)
                    total_payment_amounts.push(Number(payment.total_amount));
                } else {
                  is_previous_claims_completed = false;
                }
              }
              this.logger.log(`payment: ${JSON.stringify(payment)}`);
            }
            const sumOfTotalAmountOfPayments = total_payment_amounts.reduce(
              (acc, curr) => acc + curr,
              0,
            );
            this.logger.log(
              `sumOfTotalAmountOfPayments: ${sumOfTotalAmountOfPayments}`,
            );
            if (paymentClaim.claim_amount != sumOfTotalAmountOfPayments) {
              is_previous_claims_completed = false;
            } else {
              is_previous_claims_completed = true;
            }
          } else {
            is_previous_claims_completed = false;
          }
        }
        return framedResponse(
          'SUCCESS',
          `Status of all associated retention claims and it's payments have been checked.`,
          { is_previous_claims_completed },
        );
      } else {
        return framedResponse(
          'SUCCESS',
          `Status of all associated retention claims and it's payments have been checked.`,
          { is_previous_claims_completed: true },
        );
      }
    } catch (error) {
      this.logger.error(
        `Errored while checking the status of the associated retention claims with message: ${error}`,
      );
      throw new Error(`${error}`);
    }
  }

  async fetchAutoPopulatableFieldsOfARetentionClaim(
    data: FetchAutoPopulatableFieldsOfARetentionClaimInput,
  ) {
    try {
      this.logger.log(
        `Request for fetching auto populatable fields of retention claim with data: ${JSON.stringify(data)}`,
      );

      const { client_supplier_id, contract_id } = data;
      const fetchedAutoPopulatableFields = await this.contractsRepo
        .createQueryBuilder('c')
        .select([
          'c.contract_id AS contract_id',
          'c.client_supplier_id AS client_supplier_id',
          'cs.client_supplier_name AS client_supplier_name',
          'cs.client_supplier_address AS client_supplier_address',
          'c.project_id AS project_id',
          'p.project_name AS project_name',
          'c.payment_terms AS payment_terms',
          'r.account_name AS retention_from_account_name',
          'r.bank_account_id AS retention_from_account_id',
          'r.bsb_number AS retention_from_account_bsb_number',
          'r.account_number AS retention_from_account_number',
          'r.account_type AS retention_from_account_type',
        ])
        .leftJoin(`c.clientSuppliersDetails`, 'cs')
        .leftJoin(`c.projectDetails`, 'p')
        .leftJoin(`c.contractRetentionFromAccount`, 'r')
        .where('c.contract_id = :contract_id', { contract_id })
        .andWhere('c.client_supplier_id = :client_supplier_id', {
          client_supplier_id,
        })
        .getRawOne();
      this.logger.log(`fetchedAutoPopulatableFields: ${JSON.stringify(fetchedAutoPopulatableFields)}`);

      const payment_to_account_details = await this.bankAccountsRepo
        .createQueryBuilder('ba')
        .select([
          'ba.account_name AS payment_to_account_name',
          'ba.account_number AS payment_to_account_number',
          'ba.account_type AS payment_to_account_type',
          'ba.bsb_number AS payment_to_account_bsb_number',
          'ba.bank_account_id AS payment_to_account_id',
        ])
        .where('ba.client_supplier_id = :client_supplier_id', {
          client_supplier_id,
        })
        .getRawOne();
      this.logger.log(`payment_to_account_details: ${JSON.stringify(payment_to_account_details)}`);

      const fetchedResults = {
        ...fetchedAutoPopulatableFields,
        ...payment_to_account_details,
      };
      this.logger.log(`fetchedResults: ${JSON.stringify(fetchedResults)}`);

      return framedResponse(
        'SUCCESS',
        'Auto populatable fields of the retention claims successfully fetched.',
        fetchedResults,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching auto populatable fields of retention claim with message: ${error}`,
      );
      throw new Error(`${error}`);
    }
  }

  async fetchDetailsOfAPaymentClaimForImport(id: string) {
    this.logger.log(
      `Request received for fetching all payment claim with payment_claim_id: ${id}`,
    );

    const queryBuilder = this.paymentClaimsRepo
      .createQueryBuilder('pc')
      .select([
        'pc.company_id AS company_id',
        `'Billable' AS claim_type`,
        'pc.cash_retention_type AS cash_retention_type',
        'pc.project_id AS project_id',
        'pc.contract_id AS contract_id',
        'pc.client_supplier_id AS client_supplier_id',
        'pc.claim_amount AS claim_amount',
        'pc.is_gst_optional AS is_gst_optional',
        'pc.cash_retention AS cash_retention',
        'pc.retention_amount AS retention_amount',
        'pc.retention_percentage AS retention_percentage',
        'pc.retention_amount_with_gst AS retention_amount_with_gst',
      ]);

    queryBuilder.addSelect((subQuery) => {
      return subQuery
        .select(
          `JSONB_AGG(
                JSONB_BUILD_OBJECT(
                  'description', pci.description,
                  'quantity', pci.quantity,
                  'unit_price', pci.unit_price,
                  'gst', pci.gst,
                  'total_amount_including_gst', pci.total_amount_including_gst
                )
              )`,
          'invoice',
        )
        .from(PaymentClaimInvoices, 'pci')
        .where('pc.payment_claim_id = pci.payment_claim_id')
        .groupBy('pci.payment_claim_id')
        .orderBy('MAX(pci.created_on)', 'ASC');
    }, 'invoice_list');
    const fetchedDetailsOfPaymentClaim = await queryBuilder
      .where('pc.id =:id', {
        id: id,
      })
      .andWhere(`pc.status not in ('Draft', 'Deleted')`)
      .andWhere(`pc.claim_type = 'Receivable'`)
      .getRawOne();

    this.logger.log(`fetchedDetailsOfAPaymentClaim: ${JSON.stringify(fetchedDetailsOfPaymentClaim)}`);

    let expectedCalculations = {};
    if (
      fetchedDetailsOfPaymentClaim &&
      fetchedDetailsOfPaymentClaim?.invoice_list &&
      fetchedDetailsOfPaymentClaim?.invoice_list?.length > 0
    ) {
      const subTotalSummaries = [];
      const gsts = [];
      await fetchedDetailsOfPaymentClaim.invoice_list.map((invoice) => {
        subTotalSummaries.push(invoice.quantity * invoice.unit_price);
        gsts.push(+invoice.gst);
      });

      expectedCalculations = {
        sub_total_summary: subTotalSummaries.reduce(
          (acc, curr) => acc + curr,
          0,
        ),
        gst_summary: gsts.reduce((acc, curr) => acc + curr, 0),
      };
    }

    fetchedDetailsOfPaymentClaim.formatted_claim_amount =
      fetchedDetailsOfPaymentClaim.claim_amount
        ? formatCurrencyWithoutDollars(
            fetchedDetailsOfPaymentClaim.claim_amount,
          )
        : null;
    fetchedDetailsOfPaymentClaim.formatted_retention_amount =
      fetchedDetailsOfPaymentClaim.retention_amount
        ? formatCurrencyWithoutDollars(
            fetchedDetailsOfPaymentClaim.retention_amount,
          )
        : null;
    fetchedDetailsOfPaymentClaim.formatted_retention_amount_with_gst =
      fetchedDetailsOfPaymentClaim.retention_amount_with_gst
        ? formatCurrencyWithoutDollars(
            Math.abs(fetchedDetailsOfPaymentClaim.retention_amount_with_gst),
          )
        : null;

    this.logger.log(
      `All payment claims fetched successfully with data: ${JSON.stringify(fetchedDetailsOfPaymentClaim)}`,
    );

    return { ...fetchedDetailsOfPaymentClaim, ...expectedCalculations };
  }

  async checkDateConditionsAndFetchStatus(
    claimType,
    receivedSentDate,
    timeZone,
    dueDate,
  ) {
    const today = new Date();

    const receivedSentDatePlus15BusinessDays =
      await this.addBusinessDaysWithTimezone(receivedSentDate, 15, timeZone);
    const receivedSentDatePlus10BusinessDays =
      await this.addBusinessDaysWithTimezone(receivedSentDate, 10, timeZone);

    let list_status = '',
      overview_status = '';
    if (receivedSentDate && dueDate) {
      if (claimType === 'Billable') {
        if (today > receivedSentDatePlus15BusinessDays && today > dueDate) {
          overview_status =
            'Warning Payment Overdue - Add and Send Payment Schedule';
          list_status = 'Overdue';
        } else if (
          (receivedSentDatePlus15BusinessDays > today && today > dueDate) ||
          (receivedSentDatePlus15BusinessDays > today &&
            today > receivedSentDatePlus10BusinessDays)
        ) {
          this.logger.log(
            `receivedSentDatePlus15BusinessDays > today: ${receivedSentDatePlus15BusinessDays > today}`,
          );
          this.logger.log(`today > dueDate: ${today > dueDate}`);
          this.logger.log(
            `today > receivedSentDatePlus10BusinessDays: ${today > receivedSentDatePlus10BusinessDays}`,
          );
          overview_status = 'Due date passed - Add and send Payment Schedule';
          list_status = 'Overdue';
        }
      } else {
        if (today > receivedSentDatePlus15BusinessDays && today > dueDate) {
          overview_status =
            'Warning Overdue - Add Payment Schedule on receipt and report to QBCC';
          list_status = 'Overdue';
        } else if (
          receivedSentDatePlus15BusinessDays > today &&
          today > dueDate
        ) {
          overview_status =
            'Due date passed - Add Payment Schedule on receipt - Send approporiate warning to your client';
          list_status = 'Overdue';
        }
      }
    }
    return { list_status, overview_status };
  }

  async addBusinessDaysWithTimezone(startDate, days, timeZone) {
    try {
      const holidayDetails = await this.holidayDetails.find({
        where: { holiday_status: 'Active' },
      });

      let date = new Date(startDate); // Copy the starting date

      while (days > 0) {
        date.setDate(date.getDate() + 1); // Increment date by one day

        // Get formatted weekday (Mon-Sun)
        const dayOfWeek = new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          timeZone,
        }).format(date);

        // Format current date as MM-DD (for recurring check)
        const formattedDate = date?.toISOString()?.split('T')[0]; // YYYY-MM-DD format
        const monthDay = formattedDate.slice(5); // MM-DD format
        // Check if it's a weekend
        if (dayOfWeek === 'Sat' || dayOfWeek === 'Sun') {
          continue; // Skip weekends
        }

        // Check if it's a holiday
        let isHoliday = holidayDetails.some((holiday) => {
          const holidayDate = new Date(holiday.holiday_date)
            ?.toISOString()
            ?.split('T')[0]; //holiday.holiday_date // Ensure YYYY-MM-DD format
          const holidayMonthDay = holidayDate.slice(5); // MM-DD for recurring
          if (!holiday.recurring_every_year) {
            // Non-recurring holiday: must match exactly within the range
            return holidayDate === formattedDate;
          } else {
            // Recurring holiday: only match MM-DD if the date is within the range
            return holidayMonthDay === monthDay;
          }
        });

        if (isHoliday) {
          this.logger.log(`isHoliday: : ${JSON.stringify(isHoliday)}`);
          continue; // Skip holidays
        }

        // Decrease the days count only if it's a valid business day
        days--;
      }

      return new Date(date.toLocaleString('en-US', { timeZone }));
    } catch (error) {
      this.logger.error(`Error in addBusinessDaysWithTimezone:: ${JSON.stringify(error)}`);
    }
  }

  async createJournalEntries(
    transactionalEntityManager,
    processType,
    claim_details,
    bankAccountId,
    payment_claim_id,
    payment_details,
    userId,
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        const journalTypeDetails = await transactionalEntityManager.find(
          JournalType,
          {
            where: { process_type: processType },
            order: { process_id: 'ASC' },
          },
        );

        const journalProcessIds = journalTypeDetails?.map(
          (type) => type.process_id,
        );
        this.logger.log(JSON.stringify({ journalProcessIds }));

        const journalRelatedDetails = payment_claim_id
          ? await this.getJournalRelatedDetailsForClaimsPayments(
              transactionalEntityManager,
              payment_claim_id,
              payment_details,
            )
          : await this.getJournalRelatedDetailsForOtherPayments(
              transactionalEntityManager,
              payment_details.payment_id,
            );
        if (processType === 22 || processType === 41) {
          journalRelatedDetails.claim_amount = claim_details.old_claim_amount
            ? claim_details.old_claim_amount
            : journalRelatedDetails.claim_amount;
          journalRelatedDetails.received_date = claim_details.old_received_date
            ? claim_details.old_received_date
            : journalRelatedDetails.received_date;
        }

        let auditId;
        if ([3, 22, 41, 44].includes(processType)) {
          auditId = payment_claim_id;
        } else {
          auditId = payment_details.payment_id;
        }
        const previousJournalTypeDetails =
          await transactionalEntityManager.find(JournalType, {
            where: {
              process_type: In(journalTypeDetails[0]?.reverse_values),
            },
            order: { process_id: 'ASC' },
          });

        const previousJournalProcessIds = previousJournalTypeDetails?.map(
          (type) => type.process_id,
        );
        this.logger.log(JSON.stringify({ previousJournalProcessIds }));

        const checkPreviousJournalExistence =
          await transactionalEntityManager.findOne(JournalEntries, {
            where: {
              journal_process_id: In(previousJournalProcessIds),
              audit_id: auditId,
              is_reversed: false,
            },
            order: { created_on: 'DESC' },
          });
        this.logger.log(JSON.stringify({ checkPreviousJournalExistence }));

        if (checkPreviousJournalExistence) {
          const updatePreviousJournals = await transactionalEntityManager
            .createQueryBuilder()
            .update(JournalEntries)
            .set({
              is_reversed: true,
            })
            .where(
              `journal_process_id IN (:...previousJournalProcessIds) AND audit_id =:auditId AND is_reversed =:isReversed`,
              { previousJournalProcessIds, auditId, isReversed: false },
            )
            .execute();
          this.logger.log(JSON.stringify({ updatePreviousJournals }));
        }

        const checkPaymentJournalExistence =
          await transactionalEntityManager.find(JournalEntries, {
            where: {
              journal_process_id: In(journalProcessIds),
              audit_id: auditId,
              is_reversed: false,
            },
          });
        this.logger.log(JSON.stringify({ checkPaymentJournalExistence }));
        if (
          checkPaymentJournalExistence &&
          checkPaymentJournalExistence?.length > 0
        ) {
          return resolve(false);
        }

        let journalId =
          (
            await transactionalEntityManager.findOne(BankAccounts, {
              where: { bank_account_id: bankAccountId },
            })
          )?.last_journal_id || 0;

        const journalPayload: AddJournalInput[] = await Promise.all(
          journalTypeDetails.map(async (entry) => {
            let journalDescription = entry.process_description;
            let dynamicValues;
            if (entry.dynamic_values) {
              const Keys = entry.dynamic_values;
              const dynamicData = {};
              Keys.forEach((key) => {
                dynamicData[key] = journalRelatedDetails[key];
              });
              if (dynamicData.hasOwnProperty('retained_amount')) {
                dynamicData['retained_amount'] = formatCurrency(
                  journalRelatedDetails.retained_amount,
                );
              }

              dynamicValues = dynamicData;

              journalDescription = await this.replaceVariables(
                entry.process_description,
                dynamicData,
              );
            }

            let transactionAccountId,
              journal_date,
              debitAmount = null,
              creditAmount = null,
              balanceAmount = 0.0;

            if (
              entry.beneficiary_account === 'company' &&
              journalRelatedDetails.cash_retention_type === 'Claim' &&
              journalRelatedDetails.claim_type === 'Billable'
            ) {
              transactionAccountId =
                journalRelatedDetails.payment_from_cash_account;
            } else if (
              entry.beneficiary_account === 'company' &&
              journalRelatedDetails.cash_retention_type === 'Claim' &&
              journalRelatedDetails.claim_type === 'Receivable'
            ) {
              transactionAccountId =
                journalRelatedDetails.payment_to_cash_account;
            } else if (
              entry.beneficiary_account === 'company' &&
              journalRelatedDetails.claim_type === 'Billable' &&
              journalRelatedDetails.cash_retention_type === 'Retention claim'
            ) {
              transactionAccountId =
                journalRelatedDetails.payment_from_cash_account;
            } else if (
              entry.beneficiary_account === 'company' &&
              journalRelatedDetails.claim_type === 'Receivable' &&
              journalRelatedDetails.cash_retention_type === 'Retention claim'
            ) {
              transactionAccountId =
                journalRelatedDetails.payment_to_cash_account;
            } else if (
              entry.beneficiary_account === 'supplier' &&
              journalRelatedDetails.claim_type === 'Billable'
            ) {
              transactionAccountId = journalRelatedDetails.payment_to_account;
            } else if (
              entry.beneficiary_account === 'PTA' &&
              journalRelatedDetails.claim_type === 'Billable'
            ) {
              transactionAccountId = journalRelatedDetails.payment_from_account;
            } else if (
              entry.beneficiary_account === 'PTA' &&
              journalRelatedDetails.claim_type === 'Receivable'
            ) {
              transactionAccountId = journalRelatedDetails.payment_to_account;
            } else if (
              entry.beneficiary_account === 'PTA/RTA' &&
              [
                'Interest Withdrawal',
                'Bank Charge Applied',
                'Withdrawal',
                'Overpayment refund to client',
                'Overpayment to supplier',
                'Underpayment to supplier',
              ].includes(journalRelatedDetails.payment_type)
            ) {
              transactionAccountId = journalRelatedDetails.payment_from_account;
            } else if (
              entry.beneficiary_account === 'company' &&
              [
                'Interest Withdrawal',
                'Bank Charge Applied',
                'Withdrawal',
              ].includes(journalRelatedDetails.payment_type)
            ) {
              transactionAccountId =
                journalRelatedDetails.payment_from_cash_account;
            } else if (
              entry.beneficiary_account === 'supplier' &&
              [
                'Overpayment to supplier',
                'Underpayment to supplier',
                'Overpayment refund from supplier',
              ].includes(journalRelatedDetails.payment_type)
            ) {
              transactionAccountId = journalRelatedDetails.supplier_account;
            } else if (
              entry.beneficiary_account === 'PTA/RTA' &&
              [
                'Interest Received',
                'Bank Charge Top Up',
                'Top Up',
                'Overpayment refund from supplier',
                'Overpayment from client',
                'Underpayment from client',
                'Top Up Retention',
              ].includes(journalRelatedDetails.payment_type)
            ) {
              transactionAccountId = journalRelatedDetails.payment_to_account;
            } else if (
              entry.beneficiary_account === 'company' &&
              [
                'Interest Received',
                'Bank Charge Top Up',
                'Top Up',
                'Top Up Retention',
              ].includes(journalRelatedDetails.payment_type)
            ) {
              transactionAccountId =
                journalRelatedDetails.payment_to_cash_account;
            } else if (
              entry.beneficiary_account === 'client' &&
              [
                'Overpayment from client',
                'Underpayment from client',
                'Overpayment refund to client',
              ].includes(journalRelatedDetails.payment_type)
            ) {
              transactionAccountId = journalRelatedDetails.client_account;
            } else if (
              entry.beneficiary_account === 'supplier' &&
              journalRelatedDetails.payment_to_account_type ===
                'Retention Trust Account' &&
              journalRelatedDetails.payment_type === 'Top Up Retention'
            ) {
              transactionAccountId = journalRelatedDetails.payment_to_account;
            } else if (
              entry.beneficiary_account === 'PTA' &&
              journalRelatedDetails.payment_type === 'Withdrawal'
            ) {
              transactionAccountId = journalRelatedDetails.payment_from_account;
            } else if (
              entry.beneficiary_account === 'RTA' &&
              journalRelatedDetails.payment_type === 'Withdrawal'
            ) {
              transactionAccountId = journalRelatedDetails.payment_from_account;
            } else if (
              entry.beneficiary_account === 'RTA' &&
              journalRelatedDetails.payment_from_account_type ===
                'Retention Trust Account'
            ) {
              transactionAccountId = journalRelatedDetails.payment_from_account;
            } else if (
              entry.beneficiary_account === 'RTA' &&
              journalRelatedDetails.payment_to_account ===
                'Retention Trust Account'
            ) {
              transactionAccountId = journalRelatedDetails.payment_to_account;
            } else if (entry.beneficiary_account === 'RTA') {
              transactionAccountId =
                journalRelatedDetails.retention_from_account;
            }

            if (entry.is_debited) {
              switch (entry.amount_type) {
                case 'claim_amount':
                  {
                    debitAmount = journalRelatedDetails.claim_amount;
                  }
                  break;
                case 'payment_amount':
                  {
                    debitAmount = journalRelatedDetails.payment_amount;
                  }
                  break;
                case 'retention_amount':
                  {
                    debitAmount = journalRelatedDetails.retained_amount;
                  }
                  break;
                case 'pay_less_amount':
                  {
                    debitAmount = journalRelatedDetails.payless_amount;
                  }
                  break;
                case 'zero_amount':
                  {
                    debitAmount = journalRelatedDetails.payment_amount;
                  }
                  break;
              }
            } else {
              switch (entry.amount_type) {
                case 'claim_amount':
                  {
                    creditAmount = journalRelatedDetails.claim_amount;
                  }
                  break;
                case 'payment_amount':
                  {
                    creditAmount = journalRelatedDetails.payment_amount;
                  }
                  break;
                case 'retention_amount':
                  {
                    creditAmount = journalRelatedDetails.retained_amount;
                  }
                  break;
                case 'pay_less_amount':
                  {
                    creditAmount = journalRelatedDetails.payless_amount;
                  }
                  break;
                case 'zero_amount':
                  {
                    creditAmount = journalRelatedDetails.payment_amount;
                  }
                  break;
              }
            }

            switch (entry.date_type) {
              case 'due_date':
                {
                  journal_date = new Date(journalRelatedDetails.due_date);
                }
                break;
              case 'payment_date':
                {
                  journal_date = new Date(journalRelatedDetails.payment_date);
                }
                break;
              case 'input_date':
                {
                  journal_date = new Date(journalRelatedDetails.input_date);
                }
                break;
              case 'received_date':
                {
                  journal_date = new Date(journalRelatedDetails.received_date);
                }
                break;
            }

            if (entry.journal_suffix === 'a') {
              journalId += 1;
            }
            return {
              company_id:
                claim_details?.company_id ?? payment_details?.company_id,
              project_id:
                claim_details?.project_id ?? payment_details?.project_id,
              contract_id: claim_details?.contract_id ?? null,
              supplier_id:
                claim_details?.client_supplier_id ??
                payment_details?.client_supplier_id,
              bank_account_id: bankAccountId,
              journal_number: journalId,
              audit_id: auditId,
              journal_suffix: entry.journal_suffix,
              activity_suffix: entry.activity_suffix,
              journal_date: journal_date,
              journal_description: journalDescription,
              dynamic_values: dynamicValues,
              transaction_account_id:
                Number(transactionAccountId) != 0 ? transactionAccountId : null,
              debit_amount: debitAmount,
              credit_amount: creditAmount,
              balance_amount: balanceAmount,
              journal_process_id: entry.process_id,
              entry_type: entry.entry_type,
              created_on: moment.tz('UTC'),
              created_by: userId,
            };
          }),
        );

        // this.logger.log(`journalPayload: : ${JSON.stringify(journalPayload)}`);
        if (journalPayload && journalPayload.length > 0) {
          await transactionalEntityManager.save(
            this.journalEntriesRepo.create(journalPayload),
          );
          await transactionalEntityManager
            .createQueryBuilder()
            .update(BankAccounts)
            .set({
              last_journal_id: journalId,
              updated_by: userId,
            })
            .where('bank_account_id = :bank_account_id', {
              bank_account_id: bankAccountId,
            })
            .execute();
          resolve(true);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async getJournalRelatedDetailsForClaimsPayments(
    transactionalEntityManager,
    payment_claim_id,
    payment_details,
  ) {
    const queryBuilder = transactionalEntityManager
      .createQueryBuilder(PaymentClaims, 'pc')
      .leftJoinAndSelect(
        ContractDetails,
        'cd',
        'pc.contract_id = cd.contract_id',
      )
      .leftJoinAndSelect(
        ClientSuppliersDetails,
        'cs',
        'pc.client_supplier_id = cs.client_supplier_id',
      )
      .leftJoinAndSelect(ProjectDetails, 'p', 'pc.project_id = p.project_id')
      .leftJoinAndSelect(CompanyDetails, 'c', 'pc.company_id = c.company_id ');

    if (payment_details?.payment_from_account) {
      queryBuilder.leftJoinAndSelect(
        BankAccounts,
        'pf',
        'pf.bank_account_id = :payment_from_account',
        {
          payment_from_account: payment_details.payment_from_account,
        },
      );
    } else {
      queryBuilder.leftJoinAndSelect(
        BankAccounts,
        'pf',
        'pf.bank_account_id = cd.payment_from_account',
      );
    }

    if (payment_details?.payment_to_account) {
      queryBuilder.leftJoinAndSelect(
        BankAccounts,
        'pt',
        'pt.bank_account_id = :payment_to_account',
        { payment_to_account: payment_details.payment_to_account },
      );
    } else {
      queryBuilder.leftJoinAndSelect(
        BankAccounts,
        'pt',
        'pt.bank_account_id = cd.payment_to_account',
      );
    }

    if (payment_details?.retention_account) {
      queryBuilder.leftJoinAndSelect(
        BankAccounts,
        'rf',
        'rf.bank_account_id = :retention_account',
        { retention_account: payment_details?.retention_account },
      );
    } else {
      queryBuilder.leftJoinAndSelect(
        BankAccounts,
        'rf',
        'rf.bank_account_id = cd.retention_from_account',
      );
    }

    queryBuilder
      .leftJoinAndSelect(
        BankAccounts,
        'pfca',
        'pfca.bank_account_id = pf.associated_cash_account_id',
      )
      .leftJoinAndSelect(
        BankAccounts,
        'ptca',
        'ptca.bank_account_id = pt.associated_cash_account_id',
      )
      .leftJoinAndSelect(
        BankAccounts,
        'rfca',
        'rfca.bank_account_id = rf.associated_cash_account_id',
      )
      .leftJoinAndSelect(
        PaymentDetails,
        'pd',
        'pd.payment_claim_id = pc.payment_claim_id and pd.payment_id = :payment_id',
        {
          payment_id: payment_details?.payment_id
            ? payment_details?.payment_id
            : null,
        },
      )
      .leftJoinAndSelect(
        SubPayments,
        'ps',
        `ps.payment_id = pd.payment_id and ps.sub_payment_type = 'Payment'`,
      )
      .leftJoinAndSelect(
        SubPayments,
        'rs',
        `rs.payment_id = pd.payment_id and rs.sub_payment_type IN ('Retention In', 'Retention')`,
      )
      .leftJoinAndSelect(
        SubPayments,
        'rsp',
        `rsp.sub_payment_id = pc.associated_retention_sub_payment_id and rsp.sub_payment_type IN ('Retention In', 'Retention')`,
      )
      .leftJoinAndSelect(
        PaymentDetails,
        'rpd',
        `rpd.payment_id = rsp.payment_id`,
      )
      .select([
        'pc.id AS id',
        `pc.payment_claim_id AS payment_claim_id`,
        `CASE WHEN pc.cash_retention_type = 'Retention claim' THEN rpd.payment_claim_id ELSE NULL END AS parent_payment_claim_id`,
        'pc.company_id AS company_id',
        'pc.claim_type AS claim_type',
        'pc.cash_retention_type AS cash_retention_type',
        'pc.status AS claim_status',
        'pc.project_id AS project_id',
        'pc.contract_id AS contract_id',
        'pc.client_supplier_id AS client_supplier_id',
        'pc.due_date AS due_date',
        'pc.sent_date AS sent_date',
        'pc.received_date AS received_date',
        'pc.claim_amount AS claim_amount',
        'cd.contract_name AS contract_name',
        'cd.client_supplier_role AS client_supplier_role',
        'cd.contract_type AS contract_type',
        'cd.contract_status AS contract_status',
        'cd.contract_date AS contract_date',
        'cd.retention_type AS retention_type',
        'cd.payment_terms AS payment_terms',
        'cd.initial_contract_sum AS initial_contract_sum',
        'pf.bank_account_id AS payment_from_account',
        `rf.bank_account_id AS retention_from_account`,
        'pt.bank_account_id AS payment_to_account',
        `CASE WHEN cs.client_supplier_type = 'Client' THEN cs.client_supplier_name ELSE NULL END AS client_name`,
        `CASE WHEN cs.client_supplier_type = 'Supplier' THEN cs.client_supplier_name ELSE NULL END AS supplier_name`,
        'cs.client_supplier_type AS client_supplier_type',
        'cs.client_supplier_status AS client_supplier_status',
        'cs.related_entity AS related_entity',
        'p.project_name AS project_name',
        'p.project_role AS project_role',
        'p.project_date AS project_date',
        'p.head_contract_sum AS head_contract_sum',
        'p.retention_type AS project_retention_type',
        'p.number_of_units AS number_of_units',
        'p.pta_eligibility AS pta_eligibility',
        'p.rta_eligibility AS rta_eligibility',
        'p.project_status AS project_status',
        'c.company_name AS company_name',
        'pf.account_name AS payment_from_account_name',
        'pf.account_type AS payment_from_account_type',
        'pf.account_number AS payment_from_account_number',
        'pf.bsb_number AS payment_from_account_bsb',
        'pf.associated_cash_account_id AS payment_from_cash_account',
        'pf.last_journal_id AS payment_from_last_journal_id',
        'pt.account_name AS payment_to_account_name',
        'pt.account_type AS payment_to_account_type',
        'pt.account_number AS payment_to_account_number',
        'pt.bsb_number AS payment_to_account_bsb',
        'pt.associated_cash_account_id AS payment_to_cash_account',
        'pt.last_journal_id AS payment_to_last_journal_id',
        'rf.account_name AS retention_from_account_name',
        'rf.account_type AS retention_from_account_type',
        'rf.account_number AS retention_from_account_number',
        'rf.bsb_number AS retention_from_account_bsb',
        'rf.associated_cash_account_id AS retention_from_cash_account',
        'rf.last_journal_id AS retention_from_last_journal_id',
        'pfca.account_name AS payment_from_cash_account_name',
        'pfca.account_type AS payment_from_cash_account_type',
        'pfca.account_number AS payment_from_cash_account_number',
        'pfca.bsb_number AS payment_from_cash_account_bsb',
        'ptca.account_name AS payment_to_cash_account_name',
        'ptca.account_type AS payment_to_cash_account_type',
        'ptca.account_number AS payment_to_cash_account_number',
        'ptca.bsb_number AS payment_to_cash_account_bsb',
        'rfca.account_name AS retention_from_cash_account_name',
        'rfca.account_type AS retention_from_cash_aaccount_type',
        'rfca.account_number AS retention_from_cash_account_number',
        'rfca.bsb_number AS retention_from_cash_account_bsb',
        'pd.payment_id AS payment_id',
        'pd.payment_type AS payment_type',
        'pd.cash_retention AS cash_retention',
        'pd.current_status AS payment_status',
        'pd.payless_amount AS payless_amount',
        'pd.input_date AS input_date',
        `CASE WHEN pd.payment_type IN ('Pay - Zero','3rd Party') THEN pd.total_amount ELSE ABS(ps.amount) END AS payment_amount`,
        `CASE WHEN pd.cash_retention = true THEN ABS(rs.amount) ELSE NULL END AS retained_amount`,
        'pd.payment_date AS payment_date',
      ])
      .where('pc.payment_claim_id = :payment_claim_id', { payment_claim_id });

    const journalRelatedDetails = await queryBuilder.getRawOne();
    return journalRelatedDetails;
  }

  async getJournalRelatedDetailsForOtherPayments(
    transactionalEntityManager,
    payment_id,
  ) {
    const queryBuilder = transactionalEntityManager
      .createQueryBuilder(PaymentDetails, 'pd')
      .leftJoinAndSelect(
        SubPayments,
        'ps',
        `pd.payment_id = ps.payment_id and ps.sub_payment_type = 'Payment'`,
      )
      .leftJoinAndSelect(CompanyDetails, 'c', 'pd.company_id = c.company_id ')
      .leftJoinAndSelect(
        BankAccounts,
        'pf',
        'pf.bank_account_id = pd.payment_from_account',
      )
      .leftJoinAndSelect(
        BankAccounts,
        'pt',
        'pt.bank_account_id = pd.payment_to_account',
      )
      .leftJoinAndSelect(
        BankAccounts,
        'pfca',
        'pfca.bank_account_id = pf.associated_cash_account_id',
      )
      .leftJoinAndSelect(
        BankAccounts,
        'ptca',
        'ptca.bank_account_id = pf.associated_cash_account_id',
      )
      .leftJoinAndSelect(ProjectDetails, 'p', 'pd.project_id = p.project_id')
      .leftJoinAndSelect(
        ClientSuppliersDetails,
        'cs',
        'pd.client_supplier_id = cs.client_supplier_id',
      )
      .leftJoinAndSelect(
        BankAccounts,
        'cba',
        'cs.client_supplier_id = cba.client_supplier_id and pd.client_supplier_id = cba.client_supplier_id and cba.added_by_client_supplier = true',
      )
      .leftJoinAndSelect(
        PaymentDetails,
        'ap',
        'pd.associated_payment_id = ap.payment_id',
      )
      .leftJoinAndSelect(
        BankAccounts,
        'appt',
        'appt.bank_account_id = ap.payment_to_account',
      )
      .select([
        'pd.id AS id',
        'pd.payment_id AS payment_id',
        'pd.payment_type AS payment_type',
        'pd.payment_claim_id AS payment_claim_id',
        'pd.cash_retention AS cash_retention',
        'pd.current_status AS payment_status',
        'pd.payless_amount AS payless_amount',
        `pd.total_amount AS payment_amount`,
        'pd.payment_date AS payment_date',
        'pd.input_date AS input_date',
        'pd.company_id AS company_id',
        'pd.project_id AS project_id',
        'pd.client_supplier_id AS client_supplier_id',
        'pd.payment_from_account AS payment_from_account',
        `pd.retention_account AS retention_from_account`,
        'pd.payment_to_account AS payment_to_account',
        `CASE WHEN cs.client_supplier_type = 'Client' THEN cs.client_supplier_name ELSE NULL END AS client_name`,
        `CASE WHEN cs.client_supplier_type = 'Supplier' THEN cs.client_supplier_name ELSE NULL END AS supplier_name`,
        'cs.client_supplier_type AS client_supplier_type',
        'cs.client_supplier_status AS client_supplier_status',
        'cs.related_entity AS related_entity',
        'p.project_name AS project_name',
        'p.project_role AS project_role',
        'p.project_date AS project_date',
        'p.head_contract_sum AS head_contract_sum',
        'p.retention_type AS project_retention_type',
        'p.number_of_units AS number_of_units',
        'p.pta_eligibility AS pta_eligibility',
        'p.rta_eligibility AS rta_eligibility',
        'p.project_status AS project_status',
        'c.company_name AS company_name',
        'pf.account_name AS payment_from_account_name',
        'pf.account_type AS payment_from_account_type',
        'pf.account_number AS payment_from_account_number',
        'pf.bsb_number AS payment_from_account_bsb',
        'pf.associated_cash_account_id AS payment_from_cash_account',
        'pf.last_journal_id AS payment_from_last_journal_id',
        'pt.account_name AS payment_to_account_name',
        'pt.account_type AS payment_to_account_type',
        'pt.account_number AS payment_to_account_number',
        'pt.bsb_number AS payment_to_account_bsb',
        'pt.associated_cash_account_id AS payment_to_cash_account',
        'pt.last_journal_id AS payment_to_last_journal_id',
        'pfca.account_name AS payment_from_cash_account_name',
        'pfca.account_type AS payment_from_cash_account_type',
        'pfca.account_number AS payment_from_cash_account_number',
        'pfca.bsb_number AS payment_from_cash_account_bsb',
        'ptca.account_name AS payment_to_cash_account_name',
        'ptca.account_type AS payment_to_cash_account_type',
        'ptca.account_number AS payment_to_cash_account_number',
        'ptca.bsb_number AS payment_to_cash_account_bsb',
        'ap.payment_to_account AS supplier_account',
        'appt.account_name AS supplier_account_name',
        'appt.account_type AS supplier_account_type',
        'appt.account_number AS supplier_account_number',
        'appt.bsb_number AS supplier_account_bsb',
        `CASE WHEN cba.bank_account_id IS NULL THEN 00000000000 ELSE cba.bank_account_id END AS client_account`,
        'cba.account_name AS client_account_name',
        'cba.account_type AS client_account_type',
        'cba.account_number AS client_account_number',
        'cba.bsb_number AS client_account_bsb',
      ])
      .where('pd.payment_id = :payment_id', { payment_id });

    const journalRelatedDetails = await queryBuilder.getRawOne();
    // console.log(
    //   'journalRelatedDetails in Other Payments: ',
    //   journalRelatedDetails,
    // );
    return journalRelatedDetails;
  }

  async replaceVariables(
    template: string,
    variables: Record<string, string>,
  ): Promise<string> {
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

  async createJournals(
    transactionalEntityManager,
    claimDetails?: any,
    paymentDetails?: any,
    sub_payment_type?: any,
    element?: any,
    filteredSubPayments?: any,
    undoJournal?: any,
    userID?: any,
  ): Promise<boolean> {
    try {
      let showJournalMessage = false;
      const otherPayments = [
        'Interest Received',
        'Interest Withdrawal',
        'Bank Charge Applied',
        'Bank Charge Top Up',
        'Top Up',
        'Withdrawal',
        'Overpayment refund from supplier',
        'Overpayment refund to client',
        'Overpayment to supplier',
        'Underpayment to supplier',
        'Overpayment from client',
        'Underpayment from client',
        'Top Up Retention',
      ];
      if (!undoJournal) {
        if (
          paymentDetails?.payment_claim_id &&
          claimDetails &&
          !otherPayments.includes(paymentDetails?.payment_type)
        ) {
          if (claimDetails.cash_retention_type === 'Claim') {
            if (
              paymentDetails.payment_type === 'Full' ||
              paymentDetails.payment_type === 'Part' ||
              paymentDetails.payment_type === 'Pay Less - Full' ||
              paymentDetails.payment_type === 'Pay Less - Part'
            ) {
              if (
                sub_payment_type === 'Payment' &&
                !paymentDetails.cash_retention &&
                claimDetails?.claim_type === 'Billable'
              ) {
                const account_details =
                  await transactionalEntityManager.findOne(BankAccounts, {
                    where: {
                      bank_account_id: paymentDetails?.payment_from_account,
                    },
                  });
                if (
                  account_details &&
                  (account_details.account_type === 'Project Trust Account' ||
                    account_details.account_type === 'Cash Account')
                ) {
                  showJournalMessage = await this.createJournalEntries(
                    transactionalEntityManager,
                    6,
                    claimDetails,
                    paymentDetails?.payment_from_account,
                    paymentDetails?.payment_claim_id,
                    paymentDetails,
                    userID,
                  );
                }
              } else if (
                sub_payment_type === 'Payment' &&
                paymentDetails.cash_retention &&
                claimDetails?.claim_type === 'Billable'
              ) {
                const account_details =
                  await transactionalEntityManager.findOne(BankAccounts, {
                    where: {
                      bank_account_id: paymentDetails?.payment_from_account,
                    },
                  });
                if (
                  account_details &&
                  (account_details.account_type === 'Project Trust Account' ||
                    account_details.account_type === 'Cash Account')
                ) {
                  showJournalMessage = await this.createJournalEntries(
                    transactionalEntityManager,
                    8,
                    claimDetails,
                    paymentDetails?.payment_from_account,
                    paymentDetails?.payment_claim_id,
                    paymentDetails,
                    userID,
                  );
                }
                const retention_payment_details =
                  await transactionalEntityManager
                    .createQueryBuilder(SubPayments, 'sp')
                    .select([
                      'sp.sub_payment_type AS sub_payment_type',
                      'sp.sub_payment_id AS sub_payment_id',
                      'sp.status AS status',
                      'sp.amount AS retained_amount',
                      'sp.payment_id AS payment_id',
                      'pd.payment_type AS payment_type',
                      'pd.company_id AS created_by',
                      'pd.client_supplier_id AS client_supplier_id',
                    ])
                    .leftJoin(
                      PaymentDetails,
                      'pd',
                      'sp.payment_id = pd.payment_id',
                    )
                    .where(`sp.payment_id = :payment_id`, {
                      payment_id: paymentDetails.payment_id,
                    })
                    .andWhere(
                      `sp.sub_payment_type IN ('Retention Out', 'Retention In') AND sp.status = 'Auto matched'`,
                    )
                    .getRawMany();

                if (
                  retention_payment_details &&
                  retention_payment_details.length > 0 &&
                  retention_payment_details[0] !== null
                ) {
                  for (const element of retention_payment_details) {
                    if (element.sub_payment_type === 'Retention Out') {
                      const account_details =
                        await transactionalEntityManager.findOne(BankAccounts, {
                          where: {
                            bank_account_id:
                              paymentDetails?.payment_from_account,
                          },
                        });
                      if (
                        account_details &&
                        account_details.account_type === 'Cash Account'
                      ) {
                        showJournalMessage = await this.createJournalEntries(
                          transactionalEntityManager,
                          10,
                          claimDetails,
                          paymentDetails.payment_from_account,
                          paymentDetails?.payment_claim_id,
                          paymentDetails,
                          userID,
                        );
                      }
                    } else if (element.sub_payment_type === 'Retention In') {
                      const account_details =
                        await transactionalEntityManager.findOne(BankAccounts, {
                          where: {
                            bank_account_id: paymentDetails?.retention_account,
                          },
                        });
                      if (
                        account_details &&
                        account_details.account_type === 'Cash Account'
                      ) {
                        showJournalMessage = await this.createJournalEntries(
                          transactionalEntityManager,
                          9,
                          claimDetails,
                          paymentDetails?.retention_account,
                          paymentDetails?.payment_claim_id,
                          paymentDetails,
                          userID,
                        );
                      }
                    }
                  }
                }
              } else if (
                sub_payment_type === 'Retention Out' &&
                paymentDetails.cash_retention &&
                claimDetails?.claim_type === 'Billable'
              ) {
                const account_details =
                  await transactionalEntityManager.findOne(BankAccounts, {
                    where: {
                      bank_account_id: paymentDetails?.payment_from_account,
                    },
                  });
                if (
                  account_details &&
                  (account_details.account_type === 'Project Trust Account' ||
                    account_details.account_type === 'Cash Account')
                ) {
                  showJournalMessage = await this.createJournalEntries(
                    transactionalEntityManager,
                    10,
                    claimDetails,
                    paymentDetails.payment_from_account,
                    paymentDetails?.payment_claim_id,
                    paymentDetails,
                    userID,
                  );
                }
              } else if (
                sub_payment_type === 'Retention In' &&
                paymentDetails.cash_retention &&
                claimDetails?.claim_type === 'Billable'
              ) {
                const account_details =
                  await transactionalEntityManager.findOne(BankAccounts, {
                    where: {
                      bank_account_id: paymentDetails?.retention_account,
                    },
                  });
                if (
                  account_details &&
                  (account_details.account_type === 'Retention Trust Account' ||
                    account_details.account_type === 'Cash Account')
                ) {
                  showJournalMessage = await this.createJournalEntries(
                    transactionalEntityManager,
                    9,
                    claimDetails,
                    paymentDetails?.retention_account,
                    paymentDetails?.payment_claim_id,
                    paymentDetails,
                    userID,
                  );
                }
              } else if (
                sub_payment_type === 'Payment' &&
                claimDetails?.claim_type === 'Receivable'
              ) {
                const account_details =
                  await transactionalEntityManager.findOne(BankAccounts, {
                    where: {
                      bank_account_id: paymentDetails?.payment_to_account,
                    },
                  });
                if (
                  account_details &&
                  (account_details.account_type === 'Project Trust Account' ||
                    account_details.account_type === 'Cash Account')
                ) {
                  showJournalMessage = await this.createJournalEntries(
                    transactionalEntityManager,
                    19,
                    claimDetails,
                    paymentDetails?.payment_to_account,
                    paymentDetails?.payment_claim_id,
                    paymentDetails,
                    userID,
                  );
                }
              }
            }
          } else {
            const bankAccountId =
              claimDetails?.claim_type === 'Billable'
                ? paymentDetails.payment_from_account
                : paymentDetails.payment_to_account;
            const payment_contract_details =
              await transactionalEntityManager.findOne(BankAccounts, {
                where: {
                  bank_account_id: bankAccountId,
                },
              });

            if (
              paymentDetails.payment_type === 'Full' ||
              paymentDetails.payment_type === 'Part' ||
              paymentDetails.payment_type === 'Pay Less - Full' ||
              paymentDetails.payment_type === 'Pay Less - Part'
            ) {
              if (
                payment_contract_details &&
                (payment_contract_details.account_type ===
                  'Retention Trust Account' ||
                  payment_contract_details.account_type === 'Cash Account') &&
                sub_payment_type === 'Payment' &&
                claimDetails?.claim_type === 'Billable'
              ) {
                showJournalMessage = await this.createJournalEntries(
                  transactionalEntityManager,
                  7,
                  claimDetails,
                  bankAccountId,
                  paymentDetails?.payment_claim_id,
                  paymentDetails,
                  userID,
                );
              } else if (
                payment_contract_details &&
                (payment_contract_details.account_type ===
                  'Project Trust Account' ||
                  payment_contract_details.account_type === 'Cash Account') &&
                sub_payment_type === 'Payment' &&
                claimDetails?.claim_type === 'Receivable'
              ) {
                showJournalMessage = await this.createJournalEntries(
                  transactionalEntityManager,
                  19,
                  claimDetails,
                  bankAccountId,
                  paymentDetails?.payment_claim_id,
                  paymentDetails,
                  userID,
                );
              }
            }
          }
        } else if (otherPayments.includes(paymentDetails?.payment_type)) {
          const bankAccountId = [
            'Interest Withdrawal',
            'Bank Charge Applied',
            'Withdrawal',
            'Overpayment refund to client',
            'Overpayment to supplier',
            'Underpayment to supplier',
          ].includes(paymentDetails?.payment_type)
            ? paymentDetails.payment_from_account
            : paymentDetails.payment_to_account;
          const account_details = bankAccountId
            ? await transactionalEntityManager.findOne(BankAccounts, {
                where: {
                  bank_account_id: bankAccountId,
                },
              })
            : null;
          // this.logger.log(`account_details: ${JSON.stringify(account_details)}`);
          if (
            bankAccountId &&
            account_details &&
            sub_payment_type === 'Payment'
          ) {
            if (paymentDetails.payment_type === 'Interest Received') {
              showJournalMessage = await this.createJournalEntries(
                transactionalEntityManager,
                12,
                null,
                bankAccountId,
                null,
                paymentDetails,
                userID,
              );
            } else if (paymentDetails.payment_type === 'Interest Withdrawal') {
              showJournalMessage = await this.createJournalEntries(
                transactionalEntityManager,
                17,
                null,
                bankAccountId,
                null,
                paymentDetails,
                userID,
              );
            } else if (paymentDetails.payment_type === 'Bank Charge Applied') {
              showJournalMessage = await this.createJournalEntries(
                transactionalEntityManager,
                4,
                null,
                bankAccountId,
                null,
                paymentDetails,
                userID,
              );
            } else if (paymentDetails.payment_type === 'Bank Charge Top Up') {
              showJournalMessage = await this.createJournalEntries(
                transactionalEntityManager,
                43,
                null,
                bankAccountId,
                null,
                paymentDetails,
                userID,
              );
            } else if (paymentDetails.payment_type === 'Top Up') {
              showJournalMessage = await this.createJournalEntries(
                transactionalEntityManager,
                43,
                null,
                bankAccountId,
                null,
                paymentDetails,
                userID,
              );
            } else if (
              paymentDetails.payment_type === 'Withdrawal' &&
              account_details.account_type === 'Project Trust Account'
            ) {
              showJournalMessage = await this.createJournalEntries(
                transactionalEntityManager,
                1,
                null,
                bankAccountId,
                null,
                paymentDetails,
                userID,
              );
            } else if (
              paymentDetails.payment_type === 'Withdrawal' &&
              account_details.account_type === 'Retention Trust Account'
            ) {
              showJournalMessage = await this.createJournalEntries(
                transactionalEntityManager,
                2,
                null,
                bankAccountId,
                null,
                paymentDetails,
                userID,
              );
            } else if (
              paymentDetails.payment_type === 'Overpayment refund from supplier'
            ) {
              showJournalMessage = await this.createJournalEntries(
                transactionalEntityManager,
                13,
                null,
                bankAccountId,
                null,
                paymentDetails,
                userID,
              );
            } else if (
              paymentDetails.payment_type === 'Overpayment refund to client'
            ) {
              showJournalMessage = await this.createJournalEntries(
                transactionalEntityManager,
                56,
                null,
                bankAccountId,
                null,
                paymentDetails,
                userID,
              );
            } else if (
              paymentDetails.payment_type === 'Overpayment to supplier'
            ) {
              showJournalMessage = await this.createJournalEntries(
                transactionalEntityManager,
                48,
                null,
                bankAccountId,
                null,
                paymentDetails,
                userID,
              );
            } else if (
              paymentDetails.payment_type === 'Underpayment to supplier'
            ) {
              showJournalMessage = await this.createJournalEntries(
                transactionalEntityManager,
                50,
                null,
                bankAccountId,
                null,
                paymentDetails,
                userID,
              );
            } else if (
              paymentDetails.payment_type === 'Overpayment from client'
            ) {
              showJournalMessage = await this.createJournalEntries(
                transactionalEntityManager,
                52,
                null,
                bankAccountId,
                null,
                paymentDetails,
                userID,
              );
            } else if (
              paymentDetails.payment_type === 'Underpayment from client'
            ) {
              showJournalMessage = await this.createJournalEntries(
                transactionalEntityManager,
                54,
                null,
                bankAccountId,
                null,
                paymentDetails,
                userID,
              );
            } else if (paymentDetails.payment_type === 'Top Up Retention') {
              showJournalMessage = await this.createJournalEntries(
                transactionalEntityManager,
                42,
                null,
                bankAccountId,
                null,
                paymentDetails,
                userID,
              );
            }
          }
        }
      } else {
        if (
          element.payment_claim_id &&
          claimDetails &&
          !otherPayments.includes(element?.payment_type)
        ) {
          if (claimDetails.cash_retention_type === 'Claim') {
            if (
              element.payment_type === 'Full' ||
              element.payment_type === 'Part' ||
              element.payment_type === 'Pay Less - Full' ||
              element.payment_type === 'Pay Less - Part'
            ) {
              this.logger.log(JSON.stringify({ filteredSubPayments }));
              for (const payment of filteredSubPayments) {
                const subPaymentDetails =
                  await transactionalEntityManager.findOne(SubPayments, {
                    where: { sub_payment_id: payment?.sub_payment_id },
                  });
                this.logger.log(JSON.stringify({ subPaymentDetails }));
                if (
                  subPaymentDetails &&
                  subPaymentDetails?.status === 'Unmatched'
                ) {
                  if (
                    payment.sub_payment_type === 'Payment' &&
                    !element.cash_retention &&
                    claimDetails?.claim_type === 'Billable' &&
                    !subPaymentDetails?.is_paid_confirmed
                  ) {
                    if (element.payment_type === 'Full') {
                      const account_details =
                        await transactionalEntityManager.findOne(BankAccounts, {
                          where: {
                            bank_account_id: element?.payment_from_account,
                          },
                        });
                      if (
                        account_details &&
                        (account_details.account_type ===
                          'Project Trust Account' ||
                          account_details.account_type === 'Cash Account')
                      ) {
                        showJournalMessage = await this.createJournalEntries(
                          transactionalEntityManager,
                          25,
                          claimDetails,
                          element?.payment_from_account,
                          element?.payment_claim_id,
                          element,
                          userID,
                        );
                      }
                    } else if (
                      element.payment_type === 'Part' ||
                      element.payment_type === 'Pay Less - Full' ||
                      element.payment_type === 'Pay Less - Part'
                    ) {
                      const account_details =
                        await transactionalEntityManager.findOne(BankAccounts, {
                          where: {
                            bank_account_id: element?.payment_from_account,
                          },
                        });
                      if (
                        account_details &&
                        (account_details.account_type ===
                          'Project Trust Account' ||
                          account_details.account_type === 'Cash Account')
                      ) {
                        showJournalMessage = await this.createJournalEntries(
                          transactionalEntityManager,
                          24,
                          claimDetails,
                          element?.payment_from_account,
                          element?.payment_claim_id,
                          element,
                          userID,
                        );
                      }
                    }
                  } else if (
                    payment.sub_payment_type === 'Payment' &&
                    element.cash_retention &&
                    claimDetails?.claim_type === 'Billable' &&
                    !subPaymentDetails?.is_paid_confirmed
                  ) {
                    const account_details =
                      await transactionalEntityManager.findOne(BankAccounts, {
                        where: {
                          bank_account_id: element?.payment_from_account,
                        },
                      });
                    if (
                      account_details &&
                      (account_details.account_type ===
                        'Project Trust Account' ||
                        account_details.account_type === 'Cash Account')
                    ) {
                      showJournalMessage = await this.createJournalEntries(
                        transactionalEntityManager,
                        26,
                        claimDetails,
                        element?.payment_from_account,
                        element?.payment_claim_id,
                        element,
                        userID,
                      );
                    }

                    const retention_payment_details =
                      await transactionalEntityManager
                        .createQueryBuilder(SubPayments, 'sp')
                        .select([
                          'sp.sub_payment_type AS sub_payment_type',
                          'sp.sub_payment_id AS sub_payment_id',
                          'sp.status AS status',
                          'sp.amount AS retained_amount',
                          'sp.payment_id AS payment_id',
                          'pd.payment_type AS payment_type',
                          'pd.company_id AS created_by',
                          'pd.client_supplier_id AS client_supplier_id',
                        ])
                        .leftJoin(
                          PaymentDetails,
                          'pd',
                          'sp.payment_id = pd.payment_id',
                        )
                        .where(`sp.payment_id = :payment_id`, {
                          payment_id: element.payment_id,
                        })
                        .andWhere(
                          `sp.sub_payment_type IN ('Retention Out', 'Retention In') AND sp.status = 'Auto matched'`,
                        )
                        .getRawMany();
                    // console.log(
                    //   'retention_payment_details::::unmatch transaction:::',
                    //   retention_payment_details,
                    // );

                    if (
                      retention_payment_details &&
                      retention_payment_details.length > 0 &&
                      retention_payment_details[0] !== null
                    ) {
                      for (const subelement of retention_payment_details) {
                        if (subelement.sub_payment_type === 'Retention Out') {
                          const account_details =
                            await transactionalEntityManager.findOne(
                              BankAccounts,
                              {
                                where: {
                                  bank_account_id:
                                    element?.payment_from_account,
                                },
                              },
                            );
                          if (
                            account_details &&
                            account_details.account_type === 'Cash Account'
                          ) {
                            showJournalMessage =
                              await this.createJournalEntries(
                                transactionalEntityManager,
                                28,
                                claimDetails,
                                element?.payment_from_account,
                                element?.payment_claim_id,
                                element,
                                userID,
                              );
                          }
                        } else if (
                          subelement.sub_payment_type === 'Retention In'
                        ) {
                          const account_details =
                            await transactionalEntityManager.findOne(
                              BankAccounts,
                              {
                                where: {
                                  bank_account_id: element?.retention_account,
                                },
                              },
                            );
                          if (
                            account_details &&
                            account_details.account_type === 'Cash Account'
                          ) {
                            showJournalMessage =
                              await this.createJournalEntries(
                                transactionalEntityManager,
                                27,
                                claimDetails,
                                element?.retention_account,
                                element?.payment_claim_id,
                                element,
                                userID,
                              );
                          }
                        }
                      }
                    }
                  } else if (
                    payment.sub_payment_type === 'Retention Out' &&
                    element.cash_retention &&
                    claimDetails?.claim_type === 'Billable' &&
                    !subPaymentDetails?.is_retention_confirmed
                  ) {
                    const account_details =
                      await transactionalEntityManager.findOne(BankAccounts, {
                        where: {
                          bank_account_id: element?.payment_from_account,
                        },
                      });
                    if (
                      account_details &&
                      (account_details.account_type ===
                        'Project Trust Account' ||
                        account_details.account_type === 'Cash Account')
                    ) {
                      showJournalMessage = await this.createJournalEntries(
                        transactionalEntityManager,
                        28,
                        claimDetails,
                        element?.payment_from_account,
                        element?.payment_claim_id,
                        element,
                        userID,
                      );
                    }
                  } else if (
                    payment.sub_payment_type === 'Retention In' &&
                    element.cash_retention &&
                    claimDetails?.claim_type === 'Billable'
                  ) {
                    const matchingRetentionOut = filteredSubPayments?.find(
                      (p) => p.sub_payment_type === 'Retention Out',
                    );

                    this.logger.log(JSON.stringify({ matchingRetentionOut }));
                    const matchingRetentionOutDetails = matchingRetentionOut
                      ? await transactionalEntityManager.findOne(SubPayments, {
                          where: {
                            sub_payment_id:
                              matchingRetentionOut?.sub_payment_id,
                          },
                        })
                      : null;
                    this.logger.log(JSON.stringify({ matchingRetentionOutDetails }));
                    if (
                      matchingRetentionOutDetails &&
                      matchingRetentionOutDetails?.status === 'Unmatched' &&
                      !matchingRetentionOutDetails?.is_retention_confirmed
                    ) {
                      const account_details =
                        await transactionalEntityManager.findOne(BankAccounts, {
                          where: {
                            bank_account_id: element?.retention_account,
                          },
                        });
                      if (
                        account_details &&
                        (account_details.account_type ===
                          'Retention Trust Account' ||
                          account_details.account_type === 'Cash Account')
                      ) {
                        showJournalMessage = await this.createJournalEntries(
                          transactionalEntityManager,
                          27,
                          claimDetails,
                          element?.retention_account,
                          element?.payment_claim_id,
                          element,
                          userID,
                        );
                      }
                    }
                  } else if (
                    payment.sub_payment_type === 'Payment' &&
                    claimDetails?.claim_type === 'Receivable' &&
                    !subPaymentDetails?.is_received_confirmed
                  ) {
                    const account_details =
                      await transactionalEntityManager.findOne(BankAccounts, {
                        where: {
                          bank_account_id: element?.payment_to_account,
                        },
                      });
                    if (
                      account_details &&
                      (account_details.account_type ===
                        'Project Trust Account' ||
                        account_details.account_type === 'Cash Account')
                    ) {
                      showJournalMessage = await this.createJournalEntries(
                        transactionalEntityManager,
                        38,
                        claimDetails,
                        element?.payment_to_account,
                        element?.payment_claim_id,
                        element,
                        userID,
                      );
                    }
                  }
                }
              }
            }
          } else {
            const bankAccountId =
              claimDetails?.claim_type === 'Billable'
                ? element.payment_from_account
                : element.payment_to_account;
            const payment_contract_details = bankAccountId
              ? await transactionalEntityManager.findOne(BankAccounts, {
                  where: {
                    bank_account_id: bankAccountId,
                  },
                })
              : null;

            if (
              element.payment_type === 'Full' ||
              element.payment_type === 'Part' ||
              element.payment_type === 'Pay Less - Full' ||
              element.payment_type === 'Pay Less - Part'
            ) {
              for (const payment of filteredSubPayments) {
                const subPaymentDetails =
                  await transactionalEntityManager.findOne(SubPayments, {
                    where: { sub_payment_id: payment?.sub_payment_id },
                  });
                if (
                  subPaymentDetails &&
                  subPaymentDetails?.status === 'Unmatched'
                ) {
                  if (
                    payment_contract_details &&
                    (payment_contract_details.account_type ===
                      'Retention Trust Account' ||
                      payment_contract_details.account_type ===
                        'Cash Account') &&
                    payment.sub_payment_type === 'Payment' &&
                    claimDetails?.claim_type === 'Billable' &&
                    !subPaymentDetails?.is_paid_confirmed
                  ) {
                    showJournalMessage = await this.createJournalEntries(
                      transactionalEntityManager,
                      29,
                      claimDetails,
                      bankAccountId,
                      element.payment_claim_id,
                      element,
                      userID,
                    );
                  } else if (
                    payment_contract_details &&
                    (payment_contract_details.account_type ===
                      'Project Trust Account' ||
                      payment_contract_details.account_type ===
                        'Cash Account') &&
                    payment.sub_payment_type === 'Payment' &&
                    claimDetails?.claim_type === 'Receivable' &&
                    !subPaymentDetails?.is_received_confirmed
                  ) {
                    showJournalMessage = await this.createJournalEntries(
                      transactionalEntityManager,
                      38,
                      claimDetails,
                      bankAccountId,
                      element.payment_claim_id,
                      element,
                      userID,
                    );
                  }
                }
              }
            }
          }
        } else if (otherPayments.includes(element?.payment_type)) {
          const paidAccounts = [
            'Interest Withdrawal',
            'Bank Charge Applied',
            'Withdrawal',
            'Overpayment refund to client',
            'Overpayment to supplier',
            'Underpayment to supplier',
          ];
          const subPaymentDetails = await transactionalEntityManager.findOne(
            SubPayments,
            {
              where: {
                sub_payment_id: element?.subPayments[0]?.sub_payment_id,
              },
            },
          );
          if (
            subPaymentDetails &&
            subPaymentDetails?.status === 'Unmatched' &&
            ((paidAccounts.includes(element?.payment_type) &&
              !subPaymentDetails?.is_paid_confirmed) ||
              (!paidAccounts.includes(element?.payment_type) &&
                !subPaymentDetails?.is_received_confirmed))
          ) {
            const bankAccountId = paidAccounts.includes(element?.payment_type)
              ? element.payment_from_account
              : element.payment_to_account;

            const account_details = bankAccountId
              ? await transactionalEntityManager.findOne(BankAccounts, {
                  where: {
                    bank_account_id: bankAccountId,
                  },
                })
              : null;
            if (
              bankAccountId &&
              account_details &&
              element.subPayments[0].sub_payment_type === 'Payment'
            ) {
              if (element.payment_type === 'Interest Received') {
                showJournalMessage = await this.createJournalEntries(
                  transactionalEntityManager,
                  30,
                  null,
                  bankAccountId,
                  null,
                  element,
                  userID,
                );
              } else if (element.payment_type === 'Interest Withdrawal') {
                showJournalMessage = await this.createJournalEntries(
                  transactionalEntityManager,
                  36,
                  null,
                  bankAccountId,
                  null,
                  element,
                  userID,
                );
              } else if (element.payment_type === 'Bank Charge Applied') {
                showJournalMessage = await this.createJournalEntries(
                  transactionalEntityManager,
                  23,
                  null,
                  bankAccountId,
                  null,
                  element,
                  userID,
                );
              } else if (element.payment_type === 'Bank Charge Top Up') {
                showJournalMessage = await this.createJournalEntries(
                  transactionalEntityManager,
                  40,
                  null,
                  bankAccountId,
                  null,
                  element,
                  userID,
                );
              } else if (element.payment_type === 'Top Up') {
                showJournalMessage = await this.createJournalEntries(
                  transactionalEntityManager,
                  40,
                  null,
                  bankAccountId,
                  null,
                  element,
                  userID,
                );
              } else if (
                element.payment_type === 'Withdrawal' &&
                account_details.account_type === 'Project Trust Account'
              ) {
                showJournalMessage = await this.createJournalEntries(
                  transactionalEntityManager,
                  20,
                  null,
                  bankAccountId,
                  null,
                  element,
                  userID,
                );
              } else if (
                element.payment_type === 'Withdrawal' &&
                account_details.account_type === 'Retention Trust Account'
              ) {
                showJournalMessage = await this.createJournalEntries(
                  transactionalEntityManager,
                  21,
                  null,
                  bankAccountId,
                  null,
                  element,
                  userID,
                );
              } else if (
                element.payment_type === 'Overpayment refund from supplier'
              ) {
                showJournalMessage = await this.createJournalEntries(
                  transactionalEntityManager,
                  31,
                  null,
                  bankAccountId,
                  null,
                  element,
                  userID,
                );
              } else if (
                element.payment_type === 'Overpayment refund to client'
              ) {
                showJournalMessage = await this.createJournalEntries(
                  transactionalEntityManager,
                  57,
                  null,
                  bankAccountId,
                  null,
                  element,
                  userID,
                );
              } else if (element.payment_type === 'Overpayment to supplier') {
                showJournalMessage = await this.createJournalEntries(
                  transactionalEntityManager,
                  49,
                  null,
                  bankAccountId,
                  null,
                  element,
                  userID,
                );
              } else if (element.payment_type === 'Underpayment to supplier') {
                showJournalMessage = await this.createJournalEntries(
                  transactionalEntityManager,
                  51,
                  null,
                  bankAccountId,
                  null,
                  element,
                  userID,
                );
              } else if (element.payment_type === 'Overpayment from client') {
                showJournalMessage = await this.createJournalEntries(
                  transactionalEntityManager,
                  53,
                  null,
                  bankAccountId,
                  null,
                  element,
                  userID,
                );
              } else if (element.payment_type === 'Underpayment from client') {
                showJournalMessage = await this.createJournalEntries(
                  transactionalEntityManager,
                  55,
                  null,
                  bankAccountId,
                  null,
                  element,
                  userID,
                );
              } else if (element.payment_type === 'Top Up Retention') {
                showJournalMessage = await this.createJournalEntries(
                  transactionalEntityManager,
                  39,
                  null,
                  bankAccountId,
                  null,
                  element,
                  userID,
                );
              }
            }
          }
        }
      }

      return showJournalMessage;
    } catch (error) {
      this.logger.error(error);
      throw new Error(error);
    }
  }

  /**
   * Hourly contract auto-uplift.
   * For supplier contracts marked as `Hourly`, when a Billable claim
   * (Confirmed or Draft) is saved/edited and the new claim amount exceeds
   * the contract's pending amount, automatically create one Agreed
   * variation for the shortfall instead of showing the exceed warning modal.
   * Best-effort: any failure is logged but does not block the claim save.
   */
  private async maybeAutoUpliftForHourlyContract(
    txEm: EntityManager,
    decoded: any,
    data: {
      contract_id?: number;
      project_id?: number;
      company_id: number;
      claim_type?: string;
      status?: string;
      claim_amount?: number;
    },
    payment_claim_id: number,
    userId?: number,
  ) {
    try {
      if (!data?.contract_id || !data?.claim_amount) return;
      if (data.claim_type !== 'Billable') return;
      if (data.status !== 'Confirmed' && data.status !== 'Draft') return;

      const contract = await txEm.findOne(ContractDetails, {
        where: { contract_id: data.contract_id },
      });
      if (!contract) return;
      if ((contract.contract_billing_type || 'Fixed') !== 'Hourly') return;

      const variationsRow = await txEm
        .createQueryBuilder(VariationDetails, 'v')
        .select('COALESCE(SUM(v.variation_amount), 0)', 'sum')
        .where("v.variation_status = 'Agreed'")
        .andWhere('v.contract_id = :cid', { cid: data.contract_id })
        .getRawOne<{ sum: string }>();
      const variationsSum = Number(variationsRow?.sum || 0);

      const claimsRow = await txEm
        .createQueryBuilder(PaymentClaims, 'pc')
        .select('COALESCE(SUM(pc.claim_amount), 0)', 'sum')
        .where('pc.contract_id = :cid', { cid: data.contract_id })
        .andWhere('pc.payment_claim_id <> :pid', { pid: payment_claim_id })
        .andWhere("pc.claim_type = 'Billable'")
        .andWhere("pc.status NOT IN ('Draft', 'Deleted')")
        .getRawOne<{ sum: string }>();
      const priorClaimsSum = Number(claimsRow?.sum || 0);

      const initial = Number(contract.initial_contract_sum || 0);
      const newClaim = Number(data.claim_amount);
      const variationName = `Auto uplift — Claim #${payment_claim_id}`;

      // Look up any existing auto-uplift variation for this claim. We need to
      // exclude its amount from the variations sum so the pending calc
      // doesn't double-count the previous uplift.
      const existingAutoVariation = await txEm.findOne(VariationDetails, {
        where: {
          company_id: data.company_id,
          contract_id: data.contract_id,
          variation_name: variationName,
        },
      });
      const existingAutoAmount =
        existingAutoVariation &&
        existingAutoVariation.variation_status === 'Agreed' &&
        !existingAutoVariation.is_archived
          ? Number(existingAutoVariation.variation_amount || 0)
          : 0;

      const pending =
        initial + (variationsSum - existingAutoAmount) - priorClaimsSum;

      if (newClaim <= pending) {
        // No shortfall on this claim. If a prior auto-uplift variation
        // exists, archive it so contract headroom isn't permanently
        // overstated.
        if (existingAutoVariation && !existingAutoVariation.is_archived) {
          existingAutoVariation.variation_amount = 0;
          existingAutoVariation.is_archived = true;
          existingAutoVariation.variation_status = 'Archived';
          existingAutoVariation.updated_by =
            userId ?? decoded?.userId ?? existingAutoVariation.updated_by;
          existingAutoVariation.updated_group = 'USER';
          await txEm.save(existingAutoVariation);
          this.logger.log(
            `Hourly auto-uplift archived (no shortfall): contract ${data.contract_id}, claim ${payment_claim_id}`,
          );
        }
        return;
      }

      const shortfall = Number((newClaim - pending).toFixed(2));
      if (shortfall <= 0) return;

      // Enforce exactly one auto-uplift variation per claim: reuse the one
      // looked up above if present; otherwise insert a new Agreed variation.
      let savedVariation: VariationDetails;
      if (existingAutoVariation) {
        existingAutoVariation.variation_amount = shortfall;
        existingAutoVariation.variation_status = 'Agreed';
        existingAutoVariation.is_archived = false;
        existingAutoVariation.updated_by =
          userId ?? decoded?.userId ?? existingAutoVariation.updated_by;
        existingAutoVariation.updated_group = 'USER';
        savedVariation = await txEm.save(existingAutoVariation);
      } else {
        // VariationDetailsSubscriber.afterInsert applies the +100000 display
        // ID transform — do not rewrite variation_id here.
        const variation = txEm.create(VariationDetails, {
          company_id: data.company_id,
          contract_id: data.contract_id,
          project_id: data.project_id || contract.project_id,
          variation_name: variationName,
          variation_status: 'Agreed',
          variation_amount: shortfall,
          is_archived: false,
          created_by: userId ?? decoded?.userId ?? null,
          created_group: 'USER',
          created_on: moment().tz('UTC'),
        });
        savedVariation = await txEm.save(variation);
      }

      const project = await txEm.findOne(ProjectDetails, {
        where: { project_id: savedVariation.project_id },
      });

      const variationLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[7]}` +
        savedVariation.id +
        `?from=log`;
      const projectLink = project
        ? `${process.env.LOG_BASE_URL}` +
          `${linkExtensions[4]}` +
          project.id +
          `?from=log`
        : '';

      const activity: CreateActivityLogInput = {
        event_template_id: 63,
        admin_id:
          decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
            ? decoded?.admin_id
            : null,
        to_user:
          decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
            ? decoded?.userId
            : null,
        from_user:
          decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
            ? null
            : decoded?.userId,
        company_id: data.company_id,
        dynamic_values: {
          variationName,
          variationLink,
          variationAmount: formatCurrency(shortfall),
          projectName: project?.project_name || '',
          projectLink,
        },
        is_admin: false,
        created_by: userId ?? decoded?.userId ?? null,
      };
      await this.activityLogService.insertActivityLog(activity);

      this.logger.log(
        `Hourly auto-uplift: contract ${data.contract_id}, claim ${payment_claim_id}, shortfall ${shortfall}, variation_id ${savedVariation.variation_id}`,
      );
    } catch (err) {
      this.logger.error(
        `Hourly auto-uplift failed for claim ${payment_claim_id}: ${
          err?.message || err
        }`,
      );
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
}
