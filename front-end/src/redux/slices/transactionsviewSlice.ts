import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const transactionsViewSlice = createSlice({
  name: "transactionsViewSlice",
  initialState: {
    transactionsActiveTabData: {},
  },
  reducers: {
    setTransactionActiveTabData: (state, action: PayloadAction<any>) => {
      state.transactionsActiveTabData = action.payload;
    },
  },
});
export const { setTransactionActiveTabData } = transactionsViewSlice.actions;
export default transactionsViewSlice.reducer;
