// Define headers dynamically
const contractListPDFHeaders = [
  "Date Created",
  "Project Name",
  "Contract Name",
  "Buyer Name",
  "Seller Name",
  "Contract Sum",
  "Agreed Variations",
  "Contract Type",
];

const contractListHeaders = [
  { dataKey: "contract_date", title: "Date Created" },
  { dataKey: "project_name", title: "Project Name" },
  { dataKey: "contract_name", title: "Contract Name" },
  { dataKey: "buyer_name", title: "Buyer Name" },
  { dataKey: "seller_name", title: "Seller Name" },
  {
    dataKey: "initial_contract_sum",
    title: "Contract Sum",
  },
  { dataKey: "variation_amount", title: "Agreed Variations" },
  { dataKey: "contract_billing_type", title: "Contract Type" },
  { dataKey: "missing_data_warnings", title: "Data Status", restrictSorting: true },
  { title: "Actions", dataKey: "status", restrictSorting: true },
];

const contractsRenderData = [
  { key: "contract_date" },
  { key: "project_name" },
  { key: "contract_name" },
  { key: "buyer_name" },
  { key: "seller_name" },
  { key: "initial_contract_sum" },
  { key: "variation_amount" },
  { key: "contract_billing_type" },
  { key: "missing_data_warnings", enableMissingDataWarning: true },
];

const excelColumnNames = [
  { value: "contract_date", label: "Date Created" },
  { value: "project_name", label: "Project Name" },
  { value: "contract_name", label: "Contract Name" },
  { value: "buyer_name", label: "Buyer Name" },
  { value: "seller_name", label: "Seller Name" },
  { value: "initial_contract_sum", label: "Contract Sum" },
  { value: "variation_amount", label: "Agreed Variations" },
  { value: "contract_billing_type", label: "Contract Type" },
];

const pdfDataRow = [
  "contract_date",
  "project_name",
  "contract_name",
  "buyer_name",
  "seller_name",
  "initial_contract_sum",
  "variation_amount",
  "contract_billing_type",
];

export {
  excelColumnNames,
  pdfDataRow,
  contractListHeaders,
  contractListPDFHeaders,
  contractsRenderData,
};
