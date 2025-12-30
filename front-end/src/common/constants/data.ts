const contactSubmissionStatus = [
  {
    label: "Closed",
    value: "Closed",
  },
  {
    label: "Contacted",
    value: "Contacted",
  },
  {
    label: "Received",
    value: "Received",
  },
];

const filterByDuration = [
  {
    label: "All",
    value: null,
  },
  { value: "Custom", label: "Custom" },
  { value: "Last Month", label: "Last Month" },
];

const moduleDropdown = [
  {
    label: "All",
    value: "",
  },
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

const categoryStatus = [
  { value: "Business", label: "Business" },
  { value: "Uncategorized", label: "Uncategorized" },
];

const statusFilter = [
  { value: "Draft", label: "Draft" },
  { value: "Deleted", label: "Deleted" },
  { value: "Published", label: "Published" },
  { value: "Unpublished", label: "Unpublished" },
];

const pageType = [
  { value: "", label: "All" },
  { value: "Cookies Policy", label: "Cookies Policy" },
  { value: "Privacy Policy", label: "Privacy Policy" },
  { value: "Security", label: "Security" },
  { value: "Terms and Conditions", label: "Terms and Conditions" },
];

//options for status dropdown
const statusOptions = [
  { value: "", label: "All" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "In Active" },
];

export {
  statusOptions,
  contactSubmissionStatus,
  filterByDuration,
  moduleDropdown,
  categoryStatus,
  statusFilter,
  pageType,
};
