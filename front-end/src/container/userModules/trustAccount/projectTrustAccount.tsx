//default imports
import React, { useEffect, useState } from "react";
//import from reactstrap components and icons
import { Accordion, Form } from "react-bootstrap";
import { Check } from "react-bootstrap-icons";
//import from customized components
//import customized styles
import customStyles from "./trustAccount.module.scss";
import { useTrustAccountContext } from "./trustAccountContext";
import { AppModal } from "@/components/model/model";
import { projectRadioOptions, projectTypeRadio } from "./trustAccount.constant";
//import from external libraries
//import from constants, interfaces ,functions and services
//module level constants and interfaces

export function ProjectTrustAccount() {
  //Other Hooks
  const {
    displayProjectAccordion,
    setDisplayProjectAccordion,
    displayTrustAccordion,
    setDisplayTrustAccordion,
    trustFormik,
    setDisplayAccSwitchConfirmation,
    selectedAccountType,
    projectFormik: formik,
  }: any = useTrustAccountContext();

  //useState and useEffect Management

  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [checkboxState, setCheckboxState] = useState({
    option20: false,
    option21: false,
    option22: false,
    option23: false,
    option24: false,
    option25: false,
    option26: false,
    option27: false,
    option28: false,
    option29: false,
    option30: false,
    option31: false,
    option32: false,
    option33: false,
    option34: false,
    option35: false,
    option36: false,
    option37: false,
    option38: false,
    option39: false,
    option40: false,
    option41: false,
    option42: false,
    option43: false,
    option44: false,
    option45: false,
    option46: false,
    option47: false,
    option48: false,
    option49: false,
    option50: false,
    option51: false,
    option52: false,
    option53: false,
    // Add more options if needed
    // Add more options if needed
  });
  const [displayInformativeModal, setDisplayInformativeModal] = useState(false);
  const [informativeModalTitle, setInformativeModalTitle] = useState("");
  const [informativeModalContent, setInformativeModalContent] = useState("");

  useEffect(() => {
    const anyFormValues =
      Object.values(formik?.values).find((x: any) => !!x) ?? false;

    if (anyFormValues) {
      setDisplayTrustAccordion(false);
    }
  }, [formik?.values]);

  //Functions
  const handleCheckboxChange = (event: any) => {
    const { id, checked } = event.target;
    setCheckboxState({ ...checkboxState, [id]: checked });
  };

  function handleAccordionItemChange() {
    const anyTrustFormValues =
      Object.values(trustFormik?.values).find((x: any) => !!x) ?? false;
    if (!displayProjectAccordion && !displayTrustAccordion) {
      setDisplayTrustAccordion(true);
    } else if (
      displayTrustAccordion &&
      (anyTrustFormValues || selectedAccountType)
    ) {
      setDisplayAccSwitchConfirmation(true);
    } else if (
      displayTrustAccordion &&
      (!anyTrustFormValues || !selectedAccountType)
    ) {
      setDisplayProjectAccordion(true);
      setDisplayTrustAccordion(false);
    }
  }

  function handleRadioButtonChange(name: string, value: string) {
    switch (name) {
      case "liableToPay":
        if (value === projectRadioOptions.TRUSTEE_OF_PROJECT_TRUST) {
          formik?.setFieldValue(name, value);
        } else if (value === projectRadioOptions.SOMEONE_ELSE) {
          formik?.setValues({
            liableToPay: "",
            carryingWork: "",
            workToBeCarried: "",
            workBeingCarried: "",
          });
          setModalContent(projectTypeRadio[0]);
        }
        break;
      case "carryingWork":
        if (
          value ===
          projectRadioOptions.CONTRACTOR_UNDER_SUBCONTRACT_WITH_TRUSTEE
        ) {
          formik?.setFieldValue(name, value);
        } else if (
          value === projectRadioOptions.CONTRACTOR_UNDER_SUBCONTRACT_WITH_PARTY
        ) {
          clearCarryingWorkFields();
          setModalContent(projectTypeRadio[1]);
        } else if (value === projectRadioOptions.AN_EMPLOYEE) {
          clearCarryingWorkFields();
          setModalContent(projectTypeRadio[2]);
        } else if (value === projectRadioOptions.NOT_SURE) {
          clearCarryingWorkFields();
          setModalContent(projectTypeRadio[3]);
        }
        break;
      case "workToBeCarried":
        if (
          value === projectRadioOptions.DRILLING_EXTRACTING ||
          value === projectRadioOptions.SUPPLY_ONLY
        ) {
          setModalContent(projectTypeRadio[4]);
          formik.setFieldValue("workToBeCarried", "");
          formik.setFieldValue("workBeingCarried", "");
        } else if (value === projectRadioOptions.NONE_OF_THE_ABOVE) {
          formik?.setFieldValue(name, value);
        }
        break;
      case "workBeingCarried":
        formik?.setFieldValue(name, value);
    }
  }

  function clearCarryingWorkFields() {
    formik.setFieldValue("carryingWork", "");
    formik.setFieldValue("workToBeCarried", "");
    formik.setFieldValue("workBeingCarried", "");
  }

  function handleInformativeModalClose() {
    setDisplayInformativeModal(false);
  }

  function setModalContent(data: any) {
    setInformativeModalContent(data?.content);
    setInformativeModalTitle(data?.title || "");
    setDisplayInformativeModal(true);
  }

  return (
    <Accordion.Item
      eventKey="1"
      className={customStyles.accordionItem}
      onClick={handleAccordionItemChange}
    >
      <Accordion.Header>
        Who is paid in a project trust account?
      </Accordion.Header>
      <Accordion.Body className={customStyles.answer}>
        <div className={customStyles.blockOne}>
          <div className="mb-4">
            Use this tool to work out if someone other than the trustee needs to
            be paid from a trust account.
          </div>
          <div className="row">
            <div className="col-lg-6">
              <div className={customStyles.dividerRule}>
                <div>
                  <div>
                    <div>
                      Who is liable to pay the person?
                      <span className={customStyles.reqSymbol}> *</span>
                    </div>
                    <div className={customStyles.radioButton}>
                      <Form.Check
                        type="radio"
                        label={projectRadioOptions.TRUSTEE_OF_PROJECT_TRUST}
                        name="liableToPay"
                        checked={
                          formik?.values?.liableToPay ===
                          projectRadioOptions.TRUSTEE_OF_PROJECT_TRUST
                        }
                        onChange={() =>
                          handleRadioButtonChange(
                            "liableToPay",
                            projectRadioOptions.TRUSTEE_OF_PROJECT_TRUST
                          )
                        }
                      />
                      <Form.Check
                        type="radio"
                        label={projectRadioOptions.SOMEONE_ELSE}
                        name="liableToPay"
                        checked={
                          formik?.values?.liableToPay ===
                          projectRadioOptions.SOMEONE_ELSE
                        }
                        onChange={() =>
                          handleRadioButtonChange(
                            "liableToPay",
                            projectRadioOptions.SOMEONE_ELSE
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div>
                      Is the person carrying out the work (or supplying related
                      services):
                      <span className={customStyles.reqSymbol}> *</span>
                    </div>
                    <div className={customStyles.radioButton}>
                      <Form.Check
                        type="radio"
                        label={
                          projectRadioOptions.CONTRACTOR_UNDER_SUBCONTRACT_WITH_TRUSTEE
                        }
                        name="carryingWork"
                        disabled={
                          formik?.values?.liableToPay !==
                          projectRadioOptions.TRUSTEE_OF_PROJECT_TRUST
                        }
                        checked={
                          formik?.values?.carryingWork ===
                          projectRadioOptions.CONTRACTOR_UNDER_SUBCONTRACT_WITH_TRUSTEE
                        }
                        onChange={() =>
                          handleRadioButtonChange(
                            "carryingWork",
                            projectRadioOptions.CONTRACTOR_UNDER_SUBCONTRACT_WITH_TRUSTEE
                          )
                        }
                      />
                      <Form.Check
                        type="radio"
                        label={
                          projectRadioOptions.CONTRACTOR_UNDER_SUBCONTRACT_WITH_PARTY
                        }
                        name="carryingWork"
                        disabled={
                          formik?.values?.liableToPay !==
                          projectRadioOptions.TRUSTEE_OF_PROJECT_TRUST
                        }
                        checked={
                          formik?.values?.carryingWork ===
                          projectRadioOptions.CONTRACTOR_UNDER_SUBCONTRACT_WITH_PARTY
                        }
                        onChange={() =>
                          handleRadioButtonChange(
                            "carryingWork",
                            projectRadioOptions.CONTRACTOR_UNDER_SUBCONTRACT_WITH_PARTY
                          )
                        }
                      />
                      <Form.Check
                        type="radio"
                        label={projectRadioOptions.AN_EMPLOYEE}
                        name="carryingWork"
                        disabled={
                          formik?.values?.liableToPay !==
                          projectRadioOptions.TRUSTEE_OF_PROJECT_TRUST
                        }
                        checked={
                          formik?.values?.carryingWork ===
                          projectRadioOptions.AN_EMPLOYEE
                        }
                        onChange={() =>
                          handleRadioButtonChange(
                            "carryingWork",
                            projectRadioOptions.AN_EMPLOYEE
                          )
                        }
                      />
                      <Form.Check
                        type="radio"
                        label={projectRadioOptions.NOT_SURE}
                        name="carryingWork"
                        disabled={
                          formik?.values?.liableToPay !==
                          projectRadioOptions.TRUSTEE_OF_PROJECT_TRUST
                        }
                        checked={
                          formik?.values?.carryingWork ===
                          projectRadioOptions.NOT_SURE
                        }
                        onChange={() =>
                          handleRadioButtonChange(
                            "carryingWork",
                            projectRadioOptions.NOT_SURE
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div>
                      Is the work to be carried out (or services supplied) under
                      the subcontract:
                      <span className={customStyles.reqSymbol}> *</span>
                    </div>
                    <div className={customStyles.radioButton}>
                      <Form.Check
                        type="radio"
                        label={projectRadioOptions.DRILLING_EXTRACTING}
                        name="workToBeCarried"
                        disabled={
                          formik?.values?.liableToPay !==
                            projectRadioOptions.TRUSTEE_OF_PROJECT_TRUST ||
                          formik?.values?.carryingWork !==
                            projectRadioOptions.CONTRACTOR_UNDER_SUBCONTRACT_WITH_TRUSTEE
                        }
                        checked={
                          formik?.values?.workToBeCarried ===
                          projectRadioOptions.DRILLING_EXTRACTING
                        }
                        onChange={() =>
                          handleRadioButtonChange(
                            "workToBeCarried",
                            projectRadioOptions.DRILLING_EXTRACTING
                          )
                        }
                      />
                      <Form.Check
                        type="radio"
                        label={projectRadioOptions.SUPPLY_ONLY}
                        name={"workToBeCarried"}
                        disabled={
                          formik?.values?.liableToPay !==
                            projectRadioOptions.TRUSTEE_OF_PROJECT_TRUST ||
                          formik?.values?.carryingWork !==
                            projectRadioOptions.CONTRACTOR_UNDER_SUBCONTRACT_WITH_TRUSTEE
                        }
                        checked={
                          formik?.values?.workToBeCarried ===
                          projectRadioOptions.SUPPLY_ONLY
                        }
                        onChange={() =>
                          handleRadioButtonChange(
                            "workToBeCarried",
                            projectRadioOptions.SUPPLY_ONLY
                          )
                        }
                      />
                      <Form.Check
                        type="radio"
                        label={projectRadioOptions.NONE_OF_THE_ABOVE}
                        name={"workToBeCarried"}
                        disabled={
                          formik?.values?.liableToPay !==
                            projectRadioOptions.TRUSTEE_OF_PROJECT_TRUST ||
                          formik?.values?.carryingWork !==
                            projectRadioOptions.CONTRACTOR_UNDER_SUBCONTRACT_WITH_TRUSTEE
                        }
                        checked={
                          formik?.values?.workToBeCarried ===
                          projectRadioOptions.NONE_OF_THE_ABOVE
                        }
                        onChange={() =>
                          handleRadioButtonChange(
                            "workToBeCarried",
                            projectRadioOptions.NONE_OF_THE_ABOVE
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div>
                      Is the work (or services supplied) under the subcontract
                      being carried out:
                      <span className={customStyles.reqSymbol}> *</span>
                    </div>
                    <div className={customStyles.radioButton}>
                      <Form.Check
                        type="radio"
                        label={projectRadioOptions.BUILDING_CONSTRUCTION_SITE}
                        name="workBeingCarried"
                        disabled={
                          formik?.values?.liableToPay !==
                            projectRadioOptions.TRUSTEE_OF_PROJECT_TRUST ||
                          formik?.values?.carryingWork !==
                            projectRadioOptions.CONTRACTOR_UNDER_SUBCONTRACT_WITH_TRUSTEE ||
                          formik?.values?.workToBeCarried !==
                            projectRadioOptions.NONE_OF_THE_ABOVE
                        }
                        checked={
                          formik?.values?.workBeingCarried ===
                          projectRadioOptions.BUILDING_CONSTRUCTION_SITE
                        }
                        onChange={() =>
                          handleRadioButtonChange(
                            "workBeingCarried",
                            projectRadioOptions.BUILDING_CONSTRUCTION_SITE
                          )
                        }
                      />
                      <Form.Check
                        type="radio"
                        label={projectRadioOptions.OFFSITE_ADVISORY}
                        name="workBeingCarried"
                        disabled={
                          formik?.values?.liableToPay !==
                            projectRadioOptions.TRUSTEE_OF_PROJECT_TRUST ||
                          formik?.values?.carryingWork !==
                            projectRadioOptions.CONTRACTOR_UNDER_SUBCONTRACT_WITH_TRUSTEE ||
                          formik?.values?.workToBeCarried !==
                            projectRadioOptions.NONE_OF_THE_ABOVE
                        }
                        checked={
                          formik?.values?.workBeingCarried ===
                          projectRadioOptions.OFFSITE_ADVISORY
                        }
                        onChange={() =>
                          handleRadioButtonChange(
                            "workBeingCarried",
                            projectRadioOptions.OFFSITE_ADVISORY
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className={customStyles.seperatorRule1}>
                {formik?.values?.workBeingCarried ===
                  projectRadioOptions.BUILDING_CONSTRUCTION_SITE && (
                  <>
                    <div className="mb-3">Type of work/related services:</div>
                    <Form.Check
                      type="checkbox"
                      label="Air conditioning/heating/ventilation/lighting"
                      checked={checkboxState.option20}
                      onChange={handleCheckboxChange}
                      name="radioGroup"
                      id="option20"
                    />
                    {checkboxState.option20 && (
                      <div>
                        {/* Content to be shown */}
                        <div className={customStyles.boxStyle}>
                          Description/examples of work:
                        </div>
                        <ul className="mt-2 ms-4">
                          <li>
                            Provision in connection with a building or
                            installation in a building or other works* of air
                            conditioning, heating, ventilation, or lighting.
                          </li>
                          <li>
                            Any operation that is integral/preparatory to or is
                            necessary for completing air conditioning, heating,
                            ventilation, or lighting installation.
                          </li>
                        </ul>
                        <div className={customStyles.checkText}>
                          *&apos;Other works&apos; include walls, roadworks,
                          powerlines, telecommunication apparatus, aircraft
                          runways, docks and harbours, railways, inland
                          waterways, pipelines, reservoirs, water mains, wells,
                          sewers, industrial plant and installations for land
                          drainage or coast protection.
                        </div>
                        <div className={customStyles.check}>
                          ✓ Eligible for Project Trust Account payment
                        </div>
                      </div>
                    )}
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Building inspection/assessment/report"
                        checked={checkboxState.option21}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option21"
                      />
                      {checkboxState.option21 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>Carrying out a building inspection.</li>
                            <li>
                              Termite inspection/investigation and advice/report
                              for a building
                            </li>
                            <li>Assessing energy efficiency of a building.</li>
                          </ul>

                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Construction"
                        checked={checkboxState.option22}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option22"
                      />
                      {checkboxState.option22 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Constructing, erecting, renovating, altering,
                              repairing, improving, extending, restoring or
                              maintaining buildings or other works*. Examples
                              include:
                            </li>
                            <ul>
                              <li>Carpentry</li>
                              <li>Plastering/rendering walls</li>
                              <li>Tiling/flooring</li>
                              <li>Cabinet joinery/installation</li>
                            </ul>
                            <li>
                              Any operation that is integral/preparatory to or
                              is necessary for completing the above types of
                              work.
                            </li>
                          </ul>
                          <div className={customStyles.checkText}>
                            *&apos;Other works&apos; include walls, roadworks,
                            powerlines, telecommunication apparatus, aircraft
                            runways, docks and harbours, railways, inland
                            waterways, pipelines, reservoirs, water mains,
                            wells, sewers, industrial plant and installations
                            for land drainage or coast protection.
                          </div>
                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Demolition/dismantling"
                        checked={checkboxState.option23}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option23"
                      />
                      {checkboxState.option23 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Demolishing or dismantling buildings or other
                              works*.
                            </li>
                            <li>
                              Any operation that is integral or preparatory to
                              or is necessary for completing
                              demolition/dismantling work.
                            </li>
                          </ul>
                          <div className={customStyles.checkText}>
                            *&apos;Other works&apos; include walls, roadworks,
                            powerlines, telecommunication apparatus, aircraft
                            runways, docks and harbours, railways, inland
                            waterways, pipelines, reservoirs, water mains,
                            wells, sewers, industrial plant and installations
                            for land drainage or coast protection.
                          </div>
                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Electrical/power supply"
                        checked={checkboxState.option24}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option24"
                      />
                      {checkboxState.option24 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Installing power supply in a building or other
                              works*.
                            </li>
                            <li>
                              Any operation that is integral or preparatory to
                              or is necessary for completing power supply
                              installation.
                            </li>
                            <li>
                              Electrical work associated with a building under
                              the{" "}
                              <span className={customStyles.radioText}>
                                Electrical Safety Act 2002
                              </span>
                              .
                            </li>
                          </ul>
                          <div className={customStyles.checkText}>
                            *&apos;Other works&apos; include walls, roadworks,
                            powerlines, telecommunication apparatus, aircraft
                            runways, docks and harbours, railways, inland
                            waterways, pipelines, reservoirs, water mains,
                            wells, sewers, industrial plant and installations
                            for land drainage or coast protection.
                          </div>
                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Fire safety work/fire protection work or systems/security systems/communications systems"
                        checked={checkboxState.option25}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option25"
                      />
                      {checkboxState.option25 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Work associated with a building performed by a
                              fire safety adviser under the&nbsp;
                              <span className={customStyles.radioText}>
                                Building Fire Safety Regulation 2008
                              </span>
                              .
                            </li>
                            <li>
                              Fire protection work (as per the&nbsp;
                              <span className={customStyles.radioText}>
                                &nbsp;Queensland Building and Construction
                                Commission Act Schedule 2
                              </span>
                              ).
                            </li>
                            <li>
                              Installing fire protection, security or
                              communications systems in a building or other
                              works*.
                            </li>
                            <li>
                              Any operation that is integral/preparatory to or
                              is necessary for completing the installation of
                              fire protection, security or communications
                              systems.
                            </li>
                          </ul>
                          <div className={customStyles.checkText}>
                            *&apos;Other works&apos; include walls, roadworks,
                            powerlines, telecommunication apparatus, aircraft
                            runways, docks and harbours, railways, inland
                            waterways, pipelines, reservoirs, water mains,
                            wells, sewers, industrial plant and installations
                            for land drainage or coast protection.
                          </div>
                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Foundations"
                        checked={checkboxState.option26}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option26"
                      />
                      {checkboxState.option26 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Laying foundations if integral/preparatory to or
                              necessary for completing:
                            </li>
                            <ul>
                              <li>
                                construction, alteration, repair, restoration,
                                maintenance, extension, demolition, dismantling
                                of a building or other works*; or
                              </li>
                              <li>
                                installation of fittings in a building or other
                                works*.
                              </li>
                            </ul>
                          </ul>
                          <div className={customStyles.checkText}>
                            *&apos;Other works&apos; include walls, roadworks,
                            powerlines, telecommunication apparatus, aircraft
                            runways, docks and harbours, railways, inland
                            waterways, pipelines, reservoirs, water mains,
                            wells, sewers, industrial plant and installations
                            for land drainage or coast protection.
                          </div>
                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Installing prefabricated building components"
                        checked={checkboxState.option27}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option27"
                      />
                      {checkboxState.option27 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Installing prefabricated building components (e.g.
                              modules).
                            </li>
                          </ul>
                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Landscaping and site restoration"
                        checked={checkboxState.option28}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option28"
                      />
                      {checkboxState.option28 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Landscaping or site restoration if
                              integral/preparatory to or necessary for
                              completing:
                            </li>
                            <ul>
                              <li>
                                Construction, alteration, repair, restoration,
                                maintenance, extension, demolition, dismantling
                                of a building or other works*; or
                              </li>
                              <li>
                                installation of fittings in a building or other
                                works*.
                              </li>
                            </ul>
                          </ul>
                          <div className={customStyles.checkText}>
                            *&apos;Other works&apos; include walls, roadworks,
                            powerlines, telecommunication apparatus, aircraft
                            runways, docks and harbours, railways, inland
                            waterways, pipelines, reservoirs, water mains,
                            wells, sewers, industrial plant and installations
                            for land drainage or coast protection.
                          </div>
                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Painting/decorating"
                        checked={checkboxState.option29}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option29"
                      />
                      {checkboxState.option29 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Painting or decorating internal or external
                              surfaces of any building or other works*.
                            </li>
                          </ul>
                          <div className={customStyles.checkText}>
                            *&apos;Other works&apos; include walls, roadworks,
                            powerlines, telecommunication apparatus, aircraft
                            runways, docks and harbours, railways, inland
                            waterways, pipelines, reservoirs, water mains,
                            wells, sewers, industrial plant and installations
                            for land drainage or coast protection.
                          </div>
                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Prefabricating"
                        checked={checkboxState.option30}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option30"
                      />
                      {checkboxState.option30 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Prefabricating complete buildings or components
                              (e.g. modules) of a building or other works*.
                            </li>
                          </ul>
                          <div className={customStyles.checkText}>
                            *&apos;Other works&apos; include walls, roadworks,
                            powerlines, telecommunication apparatus, aircraft
                            runways, docks and harbours, railways, inland
                            waterways, pipelines, reservoirs, water mains,
                            wells, sewers, industrial plant and installations
                            for land drainage or coast protection.
                          </div>
                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Professional cleaning"
                        checked={checkboxState.option31}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option31"
                      />
                      {checkboxState.option31 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              External or internal cleaning of a building or
                              other works* carried out in the course of the
                              construction, alteration, repair, restoration,
                              maintenance or extension of the building or other
                              works*.
                            </li>
                          </ul>
                          <div className={customStyles.checkText}>
                            *&apos;Other works&apos; include walls, roadworks,
                            powerlines, telecommunication apparatus, aircraft
                            runways, docks and harbours, railways, inland
                            waterways, pipelines, reservoirs, water mains,
                            wells, sewers, industrial plant and installations
                            for land drainage or coast protection.
                          </div>
                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Roadways/access"
                        checked={checkboxState.option32}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option32"
                      />
                      {checkboxState.option32 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Providing roadways and other access works if
                              integral/preparatory to or necessary for
                              completing:
                            </li>
                            <ul>
                              <li>
                                construction, alteration, repair, restoration,
                                maintenance, extension, demolition, dismantling
                                of a building or other works*; or
                              </li>
                              <li>
                                installation of fittings in a building or other
                                works*.
                              </li>
                            </ul>
                          </ul>
                          <div className={customStyles.checkText}>
                            *&apos;Other works&apos; include walls, roadworks,
                            powerlines, telecommunication apparatus, aircraft
                            runways, docks and harbours, railways, inland
                            waterways, pipelines, reservoirs, water mains,
                            wells, sewers, industrial plant and installations
                            for land drainage or coast protection.
                          </div>
                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        checked={checkboxState.option33}
                        onChange={handleCheckboxChange}
                        label="Rubber laying"
                        name="radioGroup"
                        id="option33"
                      />
                      {checkboxState.option33 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Laying wet pour rubber associated with a building,
                              including the laying of a blended mix of graded
                              rubber particles and binder to provide a
                              continuous surface.
                            </li>
                          </ul>

                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Scaffolding"
                        checked={checkboxState.option34}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option34"
                      />
                      {checkboxState.option34 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Erecting scaffolding associated with a building
                            </li>
                            <li>
                              Managing or removing scaffolding used for carrying
                              out project trust work
                            </li>
                            <li>
                              Erecting, maintaining or dismantling scaffolding
                              if integral/preparatory to or necessary for
                              completing:
                            </li>
                            <ul>
                              <li>
                                construction, alteration, repair, restoration,
                                maintenance, extension, demolition, dismantling
                                of a building or other works*; or
                              </li>
                              <li>
                                installation of fittings in a building or other
                                works*.
                              </li>
                            </ul>
                          </ul>
                          <div className={customStyles.checkText}>
                            *&apos;Other works&apos; include walls, roadworks,
                            powerlines, telecommunication apparatus, aircraft
                            runways, docks and harbours, railways, inland
                            waterways, pipelines, reservoirs, water mains,
                            wells, sewers, industrial plant and installations
                            for land drainage or coast protection.
                          </div>
                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Site testing"
                        checked={checkboxState.option35}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option35"
                      />
                      {checkboxState.option35 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Site testing and classification carried out in
                              preparation for building erection or construction.
                            </li>
                            <li className={customStyles.radioText}>
                              Site testing means field work for soil testing or
                              site classification or laboratory testing of soil.
                            </li>
                            <li className={customStyles.radioText}>
                              Site classification means the classification of a
                              site, or the reclassification of a site, under a
                              standard directed to ensuring the appropriate
                              selection or design of footings.
                            </li>
                          </ul>

                          <div className={customStyles.checkText}>
                            *&apos;Other works&apos; include walls, roadworks,
                            powerlines, telecommunication apparatus, aircraft
                            runways, docks and harbours, railways, inland
                            waterways, pipelines, reservoirs, water mains,
                            wells, sewers, industrial plant and installations
                            for land drainage or coast protection.
                          </div>

                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Site work, site clearance, earthmoving, excavating, tunnelling and boring"
                        checked={checkboxState.option36}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option36"
                      />
                      {checkboxState.option36 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Site work (including retaining structures) related
                              to:
                            </li>
                            <ul>
                              <li>
                                building construction, erection, renovation,
                                alteration, repair, improvement or extension
                              </li>
                              <li>
                                the provision of lighting, heating, ventilation
                                or air conditioning in connection with a
                                building
                              </li>
                              <li>
                                the provision of water supply, sewerage or
                                drainage in connection with a building
                              </li>
                            </ul>
                            <li>
                              Earthmoving or excavation associated with a
                              building
                            </li>
                            <li>
                              Site clearance, earthmoving, excavation,
                              tunnelling and boring if integral/preparatory to
                              or necessary for completing:
                            </li>
                            <ul>
                              <li>
                                construction, alteration, repair, restoration,
                                maintenance, extension, demolition, dismantling
                                of a building or other works*; or
                              </li>
                              <li>
                                installation of fittings in a building or other
                                works*.
                              </li>
                            </ul>
                          </ul>

                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Soil testing/testing road-materials"
                        checked={checkboxState.option37}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option37"
                      />
                      {checkboxState.option37 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Testing soils and road making materials during the
                              construction and maintenance of roads
                            </li>
                            <li>
                              Soil testing services related to protected work
                            </li>
                          </ul>

                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Surveying"
                        checked={checkboxState.option38}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option38"
                      />
                      {checkboxState.option38 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Surveying or quantity surveying services relating
                              to protected work
                            </li>
                          </ul>

                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Swimming pools"
                        checked={checkboxState.option39}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option39"
                      />
                      {checkboxState.option39 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Constructing, installing, altering or repairing a
                              swimming pool (
                              <span className={customStyles.radioText}>
                                Building Act 1975
                              </span>
                              , Schedule 2), whether associated with a building
                              or not
                            </li>
                          </ul>

                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Water/drainage/sanitation"
                        checked={checkboxState.option40}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option40"
                      />
                      {checkboxState.option40 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Provision of water supply, sewerage or drainage in
                              connection with a building.
                            </li>
                            <li>
                              Installing water supply, drainage or sanitation in
                              a building or other works*.
                            </li>
                            <li>
                              Any operation that is integral/preparatory to or
                              is necessary for completing water supply, drainage
                              or sanitation installation.
                            </li>
                          </ul>

                          <div className={customStyles.checkText}>
                            *&apos;Other works&apos; include walls, roadworks,
                            powerlines, telecommunication apparatus, aircraft
                            runways, docks and harbours, railways, inland
                            waterways, pipelines, reservoirs, water mains,
                            wells, sewers, industrial plant and installations
                            for land drainage or coast protection.
                          </div>

                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Drilling/extracting oil/gas"
                        checked={checkboxState.option41}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option41"
                      />
                      {checkboxState.option41 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Drilling for, or extracting, oil or natural gas
                            </li>
                          </ul>

                          <div className={customStyles.unCheck}>
                            ✗ Not eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Extraction of minerals"
                        checked={checkboxState.option42}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option42"
                      />
                      {checkboxState.option42 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Extracting minerals, whether by underground or
                              surface working, including tunnelling or boring,
                              or constructing underground works, for that
                              purpose.
                            </li>
                          </ul>

                          <div className={customStyles.unCheck}>
                            ✗ Not eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Form.Check
                        type="checkbox"
                        label="Ongoing maintenance work"
                        checked={checkboxState.option43}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option43"
                      />
                      {checkboxState.option43 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Maintenance work that is the only remaining work
                              to be carried out for the project.
                            </li>
                          </ul>
                          <div className={customStyles.unCheck}>
                            ✗ Not eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
                {formik?.values?.workBeingCarried ===
                  projectRadioOptions.OFFSITE_ADVISORY && (
                  <>
                    <div className={customStyles.seperatorRule2}>
                      <div className="mb-3">Type of work/related services:</div>
                      <Form.Check
                        type="checkbox"
                        label="Architecture and design"
                        checked={checkboxState.option44}
                        onChange={handleCheckboxChange}
                        name="radioGroup"
                        id="option44"
                      />
                      {checkboxState.option44 && (
                        <div>
                          {/* Content to be shown */}
                          <div className={customStyles.boxStyle}>
                            Description/examples of work:
                          </div>
                          <ul className="mt-2 ms-4">
                            <li>
                              Work associated with a building performed by an
                              architect under the{" "}
                              <span className={customStyles.radioText}>
                                Architects Act 2002
                              </span>
                              &nbsp; in the architect’s professional practice.
                            </li>
                            <li>
                              Architectural or design services relating to
                              protected work.
                            </li>
                          </ul>

                          <div className={customStyles.check}>
                            ✓ Eligible for Project Trust Account payment
                          </div>
                        </div>
                      )}
                      <div className="mt-2">
                        <Form.Check
                          type="checkbox"
                          label="Assessing energy efficiency"
                          checked={checkboxState.option45}
                          onChange={handleCheckboxChange}
                          name="radioGroup"
                          id="option45"
                        />
                        {checkboxState.option45 && (
                          <div>
                            {/* Content to be shown */}
                            <div className={customStyles.boxStyle}>
                              Description/examples of work:
                            </div>
                            <ul className="mt-2 ms-4">
                              <li>
                                The assessment of energy efficiency of a
                                building.
                              </li>
                            </ul>
                            <div className={customStyles.check}>
                              ✓ Eligible for Project Trust Account payment
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <Form.Check
                          type="checkbox"
                          label="Building and other advisory services"
                          checked={checkboxState.option46}
                          onChange={handleCheckboxChange}
                          name="radioGroup"
                          id="option46"
                        />
                        {checkboxState.option46 && (
                          <div>
                            {/* Content to be shown */}
                            <div className={customStyles.boxStyle}>
                              Description/examples of work:
                            </div>
                            <ul className="mt-2 ms-4">
                              <li>
                                Building advisory services, engineering advisory
                                services, interior or exterior decoration
                                advisory services or landscaping advisory
                                services relating to protected work.
                              </li>
                            </ul>
                            <div className={customStyles.check}>
                              ✓ Eligible for Project Trust Account payment
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <Form.Check
                          type="checkbox"
                          label="Certifying"
                          checked={checkboxState.option47}
                          onChange={handleCheckboxChange}
                          name="radioGroup"
                          id="option47"
                        />
                        {checkboxState.option47 && (
                          <div>
                            {/* Content to be shown */}
                            <div className={customStyles.boxStyle}>
                              Description/examples of work:
                            </div>
                            <ul className="mt-2 ms-4">
                              <li>
                                Certification work associated with a building
                                performed by a building certifier under
                                the&nbsp;
                                <span className={customStyles.radioText}>
                                  Building Act 1975
                                </span>
                                &nbsp; in the certifier&apos;s professional
                                practice.
                              </li>
                            </ul>
                            <div className={customStyles.check}>
                              ✓ Eligible for Project Trust Account payment
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <Form.Check
                          type="checkbox"
                          label="Contract administration"
                          checked={checkboxState.option48}
                          onChange={handleCheckboxChange}
                          name="radioGroup"
                          id="option48"
                        />
                        {checkboxState.option48 && (
                          <div>
                            {/* Content to be shown */}
                            <div className={customStyles.boxStyle}>
                              Description/examples of work:
                            </div>
                            <ul className="mt-2 ms-4">
                              <li>
                                Contract administration if carried out by a
                                person for the construction of a building wholly
                                or partly designed by the person.
                              </li>
                            </ul>
                            <div className={customStyles.check}>
                              ✓ Eligible for Project Trust Account payment
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <Form.Check
                          type="checkbox"
                          label="Engineering"
                          checked={checkboxState.option49}
                          onChange={handleCheckboxChange}
                          name="radioGroup"
                          id="option49"
                        />
                        {checkboxState.option49 && (
                          <div>
                            {/* Content to be shown */}
                            <div className={customStyles.boxStyle}>
                              Description/examples of work:
                            </div>
                            <ul className="mt-2 ms-4">
                              <li>
                                Work associated with a building performed by a
                                registered professional engineer under the&nbsp;{" "}
                                <span className={customStyles.radioText}>
                                  Professional Engineers Act 2002
                                </span>
                                &nbsp;in the engineer&apos;s professional
                                practice.
                              </li>
                            </ul>
                            <div className={customStyles.check}>
                              ✓ Eligible for Project Trust Account payment
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <Form.Check
                          type="checkbox"
                          label="Prefabricating"
                          checked={checkboxState.option50}
                          onChange={handleCheckboxChange}
                          name="radioGroup"
                          id="option50"
                        />
                        {checkboxState.option50 && (
                          <div>
                            {/* Content to be shown */}
                            <div className={customStyles.boxStyle}>
                              Description/examples of work:
                            </div>
                            <ul className="mt-2 ms-4">
                              <li>
                                The prefabrication of complete buildings or
                                components (e.g. modules) of a building or other
                                works*.
                              </li>
                            </ul>

                            <div className={customStyles.checkText}>
                              *&apos;Other works&apos; include walls, roadworks,
                              powerlines, telecommunication apparatus, aircraft
                              runways, docks and harbours, railways, inland
                              waterways, pipelines, reservoirs, water mains,
                              wells, sewers, industrial plant and installations
                              for land drainage or coast protection.
                            </div>

                            <div className={customStyles.check}>
                              ✓ Eligible for Project Trust Account payment
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <Form.Check
                          type="checkbox"
                          label="Preparing plans or specifications"
                          checked={checkboxState.option51}
                          onChange={handleCheckboxChange}
                          name="radioGroup"
                          id="option51"
                        />
                        {checkboxState.option51 && (
                          <div>
                            {/* Content to be shown */}
                            <div className={customStyles.boxStyle}>
                              Description/examples of work:
                            </div>
                            <ul className="mt-2 ms-4">
                              <li>
                                The preparation of plans or specifications for
                                the performance of project trust work.
                              </li>
                            </ul>
                            <div className={customStyles.check}>
                              ✓ Eligible for Project Trust Account payment
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <Form.Check
                          type="checkbox"
                          label="Surveying"
                          checked={checkboxState.option52}
                          onChange={handleCheckboxChange}
                          name="radioGroup"
                          id="option52"
                        />
                        {checkboxState.option52 && (
                          <div>
                            {/* Content to be shown */}
                            <div className={customStyles.boxStyle}>
                              Description/examples of work:
                            </div>
                            <ul className="mt-2 ms-4">
                              <li>
                                Work associated with a building performed by a
                                surveyor under the&nbsp;
                                <span className={customStyles.radioText}>
                                  Surveyors Act 2003
                                </span>
                                &nbsp; in the surveyor’s professional practice.
                              </li>
                              <li>
                                Surveying or quantity surveying services
                                relating to protected work.
                              </li>
                            </ul>
                            <div className={customStyles.check}>
                              ✓ Eligible for Project Trust Account payment
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <Form.Check
                          type="checkbox"
                          label="Supply only of products"
                          checked={checkboxState.option53}
                          onChange={handleCheckboxChange}
                          name="radioGroup"
                          id="option53"
                        />
                        {checkboxState.option53 && (
                          <div>
                            {/* Content to be shown */}
                            <div className={customStyles.boxStyle}>
                              Description/examples of work:
                            </div>
                            <ul className="mt-2 ms-4">
                              <li>Supply only does NOT include:</li>
                              <ul>
                                <li>
                                  prefabricating complete buildings or
                                  components of a building or other works*
                                </li>
                                <li>
                                  installation of the product being supplied
                                </li>
                              </ul>
                              <li>
                                Examples — a supplier of a building/construction
                                product who is only involved in delivering the
                                product to the work site; a wholesaler/retailer
                                whose only role is the selling of a
                                building/construction product; a supplier of
                                scaffolding who does NOT install, manage,
                                maintain or remove the scaffolding.
                              </li>
                            </ul>

                            <div className={customStyles.checkText}>
                              *&apos;Other works&apos; include walls, roadworks,
                              powerlines, telecommunication apparatus, aircraft
                              runways, docks and harbours, railways, inland
                              waterways, pipelines, reservoirs, water mains,
                              wells, sewers, industrial plant and installations
                              for land drainage or coast protection.
                            </div>

                            <div className={customStyles.unCheck}>
                              ✗ Not eligible for Project Trust Account payment
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </Accordion.Body>
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
    </Accordion.Item>
  );
}
