import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
} from 'typeorm';
import { ProjectDetails } from 'src/entities/project-details.entity';

@EventSubscriber()
export class ProjectDetailsSubscriber
  implements EntitySubscriberInterface<ProjectDetails>
{
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return ProjectDetails;
  }

  async afterInsert(event: InsertEvent<ProjectDetails>) {
    const project_id = event.entity.project_id;
    const projectDetails = await event.manager
      .getRepository(ProjectDetails)
      .findOne({ where: { project_id } });
    projectDetails.project_id = 1000 + Number(project_id);
    await event.manager.getRepository(ProjectDetails).save(projectDetails);
  }
}
