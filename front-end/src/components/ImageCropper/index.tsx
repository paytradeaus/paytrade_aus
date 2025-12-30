import React, { useState, useRef, useEffect } from "react";
import ReactCrop, { centerCrop, Crop, PixelCrop } from "react-image-crop";
import { useDebounceEffect } from "./useDebounceEffect";
import { canvasPreview } from "./canvasPreview";
import Image from "next/image";
import "react-image-crop/dist/ReactCrop.css";
import BaseModal from "../BaseModal";

interface ImageCropperProps {
  selectedImage: Array<any>;
  handleCroppedImage: (selectedImage: any) => void;
  removeSelectedImage: (type?: boolean) => void;
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
    return true;
  }

  return (
    <BaseModal
      title="Crop Selected Image"
      displayModal={displayCropper}
      onClose={removeSelectedImage}
      onConfirm={handleSave}
      firstButtonName="Cancel"
      secondButtonName="Save"
    >
      <div className={"imageCropperContainer"}>
        <div className={"cropper"}>
          <div className="imageFlex">
            {!!imgSrc && (
              <div className={"imageContainer"}>
                <ReactCrop
                  crop={crop}
                  onChange={(newCrop, percentCrop) =>
                    handleCropChange(newCrop, percentCrop)
                  }
                  onComplete={(c) => setCompletedCrop(c)}
                  keepSelection
                  aspect={lockAspectRatio ? MAX_ASPECT_RATIO : undefined}
                  minWidth={MIN_DIMENSION}
                >
                  <Image
                    ref={imgRef}
                    alt="Crop me"
                    src={imgSrc}
                    style={{
                      transform: `scale(${scale}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                      width: "100%",
                      height: "auto",
                      cursor: "move",
                    }}
                    width={0} // Adjust based on the image dimensions
                    height={0}
                    onLoad={onImageLoad}
                    draggable={false}
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
                        document.removeEventListener("mouseup", handleMouseUp);
                      };

                      document.addEventListener("mousemove", handleMouseMove);
                      document.addEventListener("mouseup", handleMouseUp);
                    }}
                  />
                </ReactCrop>
              </div>
            )}
          </div>
          <div className={"canvasContainer"}>
            {!!completedCrop && (
              <canvas ref={previewCanvasRef} className={"previewCanvas"} />
            )}
          </div>
        </div>
        <div className={"controls"}>
          <label htmlFor="scale-input" className={"label"}>
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
            className={"slider"}
          />
        </div>
      </div>
    </BaseModal>
  );
}
