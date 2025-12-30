import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const CompanyRegistrationDetails = createSlice({
  name: "CompanyDetails",
  initialState: {
    companyDetails: {},
    name: "", // Add the name field to the initial state
    addTrustRecord: [],
    businessProfile: {},
    businessInfo: {},
    searchName: "",
    editBusinessDetails: {},
    removedFiles: [],
    defaultFiles: [],
  },
  reducers: {
    setCompanyDetails: (state, action: PayloadAction<any>) => {
      state.companyDetails = action.payload;
    },
    setName: (state, action: PayloadAction<string>) => {
      state.name = action.payload; // Update the name field in the state
    },
    setAddTrustRecord: (state, action: PayloadAction<any>) => {
      state.addTrustRecord = action.payload; // Update the name field in the state
    },
    setBusinessProfile: (state, action: PayloadAction<any>) => {
      state.businessProfile = action.payload; // Update the name field in the state
    },
    setBusinessInfo: (state, action: PayloadAction<any>) => {
      state.businessInfo = action.payload; // Update the name field in the state
    },
    setSearchName: (state, action: PayloadAction<any>) => {
      state.searchName = action.payload; // Update the name field in the state
    },
    setEditBusinessDetails: (state, action: PayloadAction<any>) => {
      state.editBusinessDetails = action.payload; // Update the name field in the state
    },
    setRemovedFiles: (state, action: PayloadAction<any>) => {
      state.removedFiles = action.payload; // Update the name field in the state
    },
    setDefaultFiles: (state, action: PayloadAction<any>) => {
      state.defaultFiles = action.payload; // Update the name field in the state
    },
  },
});
export const {
  setCompanyDetails,
  setName,
  setAddTrustRecord,
  setBusinessProfile,
  setBusinessInfo,
  setSearchName,
  setEditBusinessDetails,
  setRemovedFiles,
  setDefaultFiles,
} = CompanyRegistrationDetails.actions;
export default CompanyRegistrationDetails.reducer;
