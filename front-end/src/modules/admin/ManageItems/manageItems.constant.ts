// Define headers dynamically
const pdfHeaders = ["Item Name", "Description", "Status"];

const pdfDataRow = ["item_name", "description", "item_status"];

const manageItemsRenderData = [
  { key: "item_name" },
  { key: "description" },
  { key: "item_status", enableStatusIcons: true },
];

//constant for bank accounts list header
const manageItemsHeaders = [
  { title: "Item Name", dataKey: "item_name" },
  { title: "Description", dataKey: "description" },
  { title: "Status", dataKey: "item_status" },
  { title: "Actions", restrictSorting: true },
];

const archivedManageItemsHeaders = [
  manageItemsHeaders[0],
  manageItemsHeaders[1],
  manageItemsHeaders[2],
  { title: "View", restrictSorting: true },
];

const statusOptions = [
  { label: "All", value: "" },
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
];

export {
  pdfHeaders,
  manageItemsRenderData,
  pdfDataRow,
  manageItemsHeaders,
  statusOptions,
  archivedManageItemsHeaders,
};
