import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { SubPayments } from 'src/entities/sub-payments.entity';

@EventSubscriber()
export class SubPaymentsSubscriber
  implements EntitySubscriberInterface<SubPayments>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return SubPayments;
  }

  async afterInsert(event: InsertEvent<SubPayments>) {
    const sub_payment_id = event.entity.sub_payment_id;
    const subPayments = await event.manager
      .getRepository(SubPayments)
      .findOne({ where: { sub_payment_id } });
    // subPayments.sub_payment_id = 10000000000 + Number(sub_payment_id);
    await event.manager.getRepository(SubPayments).save(subPayments);
  }
}
