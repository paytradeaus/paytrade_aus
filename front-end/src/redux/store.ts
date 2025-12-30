import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import MemberSidebarSlice from "./slices/sidebar";
import UserRegistrationDetails from "./slices/userRegistrationSlice";
import companyRegistrationDetails from "./slices/companyRegistrationDetails";
import imageSlice from "./slices/imageUploadSlice";
import companySlice from "./slices/companyDetails";
import dashboardSlices from "./slices/dashboardSlices";
import userModeSlice from "./slices/userModeSlice";
import applicationThemeDetails from "./slices/theme";
import HomePageSlice from "./slices/homePage";
import subscribeRouteBackDetails from "./slices/subscribeRouteBackDetails";
import reconciliationDetails from "./slices/reconciliationDetails";
import clientSuppliersDetails from "./slices/clientSuppliersDetails";
import auditReportReducer from "./slices/auditDetails";
// Configure the store
const store = configureStore({
  reducer: {
    dashBoard: dashboardSlices,
    homePage: HomePageSlice,
    memberSidebar: MemberSidebarSlice,
    userDetails: UserRegistrationDetails,
    companyDetails: companyRegistrationDetails,
    clientsSuppliers: clientSuppliersDetails,
    imagestores: imageSlice,
    companyStore: companySlice,
    reportDataDetails: reconciliationDetails,
    userMode: userModeSlice,
    appTheme: applicationThemeDetails,
    retainedDataFromSubscription: subscribeRouteBackDetails,
    auditReport: auditReportReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Use typed hooks to access state and dispatch in components
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
