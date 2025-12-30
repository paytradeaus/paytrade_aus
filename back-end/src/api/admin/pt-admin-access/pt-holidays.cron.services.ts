import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PtAdminAccessService } from './pt-admin-access.service';

@Injectable()
export class HolidaysCronService {
  constructor(private readonly adminAccessService: PtAdminAccessService) {}

  @Cron('0 0 15 12 *', {
    timeZone: 'UTC',
  }) // Dec 15th 00:00 AM
  async handleMidDecemberReminder() {
    await this.adminAccessService.checkAndNotifyNonRecurringHolidaysForNextYear();
  }

  // @Cron('56 11 * * *') // Dec 15th 00:00 AM

  // async handleMidDecemberReminder() {
  //     await this.adminAccessService.checkAndNotifyNonRecurringHolidaysForNextYear();
  // }

  @Cron('50 23 31 12 *', {
    timeZone: 'UTC',
  }) // Dec 31st 11:50 PM
  // @Cron('59 16 * * *')
  async handleYearEndReminder() {
    await this.adminAccessService.checkAndNotifyNonRecurringHolidaysForNextYear();

    // Optionally add recurring holidays for the next year
    await this.adminAccessService.mapRecurringHolidaysForNextYear();
  }
}
