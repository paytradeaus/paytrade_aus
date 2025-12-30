import { StripeCoupons } from 'src/entities/subscription-coupon.entity';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';

@EventSubscriber()
export class StripeCouponsSubscriber
  implements EntitySubscriberInterface<StripeCoupons>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return StripeCoupons;
  }

  async afterInsert(event: InsertEvent<StripeCoupons>) {
    const coupon_id = event.entity.coupon_id;
    const planDetails = await event.manager
      .getRepository(StripeCoupons)
      .findOne({ where: { coupon_id } });
    planDetails.coupon_id = 100000 + Number(coupon_id);
    await event.manager.getRepository(StripeCoupons).save(planDetails);
  }
}
