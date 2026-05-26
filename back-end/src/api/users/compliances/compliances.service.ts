import { Injectable, Optional } from '@nestjs/common';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import {
  FetchAllComplianceResultsInDashboardInput,
  FetchAllCompliancesInput,
  FetchComplianceResultsOfAProjectInput,
  FetchComplianceStatusesOfAProjectInput,
  SilenceComplianceOfAProjectInput,
} from './compliances.input';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { getRepository, IsNull, Not, Repository } from 'typeorm';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { CompliancePTAFunctions } from './functions/pta-functions';
import { ComplianceRTAFunctions } from './functions/rta-functions';
import { BankAccounts } from 'src/entities/banking.entity';
import {
  ComplianceChecks,
  ComplianceOfProjects,
  PtaCompliances,
  RtaCompliances,
} from 'src/entities/compliances.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { PtContentsService } from 'src/api/admin/pt-contents/pt-contents.service';
import { EmailService } from 'src/libs/@email-services/email.service';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import {
  ComplianceCheckpoint,
  ComplianceRule,
} from 'src/entities/compliance-details-pro-acc.entity';
import { CompanyUserRoles } from 'src/entities/company-user-roles.entity';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { UserDetails } from 'src/entities/user-details.entity';
import { EmailQueueProducer } from 'src/libs/@email-services/email-queue/email-queue.producer';
import { EmailTypeEnum } from 'src/entities/email-logs.entity';
import { ComplianceRefreshProducer } from './compliance-refresh.producer';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class CompliancesService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(ProjectDetails)
    private readonly projectsRepo: Repository<ProjectDetails>,
    @InjectRepository(BankAccounts)
    private readonly bankAccountsRepo: Repository<BankAccounts>,
    @InjectRepository(ComplianceChecks)
    private readonly complianceChecksRepo: Repository<ComplianceChecks>,
    @InjectRepository(RtaCompliances)
    private readonly rtaCompliancesRepo: Repository<RtaCompliances>,
    @InjectRepository(ComplianceOfProjects)
    private readonly complianceOfProjects: Repository<ComplianceOfProjects>,
    @InjectRepository(PtaCompliances)
    private readonly ptaCompliancesRepo: Repository<PtaCompliances>,
    @InjectRepository(ComplianceCheckpoint)
    private readonly checkpointRepo: Repository<ComplianceCheckpoint>,
    @InjectRepository(ComplianceRule)
    private readonly complianceRulesRepo: Repository<ComplianceRule>,
    private readonly compliancePTAFunctions: CompliancePTAFunctions,
    private readonly complianceRTAFunctions: ComplianceRTAFunctions,
    private readonly ptContentService: PtContentsService,
    private readonly emailServices: EmailService,
    private emailQueueProducer: EmailQueueProducer,
    // Task #297 — event-driven compliance cache freshness. Marked
    // `@Optional()` because CompliancesService is registered as a
    // provider directly inside several sibling modules (NoticesModule,
    // PaymentsModule, ContractDetailsModule, BankAccountsModule, ...)
    // that don't import CompliancesModule and therefore have no
    // ComplianceRefreshProducer in scope. In those contexts the
    // invalidation simply no-ops (those modules already invalidate via
    // their own injected CompliancesService instance from CompliancesModule
    // when applicable). In CompliancesModule itself, DI supplies the
    // real producer and self-healing works as designed.
    @Optional()
    private readonly complianceRefreshProducer?: ComplianceRefreshProducer,
  ) {
    this.logger = new PaytradeLogger('COMPLIANCES_SERVICE');
  }

  /**
   * Task #297 — public invalidation entry point used by every write path
   * (payments, contracts, notices, bank accounts, trust movements, ...).
   * Safe to call from anywhere that already injects `CompliancesService`;
   * non-blocking and never throws into the caller's transaction.
   */
  async markComplianceDirty(
    projectId: number,
    trigger?: string,
  ): Promise<void> {
    if (!projectId) return;
    if (!this.complianceRefreshProducer) return;
    try {
      await this.complianceRefreshProducer.markDirty(
        Number(projectId),
        trigger,
      );
    } catch (err: any) {
      this.logger.error(
        `markComplianceDirty failed for project ${projectId} (${trigger ?? '-'}): ${err?.message || err}`,
      );
    }
  }

  /**
   * Task #297 — full rebuild of the persisted compliance cache for a
   * single project. Iterates every active check on both PTA and RTA and
   * calls the existing `syncCompliancesOfProject` path, which writes
   * through `saveFullComplianceData` (and therefore flips `is_stale`
   * back to false + stamps `last_synced_at`).
   *
   * Called by:
   *   - `ComplianceRefreshConsumer` (debounced BullMQ worker)
   *   - the read-time safety net inside `getComplianceData`
   *   - the `forceRefreshProjectCompliance` admin/user mutation
   */
  async refreshProjectComplianceCache(
    projectId: number,
  ): Promise<{ pta: number; rta: number; failed: number }> {
    const summary = { pta: 0, rta: 0, failed: 0 };
    if (!projectId) return summary;

    // Capture the wall-clock moment we started, BEFORE any sync runs.
    // We use this as a watermark when clearing orphan stale rows at
    // the end: any row whose `last_synced_at` is older than this (or
    // null) was not touched by `saveFullComplianceData` during this
    // pass, so it is either a brand-new orphan or a row for a check
    // that no longer applies — safe to mark fresh. Rows touched by
    // this pass already have `last_synced_at >= startedAt` set by
    // `saveFullComplianceData`, and rows that a concurrent write
    // re-dirtied AFTER `saveFullComplianceData` also have
    // `last_synced_at >= startedAt` — so the watermark protects both
    // cases from being clobbered.
    const startedAt = new Date();

    for (const bankType of [
      'Project Trust Account',
      'Retention Trust Account',
    ] as const) {
      const isPTA = bankType === 'Project Trust Account';
      const allChecks = await this.complianceChecksRepo.find({
        where: { bank_account_type: bankType },
      });
      const uniqueCheckNumbers = [
        ...new Set(allChecks.map((c) => c.check_number)),
      ];

      for (const checkNumber of uniqueCheckNumbers) {
        try {
          await this.syncCompliancesOfProject(projectId, checkNumber, isPTA);
          if (isPTA) summary.pta += 1;
          else summary.rta += 1;
        } catch (err: any) {
          summary.failed += 1;
          this.logger.error(
            `refreshProjectComplianceCache failed project=${projectId} check=${checkNumber} (${bankType}): ${err?.message || err}`,
          );
        }
      }
    }

    // Defensive: clear `is_stale` ONLY on orphan rows that this pass
    // never touched (e.g. a project with zero applicable RTA checks,
    // or a checkpoint for a check that no longer exists in
    // `compliance_checks`). Crucially we do NOT touch rows whose
    // `last_synced_at` was bumped during this pass — those include
    // both freshly-saved rows AND rows that a concurrent
    // `markComplianceDirty` re-dirtied between
    // `saveFullComplianceData` and this final query. Without this
    // guard the blanket clear would silently lose a legitimate
    // mid-flight dirty signal.
    try {
      await this.checkpointRepo
        .createQueryBuilder()
        .update()
        .set({ is_stale: false, last_synced_at: new Date() })
        .where(
          'project_id = :pid AND (last_synced_at IS NULL OR last_synced_at < :startedAt)',
          { pid: Number(projectId), startedAt },
        )
        .execute();
    } catch (err: any) {
      this.logger.error(
        `refreshProjectComplianceCache: orphan clear failed for project ${projectId}: ${err?.message || err}`,
      );
    }

    return summary;
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  async changeCheckNameToCamelCase(checkName: string) {
    try {
      const upperCasedCheckName = checkName.toLowerCase();
      const allElementssOfCheckName = [];
      for (const element of upperCasedCheckName) {
        allElementssOfCheckName.push(element);
      }
      for (const [i, element] of allElementssOfCheckName.entries()) {
        if (element == ' ') {
          allElementssOfCheckName[i + 1] =
            allElementssOfCheckName[i + 1].toUpperCase();
        }
      }
      const finalResult = allElementssOfCheckName
        .filter((element) => element != ' ')
        .join('');
      return finalResult;
    } catch (error) {
      throw error;
    }
  }

  async fetchAllCompliances(data: FetchAllCompliancesInput) {
    try {
      this.logger.log(
        `Fetching all compliances of a company with data: ${JSON.stringify(data)}`,
      );

      const {
        company_id,
        project_id,
        bank_account_id,
        account_type,
        date_filter,
        start_date,
        end_date,
        page_number,
        items_per_page,
        pta_compliance,
        rta_compliance,
        sorting_field,
      } = data;

      let queryBuilder = await this.projectsRepo
        .createQueryBuilder('p')
        .select([
          'p.project_id AS project_id',
          'p.project_name AS project_name',
          'p.created_on AS project_added_on_date',
          'p.site_address AS site_address',
          'p.project_role AS role',
          'p.pta_compliance AS pta_compliance',
          'p.rta_compliance AS rta_compliance',
          'p.project_status AS status',
          'c.company_id AS company_id',
          'c.company_name AS company_name',
        ])
        .leftJoin(CompanyDetails, 'c', 'c.company_id = p.company_id')
        .andWhere(`p.project_status != 'Deleted'`);

      if (company_id) {
        queryBuilder.andWhere('p.company_id = :company_id', { company_id });
      }

      if (project_id) {
        queryBuilder.andWhere('p.project_id = :project_id', { project_id });
      }

      if (bank_account_id) {
        const bank_accounts = await this.bankAccountsRepo.findOne({
          where: { bank_account_id },
          select: ['project_ids'],
        });
        if (bank_accounts) {
          queryBuilder.andWhere('p.project_id IN (:...project_ids)', {
            project_ids: bank_accounts.project_ids,
          });
        }
      }

      if (account_type && account_type == 'Project Trust Account') {
        queryBuilder.andWhere('p.pta_eligibility = :pta_eligibility', {
          pta_eligibility: 'Yes',
        });
      }

      if (account_type && account_type == 'Retention Trust Account') {
        queryBuilder.andWhere('p.rta_eligibility = :rta_eligibility', {
          rta_eligibility: 'Yes',
        });
      }

      if (date_filter) {
        if (date_filter === 'Custom' && start_date && end_date) {
          queryBuilder.andWhere(
            'p.project_date BETWEEN :start_date AND :end_date',
            { start_date, end_date },
          );
        } else if (date_filter === 'This Month') {
          const startDate = moment().startOf('month').toDate();
          const endDate = moment().endOf('month').toDate();
          queryBuilder.andWhere(
            'p.project_date BETWEEN :start_date AND :end_date',
            { start_date: startDate, end_date: endDate },
          );
        } else if (date_filter === 'Last Month') {
          const startDate = moment()
            .subtract(1, 'month')
            .startOf('month')
            .toDate();
          const endDate = moment().subtract(1, 'month').endOf('month').toDate();
          queryBuilder.andWhere(
            'p.project_date BETWEEN :start_date AND :end_date',
            { start_date: startDate, end_date: endDate },
          );
        }
      }

      const sorting_order = data.sorting_order ? data.sorting_order : 'DESC';
      if (!sorting_field) {
        queryBuilder.orderBy({ 'p.project_date': sorting_order });
        // if (page_number && items_per_page) {
        //   queryBuilder
        //     .offset((page_number - 1) * items_per_page)
        //     .limit(items_per_page);
        // }
      }
      if (
        sorting_field &&
        sorting_field !== 'pta_compliance' &&
        sorting_field !== 'rta_compliance'
      ) {
        switch (sorting_field) {
          case 'project_name':
            {
              queryBuilder.orderBy({ 'LOWER(p.project_name)': sorting_order });
            }
            break;
          case 'company_name':
            {
              queryBuilder.orderBy({ 'LOWER(c.company_name)': sorting_order });
            }
            break;
          case 'project_added_on_date':
            {
              queryBuilder.orderBy({ 'p.created_on': sorting_order });
            }
            break;
          case 'site_address':
            {
              queryBuilder.orderBy({ 'LOWER(p.site_address)': sorting_order });
            }
            break;
          case 'role':
            {
              queryBuilder.orderBy({ 'p.project_role': sorting_order });
            }
            break;
        }
        // if (page_number && items_per_page) {
        //   queryBuilder
        //     .offset((page_number - 1) * items_per_page)
        //     .limit(items_per_page);
        // }
      }

      let [rawResults, total_count] = await Promise.all([
        queryBuilder.getRawMany(),
        queryBuilder.getCount(),
      ]);

      // Filter results based on compliance statuses if provided
      rawResults = await Promise.all(
        rawResults.map(async (result) => {
          const fetchedComplianceStatuses =
            await this.fetchComplianceStatusesOfAProject({
              project_id: result.project_id,
            });
          result.pta_compliance = fetchedComplianceStatuses.data.pta_compliance;
          result.rta_compliance = fetchedComplianceStatuses.data.rta_compliance;
          return result;
        }),
      );

      // Apply compliance filters and recalculate total_count
      if (pta_compliance) {
        rawResults = rawResults.filter(
          (result) => result.pta_compliance === pta_compliance,
        );
      }

      if (rta_compliance) {
        rawResults = rawResults.filter(
          (result) => result.rta_compliance === rta_compliance,
        );
      }

      total_count = rawResults.length; // Now, the total count reflects the filtered results.

      let finalResult, finalCount;
      if (sorting_field && sorting_field === 'pta_compliance') {
        let sortedResult: any[] = [];
        if (sorting_order === 'ASC') {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            a.pta_compliance.localeCompare(b.pta_compliance),
          );
        } else {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            b.pta_compliance.localeCompare(a.pta_compliance),
          );
        }

        const startIndex =
          page_number && items_per_page
            ? (page_number - 1) * items_per_page
            : 0;
        const endIndex =
          page_number && items_per_page
            ? Math.min(
              (page_number - 1) * items_per_page + items_per_page,
              sortedResult?.length,
            )
            : sortedResult?.length;
        // Slice the results array to get the results for the current page
        finalResult = sortedResult?.slice(startIndex, endIndex);
        finalCount = sortedResult?.length || 0;
      } else if (sorting_field && sorting_field === 'rta_compliance') {
        let sortedResult: any[] = [];
        if (sorting_order === 'ASC') {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            a.pta_compliance.localeCompare(b.pta_compliance),
          );
        } else {
          sortedResult = Array.from(rawResults).sort((a, b) =>
            b.pta_compliance.localeCompare(a.pta_compliance),
          );
        }

        const startIndex =
          page_number && items_per_page
            ? (page_number - 1) * items_per_page
            : 0;
        const endIndex =
          page_number && items_per_page
            ? Math.min(
              (page_number - 1) * items_per_page + items_per_page,
              sortedResult?.length,
            )
            : sortedResult?.length;
        // Slice the results array to get the results for the current page
        finalResult = sortedResult?.slice(startIndex, endIndex);
        finalCount = sortedResult?.length || 0;
      } else {
        const startIndex =
          page_number && items_per_page
            ? (page_number - 1) * items_per_page
            : 0;
        const endIndex =
          page_number && items_per_page
            ? Math.min(
              (page_number - 1) * items_per_page + items_per_page,
              rawResults?.length,
            )
            : rawResults?.length;

        finalResult = rawResults?.slice(startIndex, endIndex);
        finalCount = total_count;
      }

      return framedResponse(
        'SUCCESS',
        'All compliances of the company fetched successfully.',
        { total_count: finalCount, results: finalResult },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all compliances with message: ${error}`,
      );
      return framedResponse('ERROR', error);
    }
  }

  async fetchComplianceStatusesOfAProject(
    data: FetchComplianceStatusesOfAProjectInput,
  ) {
    try {

      this.logger.log(
        `Fetching compliance status of project with payload: ${JSON.stringify(data)}`,
      );

      const { project_id } = data;

      let pta_compliance;
      let rta_compliance;

      let pta_compliance_silenced = false;
      let rta_compliance_silenced = false;

      const complianceResultsOfPta = await this.getComplianceData({
        project_id,
        bank_account_type: 'Project Trust Account',
        failedFilter: false,
      });
      const complianceResultsOfRta = await this.getComplianceData({
        project_id,
        bank_account_type: 'Retention Trust Account',
        failedFilter: false,
      });
      //   'complianceResultsOfRtaResults',
      //   complianceResultsOfRta.data[0].results,
      // );

      const statusesOfPTA = [];
      const statusesOfRTA = [];

      let hasSilencedPTAFailure = false;
      let hasSilencedRTAFailure = false;

      for (let i = 0; i < complianceResultsOfPta.data.length; i++) {
        const group = complianceResultsOfPta.data[i];
        const isMailEnabled = group.mails !== false;

        for (
          let j = 0;
          j < complianceResultsOfPta.data[i].results.length;
          j++
        ) {
          if (
            complianceResultsOfPta.data[i].results[j].check_status &&
            complianceResultsOfPta.data[i].results[j].check_status ==
            'FAILED' &&
            complianceResultsOfPta.data[i].results[j].notify == true
          ) {
            if (isMailEnabled) {
              statusesOfPTA.push('FAILED');
            } else {
              hasSilencedPTAFailure = true;
            }
          }
        }
      }
      for (let i = 0; i < complianceResultsOfRta.data.length; i++) {
        const group = complianceResultsOfRta.data[i];
        const isMailEnabled = group.mails !== false;
        for (
          let j = 0;
          j < complianceResultsOfRta.data[i].results.length;
          j++
        ) {
          if (
            complianceResultsOfRta.data[i].results[j].check_status &&
            complianceResultsOfRta.data[i].results[j].check_status ==
            'FAILED' &&
            complianceResultsOfRta.data[i].results[j].notify == true
          ) {
            if (isMailEnabled) {
              statusesOfRTA.push('FAILED');
            } else {
              hasSilencedRTAFailure = true;
            }
          }
        }
      }


      const projectDetails = await this.projectsRepo.findOne({
        where: { project_id },
        select: ['project_name'],
      });

      if (statusesOfPTA.length) {
        pta_compliance = 'Action required';
      } else if (hasSilencedPTAFailure) {
        pta_compliance = 'Action required';
        pta_compliance_silenced = true;
      } else {
        pta_compliance = 'Ok';
      }
      if (statusesOfRTA.length) {
        rta_compliance = 'Action required';
      } else if (hasSilencedRTAFailure) {
        rta_compliance = 'Action required';
        rta_compliance_silenced = true;
      } else {
        rta_compliance = 'Ok';
      }

      return framedResponse(
        'SUCCESS',
        `Project details fetched successfully.`,
        {
          project_name: projectDetails.project_name,
          pta_compliance,
          rta_compliance,
          number_of_issues_in_pta: statusesOfPTA.length,
          number_of_issues_in_rta: statusesOfRTA.length,
          pta_compliance_silenced,
          rta_compliance_silenced,
        },
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching compliances status of a project with message: ${error}`,
      );
      throw error;
    }
  }

  async getComplianceData(data: FetchComplianceResultsOfAProjectInput) {

    this.logger.log(
      `Fetching compliances with data: ${JSON.stringify(data)}`,
    );

    let checkpoints = await this.checkpointRepo.find({
      where: {
        project_id: data.project_id,
        bank_account_type: data.bank_account_type,
      },
      relations: ['rules'],
      order: {
        check_number: 'ASC',
        rules: {
          rule_number: 'ASC',
        },
      },
    });

    // Task #297 — read-time safety net. If any checkpoint for this
    // project is flagged `is_stale` (typically because a recent write
    // called `markComplianceDirty` but the debounced refresh worker
    // hasn't run yet), attempt a synchronous fast-path recompute with a
    // hard 3s timeout. On success we re-read fresh rows; on timeout or
    // error we fall through and serve the stale cache so the UI never
    // hangs. This is the line of defence that means the Compliance page
    // is consistent the moment the user navigates back to it.
    if (
      checkpoints.length > 0 &&
      data.project_id &&
      checkpoints.some((c) => c.is_stale)
    ) {
      try {
        await Promise.race([
          this.refreshProjectComplianceCache(Number(data.project_id)),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('compliance read-time refresh timeout')),
              3000,
            ),
          ),
        ]);
        checkpoints = await this.checkpointRepo.find({
          where: {
            project_id: data.project_id,
            bank_account_type: data.bank_account_type,
          },
          relations: ['rules'],
          order: {
            check_number: 'ASC',
            rules: { rule_number: 'ASC' },
          },
        });
      } catch (refreshErr: any) {
        this.logger.warn?.(
          `Read-time compliance refresh skipped for project ${data.project_id}: ${refreshErr?.message || refreshErr}`,
        );
      }
    }

    if (!checkpoints.length && data.project_id) {
      this.logger.log(
        `No checkpoints found for project ${data.project_id} / ${data.bank_account_type}, auto-populating...`,
      );
      try {
        const isPTA = data.bank_account_type === 'Project Trust Account';
        const bankAccountType = data.bank_account_type || 'Project Trust Account';

        const allChecks = await this.complianceChecksRepo.find({
          where: { bank_account_type: bankAccountType },
        });

        const uniqueCheckNumbers = [
          ...new Set(allChecks.map((c) => c.check_number)),
        ];

        for (const checkNumber of uniqueCheckNumbers) {
          try {
            await this.syncCompliancesOfProject(
              data.project_id,
              checkNumber,
              isPTA,
            );
          } catch (syncErr) {
            this.logger.error(
              `Auto-sync failed for project ${data.project_id} check ${checkNumber}: ${syncErr.message}`,
            );
          }
        }

        checkpoints = await this.checkpointRepo.find({
          where: {
            project_id: data.project_id,
            bank_account_type: data.bank_account_type,
          },
          relations: ['rules'],
          order: {
            check_number: 'ASC',
            rules: {
              rule_number: 'ASC',
            },
          },
        });
      } catch (autoPopErr) {
        this.logger.error(
          `Auto-populate checkpoints failed for project ${data.project_id}: ${autoPopErr.message}`,
        );
      }
    }

    const complianceResult = checkpoints.map((checkpoint, index) => {
      let check_colour_code = checkpoint.check_colour_code;

      if (check_colour_code !== '#4C9B8A' && checkpoint.mails === false) {
        check_colour_code = '#cfad50';
      }

      return {
        check_number: checkpoint.check_number,
        check_name: checkpoint.check_name,
        check_colour_code: check_colour_code,
        display_check_number: index + 1,
        mails: checkpoint.mails,
        results: checkpoint.rules.map((rule) => ({
          check_number: checkpoint.check_number,
          rule_number: rule.rule_number,
          check_name: rule.check_name,
          check_status: rule.check_status,
          action_button_type: rule.action_button_type,
          display_message_colour: rule.display_message_colour,
          display_message: rule.display_message,
          reference_id: rule.reference_id,
          content: rule.content,
          notify: rule.notify,
        })),
      };
    });

    return framedResponse(
      'SUCCESS',
      `Compliance results obtained successfully.`,
      complianceResult,
    );
  }

  async fetchComplianceResultsOfAProject(
    data: FetchComplianceResultsOfAProjectInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching the compliance results of a project with data: ${JSON.stringify(data)}`,
      );

      const { project_id, bank_account_type, failedFilter } = data;
      let complianceResults = [];
      const requiredProjectDetails = await this.projectsRepo.findOne({
        where: { project_id },
        select: [
          'pta_eligibility',
          'rta_eligibility',
          'retention_type',
          'number_of_units',
          'head_contract_sum',
          'project_role',
          'id',
        ],
      });

      switch (bank_account_type) {
        case 'Project Trust Account':
          {
            const projectTrustAccount = await this.bankAccountsRepo
              .createQueryBuilder('ba')
              .select([
                'ba.bank_account_id AS bank_account_id',
                'ba.account_type AS bank_account_type',
                'ba.opening_date AS opening_date',
                'ba.delegate_powers AS delegate_powers',
                'ba.current_balance AS current_balance',
              ])
              .where(
                ":project_id = ANY(string_to_array(ba.project_ids, ',')::int[])",
                { project_id },
              )
              .andWhere('ba.account_type = :bank_account_type', {
                bank_account_type,
              })
              .orderBy({ 'ba.created_on': 'ASC' })
              .getRawOne();

            const fetchedAllContents = await this.complianceChecksRepo.find({
              where: { bank_account_type: 'Project Trust Account' },
            });

            const fetchedAllRules = await this.ptaCompliancesRepo.find({
              where: { bank_account_type: 'Project Trust Account' },
              select: [
                'check_number',
                'check_name',
                'display_message',
                'display_message_colour',
                'action_button_type',
                'check_status',
                'rule_number',
              ],
            });

            const AllRulesOfPTA = await this.complianceChecksRepo.find({
              where: { bank_account_type: 'Project Trust Account' },
              select: [
                'check_name',
                'check_number',
                'rule_number',
                'is_active',
              ],
            });

            const functionNameMap: Record<string, string> = {};
            for (const rule of AllRulesOfPTA) {
              if (!functionNameMap[rule.check_name]) {
                functionNameMap[rule.check_name] =
                  await this.changeCheckNameToCamelCase(rule.check_name);
              }
            }

            const rulesGroupedByCheck = AllRulesOfPTA.reduce((acc, rule) => {
              if (!acc[rule.check_number]) acc[rule.check_number] = [];
              acc[rule.check_number].push(rule);
              return acc;
            }, {});

            for (const checkNumber in rulesGroupedByCheck) {
              const rules = rulesGroupedByCheck[checkNumber];
              const anyRuleActive = rules.some((rule) => rule.is_active);
              const checkName = rules[0].check_name;
              const functionName =
                await this.changeCheckNameToCamelCase(checkName);

              if (!anyRuleActive) {
                complianceResults.push({
                  check_number: checkNumber,
                  check_colour_code: '#cfad50',
                  results: [
                    {
                      check_number: checkNumber,
                      check_name: checkName,
                      display_message_colour: '#cfad50',
                      display_message:
                        'Pay Trade does not carry out this compliance check at present. Please contact administrator.',
                    },
                  ],
                });
                continue; // skip to next checkNumber
              }

              const complianceResultsForCheck =
                await this.compliancePTAFunctions[functionName](
                  { ...requiredProjectDetails, ...data },
                  fetchedAllContents,
                  fetchedAllRules,
                  projectTrustAccount,
                );

              const resultsByRule = complianceResultsForCheck.map((result) => {
                const rule = rules.find(
                  (r) => r.rule_number === result.rule_number,
                );

                if (!rule || !rule.is_active) {
                  // Clean inactive rule's output
                  delete result.action_button_type;
                  delete result.check_status;
                  delete result.reference_id;
                  // delete result.rule_number;
                  result.display_message_colour = '#cfad50';
                  result.display_message =
                    'Pay Trade does not carry out this compliance rule check at present. Please contact administrator.';
                }

                return result;
              });

              const redColourCode = resultsByRule.filter(
                (result) => result.display_message_colour === '#e23b30',
              );
              const yellowColourCode = resultsByRule.filter(
                (result) => result.display_message_colour === '#cfad50',
              );

              const checkColourCode = redColourCode.length
                ? '#e23b30'
                : yellowColourCode.length
                  ? '#cfad50'
                  : '#4C9B8A';

              complianceResults.push({
                check_number: checkNumber,
                check_colour_code: checkColourCode,
                results: resultsByRule,
              });
            }
          }
          break;
        case 'Retention Trust Account':
          {
            const fetchedAllContents = await this.complianceChecksRepo.find({
              where: { bank_account_type: 'Retention Trust Account' },
            });

            const fetchedAllRules = await this.rtaCompliancesRepo.find({
              where: { bank_account_type: 'Retention Trust Account' },
              select: [
                'check_number',
                'check_name',
                'display_message',
                'display_message_colour',
                'action_button_type',
                'check_status',
                'rule_number',
              ],
            });

            const retentionTrustAccount = await this.bankAccountsRepo
              .createQueryBuilder('ba')
              .select([
                'ba.bank_account_id AS bank_account_id',
                'ba.opening_date AS opening_date',
                'ba.account_type AS bank_account_type',
                'ba.delegate_powers AS delegate_powers',
                'ba.retention_trust_certificate_attachment_ids AS retention_trust_certificate_attachment_ids',
                'ba.company_id AS company_id',
              ])
              .where(
                ":project_id = ANY(string_to_array(ba.project_ids, ',')::int[])",
                { project_id },
              )
              .andWhere('ba.account_type = :bank_account_type', {
                bank_account_type,
              })
              .orderBy({ 'ba.created_on': 'ASC' })
              .getRawOne();

            const AllRulesOfRTA = await this.complianceChecksRepo.find({
              where: { bank_account_type: 'Retention Trust Account' },
              select: [
                'check_name',
                'check_number',
                'rule_number',
                'is_active',
              ],
            });

            const functionNameMap: Record<string, string> = {};
            for (const rule of AllRulesOfRTA) {
              if (!functionNameMap[rule.check_name]) {
                functionNameMap[rule.check_name] =
                  await this.changeCheckNameToCamelCase(rule.check_name);
              }
            }

            const rulesGroupedByCheck = AllRulesOfRTA.reduce((acc, rule) => {
              if (!acc[rule.check_number]) acc[rule.check_number] = [];
              acc[rule.check_number].push(rule);
              return acc;
            }, {});

            for (const checkNumber in rulesGroupedByCheck) {
              const rules = rulesGroupedByCheck[checkNumber];
              const anyRuleActive = rules.some((rule) => rule.is_active);
              const checkName = rules[0].check_name;
              const functionName =
                await this.changeCheckNameToCamelCase(checkName);

              if (!anyRuleActive) {
                complianceResults.push({
                  check_number: checkNumber,
                  check_colour_code: '#cfad50',
                  results: [
                    {
                      check_number: checkNumber,
                      check_name: checkName,
                      display_message_colour: '#cfad50',
                      display_message:
                        'Pay Trade does not carry out this compliance check at present. Please contact administrator.',
                    },
                  ],
                });
                continue; // skip to next checkNumber
              }

              const complianceResultsForCheck =
                await this.complianceRTAFunctions[functionName](
                  { ...requiredProjectDetails, ...data },
                  fetchedAllContents,
                  fetchedAllRules,
                  retentionTrustAccount,
                );

              const resultsByRule = complianceResultsForCheck.map((result) => {
                const rule = rules.find(
                  (r) => r.rule_number === result.rule_number,
                );

                if (!rule || !rule.is_active) {
                  // Clean inactive rule's output
                  delete result.action_button_type;
                  delete result.check_status;
                  delete result.reference_id;
                  // delete result.rule_number;
                  result.display_message_colour = '#cfad50';
                  result.display_message =
                    'Pay Trade does not carry out this compliance rule check at present. Please contact administrator.';
                }

                return result;
              });

              const redColourCode = resultsByRule.filter(
                (result) => result.display_message_colour === '#e23b30',
              );
              const yellowColourCode = resultsByRule.filter(
                (result) => result.display_message_colour === '#cfad50',
              );

              const checkColourCode = redColourCode.length
                ? '#e23b30'
                : yellowColourCode.length
                  ? '#cfad50'
                  : '#4C9B8A';

              complianceResults.push({
                check_number: checkNumber,
                check_colour_code: checkColourCode,
                results: resultsByRule,
              });
            }
          }
          break;
      }
      this.logger.log(
        `Compliance results obtained successfully with data: ${JSON.stringify(complianceResults)}`,
      );

      const flattenedData = complianceResults.flat();
      const sortedData = flattenedData.sort((a, b) => {
        if (a.check_number === undefined) return 1; // move undefined to the end
        if (b.check_number === undefined) return -1;
        return a.check_number - b.check_number;
      });
      // const groupedData: { [key: number]: any[] } = sortedData.reduce(
      //   (acc, item) => {
      //     if (!acc[item.check_number]) {
      //       acc[item.check_number] = [];
      //     }
      //     acc[item.check_number].push(item);
      //     return acc;
      //   },
      //   {},
      // );
      // const results = Object.values(groupedData);

      const savedFullComplianceDetails = await this.saveFullComplianceData(
        sortedData,
        bank_account_type === 'Project Trust Account' ? true : false,
        project_id,
      );

      let filteredData = sortedData;

      const savedComplianceDetails = await this.saveComplianceData(
        filteredData,
        bank_account_type === 'Project Trust Account' ? true : false,
        project_id,
      );

      if (failedFilter) {
        filteredData = sortedData
          .map((item) => ({
            ...item,
            results: item.results?.filter(
              (result) => result.check_status === 'FAILED',
            ),
          }))
          .filter((item) => item.results.length > 0);
      }

      const updatedfilteredData = filteredData.map((result) => {
        let compliance;
        if (bank_account_type === 'Project Trust Account') {
          compliance =
            savedComplianceDetails.pta_compliances.find(
              (item) => item.check_number === result.check_number,
            ) || null;
        } else {
          compliance =
            savedComplianceDetails.rta_compliances.find(
              (item) => item.check_number === result.check_number,
            ) || null;
        }
        if (
          result.check_colour_code !== '#4C9B8A' &&
          compliance?.mails === false
        ) {
          result.check_colour_code = '#cfad50';
        }
        return {
          ...result,
          mails: compliance ? compliance?.mails : undefined, // Add mails if found, else undefined
        };
      });

      return framedResponse(
        'SUCCESS',
        `Compliance results obtained successfully.`,
        updatedfilteredData,
      );
    } catch (error) {
      this.logger.error(
        `Errored while obtaining compliance results with message: ${error}`,
      );
      throw error;
    }
  }

  async syncCompliancesOfProject(
    projectId: number,
    checkNumber: number,
    isPTA: boolean,
  ) {
    const bankAccountType = isPTA
      ? 'Project Trust Account'
      : 'Retention Trust Account';

    const existingCheckpoint = await this.checkpointRepo.findOne({
      where: {
        project_id: projectId,
        bank_account_type: bankAccountType,
        check_number: checkNumber,
      },
      relations: ['rules'],
    });

    const requiredProjectDetails = await this.projectsRepo.findOne({
      where: { project_id: projectId },
      select: [
        'pta_eligibility',
        'rta_eligibility',
        'retention_type',
        'number_of_units',
        'head_contract_sum',
        'project_role',
        'id',
      ],
    });

    const rules = await this.complianceChecksRepo.find({
      where: {
        check_number: checkNumber,
        bank_account_type: bankAccountType,
      },
    });

    if (!rules.length) throw new Error('No rules found for this check');

    const anyRuleActive = rules.some((rule) => rule.is_active);
    const checkName = rules[0].check_name;
    const functionName = await this.changeCheckNameToCamelCase(checkName);

    if (!anyRuleActive) {
      const newCheckpoint = new ComplianceCheckpoint();
      newCheckpoint.project_id = projectId;
      newCheckpoint.bank_account_type = bankAccountType;
      newCheckpoint.check_number = checkNumber;
      newCheckpoint.check_name = checkName;
      newCheckpoint.check_colour_code = null;
      newCheckpoint.mails = true;

      const rule = new ComplianceRule();
      rule.project_id = projectId;
      rule.rule_number = 0;
      rule.check_name = checkName;
      rule.check_status = null;
      rule.action_button_type = null;
      rule.display_message_colour = '#cfad50';
      rule.display_message =
        'Pay Trade does not carry out this compliance check at present. Please contact administrator.';
      rule.reference_id = null;
      rule.content = null;
      rule.notify = true;
      rule.checkpoint = newCheckpoint;

      newCheckpoint.rules = [rule];

      if (existingCheckpoint) {
        await this.complianceRulesRepo.delete({
          checkpoint_id: existingCheckpoint.id,
        });
        await this.checkpointRepo.delete(existingCheckpoint.id);
      }

      // Task #297: this synthetic "inactive" checkpoint is also fresh.
      newCheckpoint.is_stale = false;
      newCheckpoint.last_synced_at = new Date();
      await this.checkpointRepo.save(newCheckpoint);
      return { message: 'Check is inactive, basic rule saved.' };
    }

    const fetchedAllContents = await this.complianceChecksRepo.find({
      where: { bank_account_type: bankAccountType },
    });

    const fetchedAllRules = isPTA
      ? await this.ptaCompliancesRepo.find({
        where: { bank_account_type: 'Project Trust Account' },
        select: [
          'check_number',
          'check_name',
          'display_message',
          'display_message_colour',
          'action_button_type',
          'check_status',
          'rule_number',
        ],
      })
      : await this.rtaCompliancesRepo.find({
        where: { bank_account_type: 'Retention Trust Account' },
        select: [
          'check_number',
          'check_name',
          'display_message',
          'display_message_colour',
          'action_button_type',
          'check_status',
          'rule_number',
        ],
      });

    const bankAccount = await this.bankAccountsRepo
      .createQueryBuilder('ba')
      .select(['ba.*'])
      .where(":projectId = ANY(string_to_array(ba.project_ids, ',')::int[])", {
        projectId,
      })
      .andWhere('ba.account_type = :bank_account_type', {
        bank_account_type: bankAccountType,
      })
      .orderBy({ 'ba.created_on': 'ASC' })
      .getRawOne();

    const complianceResultsForCheck = await this[
      isPTA ? 'compliancePTAFunctions' : 'complianceRTAFunctions'
    ][functionName](
      { ...requiredProjectDetails, project_id: projectId },
      fetchedAllContents,
      fetchedAllRules,
      bankAccount,
    );

    const resultsByRule = complianceResultsForCheck.map((result) => {
      const rule = rules.find((r) => r.rule_number === result.rule_number);
      if (!rule || !rule.is_active) {
        delete result.action_button_type;
        delete result.check_status;
        delete result.reference_id;
        result.display_message_colour = '#cfad50';
        result.display_message =
          'Pay Trade does not carry out this compliance rule at present. Please contact administrator.';
      }
      return result;
    });

    const redColourCode = resultsByRule.some(
      (r) => r.display_message_colour === '#e23b30',
    );
    const yellowColourCode = resultsByRule.some(
      (r) => r.display_message_colour === '#cfad50',
    );
    const colourCodeOfCheck = redColourCode
      ? '#e23b30'
      : yellowColourCode
        ? '#cfad50'
        : '#4C9B8A';

    const existingRulesMap = new Map<number, ComplianceRule>();
    if (existingCheckpoint?.rules?.length) {
      for (const rule of existingCheckpoint.rules) {
        existingRulesMap.set(rule.rule_number, rule);
      }
    }

    const hasChanges =
      !existingCheckpoint ||
      existingCheckpoint.check_colour_code !== colourCodeOfCheck ||
      resultsByRule.length !== existingCheckpoint.rules.length ||
      resultsByRule.some((newRule) => {
        const oldRule = existingRulesMap.get(newRule.rule_number);
        return (
          !oldRule ||
          oldRule.check_name !== newRule.check_name ||
          oldRule.check_status !== newRule.check_status ||
          oldRule.action_button_type !== newRule.action_button_type ||
          oldRule.display_message_colour !== newRule.display_message_colour ||
          oldRule.display_message !== newRule.display_message ||
          oldRule.content !== newRule.content
        );
      });

    if (hasChanges) {
      // Delete old rules if they exist
      if (existingCheckpoint) {
        await this.complianceRulesRepo.delete({
          checkpoint_id: existingCheckpoint.id,
        });
        await this.checkpointRepo.delete(existingCheckpoint.id);
      }

      const newCheckpoint = new ComplianceCheckpoint();
      newCheckpoint.project_id = projectId;
      newCheckpoint.bank_account_type = bankAccountType;
      newCheckpoint.check_number = checkNumber;
      newCheckpoint.check_name = checkName;
      newCheckpoint.check_colour_code = colourCodeOfCheck;
      newCheckpoint.mails = true;

      const newRules = resultsByRule.map((result) => {
        const rule = new ComplianceRule();
        rule.project_id = projectId;
        rule.rule_number = result.rule_number;
        rule.check_name = result.check_name;
        rule.check_status = result.check_status;
        rule.action_button_type = result.action_button_type || null;
        rule.display_message_colour = result.display_message_colour || null;
        rule.display_message = result.display_message || null;
        rule.reference_id = result.reference_id || null;
        rule.content = result.content || null;
        rule.notify = true;
        rule.checkpoint = newCheckpoint;
        return rule;
      });

      newCheckpoint.rules = newRules;

      await this.checkpointRepo.save(newCheckpoint);
      this.logger.error(
        `Compliances of a project updated with project-id: ${projectId}`,
      );

      return { message: 'Updated successfully' };
    }

    return { message: 'No changes detected, skipping update' };
  }

  async fetchAllComplianceResultsInDashboard(
    data: FetchAllComplianceResultsInDashboardInput,
  ) {
    try {
      this.logger.log(
        `Request received for fetching all compliance results in dashboard with data: ${JSON.stringify(data)}`,
      );

      const { company_id } = data;

      // Query for existing Project Trust Accounts and Retention Trust Accounts
      const results = await this.projectsRepo
        .createQueryBuilder('pd')
        .select([
          'pd.project_id AS project_id',
          'pd.project_name AS project_name',
          'pd.pta_eligibility AS pta_eligibility',
          'pd.rta_eligibility AS rta_eligibility',
          'pd.project_status AS project_status',
          'ba.bank_account_id AS bank_account_id',
          'ba.account_name AS bank_account_name',
          'ba.account_type AS bank_account_type',
          'ba.created_on AS created_on',
        ])
        .leftJoin(
          BankAccounts,
          'ba',
          `pd.project_id = ANY(string_to_array(ba.project_ids, ',')::int[]) 
           AND ba.status <> 'Deleted' 
           AND ba.company_id = :company_id 
           AND ba.added_by_client_supplier = false`,
          { company_id },
        )
        .where('pd.company_id = :company_id', { company_id })
        .andWhere('pd.project_status <> :deletedStatus', {
          deletedStatus: 'Deleted',
        })
        .orderBy('pd.project_id', 'ASC')
        .addOrderBy('ba.account_type', 'ASC') // Order by account type
        .addOrderBy('ba.created_on', 'ASC')
        .getRawMany();

      // Process the results to ensure both PTA and RTA entries are included for each project
      const processedResults = [];

      // Iterate over each project and generate the necessary entries
      for (const result of results) {
        const statuses = await this.fetchComplianceStatusesOfAProject({
          project_id: result.project_id,
        });

        // Calculate issues
        const numberOfIssuesPTA = statuses.data.number_of_issues_in_pta || 0;
        const numberOfIssuesRTA = statuses.data.number_of_issues_in_rta || 0;

        const isBothAccountsArePresent = await results.filter(
          (res) => res.project_id == result.project_id,
        );

        // Add PTA entry (even if it doesn't have bank details)
        if (result.bank_account_type === 'Project Trust Account') {
          processedResults.push({
            project_id: result.project_id,
            project_name: result.project_name,
            project_status: result.project_status,
            bank_account_id:
              result.bank_account_type === 'Project Trust Account'
                ? result.bank_account_id
                : null,
            bank_account_name:
              result.bank_account_type === 'Project Trust Account'
                ? result.bank_account_name
                : null,
            bank_account_type: 'Project Trust Account',
            created_on:
              result.bank_account_type === 'Project Trust Account'
                ? result.created_on
                : null,
            number_of_issues: numberOfIssuesPTA,
          });
        }
        if (
          isBothAccountsArePresent.length < 2 &&
          isBothAccountsArePresent[0].bank_account_type &&
          isBothAccountsArePresent[0].bank_account_type ==
          'Retention Trust Account'
        ) {
          // Include null values if PTA eligibility exists but no bank details
          processedResults.push({
            project_id: result.project_id,
            project_name: result.project_name,
            project_status: result.project_status,
            bank_account_id: null,
            bank_account_name: null,
            bank_account_type: 'Project Trust Account',
            created_on: null,
            number_of_issues: numberOfIssuesPTA,
          });
        }

        // Add RTA entry (even if it doesn't have bank details)
        if (result.bank_account_type === 'Retention Trust Account') {
          processedResults.push({
            project_id: result.project_id,
            project_name: result.project_name,
            project_status: result.project_status,
            bank_account_id:
              result.bank_account_type === 'Retention Trust Account'
                ? result.bank_account_id
                : null,
            bank_account_name:
              result.bank_account_type === 'Retention Trust Account'
                ? result.bank_account_name
                : null,
            bank_account_type: 'Retention Trust Account',
            created_on:
              result.bank_account_type === 'Retention Trust Account'
                ? result.created_on
                : null,
            number_of_issues: numberOfIssuesRTA,
          });
        }
        if (
          isBothAccountsArePresent.length < 2 &&
          isBothAccountsArePresent[0].bank_account_type &&
          isBothAccountsArePresent[0].bank_account_type ==
          'Project Trust Account'
        ) {
          // Include null values if RTA eligibility exists but no bank details
          processedResults.push({
            project_id: result.project_id,
            project_name: result.project_name,
            project_status: result.project_status,
            bank_account_id: null,
            bank_account_name: null,
            bank_account_type: 'Retention Trust Account',
            created_on: null,
            number_of_issues: numberOfIssuesRTA,
          });
        }

        if (!result.bank_account_type) {
          processedResults.push({
            project_id: result.project_id,
            project_name: result.project_name,
            project_status: result.project_status,
            bank_account_id: null,
            bank_account_name: null,
            bank_account_type: 'Project Trust Account',
            created_on: null,
            number_of_issues: numberOfIssuesPTA,
          });
          processedResults.push({
            project_id: result.project_id,
            project_name: result.project_name,
            project_status: result.project_status,
            bank_account_id: null,
            bank_account_name: null,
            bank_account_type: 'Retention Trust Account',
            created_on: null,
            number_of_issues: numberOfIssuesRTA,
          });
        }
      }

      // Filter out null values (those with zero issues)
      const resultsWithComplianceIssues = processedResults.filter(
        (res) => res.number_of_issues != 0,
      );

      return framedResponse(
        'SUCCESS',
        'All compliance results successfully fetched.',
        resultsWithComplianceIssues,
      );
    } catch (error) {
      this.logger.error(
        `Errored while fetching all compliance results in dashboard with message: ${error}`,
      );
      throw error;
    }
  }

  async checkAllprojectCompliance() {
    try {
      const queryBuilder = await this.projectsRepo
        .createQueryBuilder('p')
        .select([
          'p.project_id as project_id',
          'p.project_name as project_name',
          'c.company_name as company_name',
          'c.company_id as company_id',
        ])
        .innerJoin('p.companyDetails', 'c')
        .innerJoin(
          CompanyUserRoles,
          'r',
          // Widened so both Primary Admins and (Secondary) Admins receive the
          // daily compliance email. Previously only PRIMARY ADMIN.
          `r.company_id = c.company_id AND r.company_role IN ('${Role.PRIMARY_ADMIN}', '${Role.ADMIN}') AND r.status = 'Active'`,
        )
        .innerJoin(UserDetails, 'u', 'u.user_id = r.user_id')
        .where('p.project_status = :project_status', {
          project_status: 'In Progress',
        })
        // Default-on user pref always wins: a user's explicit `false`
        // suppresses the email even when the owning company is a real
        // (non-system) company that has opted in at the company level.
        // For system-added (personal) companies we fall back to the
        // user pref entirely. Null / missing prefs are treated as
        // opted-IN on both sides so legacy rows without the
        // `compliance` key still receive the daily email.
        .andWhere(
          `(u.email_preferences ->> 'compliance') IS DISTINCT FROM 'false'`,
        )
        .andWhere(
          `(c.is_system_added = TRUE OR (c.email_preferences ->> 'compliance') IS DISTINCT FROM 'false')`,
        );

      const result = await queryBuilder.getRawMany();

      const projectIds = result?.map((project) => project?.project_id);

      for (const projectId of projectIds) {
        await this.sentMailsOnFailedComplianceOfAProject(projectId);
      }
    } catch (error) {
      this.logger.error(
        `Errored while generating a mail for compliance of all projectswith message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async sentMailsOnFailedComplianceOfAProject(projectId: number) {
    try {
      this.logger.log(
        `Handling request for sending mails on failed compliance to the project owners`,
      );

      const projectdetails = await this.projectsRepo.findOne({
        where: { project_id: projectId },
        relations: ['companyDetails'],
      });

      const projectOwnerdetails = projectdetails.companyDetails;

      const complianceResults = [
        {
          type: 'PTA',
          data: await this.fetchComplianceResultsOfAProject({
            project_id: projectId,
            bank_account_type: 'Project Trust Account',
            failedFilter: true,
          }),
        },
        {
          type: 'RTA',
          data: await this.fetchComplianceResultsOfAProject({
            project_id: projectId,
            bank_account_type: 'Retention Trust Account',
            failedFilter: true,
          }),
        },
      ];

      const savedProjectCompliance = await this.complianceOfProjects.findOne({
        where: { project_id: projectId },
      });

      let combinedComplianceData: any[] = [];

      complianceResults.forEach(({ type, data }) => {
        if (!data) return;

        const filteredData = data.data.filter((compliance) => {
          const match =
            type === 'PTA'
              ? savedProjectCompliance.pta_compliances.find(
                (savedCompliance) =>
                  savedCompliance.check_number === compliance.check_number,
              )
              : savedProjectCompliance.rta_compliances.find(
                (savedCompliance) =>
                  savedCompliance.check_number === compliance.check_number,
              );

          return match && match.mails === true; // Include only if mails is true
        });

        if (filteredData.length) {
          combinedComplianceData.push({
            type,
            data: filteredData,
          });
        }
      });

      if (!combinedComplianceData.length) return;

      const complianceHtml = await this.generateComplianceHTML(
        combinedComplianceData,
        projectdetails,
      );

      const mailTemplate =
        await this.ptContentService.getMailTemplateByMailType(
          'failed-compliance',
        );

      const mailDynamicData = {
        failed_compliance: complianceHtml,
        user_name: projectOwnerdetails.company_name,
        project_name: projectdetails.project_name,
      };

      const Keys = mailTemplate.selected_dynamic;
      const dynamicData: { [key: string]: any } = {};
      Keys.forEach((key) => {
        dynamicData[key] = mailDynamicData[key];
      });

      const mailbody = await this.replaceVariables(
        mailTemplate.email_content,
        dynamicData,
      );

      // Resolve recipients: all active Primary + Secondary Admins on the
      // owning company who haven't opted out via
      // `user_details.email_preferences.compliance = false`.
      const adminRows = await this.projectsRepo.manager
        .getRepository(CompanyUserRoles)
        .createQueryBuilder('r')
        .innerJoin(UserDetails, 'u', 'u.user_id = r.user_id')
        .where('r.company_id = :cid', {
          cid: projectOwnerdetails.company_id,
        })
        .andWhere(`r.company_role IN ('${Role.PRIMARY_ADMIN}', '${Role.ADMIN}')`)
        .andWhere(`r.status = 'Active'`)
        // null/missing pref counts as opted-in; only explicit false opts out.
        .andWhere(
          `(u.email_preferences ->> 'compliance') IS DISTINCT FROM 'false'`,
        )
        .select(['u.email_id AS email_id'])
        .getRawMany<{ email_id: string }>();

      const recipientEmails = Array.from(
        new Set(
          adminRows
            .map((r) => r.email_id)
            .filter((e): e is string => !!e && e.includes('@')),
        ),
      );

      // Fall back to the legacy company email if there are no opted-in admins
      // (preserves old behaviour for companies without a Primary Admin row).
      if (!recipientEmails.length && projectOwnerdetails.company_email_id) {
        recipientEmails.push(projectOwnerdetails.company_email_id);
      }

      for (const toEmail of recipientEmails) {
        const mailDetails = {
          toEmail,
          subject: `Compliance Failed for your project: ${projectdetails.project_name}`,
          template: 'header-footer-email',
          mailBody: String(mailbody),
          mail_type: EmailTypeEnum.failedCompliance,
        };
        this.emailQueueProducer.emailQueueProducer(mailDetails);
      }
      // await this.emailServices.sendMail(mailDetails);

      return combinedComplianceData;
    } catch (error) {
      this.logger.error(
        `Errored while generating a mail for failed compliance with message: ${error}`,
      );
      throw new Error(error);
    }
  }

  async generateComplianceHTML(response, project) {
    const complianceData = response || [];
    const projectDetails = project;
    let htmlString = '';

    const complianceLink =
      `${process.env.LOG_BASE_URL}` +
      `${linkExtensions[41]}` +
      `${projectDetails.project_id}&st=` +
      `${projectDetails.project_status}&company_id=` +
      `${projectDetails?.company_id}` +
      `&from=log&screen=import`;

    //   const compliancePage =
    //   `${linkExtensions[41]}` +
    //   `${projectDetails.project_id}&st=` +
    //   `${projectDetails.project_status}`;

    // const selectProfilePage = `user/select-profile?redirect=${encodeURIComponent(compliancePage)}`;
    // const loginPage = `user/login?redirect=${encodeURIComponent(compliancePage)}`;

    // const complianceLink = `${process.env.LOG_BASE_URL}${loginPage}`;

    complianceData.forEach(({ type, data }) => {
      const bankType =
        type === 'PTA' ? 'Project Trust Account' : 'Retention Trust Account';

      htmlString += `
          <h3 style="color: #1583D8; margin-bottom: 8px;">Failed Compliance: ${bankType}</h3>
        `;

      data.forEach((session) => {
        const checkNumber = session.check_number;
        const checkName = session.results[0]?.check_name || 'No Title';
        const checkColourCode = session.check_colour_code || '#000';

        // **Each Check has its own bordered box**
        htmlString += `
          <div style="border: 1px solid #dcdcdc; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; background-color: #eaf4fe; padding: 8px 12px; border-radius: 4px;">
              <span style="background-color: ${checkColourCode}; color: white; font-size: 18px; font-weight: bold; border-radius: 50%; width: 24px; height: 24px; display: flex; justify-content: center; align-items: center; margin-right: 8px;">
                ${checkNumber}
              </span>
              <h3 style="font-size: 16px; font-weight: bold; margin: 0;">${checkName}</h3>
            </div>
          
            <div style="margin-top: 16px;">
          `;

        session.results.forEach((result) => {
          const actionButtonType = result.action_button_type;
          const showActionButton = actionButtonType && actionButtonType !== 'NONE';
          
          // **Each result should have a separate box inside the check**
          htmlString += `
              <div style="border: 1px solid ${result.display_message_colour}; background-color: #fff3f3; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
                <div style="font-size: 14px; color: #666; margin-bottom: 8px;">
                  ${result.content}
                </div>
                <div style="font-size: 14px; font-weight: bold; color: #D32F2F;">
                  ${result.display_message}
                </div>
                ${showActionButton ? `
                <a href="${complianceLink}" target="_blank" style="text-decoration: none;">
                  <button style="background-color: #1583D8; color: white; font-size: 14px; font-weight: bold; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">
                    ${actionButtonType.replace(/_/g, ' ')}
                  </button>
                </a>
                ` : ''}
              </div>
            `;
        });

        htmlString += `
            </div> 
          </div>
          `;
      });
    });

    return htmlString;
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

  // async saveFullComplianceData(
  //   responseData: any,
  //   isPTA: boolean,
  //   projectId: number,
  // ) {
  //   const bankAccountType = isPTA
  //     ? 'Project Trust Account'
  //     : 'Retention Trust Account';

  //   // Fetch existing checkpoints with their rules
  //   const existingCheckpoints = await this.checkpointRepo.find({
  //     where: { project_id: projectId, bank_account_type: bankAccountType },
  //     relations: ['rules'],
  //   });

  //   // if (existingCheckpoints.length > 2) {
  //   //   return;
  //   // }

  //   const checkpointsToSave: ComplianceCheckpoint[] = [];

  //   for (const item of responseData) {
  //     if (
  //       item.check_number == null ||
  //       !Array.isArray(item.results) ||
  //       !item.results.every(result => result.rule_number != null)
  //     ) {
  //       continue;
  //     }

  //     const existingCheckpoint = existingCheckpoints.find(
  //       cp => cp.check_number === item.check_number
  //     );

  //     const newRules: ComplianceRule[] = item.results.map((result) => {
  //       const existingRule = existingCheckpoint?.rules.find(
  //         (r) => r.rule_number === result.rule_number
  //       );

  //       const rule = existingRule ?? new ComplianceRule();

  //       rule.project_id = projectId;
  //       rule.rule_number = result.rule_number;
  //       rule.check_name = result.check_name;
  //       rule.check_status = result.check_status;
  //       rule.action_button_type = result.action_button_type || null;
  //       rule.display_message_colour = result.display_message_colour || null;
  //       rule.display_message = result.display_message || null;
  //       rule.reference_id = result.reference_id || null;
  //       rule.content = result.content || null;
  //       rule.checkpoint = existingCheckpoint;

  //       return rule;
  //     });

  //     if (existingCheckpoint) {
  //       // Update existing checkpoint fields
  //       existingCheckpoint.check_name = item.results?.[0]?.check_name;
  //       existingCheckpoint.check_colour_code = item.check_colour_code || null;
  //       existingCheckpoint.mails = true;
  //       existingCheckpoint.rules = newRules;
  //       checkpointsToSave.push(existingCheckpoint);
  //     } else {
  //       // Create new checkpoint
  //       const newCheckpoint = new ComplianceCheckpoint();
  //       newCheckpoint.project_id = projectId;
  //       newCheckpoint.bank_account_type = bankAccountType;
  //       newCheckpoint.check_number = item.check_number || 0;
  //       newCheckpoint.check_name = item.results?.[0]?.check_name;
  //       newCheckpoint.check_colour_code = item.check_colour_code || null;
  //       newCheckpoint.mails = true;
  //       newCheckpoint.rules = newRules;

  //       // Associate checkpoint on each rule
  //       newRules.forEach(rule => (rule.checkpoint = newCheckpoint));

  //       checkpointsToSave.push(newCheckpoint);
  //     }
  //   }

  //   if (checkpointsToSave.length > 0) {
  //     await this.checkpointRepo.save(checkpointsToSave);
  //   }
  // }

  async saveFullComplianceData(
    responseData: any,
    isPTA: boolean,
    projectId: number,
  ) {
    const bankAccountType = isPTA
      ? 'Project Trust Account'
      : 'Retention Trust Account';

    const validIncomingCheckpoints = responseData.filter(
      (item) =>
        item.check_number != null &&
        Array.isArray(item.results) &&
        item.results.every((r) => r.rule_number != null),
    );

    const existingCheckpoints = await this.checkpointRepo.find({
      where: { project_id: projectId, bank_account_type: bankAccountType },
      relations: ['rules'],
    });

    const checkpointsToDelete = existingCheckpoints.filter(
      (existing) =>
        !validIncomingCheckpoints.some(
          (incoming) =>
            incoming.check_number === existing.check_number &&
            projectId === existing.project_id &&
            bankAccountType === existing.bank_account_type,
        ),
    );

    for (const cp of checkpointsToDelete) {
      // Delete related rules first
      await this.complianceRulesRepo.delete({ checkpoint_id: cp.id });

      // Then delete the checkpoint
      await this.checkpointRepo.delete(cp.id);
    }

    const checkpointsToSave: ComplianceCheckpoint[] = [];

    for (const item of responseData) {
      if (
        item.check_number == null ||
        !Array.isArray(item.results) ||
        !item.results.every((r) => r.rule_number != null)
      )
        continue;

      const existingCheckpoint = existingCheckpoints.find(
        (cp) =>
          Number(cp.check_number) === Number(item.check_number) &&
          cp.bank_account_type === bankAccountType &&
          cp.project_id === projectId,
      );

      const check_name = item.results?.[0]?.check_name || null;

      const newRules: ComplianceRule[] = [];

      for (const result of item.results) {
        let ruleToUse: ComplianceRule | undefined;

        if (existingCheckpoint) {
          ruleToUse = existingCheckpoint.rules.find(
            (r) => r.rule_number === result.rule_number,
          );

          const hasChanged =
            !ruleToUse ||
            ruleToUse.check_name !== result.check_name ||
            ruleToUse.check_status !== result.check_status ||
            ruleToUse.action_button_type !==
            (result.action_button_type || null) ||
            ruleToUse.display_message_colour !==
            (result.display_message_colour || null) ||
            ruleToUse.display_message !== (result.display_message || null) ||
            ruleToUse.reference_id !== (result.reference_id || null) ||
            ruleToUse.content !== (result.content || null);

          if (!ruleToUse || hasChanged) {
            const newRule = ruleToUse ?? new ComplianceRule();
            newRule.project_id = projectId;
            newRule.rule_number = result.rule_number;
            newRule.check_name = result.check_name;
            newRule.check_status = result.check_status;
            newRule.action_button_type = result.action_button_type || null;
            newRule.display_message_colour =
              result.display_message_colour || null;
            newRule.display_message = result.display_message || null;
            newRule.reference_id = result.reference_id || null;
            newRule.content = result.content || null;
            newRule.checkpoint = existingCheckpoint;
            newRules.push(newRule);
          } else {
            newRules.push(ruleToUse); // unchanged
          }
        } else {
          const newRule = new ComplianceRule();
          newRule.project_id = projectId;
          newRule.rule_number = result.rule_number;
          newRule.check_name = result.check_name;
          newRule.check_status = result.check_status;
          newRule.action_button_type = result.action_button_type || null;
          newRule.display_message_colour =
            result.display_message_colour || null;
          newRule.display_message = result.display_message || null;
          newRule.reference_id = result.reference_id || null;
          newRule.content = result.content || null;
          newRules.push(newRule);
        }
      }

      if (existingCheckpoint) {
        const checkpointChanged =
          existingCheckpoint.check_name !== check_name ||
          existingCheckpoint.check_colour_code !==
          (item.check_colour_code || null);

        if (checkpointChanged || newRules.length > 0) {
          existingCheckpoint.check_name = check_name;
          existingCheckpoint.check_colour_code = item.check_colour_code || null;
          existingCheckpoint.mails = true;
          existingCheckpoint.rules = newRules;
          // Task #297: this row is being rebuilt from a fresh live
          // evaluation — clear the dirty flag and stamp the sync time.
          existingCheckpoint.is_stale = false;
          existingCheckpoint.last_synced_at = new Date();
          checkpointsToSave.push(existingCheckpoint);
        } else {
          // Even when nothing rule-level changed, the cache is now
          // considered fresh — flip the freshness fields if needed.
          if (
            existingCheckpoint.is_stale === true ||
            !existingCheckpoint.last_synced_at
          ) {
            existingCheckpoint.is_stale = false;
            existingCheckpoint.last_synced_at = new Date();
            checkpointsToSave.push(existingCheckpoint);
          }
        }
      } else {
        const newCheckpoint = new ComplianceCheckpoint();
        newCheckpoint.project_id = projectId;
        newCheckpoint.bank_account_type = bankAccountType;
        newCheckpoint.check_number = item.check_number;
        newCheckpoint.check_name = check_name;
        newCheckpoint.check_colour_code = item.check_colour_code || null;
        newCheckpoint.mails = true;
        newCheckpoint.rules = newRules;
        // Task #297: freshly built → never stale.
        newCheckpoint.is_stale = false;
        newCheckpoint.last_synced_at = new Date();

        newRules.forEach((r) => (r.checkpoint = newCheckpoint));
        checkpointsToSave.push(newCheckpoint);
      }
    }

    if (checkpointsToSave.length > 0) {
      await this.checkpointRepo.save(checkpointsToSave);
    }
  }

  async saveComplianceData(
    responseData: any,
    isPTA: boolean,
    projectId: number,
  ) {
    let ptaCompliances, rtaCompliances;

    if (isPTA) {
      const existing_saved_compliance = await this.complianceOfProjects.findOne(
        {
          where: { project_id: projectId, pta_compliances: Not(IsNull()) },
        },
      );

      // Task #276: persist reference_id / action_button_type / rule_number /
      // display_message for the first FAILED rule per check so future
      // re-hydrations of this cache carry a valid deep link.
      ptaCompliances = responseData.reduce((acc, item) => {
        item.results.forEach((result) => {
          const existing = acc.find(
            (entry) => entry.check_number === result.check_number,
          );

          if (existing) {
            // If the check_name already exists and the status is 'FAILED', update it
            if (result.check_status === 'FAILED') {
              existing.check_status = 'FAILED';
              if (!existing.reference_id && result.reference_id) {
                existing.reference_id = result.reference_id;
                existing.action_button_type = result.action_button_type ?? null;
                existing.rule_number = result.rule_number ?? null;
                existing.display_message = result.display_message ?? null;
              }
            }
          } else {
            acc.push({
              check_number: item.check_number,
              check_name: result.check_name,
              check_status: result.check_status,
              notify: true,
              mails: true, // Set as per your requirements
              reference_id: result.reference_id ?? null,
              action_button_type: result.action_button_type ?? null,
              rule_number: result.rule_number ?? null,
              display_message: result.display_message ?? null,
              cache_version: 2,
            });
          }
        });

        return acc;
      }, []);

      if (existing_saved_compliance) {
        const updatedPtaCompliance = ptaCompliances.map((compliance) => {
          const matchingCompliance =
            existing_saved_compliance.pta_compliances.find(
              (pta) => pta.check_number === compliance.check_number,
            );
          if (matchingCompliance) {
            return {
              ...compliance,
              notify: matchingCompliance.notify,
              mails: matchingCompliance.mails,
            };
          }
          return compliance; // Return the original compliance if no match is found
        });
        existing_saved_compliance.pta_compliances = updatedPtaCompliance;
        const response = await this.complianceOfProjects.save(
          existing_saved_compliance,
        ); // Save the updated record
        return response; // Exit early since we're updating the existing entry
      } else {
        const complianceEntry = this.complianceOfProjects.create({
          project_id: projectId, // Replace with actual project ID
          pta_compliances: ptaCompliances,
          rta_compliances: rtaCompliances,
        });

        // Save the entry to the database
        const response = await this.complianceOfProjects.save(complianceEntry);
        return response;
      }
    } else {
      // Prepare RTA compliance data
      const existing_saved_compliance = await this.complianceOfProjects.findOne(
        { where: { project_id: projectId, rta_compliances: Not(IsNull()) } },
      );

      // Task #276: persist reference_id / action_button_type / rule_number /
      // display_message for the first FAILED rule per check so future
      // re-hydrations of this cache carry a valid deep link.
      rtaCompliances = responseData.reduce((acc, item) => {
        item.results.forEach((result) => {
          const existing = acc.find(
            (entry) => entry.check_number === result.check_number,
          );

          if (existing) {
            // If the check_name already exists and the status is 'FAILED', update it
            if (result.check_status === 'FAILED') {
              existing.check_status = 'FAILED';
              if (!existing.reference_id && result.reference_id) {
                existing.reference_id = result.reference_id;
                existing.action_button_type = result.action_button_type ?? null;
                existing.rule_number = result.rule_number ?? null;
                existing.display_message = result.display_message ?? null;
              }
            }
          } else {
            acc.push({
              check_number: item.check_number,
              check_name: result.check_name,
              check_status: result.check_status,
              notify: true,
              mails: true,
              reference_id: result.reference_id ?? null,
              action_button_type: result.action_button_type ?? null,
              rule_number: result.rule_number ?? null,
              display_message: result.display_message ?? null,
              cache_version: 2,
            });
          }
        });

        return acc;
      }, []);

      if (existing_saved_compliance) {
        const updatedRtaCompliance = rtaCompliances.map((compliance) => {
          const matchingCompliance =
            existing_saved_compliance.rta_compliances.find(
              (rta) => rta.check_number === compliance.check_number,
            );
          if (matchingCompliance) {
            return {
              ...compliance,
              notify: matchingCompliance.notify,
              mails: matchingCompliance.mails,
            };
          }
          return compliance; // Return the original compliance if no match is found
        });
        existing_saved_compliance.rta_compliances = updatedRtaCompliance;
        const response = await this.complianceOfProjects.save(
          existing_saved_compliance,
        ); // Save the updated record
        return response; // Exit early since we're updating the existing entry
      } else {
        const complianceEntry = this.complianceOfProjects.create({
          project_id: projectId, // Replace with actual project ID
          pta_compliances: ptaCompliances,
          rta_compliances: rtaCompliances,
        });

        // Save the entry to the database
        const response = await this.complianceOfProjects.save(complianceEntry);
        this.logger.log('Compliance data inserted successfully');
        return response;
      }
    }
  }

  async silenceComplianceAndRulesOfAProject(
    data: SilenceComplianceOfAProjectInput,
  ) {
    try {
      const checkpoints = await this.checkpointRepo.find({
        where: {
          project_id: data.project_id,
          bank_account_type: data.bank_account_type,
        },
        relations: ['rules'],
        order: {
          check_number: 'ASC',
          rules: {
            rule_number: 'ASC',
          },
        },
      });

      if (!checkpoints || checkpoints.length === 0) return;

      let shouldSave = false;

      for (const checkpoint of checkpoints) {
        // If specific rule is being silenced
        if (data.rule_number != null && data.notify != null) {
          if (checkpoint.check_number === data.check_number) {
            const rule = checkpoint.rules.find(
              (r) => r.rule_number === data.rule_number,
            );
            if (rule && rule.notify !== data.notify) {
              rule.notify = data.notify;
              shouldSave = true;
            }
          }
        }

        // Otherwise, silencing the whole compliance (checkpoint)
        else if (data.check_number != null && data.mails != null) {
          if (
            checkpoint.check_number === data.check_number &&
            checkpoint.mails !== data.mails
          ) {
            checkpoint.mails = data.mails;
            shouldSave = true;
          }
        }
      }

      if (shouldSave) {
        await this.checkpointRepo.save(checkpoints);
      }
    } catch (error) {
      throw error;
    }
  }
}
