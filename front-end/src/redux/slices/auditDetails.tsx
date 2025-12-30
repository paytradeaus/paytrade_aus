import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const auditDataDetails = createSlice({
  name: "auditReport",
  initialState: {
    auditData: {},
  },
  reducers: {
    setReduxAuditData: (state: any, action: PayloadAction<any>) => {
      state.auditData = action.payload;
    },
  },
});

export const { setReduxAuditData } = auditDataDetails.actions;
export default auditDataDetails.reducer;
