import { DataSource, EntitySubscriberInterface, EventSubscriber, InsertEvent } from 'typeorm';
import { UserDetails } from '../entities/user-details.entity';

@EventSubscriber()
export class UserDetailsSubscriber implements EntitySubscriberInterface<UserDetails> {
    constructor(dataSource: DataSource) {
        dataSource.subscribers.push(this);
    }

    listenTo() {
        return UserDetails;
    }

    async afterInsert(event: InsertEvent<UserDetails>) {
        const user_id = event.entity.user_id;
        const userDetails = await event.manager.getRepository(UserDetails).findOne({ where: { user_id } });
        userDetails.user_id = 1000 + Number(user_id);
        await event.manager.getRepository(UserDetails).save(userDetails);
    }
    
}
