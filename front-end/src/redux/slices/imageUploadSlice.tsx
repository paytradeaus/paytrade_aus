import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ImageState {
  imageFile: File | File[] | null | any;
  name: string;
}

let initialState: ImageState = {
  imageFile: null,
  name: "",
};

const imageSlice = createSlice({
  name: "imagestores",
  initialState,
  reducers: {
    setImageFile: (state, action: PayloadAction<File | any | null>) => {
      state.imageFile = action.payload;
    },
    setImageName: (state, action: PayloadAction<string>) => {
      state.name = action.payload;
    },
    clearImageState: (state) => {
      state.imageFile = null;
      state.name = "";
    },
  },
});

export const { setImageFile, setImageName, clearImageState } =
  imageSlice.actions;
// export const selectImageFile = (state: { image: ImageState }) => state.image.imageFile;

export default imageSlice.reducer;
