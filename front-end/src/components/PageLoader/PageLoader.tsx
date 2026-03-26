"use client";
import React from "react";
import { createPortal } from "react-dom";

interface LoaderProps {
  onLoadingInfo?: string;
}

export default function PageLoader({ onLoadingInfo }: Readonly<LoaderProps>) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const overlay = (
    <div id="fader">
      <div className="loaderwrap">
        <div className="loader"></div>
        <div className="loaderlogo"></div>
        {onLoadingInfo && <div className="loader_info">{onLoadingInfo}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ flexGrow: 1 }}>
      {mounted ? createPortal(overlay, document.body) : overlay}
    </div>
  );
}
