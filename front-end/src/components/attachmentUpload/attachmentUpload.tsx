// components/AttachmentUpload.tsx

import React, { useEffect, useState } from "react";
import styles from "./attachmentUpload.module.scss";
import { clearImageState } from "@/redux/slices/imageUploadSlice";
import { useDispatch } from "react-redux";
import { FileTextFill } from "react-bootstrap-icons";

interface AttachmentUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  title?: string;
  inputLabelStyles?: string;
  placeholder?: string;
  accept?: string;
  selected_file?: any;
  selected_filename?: string;
  disabled?: boolean;
  allowedTypes?: any;
}

const AttachmentUpload: React.FC<AttachmentUploadProps> = ({
  onFileSelect,
  onFileRemove,
  title,
  inputLabelStyles,
  placeholder,
  accept,
  selected_file,
  selected_filename,
  disabled,
  allowedTypes,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(
    selected_file || null
  );
  const [selectedFileName, setSelectedFileName] = useState<string>(
    selected_file?.name || ""
  );

  const dispatch = useDispatch();

  useEffect(() => {
    setSelectedFile(selected_file || null);
    setSelectedFileName(selected_file?.name || selected_filename || "");
  }, [selected_file]);

  useEffect(() => {
    if (selected_file === null) handleRemove();
  }, [selected_file]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (disabled) return;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      setSelectedFileName(file.name);
      onFileSelect(file);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setSelectedFileName("");
    dispatch(clearImageState());
    if (onFileRemove) {
      onFileRemove();
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (disabled) return;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      setSelectedFileName(file.name);
      onFileSelect(file);
    }
  };

  const truncateFileName = (fileName: string, maxLength: number) => {
    if (fileName.length > maxLength) {
      return fileName.substring(0, maxLength - 3) + "...";
    }
    return fileName;
  };

  return (
    <div
      className={styles.UploadAreaStyles}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {title && <h5 className={styles.title}>{title}</h5>}
      <label
        htmlFor="fileInput"
        className={`${styles.InputStyles} ${inputLabelStyles || ""}`}
      >
        <span className={styles.ImagePlaceholderStyles}>
          {selectedFile ? (
            <>
              <FileTextFill className={styles.FileIcon} />
              <span className={styles.SelectedFileName}>
                {truncateFileName(selectedFileName, 20)}
              </span>
            </>
          ) : (
            placeholder
          )}
        </span>
      </label>
      <input
        key={selectedFile?.name}
        id="fileInput"
        type="file"
        onChange={handleFileChange}
        style={{ display: "none" }}
        accept={allowedTypes}
        disabled={disabled}
      />
    </div>
  );
};

export default AttachmentUpload;
