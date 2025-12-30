import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const clientSuppliersDetails = createSlice({
  name: "clientSuppliers",
  initialState: {
    clientsSuppliersData: {},
    accountDetailsData: "",
    deletedAccountDetails: [],
  },
  reducers: {
    setClientsSuppliersData: (state: any, action: PayloadAction<any>) => {
      state.clientsSuppliersData = action.payload;
    },
    setAccountDetailsData: (state: any, action: PayloadAction<any>) => {
      state.accountDetailsData = action.payload;
    },

    setDeletedAccountDetails: (state: any, action: PayloadAction<any>) => {
      state.deletedAccountDetails = action.payload;
    },
  },
});

export const {
  setClientsSuppliersData,
  setAccountDetailsData,
  setDeletedAccountDetails,
} = clientSuppliersDetails.actions;
export default clientSuppliersDetails.reducer;
