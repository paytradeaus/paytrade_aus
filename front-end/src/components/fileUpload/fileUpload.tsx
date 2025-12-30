"use client";

// components/ImageUploader.tsx

import React, { useState, useEffect } from "react";
import { Trash } from "react-bootstrap-icons"; // Import the Trash icon
import styles from "./fileUpload.module.scss";
import { AppModal } from "../model/model";
import Image from "next/image";

interface ImageUploaderProps {
  onImageSelect: (file: File, path: string) => void;
  onImageRemove?: () => void; // Add optional callback function for removing image
  imageStyles?: React.CSSProperties;
  title?: string;
  inputLabelStyles?: string | undefined;
  initialImageUrl?: string;
  image?: any;
  imagePlaceholder?: string;
  accept?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageSelect,
  onImageRemove,
  imageStyles,
  title,
  inputLabelStyles,
  initialImageUrl,
  imagePlaceholder,
  image, // Add image prop
  accept,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    if (initialImageUrl) {
      setImageUrl(initialImageUrl);
    }
  }, [initialImageUrl]);

  useEffect(() => {
    if (image) {
      setSelectedFile(image);
      const reader = new FileReader();
      reader.readAsDataURL(image);
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
    }
  }, [image]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
        onImageSelect(file, reader.result as string);
      };
    }
  };

  const handleRemoveConfirmed = () => {
    setSelectedFile(null);
    setImageUrl(null);
    if (onImageRemove) {
      onImageRemove();
    }
    setOpenModal(false); // Hide the confirmation modal after removing the image
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
        onImageSelect(file, reader.result as string);
      };
    }
  };

  return (
    <>
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
          {imageUrl || image ? (
            <div className={styles.imageContainer}>
              <Image
                width={0}
                height={0}
                // src={imageUrl}
                src={imageUrl || URL?.createObjectURL(image)}
                alt="Uploaded"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: 50,
                  ...imageStyles,
                }}
              />
              {onImageRemove && ( // Render remove icon if onImageRemove callback is provided
                <div
                  className={styles.removeIcon}
                  onClick={(e) => {
                    e.preventDefault();
                    setOpenModal(true);
                  }}
                >
                  <Trash />
                </div>
              )}
            </div>
          ) : (
            <p className={styles.InfoTextStyle}>{imagePlaceholder || ""}</p>
          )}
        </label>
        <input
          id="fileInput"
          type="file"
          onChange={handleFileChange}
          style={{ display: "none" }}
          accept={accept} // Pass accept prop to specify accepted file types
        />
      </div>
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        firstButtonLabel="Remove"
        secondButtonLabel="Cancel"
        // modalHeading="Remove Image"
        modalBodyContent="Are you sure you want to remove the image?"
        onConfirm={handleRemoveConfirmed}
      />
    </>
  );
};

export default ImageUploader;
