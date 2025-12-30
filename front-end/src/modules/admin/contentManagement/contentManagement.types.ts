export interface IContentManagementDetails {
  id: any;
  heading: string;
  body: string;
  updated_on: any;
}
export interface IFaqDetails {
  status: string;
  id: number;
  category: any;
  question: string;
  answer: string;
  faq_status: string;
  selectedOption?: string;
  messages?: string;
  show_in_home: boolean;
}
export interface IMailDetails {
  id: any;
  email_subject: string;
  category: any;
  updated_on: string;
}
