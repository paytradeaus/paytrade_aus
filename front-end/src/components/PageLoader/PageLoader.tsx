import React from "react";

interface LoaderProps {
  onLoadingInfo?: string;
}

export default function PageLoader({ onLoadingInfo }: Readonly<LoaderProps>) {
  return (
    <div style={{ flexGrow: 1 }}>
      <div id="fader">
        <div className="loaderwrap">
          <div className="loader"></div>
          <div className="loaderlogo"></div>
          {onLoadingInfo && <div className="loader_info">{onLoadingInfo}</div>}
        </div>
      </div>
    </div>
  );
}
