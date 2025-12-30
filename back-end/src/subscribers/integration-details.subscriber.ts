import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { IntegrationDetails } from 'src/entities/integration-details.entity';

@EventSubscriber()
export class IntegrationDetailsSubscriber
  implements EntitySubscriberInterface<IntegrationDetails>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return IntegrationDetails;
  }

  async afterInsert(event: InsertEvent<IntegrationDetails>) {
    const integration_id = event.entity.integration_id;
    const integrationDetails = await event.manager
      .getRepository(IntegrationDetails)
      .findOne({ where: { integration_id } });
    integrationDetails.integration_id = 1000 + Number(integration_id);
    await event.manager
      .getRepository(IntegrationDetails)
      .save(integrationDetails);
  }
}
