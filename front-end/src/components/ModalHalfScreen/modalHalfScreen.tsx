//default imports
import React, { ReactElement, useState } from "react";
import Image from "next/image";
//import from reactstrap components
import { Button, Modal, Form } from "react-bootstrap";
import { XLg } from "react-bootstrap-icons";
//import from customized components and images
import customStyles from "./modalHalfScreen.module.scss";
import Logo from "../../../public/assets/payTradeLogo.png";
//import customized styles
//import from external libraries
//import from constants, interfaces ,functions and services
const values = [true, "sm-down", "md-down", "lg-down", "xl-down", "xxl-down"];
//module level constants and interfaces
interface HalfScreenModalProps {
  displayHalfScreenModal: boolean;
  onClose: () => void;
  children: any;
  closeButtonStyle?: any;
}

export function HalfScreenModal({
  displayHalfScreenModal,
  onClose,
  children,
  closeButtonStyle,
}: Readonly<HalfScreenModalProps>) {
  //useState and useEffect Management

  //other Hooks

  //Formik Handling

  //functions

  //render Template
  return (
    <Modal
      show={displayHalfScreenModal}
      fullscreen={true}
      centered
      dialogClassName={customStyles.modalHalfScreen}
    >
      <Modal.Header className={customStyles.header}>
        <div></div>
        <XLg className={customStyles.closeImage} onClick={onClose} />
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      <Modal.Footer className={customStyles.footer}>
        <Button
          className={`${customStyles.closeButton} ${closeButtonStyle}`}
          onClick={onClose}
        >
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
