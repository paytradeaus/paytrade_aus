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

      // Check for Accepted File Formats.
      // `acceptedFileFormats` may contain MIME types (e.g. "text/csv") and/or
      // file extensions (e.g. ".csv"). Browsers report `file.type` as a MIME
      // string only — and that MIME is unreliable for CSVs (Excel on Windows
      // reports `application/vnd.ms-excel`, some bank exports come through as
      // empty string or `application/octet-stream`). So accept the file if
      // either its MIME or its filename extension matches an entry.
      if (acceptedFileFormats.length > 0) {
        const allowed = acceptedFileFormats.map((f) => f.toLowerCase());
        const allowedMimes = allowed.filter((f) => !f.startsWith("."));
        const allowedExts = allowed.filter((f) => f.startsWith("."));
        const invalidFiles = filesToUpload.some((file) => {
          const mime = (file.type || "").toLowerCase();
          const name = (file.name || "").toLowerCase();
          const ext = name.includes(".")
            ? name.slice(name.lastIndexOf("."))
            : "";
          const mimeOk = mime !== "" && allowedMimes.includes(mime);
          const extOk = ext !== "" && allowedExts.includes(ext);
          return !mimeOk && !extOk;
        });
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
