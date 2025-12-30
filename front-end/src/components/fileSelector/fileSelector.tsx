import { showErrorToast } from "../Toaster";
import { IProps } from "./fileSelector.types";
import React, { useRef } from "react";

export default function FileSelector(props: IProps) {
  const {
    acceptedFileFormats,
    maximumSize,
    multiple,
    handleSave,
    onError,
    disabled,
  } = props;

  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  function openFilePicker() {
    if (hiddenFileInputRef.current) {
      hiddenFileInputRef.current.click();
    }
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;
    if (files && files.length > 0) {
      const filesToUpload: File[] = Array.from(files);

      // Check for Accepted File Formats
      if (acceptedFileFormats.length > 0) {
        const invalidFiles = filesToUpload.some(
          (file) => !acceptedFileFormats.includes(file.type)
        );
        if (invalidFiles) {
          showErrorToast("Please select correct file format");
          return;
        }
      }
      // Check for Maximum Size
      if (maximumSize) {
        const filesExceedSize = filesToUpload.some((file) => {
          // from bytes to kb
          const fileSize = file.size / 1024;
          return fileSize > maximumSize;
        });
        if (filesExceedSize) {
          // TODO: Handle when file size exceeds maximum size
          onError?.("MAX_SIZE_EXCEED");
          return;
        }
      }

      // Saving
      handleSave && handleSave(filesToUpload);
      // reset input
      if (hiddenFileInputRef.current) {
        hiddenFileInputRef.current.value = "";
      }
    }
  }

  //
  //
  const isChildrenFunction = typeof props.children === "function";
  return (
    <span onClick={isChildrenFunction ? undefined : openFilePicker}>
      {/* Hidden FilePicker */}
      <input
        type="file"
        name="file"
        style={{ display: "none" }}
        ref={hiddenFileInputRef}
        onChange={onFileChange}
        accept={acceptedFileFormats.join(",")}
        multiple={multiple}
        disabled={disabled}
      />

      {isChildrenFunction
        ? (props.children as Function)(openFilePicker)
        : props.children}
    </span>
  );
}
