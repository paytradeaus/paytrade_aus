import { date } from "yup";

export const sampleData = [
  {
    journal: "1",
    activity: "1",
    account: "Bank Account (Project Trust Account Number)",
    date: "",
    transaction: "",
    corresponding: "",
    debit: "",
    credit: "",
    balance: "$",
  },
  {
    journal: "2",
    activity: "2",
    account: "Bank Account (Project Trust Account Number)",
    date: "23/04/2023",
    transaction:
      "Payment Received into the Trust Account from Principal Name for Progress Claim #1234567",
    corresponding: "Trustee Name",
    debit: "$95,000.00",
    credit: "",
    balance: "$95,000.00",
  },
  {
    journal: "3",
    activity: "3",
    account: "Bank Account (Project Trust Account Number)",
    date: "24/04/2023",
    transaction:
      "To Take up the Payments of Retentions to Contractors from the Trust Account - Payment Claim #123456",
    corresponding: "Roofing Sub Contractor",
    debit: "",
    credit: "$10,000.00",
    balance: "$85,000.00",
  },
  {
    journal: "10",
    activity: "10",
    account: "Bank Account (Project Trust Account Number)",
    date: "10/05/2023",
    transaction:
      "Payment Received into the Trust Account from Principal Name for Progress Claim #111111",
    corresponding: "Trustee Name",
    debit: "$47,500.00",
    credit: "",
    balance: "$132,500.00",
  },
  {
    journal: "5",
    activity: "5",
    account: "Bank Account (Project Trust Account Number)",
    date: "24/05/2023",
    transaction:
      "To Take up the Payments of Retentions to Contractors from the Trust Account - Payment Claim #654321",
    corresponding: "Roofing Sub Contractor",
    debit: "",
    credit: "$28,500.00",
    balance: "$104,000.00",
  },
  {
    journal: "6",
    activity: "5",
    account: "Bank Account (Project Trust Account Number)",
    date: "24/05/2023",
    transaction:
      "To Take up the Payments of Retentions to the Retention Trust Account - Payment Claim #654321 (Retained Amount)",
    corresponding: "Roofing Sub Contractor",
    debit: "",
    credit: "$1,500.00",
    balance: "$102,500.00",
  },
  {
    journal: "11",
    activity: "11",
    account: "Bank Account (Project Trust Account Number)",
    date: "30/06/2023",
    transaction:
      "To Take up the Payments of Retentions to Contractors from the Trust Account - Payment Claim #98765",
    corresponding: "Roofing Sub Contractor",
    debit: "",
    credit: "$14,250.00",
    balance: "$88,250.00",
  },
  {
    journal: "12",
    activity: "11",
    account: "Bank Account (Project Trust Account Number)",
    date: "30/06/2023",
    transaction:
      "To Take up the Payments of Retentions to the Retention Trust Account - Payment Claim #98765 (Retained Amount)",
    corresponding: "Roofing Sub Contractor",
    debit: "",
    credit: "$750.00",
    balance: "$87,500.00",
  },
  {
    journal: "16",
    activity: "17",
    account: "Bank Account (Project Trust Account Number)",
    date: "10/01/2024",
    transaction:
      "To Take up the Payments of Retentions to Contractors from the Trust Account - Payment Claim #22222",
    corresponding: "Roofing Sub Contractor",
    debit: "",
    credit: "$30,000.00",
    balance: "$12,500.00",
  },
  {
    journal: "20",
    activity: "20",
    account: "Bank Account (Project Trust Account Number)",
    date: "10/02/2024",
    transaction:
      "To Take up the Payments of Retentions to the Retention Trust Account - Payment Claim #33333",
    corresponding: "Roofing Sub Contractor",
    debit: "",
    credit: "$30,000.00",
    balance: "$12,500.00",
  },
  {
    journal: "22",
    activity: "22",
    account: "Bank Account (Project Trust Account Number)",
    date: "09/03/2024",
    transaction:
      "Payment I Received into the Trust Account from Head Contractor for Short Term Liquidity Topup #121212",
    corresponding: "Trustee Name",
    debit: "$37,500.00",
    credit: "",
    balance: "$50,000.00",
  },
  {
    journal: "23",
    activity: "23",
    account: "Bank Account (Project Trust Account Number)",
    date: "10/03/2024",
    transaction:
      "To Take up the Payments of Retentions to the Retention Trust Account - Payment Claim #44444",
    corresponding: "Roofing Sub Contractor",
    debit: "",
    credit: "$50,000.00",
    balance: "",
  },
  {
    journal: "24",
    activity: "24",
    account: "Bank Account (Project Trust Account Number)",
    date: "10/04/2024",
    transaction:
      "Ppayment Received into the Trust Account from Principal Name for Progress Claim #7654321",
    corresponding: "Trustee Name",
    debit: "$95,000.00",
    credit: "",
    balance: "$95,000.00",
  },
];
export const sampleData1 = [
  {
    date1: "Retention Trust Account",
    trans: "",
    reference: "",
    dr: "",
    cr: "",
    bal: "$0.00",
  },
  {
    date1: "28/02/2022",
    trans:
      "To take up cash retention on payment claims (Beneficiary A (800-01))",
    reference: "",
    dr: "",
    cr: "",
    bal: "",
  },
  {
    date1: "",
    trans: "",
    reference: "#16",
    dr: "$8,616.00",
    cr: "",
    bal: "$8,616.00",
  },
  {
    date1: "15/03/2022",
    trans:
      "To take up cash retention on payment claims (Beneficiary B (800-02))",
    reference: "#17",
    dr: "$50,000.00",
    cr: "",
    bal: "$58,616.00",
  },
  {
    date1: "15/03/2022",
    trans:
      "To take up cash retention on payment claims (Beneficiary C (800-03))",
    reference: "#18",
    dr: "$40,000.00",
    cr: "",
    bal: "$98,616.00",
  },
  {
    date1: "31/03/2022",
    trans: "To take up interest credited by bank (trustee)",
    reference: "#19",
    dr: "$34.00",
    cr: "",
    bal: "$98,650.00",
  },
  {
    date1: "15/04/2022",
    trans: "To take up cash retention on payment claims (multiple)",
    reference: "#20",
    dr: "$98,000.00",
    cr: "",
    bal: "$196,650.00",
  },
  {
    date1: "31/05/2022",
    trans:
      "To record payment for rectifying Beneficiary C defective work (third party)",
    reference: "#21",
    dr: "",
    cr: "$40,000.00",
    bal: "$156,650.00",
  },
  {
    date1: "30/06/2023",
    trans: "To record payments of retention at practical completion (multiple)",
    reference: "#22",
    dr: "",
    cr: "$62,000.00",
    bal: "$94,650.00",
  },
  {
    date1: "30/06/2023",
    trans: "To record withdrawal of interest (trustee)",
    reference: "#23",
    dr: "",
    cr: "$34.00",
    bal: "$94,616.00",
  },
  {
    date1: "",
    trans: "Total Retention Trust Account",
    reference: "",
    dr: "$196,650.00",
    cr: "$102,034.00",
    bal: "",
  },
  {
    date1: "",
    trans: "Net movement",
    reference: "",
    dr: "$94,616.00",
    cr: "",
    bal: "",
  },
  {
    date1: "Beneficiary A (800-01)",
    trans: "",
    reference: "",
    dr: "",
    cr: "",
    bal: "$0.00",
  },
  {
    date1: "28/02/2022",
    trans:
      "To take up cash retention on payment claims (Beneficiary A (800-01))",
    reference: "#16",
    dr: "",
    cr: "$8,616.00",
    bal: "-$8,616.00",
  },
  {
    date1: "15/04/2022",
    trans:
      "To take up cash retention on payment claims (Beneficiary A (800-01))",
    reference: "#20",
    dr: "",
    cr: "$28,000.00",
    bal: "-$36,616.00",
  },
  {
    date1: "30/06/2023",
    trans:
      "To record payments of retention at practical completion (Beneficiary A (800-01))",
    reference: "#22",
    dr: "$10,000.00",
    cr: "",
    bal: "-$26,616.00",
  },
  {
    date1: "",
    trans: "Total Beneficiary A (800-01)",
    reference: "",
    dr: "$10,000.00",
    cr: "$36,616.00",
    bal: "",
  },
  {
    date1: "",
    trans: "Net movement",
    reference: "",
    dr: "",
    cr: "$26,616.00",
    bal: "",
  },
  {
    date1: "Beneficiary B (800-02)",
    trans: "",
    reference: "",
    dr: "",
    cr: "",
    bal: "$0.00",
  },
  {
    date1: "15/03/2022",
    trans:
      "To take up cash retention on payment claims (Beneficiary B (800-02))",
    reference: "#17",
    dr: "",
    cr: "$50,000.00",
    bal: "-$50,000.00",
  },
  {
    date1: "15/04/2022",
    trans:
      "To take up cash retention on payment claims (Beneficiary B (800-02))",
    reference: "#20",
    dr: "",
    cr: "$50,000.00",
    bal: "-$100,000.00",
  },
  {
    date1: "30/06/2023",
    trans:
      "To record payments of retention at practical completion (Beneficiary B (800-02))",
    reference: "#22",
    dr: "$50,000.00",
    cr: "",
    bal: "-$50,000.00",
  },
  {
    date1: "",
    trans: "Total Beneficiary B (800-02)",
    reference: "",
    dr: "$50,000.00",
    cr: "$100,000.00",
    bal: "",
  },
  {
    date1: "",
    trans: "Net movement",
    reference: "",
    dr: "",
    cr: "$50,000.00",
    bal: "",
  },
  {
    date1: "Beneficiary C (800-03)",
    trans: "",
    reference: "",
    dr: "",
    cr: "",
    bal: "$0.00",
  },
  {
    date1: "15/03/2022",
    trans:
      "To take up cash retention on payment claims (Beneficiary C (800-03))",
    reference: "#18",
    dr: "",
    cr: "$40,000.00",
    bal: "-$40,000.00",
  },
  {
    date1: "15/04/2022",
    trans:
      "To take up cash retention on payment claims (Beneficiary C (800-03)",
    reference: "#20",
    dr: "",
    cr: "$20,000.00",
    bal: "-$60,000.00",
  },
  {
    date1: "31/05/2022",
    trans:
      "To record payment for rectifying Beneficiary C defective work (third party)",
    reference: "#21",
    dr: "$40,000.00",
    cr: "",
    bal: "-$20,000.00",
  },
  {
    date1: "30/06/2023",
    trans:
      "To record payments of retention at practical completion (Beneficiary C (800-03))",
    reference: "#22",
    dr: "$2,000.00",
    cr: "",
    bal: "-$18,000.00",
  },
  {
    date1: "",
    trans: "Total Beneficiary C (800-03)",
    reference: "",
    dr: "$42,000.00",
    cr: "$60,000.00",
    bal: "",
  },
  {
    date1: "",
    trans: "Net movement",
    reference: "",
    dr: "",
    cr: "$18,000.00",
    bal: "",
  },
  {
    date1: "Trustee Pty Ltd",
    trans: "",
    reference: "",
    dr: "",
    cr: "",
    bal: "$0.00",
  },
  {
    date1: "31/03/2022",
    trans: "To take up interest credited by bank (trustee)",
    reference: "#19",
    dr: "",
    cr: "$34.00",
    bal: "-$34.00",
  },
  {
    date1: "30/06/2023",
    trans: "To record withdrawal of interest (trustee)",
    reference: "#23",
    dr: "$34.00",
    cr: "",
    bal: "$0.00",
  },
  {
    date1: "",
    trans: "Total Trustee Pty Ltd",
    reference: "",
    dr: "$34.00",
    cr: "$34.00",
    bal: "",
  },
  {
    date1: "",
    trans: "Net movement",
    reference: "",
    dr: "$0.00",
    cr: "",
    bal: "",
  },
];
export type UserData = {
  journal: string;
  activity: string;
  account: string;
  date: string;
  transaction: string;
  corresponding: string;
  debit: string;
  credit: string;
  balance: string;
};
export type LedgerType = {
  journal_date: any;
  journal_description: string;
  activity_id: any;
  debit_amount: number;
  credit_amount: number;
  balance_amount: number;
};
