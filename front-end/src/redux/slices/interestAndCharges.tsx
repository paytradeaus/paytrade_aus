import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const interestPaymentSlice = createSlice({
  name: "interestChargesAccount",
  initialState: {
    accountDetails: {},
    selectedTab:null,
  },
  reducers: {
    setBankAccountDetails: (state, action: PayloadAction<any>) => {
      state.accountDetails = action.payload;
    },
    setSelectedTab: (state, action: PayloadAction<any>) => {
      state.selectedTab = action.payload;
    },
  },
});
export const { setBankAccountDetails,setSelectedTab } = interestPaymentSlice.actions;
export default interestPaymentSlice.reducer;
