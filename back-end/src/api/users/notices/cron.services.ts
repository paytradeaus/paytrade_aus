import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NoticesService } from './notices.service';

@Injectable()
export class CronService {
  constructor(private readonly noticeService: NoticesService) {}

  @Cron('0 0 * * *')
  async handleCron() {
    await this.noticeService.sentAdminReminderPendingQbccNotice('UTC');
  }
}
