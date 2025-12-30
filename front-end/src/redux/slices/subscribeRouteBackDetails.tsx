import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const subscribeRouteBackDetails = createSlice({
  name: "SubscribeFromOtherPages",
  initialState: {
    claimsData: {},
    paymentsData: {},
    paymentAttachments: {},
    matchedTransactions: {},
    auditDetails: {},
  },
  reducers: {
    setPaymentClaims: (state: any, action: PayloadAction<any>) => {
      state.claimsData = action.payload;
    },
    setPayments: (state: any, action: PayloadAction<any>) => {
      state.paymentsData = action.payload;
    },
    setPaymentAttachments: (state: any, action: PayloadAction<any>) => {
      state.paymentAttachments = action.payload;
    },
    setMatchTransactions: (state: any, action: PayloadAction<any>) => {
      state.matchedTransactions = action.payload;
    },
    setAuditDetails: (state: any, action: PayloadAction<any>) => {
      state.auditDetails = action.payload;
    },
  },
});

export const {
  setPaymentClaims,
  setPayments,
  setPaymentAttachments,
  setMatchTransactions,
  setAuditDetails,
} = subscribeRouteBackDetails.actions;
export default subscribeRouteBackDetails.reducer;
