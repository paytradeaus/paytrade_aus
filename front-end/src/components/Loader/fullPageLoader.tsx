//default imports
"use client";
import { CSSProperties, Fragment } from "react";
//import from reactstrap components
//import from customized components
//import customized styles
// import styles from "./loader.module.scss";
//import from external libraries
import PulseLoader from "react-spinners/PulseLoader";
//import from constants, interfaces ,functions and services
//module level constants and interfaces
const override: CSSProperties = {
  display: "block",
  margin: "0 auto",
  position: "relative",
  left: "50%",
  top: "50%",
  zIndex: 99999,
};

interface LoaderProps {
  setLoading: boolean;
}

export const FullPageLoader = ({ setLoading }: LoaderProps) => {
  //functions

  //render Template
  return (
    <Fragment>
      {/* FullPageLoader */}
      <div
        style={{
          position: "fixed",
          top: "0",
          left: "0",
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: "999999",
        }}
      />
      <PulseLoader
        color={"#1c2475"}
        loading={setLoading}
        cssOverride={override}
        size={22}
        aria-label="Loading Spinner"
      />
    </Fragment>
  );
};
