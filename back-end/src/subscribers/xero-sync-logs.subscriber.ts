import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { XeroSyncLogs } from 'src/entities/xero-sync-logs.entity';

@EventSubscriber()
export class XeroSyncLogsSubscriber
  implements EntitySubscriberInterface<XeroSyncLogs>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return XeroSyncLogs;
  }

  async afterInsert(event: InsertEvent<XeroSyncLogs>) {
    const sync_id = event.entity.sync_id;
    const syncDetails = await event.manager
      .getRepository(XeroSyncLogs)
      .findOne({ where: { sync_id } });
    syncDetails.sync_id = 100000 + Number(sync_id);
    await event.manager.getRepository(XeroSyncLogs).save(syncDetails);
  }
}
