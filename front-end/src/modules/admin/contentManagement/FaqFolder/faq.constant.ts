// Define headers dynamically
const faqPDFHeaders = ["Category", "Questions", "Answers", "Status"];

const faqHeaders = [
  { dataKey: "category", title: "Category" },
  { dataKey: "question", title: "Questions" },
  { dataKey: "answer", title: "Answers" },
  { dataKey: "orderChange", title: "Change Order", restrictSorting: true },
  { dataKey: "faq_status", title: "Status" },
  { title: "Actions", dataKey: "status", restrictSorting: true },
];

const faqRenderData = [
  { key: "category" },
  { key: "question" },
  { key: "answer", trim: 100 },
  { key: "orderChange" },
  { key: "faq_status" },
];

const excelColumnNames = [
  { value: "category", label: "Category" },
  { value: "question", label: "Questions" },
  { value: "answer", label: "Answers" },
  { value: "faq_status", label: "Status" },
];

const pdfDataRow = ["category", "question", "answer", "faq_status"];

const statusOptions = [
  { value: "All", label: "All" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];
const tabs = [
  { id: "Page List", label: "Page List", hasError: false },
  { id: "FAQs", label: "FAQs", hasError: true, isActive: true },
  { id: "Email Templates", label: "Email Templates", hasError: true },
];

export {
  tabs,
  statusOptions,
  excelColumnNames,
  pdfDataRow,
  faqPDFHeaders,
  faqHeaders,
  faqRenderData,
};
