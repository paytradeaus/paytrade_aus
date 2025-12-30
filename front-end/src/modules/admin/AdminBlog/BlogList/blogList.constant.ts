const excelColumnNames = [
  { value: "authorName", label: "Author" },
  { value: "title", label: "Title" },
  { value: "content", label: "content" },
  { value: "urlSlug", label: "URL" },
  { value: "blog_status", label: "Status" },
  { value: "category", label: "category" },
  { value: "published_on", label: "Published Date" },
];

const pdfDataHeaders = [
  "Author",
  "Title",
  "content",
  "URL",
  "Status",
  "category",
  "Published Date",
];

const pdfDataRow = [
  "authorName",
  "title",
  "content",
  "urlSlug",
  "blog_status",
  "category",
  "published_on",
];

const blogListHeaders = [
  { dataKey: "category", title: "Category" },
  { dataKey: "title", title: "Title" },
  { dataKey: "authorName", title: "Author" },
  { dataKey: "created_on", title: "Date Posted" },
  { dataKey: "published_on", title: "Date Published" },
  { dataKey: "blog_status", title: "Status" },
  { dataKey: "", title: "Actions", restrictSorting: true },
];

const blogCommentsHeader = [
  { dataKey: "User ID", title: "User ID" },
  { dataKey: "User Name", title: "User Name" },
  { dataKey: "Comment Posted", title: "Comment Posted" },
  { dataKey: "Status", title: "Status" },
  { dataKey: "Date", title: "Date" },
  { dataKey: "", title: "Actions", restrictSorting: true },
];

const BlogCommentRenderData = [
  { key: "User ID" },
  { key: "User Name" },
  { key: "Comment Posted" },
  { key: "Status" },
  { key: "Date" },
];

const blogRenderData = [
  { key: "category" },
  { key: "title" },
  { key: "authorName" },
  { key: "created_on" },
  { key: "published_on" },
  { key: "blog_status" },
];

const tabsOptions = [
  { label: "Blog Definition", value: "Blog Definition" },
  { label: "Blog Comments", value: "Blog Comments" },
];

const statusOption = [
  { value: "", label: "All" },
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
];

const addEditStatusOptions = [
  { value: "Draft", label: "Draft" },
  { value: "Published", label: "Published" },
  { value: "Unpublished", label: "Unpublished" },
];

export {
  excelColumnNames,
  pdfDataRow,
  pdfDataHeaders,
  blogListHeaders,
  blogRenderData,
  blogCommentsHeader,
  BlogCommentRenderData,
  tabsOptions,
  statusOption,
  addEditStatusOptions,
};
