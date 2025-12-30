// Example: create a simple slice
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const applicationThemeDetails = createSlice({
  name: "appTheme",
  initialState: {
    currentTheme: "",
  },
  reducers: {
    setCurrentTheme: (state, action: PayloadAction<any>) => {
      state.currentTheme = action.payload;
    },
  },
});

export const { setCurrentTheme } = applicationThemeDetails.actions;
export default applicationThemeDetails.reducer;
