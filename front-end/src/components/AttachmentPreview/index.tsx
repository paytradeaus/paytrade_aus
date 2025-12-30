import React from "react";
import Image from "next/image";
import pdfIcon from "../../../public/images/pdf-icon.png";
import docIcon from "../../../public/images/docx-icon.png";
import imagesFileType from "../../../public/images/imagesfileTypes.webp";
import excelsFileType from "../../../public/images/excelicons.png";
import customStyles from "./AttachmentPreview.module.css";

interface AttachmentPreviewProps {
  uploadedFile: any;
  onDelete: (e: any) => void;
  hideDeleteButton?: boolean;
  imageWidth?: number;
  imageHeight?: number;
  isMultipleAttachment?: boolean;
}

const fileExtension = {
  pdf: "application/pdf",
  docxTypeOne: "application/wps-office.docx",
  docxTypeTwo:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  excelType1:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  excelType2: "application/vnd.ms-excel",
  imageType1: "image/jpeg",
  imageType2: "image/png",
};

export default function AttachmentPreview({
  uploadedFile,
  onDelete,
  hideDeleteButton = false,
  imageWidth,
  imageHeight,
  isMultipleAttachment = false,
}: AttachmentPreviewProps) {
  function displayFileIcon() {
    switch (uploadedFile?.type || uploadedFile?.file_type) {
      case fileExtension.pdf:
        return pdfIcon;
      case fileExtension.docxTypeOne:
      case fileExtension.docxTypeTwo:
        return docIcon;
      case fileExtension.excelType1:
      case fileExtension.excelType2:
        return excelsFileType;
      case fileExtension.imageType1:
      case fileExtension.imageType2:
        return imagesFileType;
      default:
        return imagesFileType;
    }
  }

  return (
    <div className={customStyles.customStyles}>
      <div className="px-0">
        <Image
          src={displayFileIcon()}
          alt="file icon"
          width={imageWidth || 34}
          height={imageHeight || 36}
          className="mx-1"
        />
      </div>
      <div className="d-flex align-items-center px-0">
        <div
          title={uploadedFile?.name || uploadedFile?.file_name}
          className={
            isMultipleAttachment
              ? `${customStyles.ellipsis} ${customStyles.multipleAttachment}`
              : customStyles.ellipsis
          }
        >
          {uploadedFile?.name || uploadedFile?.file_name}
        </div>
      </div>
      <div className="d-flex align-items-start justify-content-end">
        {!hideDeleteButton && (
          <i
            className={"fa-regular fa-circle-xmark fa-xs"}
            onClick={(e: any) => {
              onDelete(e);
            }}
          ></i>

          //   <XCircle
          //     className="c-p"
          //     onClick={(e:any) => {
          //       onDelete(e);
          //     }}
          //   />
        )}
      </div>
    </div>
  );
}
