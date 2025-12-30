import { DataSource, EntitySubscriberInterface, EventSubscriber, InsertEvent } from 'typeorm';
import { CompanyDetails } from '../entities/company-details.entity';

@EventSubscriber()
export class CompanySubscriber implements EntitySubscriberInterface<CompanyDetails> {
    constructor(dataSource: DataSource) {
        dataSource.subscribers.push(this);
    }

    listenTo() {
        return CompanyDetails;
    }

    async afterInsert(event: InsertEvent<CompanyDetails>) {
        const company_id = event.entity.company_id;
        const companyDetails = await event.manager.getRepository(CompanyDetails).findOne({ where: { company_id } });
        companyDetails.company_id = 1000 + Number(company_id);
        await event.manager.getRepository(CompanyDetails).save(companyDetails);
    }
    
}
