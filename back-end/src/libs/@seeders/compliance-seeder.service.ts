import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ComplianceChecks,
  ComplianceSettings,
  PtaCompliances,
  RtaCompliances,
} from 'src/entities/compliances.entity';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

import * as complianceChecksData from './compliance-seed-data/compliance-checks.json';
import * as ptaCompliancesData from './compliance-seed-data/pta-compliances.json';
import * as rtaCompliancesData from './compliance-seed-data/rta-compliances.json';
import * as complianceSettingsData from './compliance-seed-data/compliance-settings.json';

@Injectable()
export class ComplianceSeederService implements OnApplicationBootstrap {
  private logger: PaytradeLogger;

  constructor(
    @InjectRepository(ComplianceChecks)
    private checksRepo: Repository<ComplianceChecks>,
    @InjectRepository(PtaCompliances)
    private ptaRepo: Repository<PtaCompliances>,
    @InjectRepository(RtaCompliances)
    private rtaRepo: Repository<RtaCompliances>,
    @InjectRepository(ComplianceSettings)
    private settingsRepo: Repository<ComplianceSettings>,
  ) {
    this.logger = new PaytradeLogger('COMPLIANCE_SEEDER');
  }

  async onApplicationBootstrap() {
    try {
      await this.seedTable(
        'compliance_checks',
        this.checksRepo,
        complianceChecksData as any[],
      );
      await this.seedTable(
        'pta_compliances',
        this.ptaRepo,
        ptaCompliancesData as any[],
      );
      await this.seedTable(
        'rta_compliances',
        this.rtaRepo,
        rtaCompliancesData as any[],
      );
      await this.seedTable(
        'compliance_settings',
        this.settingsRepo,
        complianceSettingsData as any[],
      );
      await this.fixCsvUploadWarningColour();
      await this.deactivateAnnualAccountReviewChecks();
      await this.updatePaymentsToSubcontractorsWording();
      this.logger.log('Compliance seeding complete');
    } catch (error) {
      this.logger.error(`Compliance seeding failed: ${error.message}`);
    }
  }

  private async fixCsvUploadWarningColour() {
    const targetId = 'd3dd91e8-4cd2-4179-a4cd-5340e06f1494';
    const row = await this.ptaRepo.findOne({ where: { id: targetId } as any });
    if (row && (row as any).display_message_colour === '#e23b30') {
      const warningColor = '#e6a817';
      await this.ptaRepo.update(targetId, {
        display_message_colour: warningColor,
        display_message: (row as any).display_message
          ?.replace(/#e23b30/g, warningColor)
          ?.replace('ACTION REQUIRED', 'ACTION RECOMMENDED'),
      } as any);
      this.logger.log('pta_compliances: updated check 7 rule 2 colour to warning');
    }
  }

  private async deactivateAnnualAccountReviewChecks() {
    const targets = [
      { id: '04aa733f-97b2-4b1e-b27f-19aadf5d68a4', label: 'PTA check 9' },
      { id: 'e850d4cf-3a77-418c-9b19-c9395c6c1ea1', label: 'RTA check 10' },
    ];
    for (const target of targets) {
      const row = await this.checksRepo.findOne({ where: { id: target.id } as any });
      if (row && (row as any).is_active === true) {
        await this.checksRepo.update(target.id, { is_active: false } as any);
        this.logger.log(`compliance_checks: deactivated ${target.label} (Annual Account Review Reports)`);
      }
    }
  }

  private async updatePaymentsToSubcontractorsWording() {
    // Check 6 / rule 10 — "PAYMENTS TO SUBCONTRACTORS" red banner.
    // Updated wording to reflect that a journal is triggered when a payment
    // is either Confirmed (Paid) OR Matched to a bank transaction.
    const targetId = 'ddacba01-0de4-406d-8741-099ed9c65405';
    const newMessage =
      '<div>\n      <p>\n        <span style="font-weight: 600; color: #e23b30;">ACTION REQUIRED</span>\n      </p>\n      <span>\n       Please ensure all payments have been confirmed or matched correctly to satisfy your trustee requirement. Ensure all payments to subcontractor beneficiaries are made only from the project trust account (and transfer retention amounts withheld into the retention trust account).\n      </span>\n    </div>';
    const row = await this.ptaRepo.findOne({ where: { id: targetId } as any });
    if (row && (row as any).display_message !== newMessage) {
      await this.ptaRepo.update(targetId, {
        display_message: newMessage,
      } as any);
      this.logger.log(
        'pta_compliances: updated check 6 rule 10 wording to "confirmed or matched"',
      );
    }
  }

  private async seedTable<T>(
    tableName: string,
    repo: Repository<T>,
    seedRows: any[],
  ) {
    let inserted = 0;
    for (const row of seedRows) {
      const exists = await repo.findOne({ where: { id: row.id } as any });
      if (!exists) {
        await repo.save(repo.create(row));
        inserted++;
      }
    }
    if (inserted > 0) {
      this.logger.log(`${tableName}: inserted ${inserted} missing rows`);
    } else {
      this.logger.log(`${tableName}: all ${seedRows.length} rows present`);
    }
  }
}
