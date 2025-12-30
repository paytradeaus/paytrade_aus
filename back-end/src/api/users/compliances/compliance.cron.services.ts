import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CompliancesService } from './compliances.service';

@Injectable()
export class ComplianceCronService {
  constructor(private readonly compliancesService: CompliancesService) {}

  // @Cron('0 16 * * *')
  // async handleTestCron() {
  //   console.log("Log: test cron running")
  //   await this.compliancesService.checkAllprojectCompliance();
  // }

  @Cron('0 8 * * *', {
    timeZone: 'UTC',
  })
  // @Cron('* * * * *',{
  //   timeZone: 'UTC',
  // })
  async handleMorningCron() {
    await this.compliancesService.checkAllprojectCompliance();
  }
}
