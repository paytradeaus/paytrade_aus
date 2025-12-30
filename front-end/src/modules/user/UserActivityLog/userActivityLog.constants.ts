export const ExcelColumnNames = [
  { value: "event_date", label: "Date Changed" },
  { value: "user", label: "User" },
  { value: "event_text", label: "Event" },
];

export const PdfheaderNames: string[] = ["Date Changed", "User", "Event"];

export const ActivitypdfheaderNames = [
  { title: "Date Changed", dataKey: "event_date" },
  { title: "User", dataKey: "user" },
  { title: "Event", dataKey: "event_text" },
];

export const pdfDataRow: any[] = ["event_date", "user", "event_text"];

export const activityRenderData = [
  { key: "event_date" },
  { key: "user" },
  { key: "event_text" },
];
