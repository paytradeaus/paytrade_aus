const tabOptions = [
  { label: "Details", value: "details" },
  { label: "Subscription items", value: "items" },
];

const planTypes = [
  { value: "Free", label: "Free" },
  { value: "Paid", label: "Paid" },
];

const statusOptions = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "In Active" },
];

const planType = {
  FREE: "Free",
};

const subscriptionGridHeaders = [
  { title: "Subscription items" },
  { title: "specifications", restrictSorting: true },
];

// const subscriptionRenderData = [
//   { key: "item_name" },
//   {
//     key: "specification",
//     render: (rowData: any, index: number) =>
//       renderSpecificationUI(rowData, index),
//   },
// ];

export const limitTypeOptions = [
  { label: "Checkbox", value: "Checkbox" },
  { label: "Dropdown", value: "Dropdown" },
  { label: "Numeric", value: "Numeric" },
];

export const unitOptions = [
  { label: "No unit", value: "No unit" },
  { label: "Second", value: "Second" },
  { label: "Minute", value: "Minute" },
  { label: "Hour", value: "Hour" },
  { label: "Day", value: "Day" },
  { label: "Month", value: "Month" },
  { label: "Year", value: "Year" },
];

export {
  tabOptions,
  planTypes,
  statusOptions,
  planType,
  subscriptionGridHeaders,
  // subscriptionRenderData,
};
