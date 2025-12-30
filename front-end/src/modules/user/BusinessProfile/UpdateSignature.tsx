import BaseModal from "@/components/BaseModal";
import React, { useEffect, useRef, useState } from "react";
import { useBusinessProfileContext } from "./BusinessProfileContext";
import ImageUploader from "@/components/ImageUploader";
import ImageCropper from "@/components/ImageCropper";
import { UploadImage } from "@/shared/constant/general";
import { handleSelectedImage } from "@/utils";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import SignaturePadComponent from "@/components/SignatureCanvas";

const fileType = {
  CANVAS: "CANVAS",
  IMAGE: "IMAGE",
};

interface SignatureProps {
  data?: { file: string; type: string };
  isDisplay: boolean;
  handleClose: () => void;
  onConfirmation: (signature: string, type: string) => void;
  buttonName?: string;
  title?: string;
  useContext?: boolean;
}

export default function UpdateSignature({
  data,
  isDisplay = false,
  handleClose,
  onConfirmation,
  buttonName = "Save",
  title = "Add signature",
  useContext = true,
}: Readonly<SignatureProps>) {
  const { displaySignature, setDisplaySignature, formik }: any = useContext
    ? useBusinessProfileContext()
    : {
        displaySignature: isDisplay,
        setDisplaySignature: handleClose,
        formik: null,
      };

  const [signedSignature, setSignedSignature] = useState<any>("");

  const [fileError, setFileErrMsg] = useState("");

  const SignatureInputRef = useRef<any>(null); // Reference to the file input

  const [processingSignedSignature, setProcessingSignedSignature] =
    useState("");
  const [base64Image, setBase64Image] = useState("");

  const [displayImage, setDisplayImage] = useState<any>([]);

  const [clearImageName, setClearImageName] = useState(false);

  useEffect(() => {
    if (!data) return;

    if (data?.type === fileType.CANVAS) {
      setSignedSignature(data?.file);
    } else if (data?.type === fileType.IMAGE) {
      setBase64Image(data?.file ?? "");
    }
    window.addEventListener("resize", resizeCanvas);
  }, []);

  const resizeCanvas = () => {
    if (!data) return;
    if (data?.type === fileType.CANVAS) {
      setSignedSignature(data?.file);
      setProcessingSignedSignature(data?.file);
    } else if (data?.type === fileType.IMAGE) {
      setBase64Image(data?.file);
    }
  };

  function onImageChange(e: any) {
    const response: any = handleSelectedImage(e);

    if (Array.isArray(response) && response?.length > 0) {
      setDisplayImage(response);
      setFileErrMsg("");
      return true;
    } else {
      setDisplayImage([]);
      setFileErrMsg(response);
      return false;
    }
  }

  const handleImageCrop = async (uploadedFile: any) => {
    const base64Image = uploadedFile?.current?.toDataURL(
      uploadedFile?.current?.type
    );

    // If validations pass, set the image file

    setBase64Image(base64Image);
  };

  function handleAfterCrop(isCancel: any) {
    if (isCancel) {
      setClearImageName(true);

      setDisplayImage([]);
    }

    setDisplayImage([]);
    setTimeout(() => {
      setClearImageName(false);
    });
  }

  function handleSave() {
    onConfirmation(
      signedSignature || base64Image,
      signedSignature ? fileType.CANVAS : fileType.IMAGE
    );
    return true;
  }

  return (
    <BaseModal
      title={title}
      modalId={"Edit signature"}
      displayModal={isDisplay}
      //   onClose={handlePageConfirmClose}
      onHeaderIconClose={() => {
        setDisplaySignature(false);
        handleClose();
      }}
      onConfirm={handleSave}
      secondButtonName={buttonName}
      hideFirstButton
      disableSecondButton={!signedSignature && !base64Image}
      restrictOncloseFunctionInHeader
    >
      <h4>
        Your signature will be used in generated documents while sending notices
      </h4>
      <h4>Upload image</h4>
      <ImageUploader
        onImageSelect={(e: any) => onImageChange(e)}
        accept={UploadImage.jpegAndPng}
        label=""
        selectedImage={""}
        onImageRemove={() => {
          setBase64Image("");
        }}
        restrictPlaceholder
        imageRef={SignatureInputRef}
        disabled={signedSignature || base64Image}
        clearImageName={clearImageName}
        base64Image={base64Image}
      />

      {fileError && (
        <small className="invalid error_wrap">
          <i className="fa-light fa-circle-xmark"></i>
          {/* Icon for the error message */}
          {fileError}
        </small>
      )}
      {displayImage?.length > 0 && (
        <ImageCropper
          selectedImage={displayImage}
          displayCropper={displayImage?.length > 0}
          handleCroppedImage={(selectedCanvas: any) => {
            handleImageCrop(selectedCanvas);
            setDisplayImage([]);
          }}
          removeSelectedImage={handleAfterCrop}
        />
      )}
      <hr />
      <h4>Draw signature</h4>

      <SignaturePadComponent
        disabled={Boolean(base64Image)}
        onBlur={(sign: string) => {
          setSignedSignature(sign);
        }}
        signatureData={signedSignature || ""}
        key={signedSignature}
      />
    </BaseModal>
  );
}
