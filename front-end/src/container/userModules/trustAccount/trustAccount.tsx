//default imports
"use client";
import React, { useState } from "react";
//import from reactstrap components and icons
import Accordion from "react-bootstrap/Accordion";
import { Navbar } from "react-bootstrap";
//import from customized components
import Footer from "@/components/footer/footer";
import NavbarLinks from "@/components/header/navLinks";
import DropdownLoginSignup from "@/components/header/navUserSection";
import NavbarComponent from "@/components/header/navbar";
import TrustAccountType from "./trustAccountType";
import { ProjectTrustAccount } from "./projectTrustAccount";
//import customized styles
import customStyles from "./trustAccount.module.scss";
import { useTrustAccountContext } from "./trustAccountContext";
import { AppModal } from "@/components/model/model";
import { CONFIRMATION, PROJECT, RETENTION } from "./trustAccount.constant";
//import from external libraries
//import from constants, interfaces ,functions and services
//module level constants and interfaces

export default function TrustAccount() {
  //UseState and UseEffect Management

  //Other Hooks
  const {
    displayTrustAccordion,
    setDisplayTrustAccordion,
    displayProjectAccordion,
    setDisplayProjectAccordion,
    trustFormik,
    setSelectedAccountType,
    displayAccSwitchConfirmation,
    setDisplayAccSwitchConfirmation,
    projectFormik,
  }: any = useTrustAccountContext();

  //Functions

  function displayActiveAccordion() {
    // if (displayTrustAccordion && displayProjectAccordion) {
    //   return ["0", "1"];
    // } else
    if (displayTrustAccordion) {
      return "0";
    } else if (displayProjectAccordion) {
      return "1";
    } else {
      return "";
    }
  }

  function handleConfirmationModal(action?: string) {
    if (action === CONFIRMATION) {
      setSelectedAccountType("");
      if (displayTrustAccordion) {
        trustFormik.setValues({
          subContractorOrSupplier: false,
          contractResidentialConstruction: false,
          contractMaintenance: false,
          professionalOrAdministration: false,
          lessThan90Days: false,
          contractBetween: false,

          contractPrice: "",
          subContractor: "",
          contractDate: "",
          contractingParty: "",
          contractValue: "",

          cashRetentions: "",
          headContract: "",
          whoAreYou: "",
        });

        setDisplayTrustAccordion(false);
        setDisplayProjectAccordion(true);
      } else if (displayProjectAccordion) {
        projectFormik.setValues({
          liableToPay: "",
          carryingWork: "",
          workToBeCarried: "",
          workBeingCarried: "",
        });

        setDisplayProjectAccordion(false);
        setDisplayTrustAccordion(true);
      }
      setDisplayAccSwitchConfirmation(false);
    } else {
      setDisplayAccSwitchConfirmation(false);
    }
  }

  //Render Template
  return (
    <div className={customStyles.mainContainer}>
      <NavbarComponent navlinkClass={""}>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav" className="collapseNav">
          <NavbarLinks />
          <DropdownLoginSignup />
        </Navbar.Collapse>
      </NavbarComponent>
      <div style={{ overflowY: "auto" }}>
        <div className="container my-5 head-button">
          <h3 className={customStyles.header}>
            Helps to understand the trust account requirements
          </h3>
          <Accordion
            className={customStyles.accordionHead}
            activeKey={displayActiveAccordion()}
          >
            <TrustAccountType />
            <ProjectTrustAccount />
          </Accordion>
        </div>
      </div>
      <Footer />

      {displayAccSwitchConfirmation && (
        <AppModal
          show={displayAccSwitchConfirmation}
          onHide={() => handleConfirmationModal("close")}
          modalTitleStyle={customStyles.modalTitle}
          firstButtonLabel={"Yes, clear my responses"}
          secondButtonLabel={"No, remain on this tool"}
          modalHeading={
            "You haven’t completed your responses to this tool. Would you like to change tools?"
          }
          modalBodyTitle=""
          modalBodyContent={""}
          onConfirm={() => handleConfirmationModal(CONFIRMATION)}
        />
      )}
    </div>
  );
}
