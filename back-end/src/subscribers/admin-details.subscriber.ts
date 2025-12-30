import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { AdminDetails } from 'src/entities/admin-details.entity';

@EventSubscriber()
export class AdminDetailsSubscriber
  implements EntitySubscriberInterface<AdminDetails>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return AdminDetails;
  }

  async afterInsert(event: InsertEvent<AdminDetails>) {
    const admin_id = event.entity.admin_id;
    const adminDetails = await event.manager
      .getRepository(AdminDetails)
      .findOne({ where: { admin_id } });
    adminDetails.admin_id = 1000 + Number(admin_id);
    await event.manager.getRepository(AdminDetails).save(adminDetails);
  }
}
