import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { VariationDetails } from 'src/entities/variation-details.entity';

@EventSubscriber()
export class VariationDetailsSubscriber
  implements EntitySubscriberInterface<VariationDetails>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return VariationDetails;
  }

  async afterInsert(event: InsertEvent<VariationDetails>) {
    const variation_id = event.entity.variation_id;
    const variationDetails = await event.manager
      .getRepository(VariationDetails)
      .findOne({ where: { variation_id } });
    variationDetails.variation_id = 100000 + Number(variation_id);
    await event.manager.getRepository(VariationDetails).save(variationDetails);
  }
}
