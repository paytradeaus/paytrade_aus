import React from "react";
import { Col, Row } from "react-bootstrap";
import Image from "next/image";
import { XCircle } from "react-bootstrap-icons";
import pdfIcon from "../../../public/assets/pdf-icon.png";
import docIcon from "../../../public/assets/docx-icon.png";
import imagesFileType from "../../../public/assets/imagesfileTypes.webp";
import excelsFileType from "../../../public/assets/excelicons.png";
import customStyles from "./AttachmentPreview.module.scss";

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
    <Row className={customStyles.customStyles}>
      <Col className="px-0" xs="auto">
        <Image
          src={displayFileIcon()}
          alt="file icon"
          width={imageWidth || 34}
          height={imageHeight || 36}
          className="mx-1"
        />
      </Col>
      <Col className="d-flex align-items-center px-0" xs="auto">
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
      </Col>
      <Col className="d-flex align-items-start justify-content-end" xs="auto">
        {!hideDeleteButton && (
          <XCircle
            className="c-p"
            onClick={(e) => {
              onDelete(e);
            }}
          />
        )}
      </Col>
    </Row>
  );
}
