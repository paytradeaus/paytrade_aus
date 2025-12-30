import { ClientSuppliersDetails } from 'src/entities/client-suppliers-details.entity';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';

@EventSubscriber()
export class ClientSuppliersSubscriber
  implements EntitySubscriberInterface<ClientSuppliersDetails>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return ClientSuppliersDetails;
  }

  async afterInsert(event: InsertEvent<ClientSuppliersDetails>) {
    const client_supplier_id = event.entity.client_supplier_id;
    const clientSuppliersDetails = await event.manager
      .getRepository(ClientSuppliersDetails)
      .findOne({ where: { client_supplier_id } });
    clientSuppliersDetails.client_supplier_id =
      1000000000 + Number(client_supplier_id);
    await event.manager
      .getRepository(ClientSuppliersDetails)
      .save(clientSuppliersDetails);
  }
}
