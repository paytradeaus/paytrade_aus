import React, { useRef, useState, useEffect } from "react";
import SignaturePad from "react-signature-canvas";

import styles from "./signaturePad.module.scss";
import { Trash } from "react-bootstrap-icons";
import _ from "lodash";

const SignaturePadComponent = (props: any) => {
  const {
    disabled = false,
    onBlur,
    signatureData,
    enableButton = false,
  } = props;
  const [initialRender, setInitialRender] = useState(false);
  const sigPadRef = useRef<any>(null);

  const resizeCanvas = () => {
    // Restore the signature after resizing
    if (signatureData) {
      sigPadRef.current.fromDataURL(signatureData);
    }
  };

  useEffect(() => {
    if (
      !_.isEmpty(sigPadRef?.current) &&
      signatureData &&
      !initialRender &&
      !disabled
    ) {
      setInitialRender(true);
      sigPadRef.current.fromDataURL(signatureData);
    }
  }, [signatureData, disabled, initialRender]);

  const clear = () => {
    if (sigPadRef?.current) {
      sigPadRef.current.clear();
      onBlur(""); // Clear the signature on parent
    }
  };

  const trim = async () => {
    const finalSignature = sigPadRef.current?.toDataURL("image/png");
    if (finalSignature) {
      onBlur(finalSignature); // Send signature data to parent
    }
  };

  const handleEnd = () => {
    trim();
  };

  useEffect(() => {
    const signaturePad = sigPadRef.current;
    const canvas = signaturePad.getCanvas();

    const preventDrawing = (event: any) => {
      if (disabled) {
        event.stopPropagation();
      }
    };

    canvas.addEventListener("mousedown", preventDrawing, true);
    canvas.addEventListener("touchstart", preventDrawing, true);
    canvas.addEventListener("mouseup", handleEnd);
    canvas.addEventListener("touchend", handleEnd);

    // Handle canvas resizing on window resize
    window.addEventListener("resize", resizeCanvas);

    return () => {
      canvas.removeEventListener("mousedown", preventDrawing, true);
      canvas.removeEventListener("touchstart", preventDrawing, true);
      canvas.removeEventListener("mouseup", handleEnd);
      canvas.removeEventListener("touchend", handleEnd);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [disabled]);

  // Ensure the canvas is resized initially
  useEffect(() => {
    resizeCanvas();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.sigContainer}>
        <SignaturePad
          canvasProps={{
            className: disabled
              ? `${styles.disabledSigPad} ${styles.sigPad}`
              : styles.sigPad,
          }}
          ref={sigPadRef}
          onEnd={handleEnd}
        />
        {!enableButton && (
          <Trash
            className={
              !disabled && signatureData ? styles.fileRemoveIcon : "invisible "
            }
            onClick={clear}
          />
        )}
      </div>
      {enableButton && (
        <div>
          <button
            className={styles.buttons}
            onClick={clear}
            disabled={disabled || !signatureData}
          >
            {signatureData ? "Clear" : "Sign"}
          </button>
        </div>
      )}
    </div>
  );
};

export default SignaturePadComponent;
