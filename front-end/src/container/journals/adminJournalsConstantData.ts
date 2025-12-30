export type UserData = {
  accountName: string;
  accountType: string;
  status: string;
  balanceCheck: string;
};

export const type = [
  { value: "Project Trust Account", label: "Project Trust Account" },
  { value: "Retention Trust Account", label: "Retention Trust Account" },
];

export const statusOptions = [
  { label: "All", value: "" },
  { value: "Closed", label: "Closed" },
  { value: "Open", label: "Open" },
];

export const check = [
  { label: "All", value: "" },
  { value: "Error", label: "Error" },
  { value: "Ok", label: "Ok" },
];

export const Actions = [
  { value: "View", label: "View" },
  { value: "View Trial Balance", label: "View Trial Balance" },
];
