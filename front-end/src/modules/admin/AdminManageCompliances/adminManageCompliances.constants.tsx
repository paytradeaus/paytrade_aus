const manageCompliancesHeaders = [
  { dataKey: "check_name", title: "compliance type", restrictSorting: true },
  { dataKey: "is_active", title: "status", restrictSorting: true },
];

const manageCompliancesRenderData = [
  { key: "check_name" },
  { key: "is_active" },
];

export { manageCompliancesHeaders, manageCompliancesRenderData };
