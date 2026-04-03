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
      this.logger.log('Compliance seeding complete');
    } catch (error) {
      this.logger.error(`Compliance seeding failed: ${error.message}`);
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
