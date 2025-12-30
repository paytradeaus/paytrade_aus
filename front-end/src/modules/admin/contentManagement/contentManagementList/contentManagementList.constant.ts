// Define headers dynamically

const contentManagementHeaders = [
  { dataKey: "heading", title: "Page Type" },
  { dataKey: "body", title: "Descriptions" },
  { dataKey: "updated_on", title: "Last Updated", typeOfDate: true },
  { title: "edit", dataKey: "status", restrictSorting: true },
];

const contentManagementRenderData = [
  { key: "heading", wrapData: true },
  { key: "body", wrapData: true },
  { key: "updated_on", typeOfDate: true },
];

const statusOptions = [
  { value: "All", label: "All" },
  { value: "Cookies Policy", label: "Cookies policy" },
  { value: "Privacy Policy", label: "Privacy policy" },
  { value: "Security", label: "Security" },
  { value: "Terms and Conditions", label: "Terms and conditions" },
];
const tabs = [
  { id: "Page List", label: "Page Type", hasError: false, isActive: true },
  { id: "FAQs", label: "FAQs", hasError: true },
  { id: "Email Templates", label: "Email Templates", hasError: true },
];

export {
  tabs,
  statusOptions,
  contentManagementHeaders,
  contentManagementRenderData,
};
