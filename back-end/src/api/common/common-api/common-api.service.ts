import { Injectable } from '@nestjs/common';
import { CreateCommonApiInput } from './dto/create-common-api.input';
import { UpdateCommonApiInput } from './dto/update-common-api.input';
import { AccountingSystem } from 'src/entities/accounting-system.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CISRate } from 'src/entities/cis-rate.entity';
import { Settings } from 'src/entities/settings.entity';

@Injectable()
export class CommonApiService {
  constructor(
    @InjectRepository(AccountingSystem)
    private accountingSystem: Repository<AccountingSystem>,
    @InjectRepository(CISRate) private cisRate: Repository<CISRate>,
    @InjectRepository(Settings) private settings: Repository<Settings>,
  ) {}

  async getAccountingSystemDetails() {
    const result = await this.accountingSystem
      .createQueryBuilder('a')
      .select('a.id', 'id')
      .addSelect('a.system', 'system')
      .orderBy('a.id')
      .getRawMany();
    return result;
  }

  async getCisRateDetails() {
    const result = await this.cisRate
      .createQueryBuilder('c')
      .select('c.id', 'id')
      .addSelect('c.cis_rate', 'cis_rate')
      .orderBy('c.id')
      .getRawMany();
    return result;
  }

  async generateSequenceId(profile_type) {
    var response, lastGeneratedId;
    const settingDetails = await this.settings.findOne({
      where: { profile_type },
    });
    settingDetails.last_generated_id += 1;
    lastGeneratedId = (await this.settings.save(settingDetails))
      .last_generated_id;
    return lastGeneratedId;
  }
}
