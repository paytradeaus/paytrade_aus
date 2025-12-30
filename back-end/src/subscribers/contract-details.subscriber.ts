import { ContractDetails } from 'src/entities/contract-details.entity';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';

@EventSubscriber()
export class ContractDetailsSubscriber
  implements EntitySubscriberInterface<ContractDetails>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return ContractDetails;
  }

  async afterInsert(event: InsertEvent<ContractDetails>) {
    const contract_id = event.entity.contract_id;
    const contractDetails = await event.manager
      .getRepository(ContractDetails)
      .findOne({ where: { contract_id } });
    contractDetails.contract_id = 100000 + Number(contract_id);
    await event.manager.getRepository(ContractDetails).save(contractDetails);
  }
}
