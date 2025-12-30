// pages/_app.js
import { setComplianceOverviewData } from "@/redux/slices/complianceOverviewDetails";
import { useAppDispatch } from "@/redux/store";
import _ from "lodash";
import { useEffect } from "react";

interface CheckReloadProps {
  persistData: any;
  afterReload: (data: any) => void;
}

function CheckReload({ persistData, afterReload }: Readonly<CheckReloadProps>) {
  const dispatch: any = useAppDispatch();
  useEffect(() => {
    if (persistData || persistData?.length > 0) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }
  }, [persistData]);

  useEffect(() => {
    onInitialization();

    // Add the event listener

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);

      dispatch(setComplianceOverviewData(null));
    };
  }, []); // Empty dependency array ensures this runs only once

  function onInitialization() {
    const storedData: any = localStorage.getItem("persist-data") ?? "";

    let isParse = "";
    // if (storedData) {
    //   isParse =
    //     !_.isEmpty(storedData) || storedData?.length > 0
    //       ? JSON.parse(storedData)
    //       : storedData;
    // }

    if (isParse) {
      afterReload(isParse);

      localStorage.removeItem("persist-data");
    }
  }

  function onReload() {
    const isStringify =
      !_.isEmpty(persistData) || persistData?.length > 0
        ? JSON.stringify(persistData)
        : persistData;

    if (isStringify) localStorage.setItem("persist-data", isStringify);
  }

  const handleBeforeUnload = (event: any) => {
    event.preventDefault();
    // Modern browsers require a returnValue to be set.

    // onReload();
    event.returnValue = "Confirm refresh";

    return "Confirm refresh";
  };

  return <></>;
}

export default CheckReload;
