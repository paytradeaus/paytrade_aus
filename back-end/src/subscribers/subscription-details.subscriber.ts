import { SubscriptionDetails } from 'src/entities/subscription-details.entity';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';

@EventSubscriber()
export class SubscriptionDetailsSubscriber
  implements EntitySubscriberInterface<SubscriptionDetails>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return SubscriptionDetails;
  }

  async afterInsert(event: InsertEvent<SubscriptionDetails>) {
    const subscription_id = event.entity.subscription_id;
    const subscriptionDetails = await event.manager
      .getRepository(SubscriptionDetails)
      .findOne({ where: { subscription_id } });
    subscriptionDetails.subscription_id = 100000 + Number(subscription_id);
    await event.manager
      .getRepository(SubscriptionDetails)
      .save(subscriptionDetails);
  }
}
