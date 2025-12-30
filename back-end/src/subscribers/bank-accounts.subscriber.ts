import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { BankAccounts } from 'src/entities/banking.entity';

@EventSubscriber()
export class BankAccountsSubscriber
  implements EntitySubscriberInterface<BankAccounts>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return BankAccounts;
  }

  async afterInsert(event: InsertEvent<BankAccounts>) {
    const bank_account_id = event.entity.bank_account_id;
    const accountDetails = await event.manager
      .getRepository(BankAccounts)
      .findOne({ where: { bank_account_id } });
    accountDetails.bank_account_id = 10000000000 + Number(bank_account_id);
    await event.manager.getRepository(BankAccounts).save(accountDetails);
  }
}
