import { status } from 'src/entities/contact-submissions.entity';

export interface ITicket {
  name: string;
  companyName?: string;
  email: string;
  message: string;
}

export interface IFetchAllTickets {
  page: number;
  itemsPerPage?: number;
  ticketRaisedFrom?: Date;
  ticketRaisedTo?: Date;
}

export interface IUpdateStatusOfATicket {
  ticketId: string;
  status: status;
}
