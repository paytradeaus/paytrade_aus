import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { SubscriptionPlanDetails } from 'src/entities/subscription-plan-details.entity';

@EventSubscriber()
export class SubscriptionPlanDetailsSubscriber
  implements EntitySubscriberInterface<SubscriptionPlanDetails>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return SubscriptionPlanDetails;
  }

  async afterInsert(event: InsertEvent<SubscriptionPlanDetails>) {
    const plan_id = event.entity.plan_id;
    const planDetails = await event.manager
      .getRepository(SubscriptionPlanDetails)
      .findOne({ where: { plan_id } });
    planDetails.plan_id = 100000 + Number(plan_id);
    await event.manager
      .getRepository(SubscriptionPlanDetails)
      .save(planDetails);
  }
}
