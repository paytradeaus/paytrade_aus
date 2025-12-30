import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const companySlice = createSlice({
  name: "companyStore",
  initialState: {
    companyid: "",
    updatedcompany: {},
    isActiveProfileUpdated: false,
  },
  reducers: {
    setCompanyId: (state, action: PayloadAction<any>) => {
      state.companyid = action.payload;
    },
    setUpdatedCompany: (state, action: PayloadAction<any>) => {
      state.updatedcompany = action.payload;
    },
    setUpdateActiveProfile: (state: any, action: PayloadAction<any>) => {
      state.isActiveProfileUpdated = action.payload;
    },
  },
});
export const { setCompanyId, setUpdatedCompany, setUpdateActiveProfile } =
  companySlice.actions;
export default companySlice.reducer;
