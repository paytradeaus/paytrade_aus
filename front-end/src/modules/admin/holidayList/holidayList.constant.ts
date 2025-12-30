const holidayListHeaders = [
  { dataKey: "holiday_name", title: "Name" },
  { dataKey: "holiday_date", title: "Date" },
  { dataKey: "recurring_every_year", title: "Occurs Annually" },
  { title: "Actions", restrictSorting: true },
];

const holidayWarningListHeaders = [
  { dataKey: "holiday_name", title: "Name", restrictSorting: true },
  { dataKey: "holiday_date", title: "Date", restrictSorting: true },
  {
    dataKey: "recurring_every_year",
    title: "Occurs Annually",
    restrictSorting: true,
  },
  { title: "Error Message", restrictSorting: true },
];

const holidayRenderData = [
  { key: "holiday_name" },
  { key: "holiday_date", typeOfDate: true },
  { key: "recurring_every_year" },
];

const holidayRenderWarningData = [
  { key: "holiday_name" },
  { key: "holiday_date", typeOfDate: true },
  { key: "recurring_every_year" },
  { key: "message" },
];

export {
  holidayListHeaders,
  holidayRenderData,
  holidayRenderWarningData,
  holidayWarningListHeaders,
};
