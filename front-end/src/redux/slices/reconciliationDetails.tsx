import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const reportDataDetails = createSlice({
  name: "reconciliationReport",
  initialState: {
    reportData: {},
  },
  reducers: {
    setReportData: (state: any, action: PayloadAction<any>) => {
      state.reportData = action.payload;
    },
  },
});

export const { setReportData } = reportDataDetails.actions;
export default reportDataDetails.reducer;
