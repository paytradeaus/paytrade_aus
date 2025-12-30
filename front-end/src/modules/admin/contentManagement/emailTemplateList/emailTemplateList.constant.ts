// Define headers dynamically

const mailHeaders = [
  { dataKey: "category", title: "Email Type" },
  { dataKey: "email_subject", title: "Subject" },
  { dataKey: "updated_on", title: "Last Updated", typeOfDate: true },

  { title: "edit", dataKey: "status", restrictSorting: true },
];

const mailRenderData = [
  { key: "category" },
  { key: "email_subject" },
  { key: "updated_on", typeOfDate: true },
];

const statusOptions = [
  { value: "All", label: "All" },
  {
    label: "Admin",
    value: "Admin",
  },
  {
    label: "Company",
    value: "Company",
  },
  {
    label: "General",
    value: "General",
  },
  {
    label: "User",
    value: "User",
  },
];
const tabs = [
  { id: "Page List", label: "Page List", hasError: false },
  { id: "FAQs", label: "FAQs", hasError: true },
  {
    id: "Email Templates",
    label: "Email Templates",
    hasError: true,
    isActive: true,
  },
];

export { tabs, statusOptions, mailHeaders, mailRenderData };
