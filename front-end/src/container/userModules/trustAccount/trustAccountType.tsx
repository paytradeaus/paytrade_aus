//default imports
"use client";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import React, { Fragment, useEffect, useState } from "react";
import { Accordion, Form, OverlayTrigger, Tooltip } from "react-bootstrap";
import { InfoCircleFill } from "react-bootstrap-icons";
//import from reactstrap components and icons
//import from customized components

//import customized styles
import customStyles from "./trustAccount.module.scss";
//import from external libraries

import { useTrustAccountContext } from "./trustAccountContext";
import {
  accountTypeProjectRadio,
  accountTypeProjectSelect,
  typeOfPersonOptions,
  contractDateOptions,
  partyOptions,
  headProjectTrustOptions,
  subcontractorOptions,
  tooltipContent,
  contractValueOptions,
  contractValueContent,
  projectSwitchConfirmation,
  retentionTypeSelect,
  cashRetentionOptions,
  RETENTION,
  PROJECT,
  CONFIRMATION,
} from "./trustAccount.constant";
import { AppModal } from "@/components/model/model";
//import from constants, interfaces ,functions and services
//module level constants and interfaces

export default function TrustAccountType() {
  //Other Hooks

  const {
    selectedAccountType,
    setSelectedAccountType,
    displayTrustAccordion,
    setDisplayTrustAccordion,
    displayProjectAccordion,
    setDisplayProjectAccordion,
    trustFormik: formik,
    projectFormik,
    setDisplayAccSwitchConfirmation,
  }: any = useTrustAccountContext();

  //useState and useEffect Management

  const [displayInformativeModal, setDisplayInformativeModal] = useState(false);
  const [informativeModalTitle, setInformativeModalTitle] = useState("");
  const [informativeModalContent, setInformativeModalContent] = useState("");
  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);

  //Functions

  function handleRadioBtnChange(name: string, value: boolean) {
    switch (name) {
      case "subContractorOrSupplier":
        return setModalContent(accountTypeProjectRadio[0]);
      case "contractResidentialConstruction":
        return setModalContent(accountTypeProjectRadio[1]);
      case "contractMaintenance":
        return setModalContent(accountTypeProjectRadio[2]);
      case "professionalOrAdministration":
        return setModalContent(accountTypeProjectRadio[3]);
      case "lessThan90Days":
        return setModalContent(accountTypeProjectRadio[4]);
      case "contractBetween":
        return setModalContent(accountTypeProjectRadio[5]);
      default:
        return "";
    }
  }

  function handleProjectSelectChange(name: string, value: any) {
    switch (name) {
      case "contractPrice":
        if (value?.value === "No") {
          formik?.setFieldValue(name, "");
          formik?.setFieldValue("subContractor", "");
          formik?.setFieldValue("contractDate", "");
          formik?.setFieldValue("contractingParty", "");
          formik?.setFieldValue("contractValue", "");
          return setModalContent(accountTypeProjectSelect[0]);
        } else {
          formik?.setFieldValue(name, value);
        }
        break;
      case "subContractor":
        if (value?.value === "No") {
          formik?.setFieldValue(name, "");
          formik?.setFieldValue("contractDate", "");
          formik?.setFieldValue("contractingParty", "");
          formik?.setFieldValue("contractValue", "");
          return setModalContent(accountTypeProjectSelect[1]);
        } else {
          formik?.setFieldValue(name, value);
        }
        break;
      case "contractDate":
        formik?.setFieldValue(name, value);
        break;
      case "contractingParty":
        formik?.setFieldValue(name, value);
        break;
    }
  }

  function handleInformativeModalClose() {
    setDisplayInformativeModal(false);

    if (formik?.values?.contractValue?.value) {
      formik?.setFieldValue("contractValue", "");
      formik?.setFieldValue("contractingParty", "");
      formik?.setFieldValue("contractDate", "");
    }
  }

  function setModalContent(data: any) {
    setInformativeModalContent(data?.content);
    setInformativeModalTitle(data?.title || "");
    setDisplayInformativeModal(true);
  }

  function handleContractValueChange(name: string, value: any) {
    formik?.setFieldValue(name, value);
    let findContent = null;
    if (value?.value === contractValueOptions[0]?.value) {
      findContent = contractValueContent[0];
    } else {
      findContent =
        contractValueContent.find((x: any) => {
          return (
            x?.contractDate === formik?.values?.contractDate?.value &&
            x?.contractingParty === formik?.values?.contractingParty?.value
          );
        }) ?? contractValueContent[0];
    }

    setInformativeModalContent(findContent?.content);
    setInformativeModalTitle("");
    setDisplayInformativeModal(true);
  }

  function handleTrustTypeChange(type: string) {
    const anyFormValues =
      Object.values(formik?.values).find((x: any) => !!x) ?? false;
    if (!selectedAccountType) {
      setSelectedAccountType(type);
    } else if (selectedAccountType && anyFormValues) {
      setDisplayConfirmationModal(true);
      setInformativeModalContent(projectSwitchConfirmation);
    } else {
      setSelectedAccountType(type);
    }
  }

  function handleConfirmationModal(action?: string) {
    if (action === CONFIRMATION) {
      setSelectedAccountType((prev: string) =>
        prev === PROJECT ? RETENTION : PROJECT
      );

      formik.setValues({
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
      setDisplayConfirmationModal(false);
    } else {
      setDisplayConfirmationModal(false);
    }
  }

  function handleRetentionSelectChange(name: string, value: any) {
    switch (name) {
      case "cashRetentions":
        if (value?.value === cashRetentionOptions[1]?.value) {
          formik?.setFieldValue(name, "");
          formik?.setFieldValue("headContract", "");
          formik?.setFieldValue("whoAreYou", "");

          return setModalContent(retentionTypeSelect[0]);
        } else {
          formik?.setFieldValue(name, value);
        }
        break;
      case "headContract":
        if (value?.value === headProjectTrustOptions[1]?.value) {
          formik?.setFieldValue(name, "");
          formik?.setFieldValue("whoAreYou", "");
          return setModalContent(retentionTypeSelect[1]);
        } else if (value?.value === headProjectTrustOptions[2]?.value) {
          formik?.setFieldValue(name, "");
          formik?.setFieldValue("whoAreYou", "");
          return setModalContent(retentionTypeSelect[2]);
        } else {
          formik?.setFieldValue(name, value);
        }
        break;
    }
  }

  function handleWhoSelectionChange(name: string, { value }: any) {
    switch (value) {
      case typeOfPersonOptions[0]?.value:
        return setModalContent(retentionTypeSelect[3]);
      case typeOfPersonOptions[1]?.value:
        return setModalContent(retentionTypeSelect[4]);
      case typeOfPersonOptions[2]?.value:
        return setModalContent(retentionTypeSelect[5]);
      case typeOfPersonOptions[3]?.value:
        return setModalContent(retentionTypeSelect[6]);
    }
  }

  function handleAccordionItemChange() {
    const anyTrustFormValues =
      Object.values(projectFormik?.values).find((x: any) => !!x) ?? false;
    if (!displayTrustAccordion && !displayProjectAccordion) {
      setDisplayTrustAccordion(true);
    } else if (displayProjectAccordion && anyTrustFormValues) {
      setDisplayAccSwitchConfirmation(true);
    } else if (displayProjectAccordion && !anyTrustFormValues) {
      setDisplayProjectAccordion(false);
      setDisplayTrustAccordion(true);
    }
  }

  //Render Template
  return (
    <Fragment>
      <Accordion.Item
        eventKey="0"
        className={customStyles.accordionItem}
        onClick={() => handleAccordionItemChange()}
      >
        <Accordion.Header className={customStyles.headButton}>
          {`Do I need a ${
            selectedAccountType === PROJECT
              ? PROJECT
              : selectedAccountType === RETENTION
              ? RETENTION
              : " "
          } trust account?`}
        </Accordion.Header>
        <Accordion.Body className={customStyles.answer}>
          <div className={customStyles.blockOne}>
            Please select the trust account type to access the relevant tool{" "}
            <span className={customStyles.reqSymbol}>*</span>
            <div className={customStyles.radioButton}>
              <Form.Check
                type="radio"
                label="Project trust account"
                name="radioGroup"
                checked={selectedAccountType === PROJECT}
                onChange={() => handleTrustTypeChange(PROJECT)}
              />
              <Form.Check
                type="radio"
                label="Retention trust account"
                name="radioGroup"
                checked={selectedAccountType === RETENTION}
                onChange={() => handleTrustTypeChange(RETENTION)}
              />
            </div>
          </div>
          {selectedAccountType === PROJECT && (
            <div className={customStyles.selectHead}>
              <div className="row">
                <div className="col-lg-6">
                  <div>
                    Use this tool to determine if you need a project trust
                    account.
                  </div>
                  <div className={customStyles.seperatorRule}>
                    <div className="mt-3">
                      Do any of these apply to your contract?
                    </div>
                    <div className="row mt-3">
                      <div className="col-lg-10">
                        Are you a subcontractor or a supplier working on a
                        building project? &nbsp;
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>{tooltipContent.first}</Tooltip>}
                        >
                          <InfoCircleFill />
                        </OverlayTrigger>
                      </div>
                      <div className="col-lg-2">
                        <Form.Check
                          type="switch"
                          label="No"
                          name="subContractorOrSupplier"
                          checked={formik?.values?.subContractorOrSupplier}
                          onChange={(e: any) =>
                            handleRadioBtnChange(
                              "subContractorOrSupplier",
                              e?.target.checked
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="row mt-4">
                      <div className="col-lg-10">
                        Is the only work to be carried out under the contract
                        residential construction work for 1 or 2 living units?
                        &nbsp;
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>{tooltipContent.second}</Tooltip>}
                        >
                          <InfoCircleFill />
                        </OverlayTrigger>
                      </div>
                      <div className="col-lg-2">
                        <Form.Check
                          type="switch"
                          label="No"
                          name="contractResidentialConstruction"
                          checked={
                            formik?.values?.contractResidentialConstruction
                          }
                          onChange={(e: any) =>
                            handleRadioBtnChange(
                              "contractResidentialConstruction",
                              e?.target.checked
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="row mt-4">
                      <div className="col-lg-10">
                        Is the only work to be carried out under the contract
                        maintenance work? &nbsp;
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>{tooltipContent.third}</Tooltip>}
                        >
                          <InfoCircleFill />
                        </OverlayTrigger>
                      </div>
                      <div className="col-lg-2">
                        <Form.Check
                          type="switch"
                          label="No"
                          name="contractMaintenance"
                          checked={formik?.values?.contractMaintenance}
                          onChange={(e: any) =>
                            handleRadioBtnChange(
                              "contractMaintenance",
                              e?.target.checked
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="row mt-4">
                      <div className="col-lg-10">
                        Is the only work to be carried out under the contract
                        professional design, advisory or contract administration
                        work? &nbsp;
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>{tooltipContent.fourth}</Tooltip>}
                        >
                          <InfoCircleFill />
                        </OverlayTrigger>
                      </div>
                      <div className="col-lg-2">
                        <Form.Check
                          type="switch"
                          label="No"
                          name="professionalOrAdministration"
                          checked={formik?.values?.professionalOrAdministration}
                          onChange={(e: any) =>
                            handleRadioBtnChange(
                              "professionalOrAdministration",
                              e?.target.checked
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="row mt-4">
                      <div className="col-lg-10">
                        Will the expected or estimated date for practical
                        completion be less than 90 calendar days from the day
                        the project trust account is required? &nbsp;
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>{tooltipContent.fifth}</Tooltip>}
                        >
                          <InfoCircleFill />
                        </OverlayTrigger>
                      </div>
                      <div className="col-lg-2">
                        <Form.Check
                          type="switch"
                          label="No"
                          name="lessThan90Days"
                          checked={formik?.values?.lessThan90Days}
                          onChange={(e: any) =>
                            handleRadioBtnChange(
                              "lessThan90Days",
                              e?.target.checked
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="row mt-4">
                      <div className="col-lg-10">
                        Is the contract only between the State of Queensland and
                        a Queensland State Authority? &nbsp;
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>{tooltipContent.six}</Tooltip>}
                        >
                          <InfoCircleFill />
                        </OverlayTrigger>
                      </div>
                      <div className="col-lg-2">
                        <Form.Check
                          type="switch"
                          label="No"
                          name="contractBetween"
                          checked={formik?.values?.contractBetween}
                          onChange={(e: any) =>
                            handleRadioBtnChange(
                              "contractBetween",
                              e?.target.checked
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className={customStyles.secondPart}>
                    Tell us about your contract
                  </div>
                  <label className={customStyles.labelHead}>
                    Is more than 50% of the contract price for project trust
                    work?
                    <span className={customStyles.reqSymbol}> *</span>
                  </label>
                  &nbsp;
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>{tooltipContent.seventh}</Tooltip>}
                  >
                    <InfoCircleFill />
                  </OverlayTrigger>
                  <SearchableSelect
                    label=""
                    options={subcontractorOptions}
                    singleSelectedData={formik?.value?.contractPrice}
                    disabled={false}
                    placeholder="--Select--"
                    onChange={(option) => {
                      handleProjectSelectChange("contractPrice", option);
                    }}
                    isRequired={
                      !!(
                        !formik.values.contractPrice &&
                        formik.touched.contractPrice
                      )
                    }
                  />
                  <div className="mt-4">
                    <label className={customStyles.labelHead}>
                      Is there, or will there be, at least one subcontractor
                      engaged for the work?
                      <span className={customStyles.reqSymbol}> *</span>
                    </label>
                    <SearchableSelect
                      label=""
                      options={subcontractorOptions}
                      onChange={(option) => {
                        handleProjectSelectChange("subContractor", option);
                      }}
                      disabled={!formik?.values?.contractPrice}
                      placeholder="--Select--"
                      singleSelectedData={formik?.values?.subContractor}
                    />
                  </div>
                  <div className="mt-4">
                    <label className={customStyles.labelHead}>
                      What is the actual or proposed contract date?
                      <span className={customStyles.reqSymbol}> *</span>
                    </label>
                    <SearchableSelect
                      label=""
                      options={contractDateOptions}
                      onChange={(option) => {
                        handleProjectSelectChange("contractDate", option);
                      }}
                      disabled={
                        !formik?.values?.contractPrice ||
                        !formik?.values?.subContractor
                      }
                      placeholder="--Select--"
                      singleSelectedData={formik?.values?.contractDate}
                    />
                  </div>
                  <div className="mt-4">
                    <label className={customStyles.labelHead}>
                      Who is the contracting party (i.e. principal)?
                      <span className={customStyles.reqSymbol}> *</span>
                    </label>
                    <SearchableSelect
                      label=""
                      options={partyOptions}
                      onChange={(option) => {
                        handleProjectSelectChange("contractingParty", option);
                      }}
                      disabled={
                        !formik?.values?.contractPrice ||
                        !formik?.values?.subContractor ||
                        !formik?.values?.contractDate
                      }
                      placeholder="--Select--"
                      singleSelectedData={formik?.values?.contractingParty}
                    />
                  </div>
                  <div className="mt-4">
                    <label className={customStyles.labelHead}>
                      What is the contract value (excluding GST)?
                      <span className={customStyles.reqSymbol}> *</span>
                    </label>
                    <SearchableSelect
                      label=""
                      options={contractValueOptions}
                      onChange={(option) => {
                        handleContractValueChange("contractValue", option);
                      }}
                      disabled={
                        !formik?.values?.contractPrice ||
                        !formik?.values?.subContractor ||
                        !formik?.values?.contractDate ||
                        !formik?.values?.contractingParty
                      }
                      placeholder="--Select--"
                      singleSelectedData={formik?.values?.contractValue}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          {selectedAccountType === RETENTION && (
            <div className={customStyles.selectHead}>
              <div>
                Use this tool to determine if you need a retention trust account
                and/or the retention amounts you’re withholding need to be held
                in a retention trust account.
              </div>
              <div className="row">
                <div className="col-lg-6">
                  <div className="mt-4">
                    <label className={customStyles.labelHead}>
                      Are you withholding cash retentions under your contract?
                      <span className={customStyles.reqSymbol}> *</span>
                    </label>
                    <SearchableSelect
                      label=""
                      options={cashRetentionOptions}
                      onChange={(option) => {
                        handleRetentionSelectChange("cashRetentions", option);
                      }}
                      placeholder="Select an Option"
                      singleSelectedData={formik?.values?.cashRetentions}
                    />
                  </div>
                  <div className="mt-4">
                    <label className={customStyles.labelHead}>
                      Does the head contract require a project trust?
                      <span className={customStyles.reqSymbol}> *</span>
                    </label>
                    &nbsp;
                    <OverlayTrigger
                      placement="top"
                      overlay={<Tooltip>{tooltipContent.eight}</Tooltip>}
                    >
                      <InfoCircleFill />
                    </OverlayTrigger>
                    <SearchableSelect
                      label=""
                      options={headProjectTrustOptions}
                      onChange={(option) => {
                        handleRetentionSelectChange("headContract", option);
                      }}
                      disabled={!formik?.values?.cashRetentions}
                      placeholder="Select an Option"
                      singleSelectedData={formik?.values?.headContract}
                    />
                  </div>
                  <div className="mt-4">
                    <label className={customStyles.labelHead}>
                      Who are you?
                      <span className={customStyles.reqSymbol}> *</span>
                    </label>
                    <SearchableSelect
                      label=""
                      options={typeOfPersonOptions}
                      onChange={(option) => {
                        handleWhoSelectionChange("whoAreYou", option);
                      }}
                      disabled={
                        !formik?.values?.cashRetentions ||
                        !formik?.values?.headContract
                      }
                      placeholder="Select an Option"
                      singleSelectedData={formik?.values?.whoAreYou}
                    />
                  </div>
                </div>
                <div className="col-lg-6"></div>
              </div>
            </div>
          )}
        </Accordion.Body>
      </Accordion.Item>
      {displayInformativeModal && (
        <AppModal
          show={displayInformativeModal}
          onHide={() => {}}
          firstButtonLabel={"Close"}
          modalTitleStyle={customStyles.modalTitle}
          modalHeading={informativeModalTitle}
          modalBodyTitle=""
          modalBodyContent={informativeModalContent}
          onConfirm={handleInformativeModalClose}
        />
      )}
      {displayConfirmationModal && (
        <AppModal
          show={displayConfirmationModal}
          onHide={() => handleConfirmationModal("close")}
          modalTitleStyle={customStyles.modalTitle}
          firstButtonLabel={"Yes, clear the form"}
          secondButtonLabel={"No, go back"}
          modalHeading={informativeModalTitle}
          modalBodyTitle=""
          modalBodyContent={informativeModalContent}
          onConfirm={() => handleConfirmationModal(CONFIRMATION)}
        />
      )}
    </Fragment>
  );
}
