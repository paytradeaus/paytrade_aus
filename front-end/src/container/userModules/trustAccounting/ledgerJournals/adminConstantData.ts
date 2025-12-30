import { Reference } from "yup";

export const sampleData = [
  {
    journalNo: "1",
    activityId: "1",
    date: "24/04/2023",
    transaction:
      "Take Up Beneficial Interest to Roofing Sub Contractor - Payment Claim 123456 - Due 24/04/2023",
    account: "Trustee Name",
    debit: "$10,000.00",
    credit: "",
  },
  {
    journalNo: "1",
    activityId: "1",
    date: "24/04/2023",
    transaction:
      "Take Up Beneficial Interest to Roofing Sub Contractor - Payment Claim 123456 - Due 24/04/2023",
    account: "Roofing Sub Contractor",
    debit: "",
    credit: "$10,000.00",
  },
  {
    journalNo: "2",
    activityId: "2",
    date: "23/04/2023",
    transaction:
      "Payment Received into the Trust Account from the Principal Name for Progress Claim #1234567",
    account: "Bank Account (Project Trust Account)",
    debit: "$95,000.00",
    credit: "",
  },
  {
    journalNo: "2",
    activityId: "2",
    date: "23/04/2023",
    transaction:
      "Payment Received into the Trust Account from the Principal Name for Progress Claim #1234567",
    account: "Trustee Name",
    debit: "",
    credit: "$95,000.00",
  },
  {
    journalNo: "3",
    activityId: "3",
    date: "24/04/2023",
    transaction:
      "To Take Up the Payments Net of Retentions of Contractors from the Trust Account - Payment Claim #123456",
    account: "Roofing Sub Contractor",
    debit: "$10,000.00",
    credit: "",
  },
  {
    journalNo: "3",
    activityId: "3",
    date: "24/04/2023",
    transaction:
      "To Take Up the Payments Net of Retentions of Contractors from the Trust Account - Payment Claim #123456",
    account: "Bank Account (Project Trust Account)",
    debit: "",
    credit: "$10,000.00",
  },
  {
    journalNo: "4",
    activityId: "4",
    date: "24/05/2023",
    transaction:
      "Take Up Beneficial Interest to Roofing Sub Contractor - Payment Claim 654321 - Due 24/05/2023",
    account: "Trustee Name",
    debit: "$30,000.00",
    credit: "",
  },
  {
    journalNo: "4",
    activityId: "4",
    date: "24/05/2023",
    transaction:
      "Take Up Beneficial Interest to Roofing Sub Contractor - Payment Claim 654321 - Due 24/05/2023",
    account: "Roofing Sub Contractor",
    debit: "",
    credit: "$30,000.00",
  },
  {
    journalNo: "5",
    activityId: "5",
    date: "24/05/2023",
    transaction:
      "To Take Up the Payments Net of Retentions to Contractors from the Trust Account - Payment Claim #654321",
    account: "Roofing Sub Contractor",
    debit: "$28,500.00",
    credit: "",
  },
  {
    journalNo: "5",
    activityId: "5",
    date: "24/05/2023",
    transaction:
      "To Take Up the Payments Net of Retentions to Contractors from the Trust Account - Payment Claim #654321",
    account: "Bank Account (Project Trust Account)",
    debit: "",
    credit: "$28,500.00",
  },
  {
    journalNo: "6",
    activityId: "5",
    date: "24/05/2023",
    transaction:
      "To Take Up the Payments of Retentions to the Retention Trust Account - Payment Claim #654321 (Reteined Amount)",
    account: "Roofing Sub Contractor",
    debit: "$1,500.00",
    credit: "",
  },
  {
    journalNo: "6",
    activityId: "5",
    date: "24/05/2023",
    transaction:
      "To Take Up the Payments of Retentions to the Retention Trust Account - Payment Claim #654321 (Reteined Amount)",
    account: "Bank Account (Project Trust Account)",
    debit: "",
    credit: "$1,500.00",
  },
  {
    journalNo: "7",
    activityId: "7",
    date: "30/06/2023",
    transaction:
      "Take Up Beneficial Interest to Roofing Sub Contractor - Payment Claim #98765 - Due 30/06/2023",
    account: "Trustee Name",
    debit: "$15,000.00",
    credit: "",
  },
  {
    journalNo: "7",
    activityId: "7",
    date: "30/06/2023",
    transaction:
      "Take Up Beneficial Interest to Roofing Sub Contractor - Payment Claim #98765 - Due 30/06/2023",
    account: "Roofing Sub Contractor",
    debit: "",
    credit: "$15,000.00",
  },
  {
    journalNo: "8",
    activityId: "8",
    date: "30/06/2023",
    transaction:
      "Reversal - Take Up Beneficial Interest to Roofing Sub Contractor - Payment Claim #98765 - Due 30/06/2023   ",
    account: "Roofing Sub Contractor",
    debit: "$15,000.00",
    credit: "",
  },
];

export type UserData = {
  journalNo: string;
  activityId: string;
  date: string;
  transaction: string;
  account: string;
  debit: string;
  credit: string;
};

export type LedgerJournalsType = {
  activity_id: number;
  date: string;
  journal_description: string;
  account_name: string;
  total_debit: number;
  total_credit: number;
  total_count: number;
};
