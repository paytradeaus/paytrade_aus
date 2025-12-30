export interface MailOptions {
  from: string;
  to: string;
  cc?: string[];
  subject: string;
  template: string;
  context: {
    data: any;
    mailBody: any;
    faqLink: string;
    contactTo: string;
    link: string;
    // logoCid: string;
    headerCid: string;
    footerCid: string;
    // fbCid: string;
    // gpCid: string;
    // twitterCid: string;
  };
  attachments: {
    filename: string;
    content: string;
    encoding: string;
    cid: string;
  }[];
  // headers: {
  //   'X-PM-Message-Stream': string;
  //   'X-PM-Tag': string;
  // };
}
