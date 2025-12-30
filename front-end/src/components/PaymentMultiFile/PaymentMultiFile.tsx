import { uploadFile } from "@/shared/constant/general";
import React, { Fragment } from "react";
import { showErrorToast } from "../Toaster";
import { FileErrors } from "@/shared/constant/messages";

export default function FileAttachmentHandler({
  titleName = "Attachments",
  attachmentSize = "",
  required,
  filesToAccept,
  afterFileChange,
  disableChooseFileBtn = false,
  existingFiles,
  handleDeleteFile,
  maxFileSize = uploadFile.fiveMB,
  hideViewButton,
  hideDeleteButton,
  fileNameTruncateSize = 10,
}: any) {
  function truncateName(file: any) {
    return (file?.name?.length || file?.file_name?.length) >
      fileNameTruncateSize
      ? (file?.name || file?.file_name)
          .slice(0, fileNameTruncateSize)
          .concat("...")
      : file?.name || file?.file_name;
  }

  function handleViewFile(file: any) {
    if (file?.id) {
      fetch(file?.file)
        .then((res) => res.blob())
        .then((res) => {
          window.open(URL.createObjectURL(res), "_blank");
        });
      return true;
    }
    // Assuming you want to open the file in a new tab
    const fileURL = URL.createObjectURL(file);
    window.open(fileURL, "_blank");
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { files }: any = event.target;

    if (files && files.length > 0) {
      const filesToUpload: File[] = [...files];

      // Check for Maximum Size
      const filesExceedSize = filesToUpload.some((file) => {
        // from bytes to kb
        const fileSize = file.size / 1024;
        return fileSize > maxFileSize;
      });

      if (filesExceedSize && filesToUpload?.length <= 5) {
        //Handle when file size exceeds maximum size
        showErrorToast(FileErrors.MAX_ALLOWED_FILE_SIZE_5MB);

        return;
      } else if (filesToUpload?.length + existingFiles?.length > 5) {
        showErrorToast(FileErrors.MAX_FILE_COUNT);
        return;
      } else {
        const updateFiles = existingFiles?.length ? existingFiles : [];

        afterFileChange([...updateFiles, ...filesToUpload]);
      }
    }
  }

  function handleDeleteFiles(fileOrder: number) {
    let updatedFiles = [...existingFiles];
    updatedFiles.splice(fileOrder, 1);
    afterFileChange([...updatedFiles]);
  }

  return (
    <div>
      <h5>
        {titleName}
        {required && <span className="required">*</span>}
      </h5>
      <h5>{attachmentSize}</h5>
      <br />
      <input
        type="file"
        multiple
        onChange={onFileChange}
        accept={filesToAccept}
        className="disable_default_file_name"
        disabled={disableChooseFileBtn}
      />
      {existingFiles?.length > 0 &&
        existingFiles.map((file: any, index: number) => (
          <Fragment key={index}>
            <div className="pt_itemwithremove">
              <span>{truncateName(file)}</span>

              <div className="attachmentBtnGap">
                <a className="downloadfile">
                  <button
                    className="secondary smallbutton"
                    onClick={() => handleViewFile(file)}
                  >
                    <i className="fa-light fa-eye"></i>View
                  </button>
                </a>

                {!hideDeleteButton && (
                  <a className="downloadfile">
                    <button
                      className="contrast smallbutton"
                      onClick={() => handleDeleteFiles(index)}
                    >
                      <i className="fa-light fa-trash"></i>Delete
                    </button>
                  </a>
                )}
              </div>
            </div>
          </Fragment>
        ))}
    </div>
  );
}
