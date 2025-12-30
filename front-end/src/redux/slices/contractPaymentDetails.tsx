import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const ContractPaymentDetails = createSlice({
  name: "ContractPayment",
  initialState: {
    paymentDetails: {},
    contractDetails: {},
    uploadDetails: {},
  },
  reducers: {
    setPaymentDeatils: (state: any, action: PayloadAction<any>) => {
      state.paymentDetails = action.payload;
    },
    setContractDeatils: (state: any, action: PayloadAction<any>) => {
      state.contractDetails = action.payload;
    },
    setUploadDeatils: (state: any, action: PayloadAction<any>) => {
      state.uploadDetails = action.payload;
    },
    clearContractDetails: (state) => {
      state.paymentDetails = {};
      state.contractDetails = {};
      state.uploadDetails = {};
    },
  },
});

export const {
  setPaymentDeatils,
  setContractDeatils,
  setUploadDeatils,
  clearContractDetails,
} = ContractPaymentDetails.actions;
export default ContractPaymentDetails.reducer;
