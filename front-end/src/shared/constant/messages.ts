const USER_LOGOUT = "User logged out successfully";
const NO_ACTIVITY_DETECTED = "We signed you out due to inactivity.";
const ApiResponse = {
  SOMETHING_WENT_WRONG: "Something went wrong !",
  SUCCESS: "SUCCESS",
  ERROR: "ERROR",
  NO_RECORDS_TO_DISPLAY: "There are no records to display",
  XERO_REFRESH: "XERO_REFRESH",
};

const ImageErrors = {
  INVALID_FILE_TYPE_JPG_PNG:
    "Invalid file type. Please select a valid image file (JPEG/PNG).",
  FILE_LIMIT_EXCEEDS_2MB:
    "File size exceeds the limit (2MB). Please select a smaller file.",
};

const FileErrors = {
  FILE_LIMIT_EXCEEDS_5MB:
    "File size exceeds the limit (5MB). Please select a smaller file.",
  MAX_ALLOWED_FILE_SIZE_5MB: "Max Allowed file size is 5 Mb",

  MAX_FILE_COUNT: "You can only select up to five files.",
};

const formInfo = {
  NO_CHANGES: "No changes saved",
};

export {
  USER_LOGOUT,
  NO_ACTIVITY_DETECTED,
  ApiResponse,
  ImageErrors,
  FileErrors,
  formInfo,
};
