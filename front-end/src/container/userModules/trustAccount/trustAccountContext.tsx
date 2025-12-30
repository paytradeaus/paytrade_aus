//default imports
"use client";
import { createContext, useState, useContext } from "react";
//import from reactstrap components
//import from customized components
//import customized styles
//import from external libraries
import { useFormik } from "formik";
import * as Yup from "yup";
//import from constants, interfaces ,functions and services
//module level constants and interfaces

const TrustAccountContext: any = createContext(null);

export const TrustAccountProvider = ({ children }: any) => {
  //useState and useEffect Management
  const [selectedAccountType, setSelectedAccountType] = useState("");
  const [displayTrustAccordion, setDisplayTrustAccordion] = useState<any>(true);
  const [displayProjectAccordion, setDisplayProjectAccordion] = useState(false);

  const [displayAccSwitchConfirmation, setDisplayAccSwitchConfirmation] =
    useState(false);

  //other Hooks

  //Formik Handling

  //Formik Handling
  const trustValidationSchema = Yup.object().shape({
    subContractorOrSupplier: Yup.boolean(),
    contractResidentialConstruction: Yup.boolean(),
    contractMaintenance: Yup.boolean(),
    professionalOrAdministration: Yup.boolean(),
    lessThan90Days: Yup.boolean(),
    contractBetween: Yup.boolean(),

    contractPrice: Yup.object(),
    subContractor: Yup.object(),
    contractDate: Yup.object(),
    contractingParty: Yup.object(),
    contractValue: Yup.object(),

    cashRetentions: Yup.object(),
    headContract: Yup.object(),
    whoAreYou: Yup.object(),
  });

  const trustFormik: any = useFormik({
    initialValues: {
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
    },

    validationSchema: trustValidationSchema,
    onSubmit: () => {
      // Handle form submission
    },
  });

  const projectValidationSchema = Yup.object().shape({
    liableToPay: Yup.string(),
    carryingWork: Yup.string(),
    workToBeCarried: Yup.string(),
    workBeingCarried: Yup.string(),
  });

  const projectFormik: any = useFormik({
    initialValues: {
      liableToPay: "",
      carryingWork: "",
      workToBeCarried: "",
      workBeingCarried: "",
    },

    validationSchema: projectValidationSchema,
    onSubmit: () => {
      // Handle form submission
    },
  });

  //functions

  //render Template
  return (
    <TrustAccountContext.Provider
      value={{
        selectedAccountType,
        setSelectedAccountType,
        displayProjectAccordion,
        setDisplayProjectAccordion,
        displayTrustAccordion,
        setDisplayTrustAccordion,
        trustFormik,
        displayAccSwitchConfirmation,
        setDisplayAccSwitchConfirmation,
        projectFormik,
      }}
    >
      {children}
    </TrustAccountContext.Provider>
  );
};

// Create a custom hook for using the global context
const useTrustAccountContext = () => {
  const context = useContext(TrustAccountContext);
  if (!context) {
    throw new Error("Error in Trust Account Context");
  }
  return context;
};

export { useTrustAccountContext };
