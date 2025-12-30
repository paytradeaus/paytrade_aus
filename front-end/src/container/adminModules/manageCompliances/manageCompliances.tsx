"use client";
import React, { useEffect, useState } from "react";
import customStyles from "./manageCompliances.module.scss";
import { ApplicationURLS } from "@/common/applicationURLS";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import {
  FetchContractValueToCheckContractEligibilityInput,
  fetchListOfComplianceChecks,
  postModifiedCompliancesList,
  SetContractValueToCheckContractEligibility,
} from "./manageCompliances.function";
import RadioSwitchToggle from "@/components/RadioSwitch/RadioSwitch";
import { trustAccountRadioOptions } from "@/container/userModules/compliance/complianceConstantData";
import { Form } from "react-bootstrap";
import { typeOfCompliances } from "./manageCompliances.constant";
import TextField from "@/components/TextField/textField";
import { FaEdit } from "react-icons/fa";
import { IoIosSave } from "react-icons/io";
import { formatDollars } from "@/common/commonFunctions";
import { toast } from "react-toastify";
import { useTokenDetails } from "@/common/commonHooks";

interface GridProps {
  check_name: string;
  is_active: boolean;
}

function columns(switchFn: any) {
  return [
    {
      name: "Compliance Type",

      grow: 1,
      wrap: true,
      selector: (row: GridProps) => row?.check_name || "",
    },
    {
      name: "Status",

      selector: (row: GridProps) => (
        <Form.Check
          type="switch"
          id="custom-switch"
          checked={row?.is_active}
          onChange={() => switchFn(row)}
        />
      ),
    },
  ];
}

export default function ManageCompliances() {
  const { decodeTokenData } = useTokenDetails();
  console.log("🚀 ~ ManageCompliances ~ accessTokenId:", decodeTokenData);
  const routePath = usePathname();
  const [contractValue, setContractValue] = useState({
    contractSum: "",
    modifiedContractSum: "",
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [isViewMode, setIsViewMode] = useState(true);

  const [gridList, setGridList] = useState([]);

  const [selectedToggle, setSelectedToggle] = useState<string>(
    "Project Trust Account"
  );

  const [postData, setPostData] = useState<any[]>([]);

  useEffect(() => {
    getComplianceList();
    getContractSum();
  }, []);

  useEffect(() => {
    if (postData?.length > 0) {
      handleSave();
    }
  }, [postData]);

  async function getComplianceList(selectedValue?: string) {
    try {
      setLoading(true);

      const postData = {
        payload: {
          bank_account_type: selectedValue ?? selectedToggle,
        },
      };

      const response: any = await fetchListOfComplianceChecks(postData);

      if (response?.length > 0) {
        setGridList(response);
      } else {
        setGridList([]);
      }

      setLoading(false);
    } catch (err: any) {
      setLoading(false);
    }
  }

  async function getContractSum() {
    try {
      setLoading(true);

      const postData = {
        payload: {
          admin_id: decodeTokenData?.userId || null,
        },
      };
      const response: any =
        await FetchContractValueToCheckContractEligibilityInput(postData);

      if (response) {
        handleContractSumChange(response?.contract_value);
      }

      setLoading(false);
    } catch (err: any) {
      setLoading(false);
    }
  }

  function handleToggledChange(value: any) {
    setSelectedToggle(value);
    getComplianceList(value);
  }

  async function handleSave() {
    try {
      // setLoading(true);

      const postData = {
        payload: handlePayload(),
      };

      const response = await postModifiedCompliancesList(postData);
      if (response) {
        getComplianceList();
      }
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
    }
  }

  function checkIfExist(complianceType: string) {
    return postData.some(
      (x: GridProps) => x?.check_name === complianceType && x?.is_active
    );
  }

  function handlePayload() {
    if (selectedToggle === "Project Trust Account") {
      return {
        projectTrustAccount: {
          checkContractEligibility: checkIfExist(
            typeOfCompliances.pta.CHECK_CONTRACT_ELIGIBILITY
          ),
          openProjectTrustAccount: checkIfExist(
            typeOfCompliances.pta.OPEN_PROJECT_TRUST_ACCOUNT
          ),
          notifyPartiesOfTheTrustAccount: checkIfExist(
            typeOfCompliances.pta.NOTIFY_PARTIES_OF_THE_TRUST_ACCOUNT
          ),
          administrationOfTheAccount: checkIfExist(
            typeOfCompliances.pta.ADMINISTRATION_OF_THE_ACCOUNT
          ),
          paymentsFromThePrincipal: checkIfExist(
            typeOfCompliances.pta.PAYMENTS_FROM_THE_PRINCIPAL
          ),
          paymentsToSubcontractors: checkIfExist(
            typeOfCompliances.pta.PAYMENTS_TO_SUBCONTRACTORS
          ),
          paymentsToYourselfAsTrustee: checkIfExist(
            typeOfCompliances.pta.PAYMENTS_TO_YOURSELF_AS_TRUSTEE
          ),
          monthlyReconciliationsAndRecordkeeping: checkIfExist(
            typeOfCompliances.pta.MONTHLY_RECONCILIATIONS_AND_RECORD_KEEPING
          ),
          annualAccountReviewReports: checkIfExist(
            typeOfCompliances.pta.ANNUAL_ACCOUNT_REVIEW_REPORTS
          ),
          closeTheAccount: checkIfExist(
            typeOfCompliances.pta.CLOSE_THE_ACCOUNT
          ),
        },
      };
    } else if (selectedToggle === "Retention Trust Account") {
      return {
        retentionTrustAccount: {
          checkContractEligibility: checkIfExist(
            typeOfCompliances.rta.CHECK_CONTRACT_ELIGIBILITY
          ),
          openRetentionTrustAccount: checkIfExist(
            typeOfCompliances.rta.OPEN_RETENTION_TRUST_ACCOUNT
          ),
          notifyPartiesOfTheTrustAccount: checkIfExist(
            typeOfCompliances.rta.NOTIFY_PARTIES_OF_THE_TRUST_ACCOUNT
          ),
          administrationOfTheAccount: checkIfExist(
            typeOfCompliances.rta.ADMINISTRATION_OF_THE_ACCOUNT
          ),
          withholdingRetentionAmountsFromPayment: checkIfExist(
            typeOfCompliances.rta.WITHHOLDING_RETENTION_AMOUNTS_FROM_PAYMENT
          ),
          releasingRetentionAmountsToContractedParties: checkIfExist(
            typeOfCompliances.rta
              .RELEASING_RETENTION_AMOUNTS_TO_CONTRACTED_PARTIES
          ),
          releasingRetentionAmountsToSomeoneElseFromTheAccount: checkIfExist(
            typeOfCompliances.rta
              .RELEASING_RETENTION_AMOUNTS_TO_SOMEONE_ELSE_FROM_THE_ACCOUNT
          ),
          releasingRetentionAmountsToYourselfAsTrustee: checkIfExist(
            typeOfCompliances.rta
              .RELEASING_RETENTION_AMOUNTS_TO_YOURSELF_AS_TRUSTEE
          ),
          monthlyReconciliationsAndRecordkeeping: checkIfExist(
            typeOfCompliances.rta.MONTHLY_RECONCILIATIONS_AND_RECORD_KEEPING
          ),
          annualAccountReviewReports: checkIfExist(
            typeOfCompliances.rta.ANNUAL_ACCOUNT_REVIEW_REPORTS
          ),
          closeTheAccount: checkIfExist(
            typeOfCompliances.rta.CLOSE_THE_ACCOUNT
          ),
        },
      };
    }
  }

  async function handleOnSwitch(rowData: GridProps) {
    const modifiedChanges: any = gridList.map((x: GridProps) => {
      if (x?.check_name === rowData?.check_name) {
        return { ...x, is_active: !x?.is_active };
      } else {
        return x;
      }
    });

    setGridList(modifiedChanges);
    setPostData(modifiedChanges);
  }

  function handleContractSumChange(e: any) {
    let value = e.target?.value || e.toString();

    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    if (rawValue === "") {
      setContractValue({ modifiedContractSum: "", contractSum: "" });
      return;
    }

    // Handle leading zeros (ignore for decimal values like "0."1"")
    if (
      rawValue.startsWith("0") &&
      rawValue.length > 1 &&
      rawValue[1] !== "."
    ) {
      rawValue = rawValue.slice(1); // Prevent leading zeros
    }

    const decimalParts = rawValue.split(".");

    if (decimalParts.length > 2) {
      return; // Prevent multiple decimal points
    }

    let [integerPart, decimalPart] = decimalParts;

    // Only limit the integer part to 11 digits
    if (integerPart.length > 11) {
      return;
    }

    if (decimalPart) {
      decimalPart = decimalPart.slice(0, 2); // Limit decimal places to two digits
    }

    let finalValue =
      decimalPart !== undefined ? `${integerPart}.${decimalPart}` : integerPart;

    if (finalValue.replace(".", "").length > 13) {
      return; // Prevent more than 13 characters total (ignoring the decimal)
    }

    const formattedValue = formatDollars(finalValue); // Assuming formatDollars is a function you have

    setContractValue({
      modifiedContractSum: formattedValue,
      contractSum: finalValue,
    });
  }

  async function updateContractValue() {
    if (!contractValue.modifiedContractSum || isViewMode) {
      return;
    }
    try {
      setLoading(true);

      const postData = {
        payload: {
          admin_id: decodeTokenData?.userId || null,
          contract_value: +contractValue?.contractSum,
        },
      };

      const response = await SetContractValueToCheckContractEligibility(
        postData
      );
      if (response) {
        getContractSum();
        toast.success("Project Head Contract Sum has been Updated");
        setIsViewMode(true);
      }
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
    }
  }

  return (
    <div className={`${customStyles.container} ${"switch-toggle"}`}>
      <ReusableBreadcrumb
        items={[
          {
            href: ApplicationURLS.USER_DASHBOARD,
            label: "Home",
            active: routePath === ApplicationURLS.USER_DASHBOARD,
          },
          {
            href: ApplicationURLS.ADMIN_MANAGE_COMPLIANCE,
            label: "Compliances",
            active: true,
          },

          {
            href: "",
            label: "Manage Compliances",
            active: true,
          },
        ]}
        separator={
          <span className={customStyles.breadcrumbSeparator}>&gt;</span>
        }
      />
      <div className={customStyles.headerContent}>
        <span className={customStyles.headerText}>Manage Compliances</span>
      </div>
      <div className="d-flex justify-content-between">
        <div className={customStyles.radioToggle}>
          <RadioSwitchToggle
            radioOptions={trustAccountRadioOptions}
            selected={selectedToggle}
            handleToggleChange={handleToggledChange}
          />
        </div>
        <div className="d-flex align-items-center">
          <span className={customStyles.projectSumLabel}>
            Project Head Contract Sum*
          </span>
          <div className={customStyles.textFieldStyles}>
            <TextField
              placeholder="Enter contract value"
              type="text"
              value={contractValue.modifiedContractSum}
              isInvalid={!contractValue.modifiedContractSum}
              onChange={handleContractSumChange}
              disabled={isViewMode}
            />
          </div>
          <FaEdit
            className="mx-2 c-p"
            size={18}
            title="Edit"
            onClick={() => setIsViewMode(false)}
          />
          <IoIosSave
            size={18}
            className={isViewMode || !contractValue.contractSum ? "" : "c-p"}
            title="Save"
            onClick={() => updateContractValue()}
          />
        </div>
      </div>
      <ReusableDataTable
        columns={columns(handleOnSwitch)}
        data={gridList?.length > 0 ? gridList : []}
        subHeader
        progressPending={loading}
      />
    </div>
  );
}
