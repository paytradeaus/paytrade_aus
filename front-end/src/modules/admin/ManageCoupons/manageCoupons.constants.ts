const manageCouponsHeaders = [
  { title: "Coupon Name", dataKey: "coupon_name" },
  { title: "Coupon Type", dataKey: "duration" },
  { title: "Duration", dataKey: "duration_in_months" },
  { title: "Discount", dataKey: "percent_off" },
  { title: "Status", dataKey: "coupon_status" },
  { title: "Actions", restrictSorting: true },
];

const archivedManageCouponsHeaders = [
  manageCouponsHeaders[0],
  manageCouponsHeaders[1],
  manageCouponsHeaders[2],
  manageCouponsHeaders[3],
  manageCouponsHeaders[4],

  { title: "View", restrictSorting: true },
];

const manageCouponsRenderData = [
  { key: "coupon_name" },
  { key: "duration" },
  { key: "duration_in_months" },
  { key: "percent_off" },
  { key: "coupon_status", enableStatusIcons: true },
];

const excelColumnNames = [
  { value: "coupon_name", label: "Coupon Name" },
  { value: "duration", label: "Coupon Type" },
  { value: "duration_in_months", label: "Duration" },
  { value: "percent_off", label: "Discount" },
  { value: "coupon_status", label: "Status" },
];

const couponListPDFHeaders = [
  "Coupon Name",
  "Coupon Type",
  "Duration",
  "Discount",
  "Status",
];

const pdfDataRow = [
  "coupon_name",
  "duration",
  "duration_in_months",
  "percent_off",
  "coupon_status",
];

export {
  archivedManageCouponsHeaders,
  manageCouponsRenderData,
  manageCouponsHeaders,
  excelColumnNames,
  pdfDataRow,
  couponListPDFHeaders,
};
