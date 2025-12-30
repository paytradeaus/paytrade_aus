// userModeSlice.js
import { createSlice } from "@reduxjs/toolkit";

export const userModeSlice = createSlice({
  name: "userMode",
  initialState: {
    mode: "", // Default value
  },
  reducers: {
    updateUserMode: (state, action) => {
      state.mode = action.payload;
    },
  },
});

export const { updateUserMode } = userModeSlice.actions;

export default userModeSlice.reducer;
