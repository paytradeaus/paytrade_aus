//default imports
import React, { ReactElement, useState } from "react";
import Image from "next/image";
//import from reactstrap components
import { Button, Modal, Form } from "react-bootstrap";
import { XLg } from "react-bootstrap-icons";
//import from customized components and images
import customStyles from "./modalFullScreen.module.scss";
import Logo from "../../../public/assets/payTradeLogo.png";
//import customized styles
//import from external libraries
//import from constants, interfaces ,functions and services
const values = [true, "sm-down", "md-down", "lg-down", "xl-down", "xxl-down"];
//module level constants and interfaces
interface FullScreenModalProps {
  displayFullScreenModal: boolean;
  onClose: () => void;
  children: any;
  closeButtonStyle?: any;
  customButtons?: boolean;
  btnConfig?: React.ReactElement<string | React.JSXElementConstructor<any>>;
  disableOnCloseIcon?: boolean;
}

export function ModalFullScreen({
  displayFullScreenModal,
  onClose,
  children,
  closeButtonStyle,
  customButtons,
  btnConfig,
  disableOnCloseIcon = false,
}: Readonly<FullScreenModalProps>) {
  //useState and useEffect Management

  //other Hooks

  //Formik Handling

  //functions

  //render Template
  return (
    <Modal
      show={displayFullScreenModal}
      fullscreen={true}
      scrollable
      className="full-screen-modal-container"
    >
      <Modal.Header className={customStyles.header}>
        {/* <Image src={Logo.src} alt="Pay trade" width={100} height={54} /> */}
        <div></div>
        {
          <XLg
            className={
              disableOnCloseIcon
                ? customStyles.closeImageNone
                : customStyles.closeImage
            }
            onClick={disableOnCloseIcon ? () => {} : onClose}
          />
        }
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      <Modal.Footer className={customStyles.footer}>
        {customButtons ? (
          <>{btnConfig}</>
        ) : (
          <Button
            className={`${customStyles.closeButton} ${closeButtonStyle}`}
            onClick={onClose}
          >
            Close
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
