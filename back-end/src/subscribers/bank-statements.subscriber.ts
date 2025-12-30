import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { BankStatements } from 'src/entities/banking.entity';

@EventSubscriber()
export class BankStatementsSubscriber
  implements EntitySubscriberInterface<BankStatements>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return BankStatements;
  }

  async afterInsert(event: InsertEvent<BankStatements>) {
    const bank_statement_id = event.entity.bank_statement_id;
    const bankStatementDetails = await event.manager
      .getRepository(BankStatements)
      .findOne({ where: { bank_statement_id } });
    bankStatementDetails.bank_statement_id = 1000 + Number(bank_statement_id);
    await event.manager
      .getRepository(BankStatements)
      .save(bankStatementDetails);
  }
}
