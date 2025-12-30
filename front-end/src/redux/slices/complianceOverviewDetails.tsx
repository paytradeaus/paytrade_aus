import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const complianceOverviewDetails = createSlice({
  name: "complianceOverview",
  initialState: {
    timeLineData: null,
  },
  reducers: {
    setComplianceOverviewData: (state: any, action: PayloadAction<any>) => {
      state.timeLineData = action.payload;
    },
  },
});

export const { setComplianceOverviewData } = complianceOverviewDetails.actions;
export default complianceOverviewDetails.reducer;
