import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { ReconciliationReport } from 'src/entities/reconciliation-report.entity';

@EventSubscriber()
export class ReconciliationReportSubscriber
  implements EntitySubscriberInterface<ReconciliationReport>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return ReconciliationReport;
  }

  async afterInsert(event: InsertEvent<ReconciliationReport>) {
    const report_id = event.entity.report_id;
    const reportDetails = await event.manager
      .getRepository(ReconciliationReport)
      .findOne({ where: { report_id } });
    reportDetails.report_id = 100000 + Number(report_id);
    await event.manager.getRepository(ReconciliationReport).save(reportDetails);
  }
}
