import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PtAdminAccessService } from './pt-admin-access.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

@Injectable()
export class HolidaysCronService {
  private logger: PaytradeLogger;

  constructor(private readonly adminAccessService: PtAdminAccessService) {
    this.logger = new PaytradeLogger('HOLIDAY_CRON');
  }

  @Cron('0 8 1 * *', {
    timeZone: 'UTC',
  })
  async handleMonthlyHolidayCheck() {
    this.logger.log('Running monthly holiday table coverage check');
    await this.adminAccessService.sendHolidayExpiryAlert();
  }

  @Cron('0 0 15 12 *', {
    timeZone: 'UTC',
  })
  async handleMidDecemberReminder() {
    await this.adminAccessService.checkAndNotifyNonRecurringHolidaysForNextYear();
  }

  @Cron('50 23 31 12 *', {
    timeZone: 'UTC',
  })
  async handleYearEndReminder() {
    await this.adminAccessService.checkAndNotifyNonRecurringHolidaysForNextYear();
    await this.adminAccessService.mapRecurringHolidaysForNextYear();
  }
}
