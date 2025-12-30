import React, { useRef, useState, useEffect } from "react";

import SignaturePad from "react-signature-canvas";

import styles from "./signaturePad.module.css";
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
  const [signedSignature, setSignedSignature] = useState("");

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
      setSignedSignature(signatureData);
    }
  }, [signatureData, disabled, initialRender]);

  const clear = () => {
    if (sigPadRef?.current) {
      sigPadRef.current.clear();
      setSignedSignature("");
      onBlur(""); // Clear the signature on parent
    }
  };

  const trim = async () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      const finalSignature = sigPadRef.current?.toDataURL("image/png");

      if (finalSignature) {
        onBlur(finalSignature); // Send signature data to parent
        setSignedSignature(finalSignature);
      }
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
          <i
            className={`fa-light fa-trash ${
              !disabled && signedSignature ? "cu-pointer" : "dis_none"
            }`}
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
