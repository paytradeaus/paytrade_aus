import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { SubPayments } from 'src/entities/sub-payments.entity';
import { RetentionSummaryDetails } from 'src/entities/retention-summary.entity';

@EventSubscriber()
export class RetentionSummaryDetailsSubscriber
  implements EntitySubscriberInterface<RetentionSummaryDetails>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return RetentionSummaryDetails;
  }

  async afterInsert(event: InsertEvent<RetentionSummaryDetails>) {
    const retention_summary_id = event.entity.retention_summary_id;
    const retentionSummary = await event.manager
      .getRepository(RetentionSummaryDetails)
      .findOne({ where: { retention_summary_id } });
    retentionSummary.retention_summary_id =
      10000000000 + Number(retention_summary_id);
    await event.manager
      .getRepository(RetentionSummaryDetails)
      .save(retentionSummary);
  }
}
