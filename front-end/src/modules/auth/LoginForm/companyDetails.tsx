import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const companySlice = createSlice({
  name: "companyStore",
  initialState: {
    companyid: "",
    updatedcompany: {},
  },
  reducers: {
    setCompanyId: (state, action: PayloadAction<any>) => {
      state.companyid = action.payload;
    },
    setUpdatedCompany: (state, action: PayloadAction<any>) => {
      state.updatedcompany = action.payload;
    },
  },
});
export const { setCompanyId, setUpdatedCompany } = companySlice.actions;
export default companySlice.reducer;
