import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const UserRegistrationDetails = createSlice({
  name: "Userdetails",
  initialState: {
    userDetails: {},
    appUserDetails: {},
  },
  reducers: {
    setUserDetails: (state: any, action: PayloadAction<any>) => {
      state.userDetails = action.payload;
    },
    setAppUserDetails: (state: any, action: PayloadAction<any>) => {
      state.appUserDetails = action.payload;
    },
  },
});

export const { setUserDetails, setAppUserDetails } =
  UserRegistrationDetails.actions;
export default UserRegistrationDetails.reducer;
