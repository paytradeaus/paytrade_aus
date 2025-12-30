// Example: create a simple slice
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const MemberSidebarSlice = createSlice({
  name: "memberSidebar",
  initialState: {
    displayResponsiveSidebar: false,
  },
  reducers: {
    setDisplayResponsiveSidebar: (state, action: PayloadAction<boolean>) => {
      state.displayResponsiveSidebar = action.payload;
    },
  },
});

export const { setDisplayResponsiveSidebar } = MemberSidebarSlice.actions;
export default MemberSidebarSlice.reducer;
