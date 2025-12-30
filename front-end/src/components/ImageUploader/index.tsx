"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import avatar from "../../../public/images/avatar.png";
import { buttonType } from "@/shared/constant/general";
import { showErrorToast } from "../Toaster";
import CustomButton from "../CustomButton/CustomButton";

interface ImageUploaderProps {
  onImageSelect: (file: File, path: string) => void;
  onImageRemove?: () => void;
  imageStyles?: React.CSSProperties;
  title?: string;
  inputLabelStyles?: string;
  selectedImage: any;
  imagePlaceholder?: string;
  accept?: any;
  displayCenterAligned?: boolean;
  label?: string;
  imageRef?: any;
  disabled?: boolean;
  clearImageName?: boolean;
  base64Image?: string;
  restrictPlaceholder?: boolean;
}

function ImageUploader({
  onImageSelect,
  onImageRemove = () => {},
  imageStyles,
  title,
  inputLabelStyles,
  imagePlaceholder,
  selectedImage,
  accept,
  displayCenterAligned = false,
  label,
  imageRef,
  disabled,
  clearImageName,
  base64Image,
  restrictPlaceholder,
}: Readonly<ImageUploaderProps>) {
  const [renderImage, setRenderImage] = useState<string | null>(null);

  useEffect(() => {
    if (selectedImage) {
      const reader = new FileReader();
      reader.readAsDataURL(selectedImage);
      reader.onloadend = () => {
        setRenderImage(reader.result as string);
      };
    } else {
      setRenderImage(null);
    }
  }, [selectedImage]);

  useEffect(() => {
    if (clearImageName && imageRef?.current) {
      imageRef.current.value = ""; // Clear the file input name, if user cancel on crop
      setRenderImage("");
    }
  }, [clearImageName, imageRef]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (files && files.length > 0) {
      const file = files[0];

      if (accept?.length && accept.includes(file?.type)) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          handleDisplayImage(reader, file);
        };
        event.target.value = "";
      } else {
        showErrorToast("Unsupported file format");
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        handleDisplayImage(reader, file);
      };
    }
  };

  function handleDisplayImage(reader: any, file: any) {
    const response: any = onImageSelect(file, reader.result as string);

    if (response) {
      setRenderImage(reader.result as string);
    } else {
      setRenderImage("");
      if (imageRef?.current) {
        imageRef.current.value = "";
      }
    }
  }

  function handleImageDelete(e: any) {
    e.preventDefault();
    onImageRemove();
    setRenderImage("");
    imageRef.current.value = ""; // Clear the file input
  }

  function typeOfPlaceholder() {
    if (imagePlaceholder) {
      return <p className="image_place_holder">{imagePlaceholder}</p>;
    } else {
      return (
        <Image
          width={0}
          height={0}
          alt="avatar"
          src={avatar}
          className="pt_profileimageupload"
        />
      );
    }
  }

  return (
    <div className={displayCenterAligned ? "d_flex_justify_center" : ""}>
      <div
        className={displayCenterAligned ? "upload_area" : ""}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {title && <h5>{title}</h5>}
        {label && (
          <label>
            <small>{label}</small>
          </label>
        )}
        <input
          id="fileInput"
          type="file"
          onChange={handleFileChange}
          disabled={disabled}
          accept={accept}
          ref={imageRef}
          className={displayCenterAligned ? "dis_none" : "file_Selector"}
        />

        <label
          htmlFor={displayCenterAligned ? "fileInput" : "imageRender"}
          className={`${inputLabelStyles} ${
            displayCenterAligned ? "cu-pointer dis_block" : "cur-default"
          }`}
        >
          {base64Image || renderImage || selectedImage ? (
            <div
              style={{
                width: "160px",
                height: "160px",
              }}
            >
              <Image
                width={0} // Fixed width
                height={0} // Fixed height
                src={
                  base64Image ||
                  renderImage ||
                  URL?.createObjectURL(selectedImage)
                }
                alt="Uploaded"
                style={{
                  ...imageStyles,
                }}
                className={
                  displayCenterAligned
                    ? "uploaded_center_aligned_image"
                    : "pt_profileimageupload cur-default"
                }
              />

              {!displayCenterAligned && (
                <div>
                  <button
                    className={buttonType.CONTRAST_SMALL}
                    onClick={handleImageDelete}
                  >
                    <i className="fa-light fa-xmark"></i>Remove
                  </button>
                </div>
              )}
            </div>
          ) : (
            !restrictPlaceholder && typeOfPlaceholder()
          )}
        </label>
      </div>
    </div>
  );
}

export default ImageUploader;
