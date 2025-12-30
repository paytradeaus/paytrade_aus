// Example: create a simple slice
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const HomePageSlice = createSlice({
  name: "homePage",
  initialState: {
    CurentHomePage: "HOME",
    showContactModel: false,
    mailValue: "",
  },
  reducers: {
    setCurentHomePage: (state, action: PayloadAction<any>) => {
      state.CurentHomePage = action.payload;
    },
    setShowContactModel: (state, action: PayloadAction<any>) => {
      state.showContactModel = action.payload;
    },
    setMailTo: (state, action: PayloadAction<any>) => {
      state.mailValue = action.payload;
    },
  },
});

export const { setCurentHomePage, setShowContactModel, setMailTo } =
  HomePageSlice.actions;
export default HomePageSlice.reducer;
