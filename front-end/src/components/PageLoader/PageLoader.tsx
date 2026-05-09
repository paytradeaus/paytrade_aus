"use client";
import React from "react";
import { createPortal } from "react-dom";

interface LoaderProps {
  onLoadingInfo?: string;
}

export default function PageLoader({ onLoadingInfo }: Readonly<LoaderProps>) {
  const [mounted, setMounted] = React.useState(false);
  const dialogRef = React.useRef<HTMLDialogElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Open the loader inside a native <dialog> via showModal() so it lands on
  // the browser's top layer — that's the only way to sit ABOVE another
  // already-open native <dialog> (e.g. the ABA wizard / BaseModal). A plain
  // fixed div, even with z-index 999999, is still beaten by the top layer.
  React.useEffect(() => {
    const dlg = dialogRef.current;
    if (!mounted || !dlg) return;
    if (!dlg.open) {
      try {
        dlg.showModal();
      } catch {
        // showModal throws if already open or not connected — ignore.
      }
    }
    return () => {
      if (dlg.open) {
        try {
          dlg.close();
        } catch {}
      }
    };
  }, [mounted]);

  const overlay = (
    <dialog
      ref={dialogRef}
      // Strip default dialog chrome so the existing #fader / .loaderwrap
      // styles look identical to before.
      style={{
        padding: 0,
        border: "none",
        background: "transparent",
        maxWidth: "100vw",
        maxHeight: "100vh",
        width: "100vw",
        height: "100vh",
        inset: 0,
        overflow: "hidden",
      }}
      onCancel={(e) => e.preventDefault()}
    >
      <div id="fader">
        <div className="loaderwrap">
          <div className="loader"></div>
          <div className="loaderlogo"></div>
          {onLoadingInfo && <div className="loader_info">{onLoadingInfo}</div>}
        </div>
      </div>
    </dialog>
  );

  return (
    <div style={{ flexGrow: 1 }}>
      {mounted ? createPortal(overlay, document.body) : overlay}
    </div>
  );
}
