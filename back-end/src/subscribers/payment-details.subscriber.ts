import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { PaymentDetails } from 'src/entities/payment-details.entity';

@EventSubscriber()
export class PaymentDetailsSubscriber
  implements EntitySubscriberInterface<PaymentDetails>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return PaymentDetails;
  }

  async afterInsert(event: InsertEvent<PaymentDetails>) {
    const payment_id = event.entity.payment_id;
    const paymentDetails = await event.manager
      .getRepository(PaymentDetails)
      .findOne({ where: { payment_id } });
    // paymentDetails.payment_id = 10000000000 + Number(payment_id);
    await event.manager.getRepository(PaymentDetails).save(paymentDetails);
  }
}
