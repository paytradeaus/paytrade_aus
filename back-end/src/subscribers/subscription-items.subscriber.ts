import { SubscriptionItems } from 'src/entities/subscription-items.entity';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';


@EventSubscriber()
export class SubscriptionItemsSubscriber
  implements EntitySubscriberInterface<SubscriptionItems>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return SubscriptionItems;
  }

  async afterInsert(event: InsertEvent<SubscriptionItems>) {
    const subscription_item_id = event.entity.subscription_item_id;
    const subscriptionItemsDetails = await event.manager
      .getRepository(SubscriptionItems)
      .findOne({ where: { subscription_item_id } });
      subscriptionItemsDetails.subscription_item_id = 1000 + Number(subscription_item_id);
    await event.manager.getRepository(SubscriptionItems).save(subscriptionItemsDetails);
  }
}
