import { AdminLogInUserData } from "../../app/api/adminApi/adminApi";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const dashboardSlices = createSlice({
  name: "dashboard",
  initialState: {
    sideBarFullView: true,
    hideSearchBarView: false,
    userDetails: {},
    companyDetails: {},
    screenDetails: {},
    bookkeepingSelectedBank: null as null | {
      companyId: number;
      bankId: string | number;
    },
    projectoverview: {},
    bankAccountTypeFromDashBoard: "",
    addBankAccountDetails: {},
    addContractDetails: {},
    blogDetailsForRouting: {},
  },
  reducers: {
    setSidebarFullView: (state, action: PayloadAction<boolean>) => {
      state.sideBarFullView = action.payload;
    },
    setHideSearchBarView: (state, action: PayloadAction<boolean>) => {
      state.hideSearchBarView = action.payload;
    },
    setUserDetails: (state, action: PayloadAction<AdminLogInUserData | {}>) => {
      state.userDetails = action.payload;
    },
    setCompanyDetails: (
      state,
      action: PayloadAction<AdminLogInUserData | {}>
    ) => {
      state.companyDetails = action.payload;
    },
    setScreenDetails: (state, action: PayloadAction<IScreenDetails | {}>) => {
      state.screenDetails = action.payload;
    },
    SetProjectOverview: (state, action: PayloadAction<IScreenDetails | {}>) => {
      state.projectoverview = action.payload;
    },
    SetBankAccountTypeFromDashBoard: (state, action: PayloadAction<any>) => {
      state.bankAccountTypeFromDashBoard = action.payload;
    },
    setAddBankAccountDetails: (state, action: PayloadAction<any>) => {
      state.addBankAccountDetails = action.payload;
    },
    setAddContractDetails: (state, action: PayloadAction<any>) => {
      state.addContractDetails = action.payload;
    },
    setBlogDetailsForRouting: (state, action: PayloadAction<any>) => {
      state.blogDetailsForRouting = action.payload;
    },
    setBookkeepingSelectedBank: (
      state,
      action: PayloadAction<{
        companyId: number;
        bankId: string | number;
      } | null>
    ) => {
      state.bookkeepingSelectedBank = action.payload;
    },
  },
});
export const {
  setSidebarFullView,
  setHideSearchBarView,
  setUserDetails,
  setCompanyDetails,
  setScreenDetails,
  SetProjectOverview,
  setAddContractDetails,
  setAddBankAccountDetails,
  SetBankAccountTypeFromDashBoard,
  setBlogDetailsForRouting,
  setBookkeepingSelectedBank,
} = dashboardSlices.actions;
export default dashboardSlices.reducer;

export type IScreenDetails = {
  fromScreen: string;
  toScreen: string;
  mainActiveTab: string;
  selectTab: string;
  subSelectTab: string;
};
