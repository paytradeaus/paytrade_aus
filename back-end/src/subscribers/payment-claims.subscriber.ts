import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { PaymentClaims } from 'src/entities/banking.entity';

@EventSubscriber()
export class PaymentClaimsSubscriber
  implements EntitySubscriberInterface<PaymentClaims>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return PaymentClaims;
  }

  async afterInsert(event: InsertEvent<PaymentClaims>) {
    const payment_claim_id = event.entity.payment_claim_id;
    const paymentClaims = await event.manager
      .getRepository(PaymentClaims)
      .findOne({ where: { payment_claim_id } });
    paymentClaims.payment_claim_id = 100000 + Number(payment_claim_id);
    await event.manager.getRepository(PaymentClaims).save(paymentClaims);
  }
}
