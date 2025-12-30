import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const subscriptionDetails = createSlice({
  name: "subscription",
  initialState: {
    selectedPlanDetails: null,
    cardPaymentDetails: null,
  },
  reducers: {
    setSelectedPlanDetails: (state: any, action: PayloadAction<any>) => {
      state.selectedPlanDetails = action.payload;
    },
    setStripeCardPaymentDetails: (state: any, action: PayloadAction<any>) => {
      state.cardPaymentDetails = action.payload;
    },
  },
});

export const { setSelectedPlanDetails, setStripeCardPaymentDetails } =
  subscriptionDetails.actions;
export default subscriptionDetails.reducer;
