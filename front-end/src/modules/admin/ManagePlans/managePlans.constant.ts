const tabOptions = [{ label: "Current" }, { label: "Archived", value: null }];

// Define headers dynamically
const pdfHeaders = [
  "Plan Name",
  "Plan Type",
  "Monthly Price",
  "Yearly Cycle",
  "Description",
  "Trial Period",
  "Status",
  "Items",
];

const pdfDataRow = [
  "plan_name",
  "plan_type",
  "monthly_price",
  "yearly_price",
  "description",
  "trial_period",
  "monthly_ai_credit",
  "plan_status",
  "plan_items",
];

const managePlansRenderData = [
  { key: "plan_name" },
  { key: "plan_type" },
  { key: "mode_label" },
  { key: "stripe_product_id" },
  { key: "monthly_price" },
  { key: "yearly_price" },
  { key: "plan_status", enableStatusIcons: true },
];

const managePlanHeaders = [
  { title: "Plan Name", dataKey: "plan_name" },
  { title: "Plan Type", dataKey: "plan_type" },
  { title: "Mode", dataKey: "mode_label", restrictSorting: true },
  { title: "Stripe Id", dataKey: "stripe_product_id" },
  { title: "Monthly Price", dataKey: "monthly_price" },
  { title: "Yearly Price", dataKey: "yearly_price" },
  { title: "Status", dataKey: "plan_status" },
  { title: "Actions", restrictSorting: true },
];

const archivedPlanHeaders = [
  managePlanHeaders[0],
  managePlanHeaders[1],
  managePlanHeaders[2],
  managePlanHeaders[3],
  managePlanHeaders[4],
  managePlanHeaders[5],
  { title: "View", restrictSorting: true },
];

const planTypes = [
  { value: "", label: "All" },
  { value: "Free", label: "Free" },
  { value: "Paid", label: "Paid" },
];

export {
  tabOptions,
  pdfHeaders,
  managePlansRenderData,
  pdfDataRow,
  managePlanHeaders,
  planTypes,
  archivedPlanHeaders,
};
