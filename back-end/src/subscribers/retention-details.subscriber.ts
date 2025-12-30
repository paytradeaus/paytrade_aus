import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { RetentionDetails } from 'src/entities/retention-details.entity';

@EventSubscriber()
export class RetentionDetailsSubscriber
  implements EntitySubscriberInterface<RetentionDetails>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return RetentionDetails;
  }

  async afterInsert(event: InsertEvent<RetentionDetails>) {
    const retention_id = event.entity.retention_id;
    const retentionDetails = await event.manager
      .getRepository(RetentionDetails)
      .findOne({ where: { retention_id } });
    // retentionDetails.retention_id = 10000000000 + Number(retention_id);
    await event.manager.getRepository(RetentionDetails).save(retentionDetails);
  }
}
