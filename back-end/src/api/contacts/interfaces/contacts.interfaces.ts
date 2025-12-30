import { status } from 'src/entities/contact-submissions.entity';

export interface IContact {
  name: string;
  companyName?: string;
  email: string;
  message: string;
}

export interface IFetchAllContacts {
  page: number;
  itemsPerPage?: number;
  contactCreatedFrom?: Date;
  contactCreatedTo?: Date;
}

export interface IUpdateStatusOfAContact {
  contactId: string;
  status: status;
}
