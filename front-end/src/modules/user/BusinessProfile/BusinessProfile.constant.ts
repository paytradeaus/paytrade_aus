const entityType = [
  {
    label: "Business",
    value: "Business",
  },
  {
    label: "Sole Trader",
    value: "Sole Trader",
  },
  {
    label: "Personal",
    value: "Personal",
  },
];

const options = [
  { value: "Blocked", label: "Blocked" },
  { value: "UnBlocked", label: "Unblocked" },
];

const trustTrainingGridHeaders = [
  { title: "Name", dataKey: "trainingRecordName", restrictSorting: true },
  { title: "Date", dataKey: "trainingRecordDate", restrictSorting: true },

  { title: "Actions", restrictSorting: true, alignCenter: true },
];

const trustTrainingRenderData = [
  { key: "trainingRecordName" },
  { key: "trainingRecordDate" },
];

export {
  entityType,
  options,
  trustTrainingGridHeaders,
  trustTrainingRenderData,
};
