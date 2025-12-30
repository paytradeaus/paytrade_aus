import { SubscriptionPricingPlan } from 'src/entities/subscription-pricing-plan.entity';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';

@EventSubscriber()
export class SubscriptionPricingPlanSubscriber
  implements EntitySubscriberInterface<SubscriptionPricingPlan>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return SubscriptionPricingPlan;
  }

  async afterInsert(event: InsertEvent<SubscriptionPricingPlan>) {
    const price_id = event.entity.price_id;
    const priceDetails = await event.manager
      .getRepository(SubscriptionPricingPlan)
      .findOne({ where: { price_id } });
    priceDetails.price_id = 100000 + Number(price_id);
    await event.manager
      .getRepository(SubscriptionPricingPlan)
      .save(priceDetails);
  }
}
