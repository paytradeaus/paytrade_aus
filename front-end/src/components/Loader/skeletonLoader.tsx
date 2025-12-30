//default imports
"use client";
import { CSSProperties, Fragment } from "react";
//import from reactstrap components
//import from customized components
//import customized styles
import styles from "./loader.module.scss";
import { Placeholder } from "react-bootstrap";
//import from external libraries

//import from constants, interfaces ,functions and services
//module level constants and interfaces

interface LoaderProps {
  setSkeletonLoader: boolean;
}

export const SkeletonLoader = ({ setSkeletonLoader }: LoaderProps) => {
  //useState and useEffect Management

  //other Hooks

  //Formik Handling

  //functions

  //render Template
  return (
    setSkeletonLoader && (
      <Placeholder as="p" animation="glow" className="text-center">
        <Placeholder
          xs={10}
          size="sm"
          bg="secondary"
          className={styles.placeHolderSpacing}
        />
        <Placeholder
          xs={10}
          size="sm"
          bg="secondary"
          className={styles.placeHolderSpacing}
        />
        <Placeholder
          xs={10}
          size="sm"
          bg="secondary"
          className={styles.placeHolderSpacing}
        />
        <Placeholder
          xs={10}
          size="sm"
          bg="secondary"
          className={styles.placeHolderSpacing}
        />
        <Placeholder
          xs={10}
          size="sm"
          bg="secondary"
          className={styles.placeHolderSpacing}
        />
        <Placeholder
          xs={10}
          size="sm"
          bg="secondary"
          className={styles.placeHolderSpacing}
        />
        <Placeholder.Button xs={4} aria-hidden="true" className="mt-3 mb-3" />
      </Placeholder>
    )
  );
};
