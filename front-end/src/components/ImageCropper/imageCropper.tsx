import React, { useState, useRef, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import ReactCrop, { centerCrop, Crop, PixelCrop } from "react-image-crop";
import { useDebounceEffect } from "./useDebounceEffect";
import customStyles from "./imageCropper.module.scss";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "react-bootstrap";
import Image from "next/image";
import { canvasPreview } from "./canvasPreview";

interface ImageCropperProps {
  selectedImage: Array<any>;
  handleCroppedImage: (selectedImage: any) => void;
  removeSelectedImage: () => void;
  displayCropper: boolean;
}

const MAX_ASPECT_RATIO = 1; // Max 1:1 ratio
const MIN_DIMENSION = 100;

export default function ImageCropper({
  selectedImage,
  handleCroppedImage,
  removeSelectedImage,
  displayCropper = false,
}: Readonly<ImageCropperProps>) {
  const [imgSrc, setImgSrc] = useState<any>("");
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1); // Maintain zoom feature
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 }); // Image move state
  const [lockAspectRatio, setLockAspectRatio] = useState(false); // Dynamic aspect ratio locking
  const [rotate] = useState(0);

  function handleClose() {
    removeSelectedImage();
  }

  function onSelectFile(file: any) {
    if (file.length > 0) {
      setCrop(undefined); // Reset crop between images
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImgSrc(reader.result?.toString() || "");
      });
      reader.readAsDataURL(file[0]);
    }
  }

  useEffect(() => {
    if (selectedImage?.length > 0) {
      onSelectFile(selectedImage);
    }
  }, [selectedImage]);

  const onImageLoad = (e: any) => {
    const { width, height } = e.currentTarget;
    // Set initial crop region, centered
    const cropWidth = Math.min(width, height) * 0.7; // Default crop size 70% of image
    const cropHeight = cropWidth; // Initial aspect ratio 1:1

    const crop: PixelCrop = {
      unit: "px",
      x: (width - cropWidth) / 2,
      y: (height - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight,
    };

    const centeredCrop = centerCrop(crop, width, height);
    setCrop(centeredCrop);
  };

  useDebounceEffect(
    async () => {
      if (
        completedCrop?.width &&
        completedCrop?.height &&
        imgRef.current &&
        previewCanvasRef.current
      ) {
        canvasPreview(
          imgRef.current,
          previewCanvasRef.current,
          completedCrop,
          scale,
          rotate
        );
      }
    },
    100,
    [completedCrop, scale, rotate]
  );

  // Lock aspect ratio when 1:1 is reached
  const handleCropChange = (newCrop: Crop, percentCrop: Crop) => {
    if (newCrop.width / newCrop.height >= MAX_ASPECT_RATIO) {
      // Lock the aspect ratio to 1:1 once max is reached
      setLockAspectRatio(true);
    } else {
      setLockAspectRatio(false); // Free aspect ratio before it reaches 1:1
    }
    setCrop(newCrop); // Update crop state
  };

  function handleSave() {
    handleCroppedImage(previewCanvasRef);
  }

  return (
    <Modal
      show={displayCropper}
      backdrop="static"
      onHide={() => handleClose()}
      className="text-center"
    >
      <Modal.Header closeButton>
        <Modal.Title>Crop Selected Image</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="App">
          <Row>
            <Col xs={12} md={6}>
              {!!imgSrc && (
                <div style={{ width: "100%", height: "auto" }}>
                  <ReactCrop
                    crop={crop}
                    onChange={(newCrop, percentCrop) =>
                      handleCropChange(newCrop, percentCrop)
                    }
                    onComplete={(c) => setCompletedCrop(c)}
                    keepSelection
                    aspect={lockAspectRatio ? MAX_ASPECT_RATIO : undefined} // Lock aspect ratio at max
                    minWidth={MIN_DIMENSION}
                  >
                    <Image
                      ref={imgRef}
                      alt="Crop me"
                      src={imgSrc}
                      style={{
                        transform: `scale(${scale}) translate(${imagePosition.x}px, ${imagePosition.y}px)`, // Move image inside crop area
                        width: "100%",
                        height: "auto",
                        cursor: "move", // Indicate draggable image
                      }}
                      width={0}
                      height={0}
                      onLoad={onImageLoad}
                      draggable={false} // Prevent default drag behavior
                      onMouseDown={(e) => {
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const initialX = imagePosition.x;
                        const initialY = imagePosition.y;

                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          const dx = moveEvent.clientX - startX;
                          const dy = moveEvent.clientY - startY;
                          setImagePosition({
                            x: initialX + dx,
                            y: initialY + dy,
                          });
                        };

                        const handleMouseUp = () => {
                          document.removeEventListener(
                            "mousemove",
                            handleMouseMove
                          );
                          document.removeEventListener(
                            "mouseup",
                            handleMouseUp
                          );
                        };

                        document.addEventListener("mousemove", handleMouseMove);
                        document.addEventListener("mouseup", handleMouseUp);
                      }}
                    />
                  </ReactCrop>
                </div>
              )}
            </Col>

            <Col xs={12} md={6}>
              {!!completedCrop && (
                <canvas
                  ref={previewCanvasRef}
                  style={{
                    border: "1px solid black",
                    borderRadius: "0.5rem",
                    objectFit: "fill",
                    width: "100%",
                    height: "auto",
                  }}
                />
              )}
            </Col>
          </Row>

          <Row className="mt-3">
            <Col>
              <div style={{ display: "flex", alignItems: "center" }}>
                <label
                  htmlFor="scale-input"
                  style={{ marginRight: "10px", fontWeight: "bold" }}
                >
                  Drag To Zoom:
                </label>
                <input
                  id="scale-input"
                  type="range"
                  value={scale}
                  min="1"
                  max="3"
                  step="0.1"
                  onChange={(e) => setScale(Number(e.target.value))}
                  style={{ flex: "1" }}
                />
              </div>
            </Col>
          </Row>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="primary"
          className={customStyles.button}
          type="button"
          onClick={() => handleSave()}
        >
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
