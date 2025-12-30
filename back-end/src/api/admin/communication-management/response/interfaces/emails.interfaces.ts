export interface ISendEmail {
  toEmail: string;
  subject: string;
  template: string;
}

export interface IEmailDetails {
  emailFromId: string;
  toEmails: string[];
  emailCcIds?: string[];
  subject: string;
  body: string;
  type?: string;
  template: string;
  attachments?: IFileAttachment[];
}

export interface IFetchEmailDetails {
  emailId: string;
}

export interface IFileAttachment {
  userId?: number;
  companyId?: number;
  filePath: string;
  fileType?: string;
  attachmentType?: string;
}

export interface IFetchAllCommunicationManagementEmails {
  emailSentDateFrom?: Date;
  emailSentDateTo?: Date;
  page: number;
  itemsPerPage?: number;
  date_filter: string;
}

export interface IReadMultipleCommunicationManagementEmails {
  page: number;
  itemsPerPage: number;
  emailSentDateFrom: Date;
  emailSentDateTo: Date;
  skip: number;
  take: number;
}
