export const sampleData = [
  {
    date: "23/03/2023",
    description: "Transfer to Other Bank CommonBank App Taylor",
    spent: "",
    received: "$10,000.00",
    matchedTo: "TBC Payment Schedule 44, Payment 3",
    status: "For Review",
  },
  {
    date: "23/03/2023",
    description: "Transfer to xx6851 CommonBank App",
    spent: "",
    received: "$10,000.00",
    matchedTo: "TBC Payment Schedule 44, Payment 4",
    status: "For Review",
  },
  {
    date: "23/03/2023",
    description:
      "Transfer to Qsquash Southern Region Inc CommonBank App Joshua Taylor",
    spent: "",
    received: "$10,000.00",
    matchedTo: "TBC Payment Schedule 44, Payment 5",
    status: "For Review",
  },
];

export const sampleData1 = [
  {
    date: "23/03/2023",
    description: "",
    spent: "",
    received: "$10,000.00",
    matchedTo: "TBC Payment Schedule 44, Payment 3",
    status: "For Review",
  },
  {
    date: "23/03/2023",
    description: "Transfer to xx6851 CommonBank App",
    spent: "",
    received: "$10,000.00",
    matchedTo: "TBC Payment Schedule 44, Payment 4",
    status: "For Review",
  },
  {
    date: "23/03/2023",
    description:
      "Transfer to Qsquash Southern Region Inc CommonBank App Joshua Taylor",
    spent: "",
    received: "$10,000.00",
    matchedTo: "TBC Payment Schedule 44, Payment 5",
    status: "For Review",
  },
];

export const sampleData5 = [
  {
    accountJournalNo: "1", // Add the accountJournalNo property
    activityId: "1",
    dateText: "24/04/2024",
    transactionDetails:
      "Take up beneficial interest to - roofing sub-contractor - Payment claim 123456 due 24/04/2024",
    accountClient: "Trustee name",
    debit: "$ 10,000.00",
    credit: "$ 10,000.00",
    money: 100,
  },
  {
    accountJournalNo: "2", // Add the accountJournalNo property
    activityId: "2",
    dateText: "24/04/2024",
    transactionDetails:
      "Take up beneficial interest to - roofing sub-contractor - Payment claim 123456 due 24/04/2024",
    accountClient: "Trustee name",
    debit: "$ 95,000.00",
    credit: "$ 95,000.00",
    money: 400,
  },
  {
    accountJournalNo: "3", // Add the accountJournalNo property
    activityId: "3",
    dateText: "24/04/2024",
    transactionDetails:
      "Take up beneficial interest to - roofing sub-contractor - Payment claim 123456 due 24/04/2024",
    accountClient: "Roofing sub contractor",
    debit: "$ 10,000.00",
    credit: "$ 10,000.00",
    money: 600,
  },
];

export const sampleData6 = [
  {
    type: "Interest", // Add the accountJournalNo property
    payment: "23/03/2023",
    amount: "$50.33",
    statusCharge: "Draft",
  },
  {
    type: "Charge", // Add the accountJournalNo property
    payment: "23/03/2023",
    amount: "$33.99",
    statusCharge: "Unmatched",
  },
  {
    type: "Charge", // Add the accountJournalNo property
    payment: "23/03/2023",
    amount: "$500.34",
    statusCharge: "Matched",
  },
];

export const toggleOptions = [
  { value: "All", label: "All", hasError: false },
  { value: "Client", label: "Clients", hasError: true },
  { value: "Supplier", label: "Suppliers", hasError: true },
];
