import React, { useEffect, useState } from "react";
import { Modal, Row, Col, Button } from "react-bootstrap";
import FileSelector from "../fileSelector/fileSelector";
import { toast } from "react-toastify";
import { imageTypeFormats } from "@/common/constants/general";
import { Trash } from "react-bootstrap-icons";
import Image from "next/image";
import customStyles from "./SignatureUploader.module.scss";
import ImageCropper from "../ImageCropper/imageCropper";
import SignaturePadComponent from "@/container/userModules/notices/canvasSignaturePad/signaturePad";

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
}

export default function SignatureUploader({
  data,
  isDisplay = false,
  handleClose,
  onConfirmation,
  buttonName = "Continue to subscribe",
  title = "Add Signature",
}: Readonly<SignatureProps>) {
  const [selectedImage, setSelectedImage] = useState<File[]>([]);
  const [savedImage, setSavedImage] = useState<any>("");
  const [displayCrop, setDisplayCrop] = useState(false);
  const [signedSignature, setSignedSignature] = useState("");
  const [processingSignedSignature, setProcessingSignedSignature] =
    useState("");

  useEffect(() => {
    if (!data) return;
    if (data?.type === fileType.CANVAS) {
      setSignedSignature(data?.file);
      setProcessingSignedSignature(data?.file);
    } else if (data?.type === fileType.IMAGE) {
      setSavedImage(data?.file);
    }
    window.addEventListener("resize", resizeCanvas);
  }, []);

  const resizeCanvas = () => {
    if (!data) return;
    if (data?.type === fileType.CANVAS) {
      setSignedSignature(data?.file);
      setProcessingSignedSignature(data?.file);
    } else if (data?.type === fileType.IMAGE) {
      setSavedImage(data?.file);
    }
  };

  async function handleCroppedImage(uploadedFile: any) {
    handleCropClose();

    const base64Image = uploadedFile?.current?.toDataURL(
      uploadedFile?.current?.type
    );

    setSavedImage(base64Image);

    handleCropClose();
  }

  function handleCropClose() {
    setSelectedImage([]);
    setDisplayCrop(false);
  }

  return (
    <Modal
      show={isDisplay}
      backdrop="static"
      onHide={() => handleClose()}
      className="text-center"
      size="lg"
    >
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className={customStyles.subTitle}>
          Your signature will be used in the generated documents while sending
          notices
        </div>
        <div className={`${customStyles.subTitle} ${customStyles.subText}`}>
          Please upload the signature or use canvas to draw
        </div>
        <Row>
          <Col
            xs={6}
            sm={5}
            md={4}
            lg={3}
            className="d-flex align-items-center justify-content-center"
          >
            {!displayCrop ? (
              <div>
                {!savedImage && (
                  <div>
                    <FileSelector
                      handleSave={(files: any) => {
                        if (files.length > 0) {
                          const fileArray = Array.from(files);
                          const newFileArray = fileArray.map((file: any) => {
                            const newFileName: any = file.name;
                            const newFile = new File([file], newFileName, {
                              type: file.type,
                            });
                            return newFile;
                          });

                          setSelectedImage(newFileArray);
                          setDisplayCrop(true);
                        }
                      }}
                      acceptedFileFormats={imageTypeFormats}
                      multiple={false}
                      maximumSize={2 * 1024}
                      onError={(error) => {
                        toast.error(`Max Allowed file size is ${2} Mb`);
                      }}
                      disabled={Boolean(processingSignedSignature)}
                    >
                      <div
                        className={
                          processingSignedSignature
                            ? `${customStyles.selectContainer} ${customStyles.disabledImage}`
                            : customStyles.selectContainer
                        }
                      >
                        select image
                      </div>
                    </FileSelector>
                  </div>
                )}
                {savedImage && (
                  <div className="d-flex">
                    <div className={customStyles.imageViewStyle}>
                      <Image
                        width={0}
                        height={0}
                        src={savedImage}
                        alt={"image"}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: 10,
                        }}
                      />
                    </div>

                    <Trash
                      className={customStyles.fileRemoveIcon}
                      onClick={() => setSavedImage("")}
                    />
                  </div>
                )}
              </div>
            ) : (
              <ImageCropper
                selectedImage={selectedImage}
                displayCropper={selectedImage?.length > 0}
                handleCroppedImage={(selectedCanvas: any) =>
                  handleCroppedImage(selectedCanvas)
                }
                removeSelectedImage={() => handleCropClose()}
              />
            )}
          </Col>
          <Col xs={1} md={1} lg={1} className="d-flex align-items-center ">
            <span className={customStyles.orText}>OR</span>
          </Col>
          <Col xs={12} sm={10} md={7} lg={8} key={signedSignature}>
            <SignaturePadComponent
              disabled={Boolean(savedImage)}
              onBlur={(sign: string) => {
                setProcessingSignedSignature(sign);
                // setSignedSignature(sign);
              }}
              signatureData={signedSignature || ""}
            />
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button
          className={customStyles.button}
          onClick={() =>
            onConfirmation(
              processingSignedSignature || savedImage,
              processingSignedSignature ? fileType.CANVAS : fileType.IMAGE
            )
          }
          disabled={!savedImage && !processingSignedSignature}
        >
          {buttonName}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
