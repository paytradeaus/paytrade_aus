export const sampleData = [
  {
    account: "Bank Account (Project Trust Account Number)",
    date: "31/07/2023",
    debit: "$137,500.00",
    credit: "$-",
    balance: "$137,500.00",
  },
  {
    account: "Roofing Sub Contractor",
    date: "31/07/2023",
    debit: "$-",
    credit: "$-",
    balance: "$-",
  },
  {
    account: "Electrical Sub Contractor",
    date: "31/07/2023",
    debit: "$-",
    credit: "$-",
    balance: "$-",
  },
  {
    account: "Trustee Name",
    date: "31/07/2023",
    debit: "$-",
    credit: "$137,500.00",
    balance: "$-137,500.00",
  },
  {
    account: "",
    date: "",
    debit: "",
    credit: "",
    balance: "",
  },

  {
    account: "Balance Check",
    date: "",
    debit: "$137,500.00",
    credit: "$137,500.00",
    balance: "",
  },
];

export const sampleData1 = [
  {
    account: "Bank Account (Project Trust Account Number)",
    debit: "$302,314.99",
    credit: "",
  },
  {
    account: "AD Electrician Pty Ltd",
    debit: "",
    credit: "$0.00",
  },
  {
    account: "AZ Concreter Pty Ltd",
    debit: "",
    credit: "$56,324.00",
  },
  {
    account: "CA Carpenter Pty Ltd",
    debit: "",
    credit: "$23,255.00",
  },
  {
    account: "NJ Plumbing Pty Ltd",
    debit: "",
    credit: "$32,058.00",
  },
  {
    account: "Trustee Pty Ltd",
    debit: "",
    credit: "$190,677.99",
  },
  {
    account: "",
    debit: "$302,314.99",
    credit: "$302,314.99",
  },
];

export const sampleData2 = [
  {
    account: "Retention Trust Account",
    closing_balance: "$94,616.00",
  },
  {
    account: "Beneficiary A (800-01)",
    closing_balance: "-$26,616.00",
  },
  {
    account: "Beneficiary B (800-02)",
    closing_balance: "-$50,000.00",
  },
  {
    account: "Beneficiary C (800-03)",
    closing_balance: "-$18,000.00",
  },
  {
    account: "Trustee Pty Ltd",
    closing_balance: "$0.00",
  },
  {
    account: "Balance",
    closing_balance: "$0.00",
  },
];

export type TrialBalanceType = {
  account: string;
  closing_balance: string;
};
