import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { AuditReport } from 'src/entities/audit-report.entity';

@EventSubscriber()
export class AuditReportSubscriber
  implements EntitySubscriberInterface<AuditReport>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return AuditReport;
  }

  async afterInsert(event: InsertEvent<AuditReport>) {
    const audit_id = event.entity.audit_id;
    const auditDetails = await event.manager
      .getRepository(AuditReport)
      .findOne({ where: { audit_id } });
    auditDetails.audit_id = 100000 + Number(audit_id);
    await event.manager.getRepository(AuditReport).save(auditDetails);
  }
}
