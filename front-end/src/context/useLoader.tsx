//default imports
"use client";

import PageLoader from "@/components/PageLoader/PageLoader";

import {
  Fragment,
  createContext,
  useState,
  useContext,
  useEffect,
} from "react";
import { v4 as uuidv4 } from "uuid";
//import from reactstrap components
//import from customized components
//import customized styles
//import from external libraries
//import from constants, interfaces ,functions and services
//module level constants and interfaces
const LoaderContext: any = createContext(null);

export const LoaderProvider = ({ children }: any) => {
  //useState and useEffect Management
  const [loader, setLoader] = useState<boolean>(false);
  const [loaderInfo, setLoaderInfo] = useState<string>("");

  //other Hooks

  // Manage tabId state
  const [tabId, setTabId] = useState<string | null>(null);

  //Formik Handling

  // Generate a unique tabId on initial load
  useEffect(() => {
    if (!tabId) {
      setTabId(uuidv4());
    }
  }, [tabId]);
  //functions

  //render Template
  return (
    <Fragment>
      {/* set default loader state to false as per requirement*/}
      {loader && <PageLoader onLoadingInfo={loaderInfo} />}
      <LoaderContext.Provider
        value={{ loader, setLoader, tabId, setLoaderInfo }}
      >
        {children}
      </LoaderContext.Provider>
    </Fragment>
  );
};

// Create a custom hook for using the global context
const useLoaderContext = () => {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
};

export { useLoaderContext };
