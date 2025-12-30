"use client";
import { useTokenDetails } from "@/hooks";
import React, { useEffect, useState } from "react";
import {
  ActivateInactivateComplianceRules,
  FetchContractValueToCheckContractEligibilityInput,
  fetchListOfComplianceChecks,
  SetContractValueToCheckContractEligibility,
} from "./adminManageCompliances.functions";
import { formatDollars } from "@/utils";
import { showSuccessToast } from "@/components/Toaster";
import { AppRoutes } from "@/shared/constant/appRoutes";
import BreadCrumbs from "@/components/BreadCrumbs";
import TabSwitch from "@/components/TabSwitch";
import { trustAccountRadioOptions } from "@/modules/user/CompliancesOverview/complianceOverview.constants";
import FormikControl from "@/components/FormikControl";
import { InputType } from "@/shared/constant/general";
import { useLoaderContext } from "@/context/useLoader";
import { io, Socket } from "socket.io-client";

interface GridProps {
  check_name: string;
  check_active: boolean;
}

export default function AdminManageCompliances() {
  const { decodeTokenData } = useTokenDetails();

  const [contractValue, setContractValue] = useState({
    contractSum: "",
    modifiedContractSum: "",
  });

  const { setLoader }: any = useLoaderContext();

  const [isViewMode, setIsViewMode] = useState(true);

  const [gridList, setGridList] = useState([]);
  const [disableRadioButtons, setDisableRadioButtons] = useState(false);

  const [selectedToggle, setSelectedToggle] = useState<string>(
    "Project Trust Account"
  );

  useEffect(() => {
    getComplianceList();
    getContractSum();
  }, []);

  async function getComplianceList(selectedValue?: string) {
    try {
      setLoader(true);

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

      setLoader(false);
    } catch {
      setLoader(false);
    }
  }

  async function getContractSum() {
    try {
      setLoader(true);

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

      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  function handleToggledChange(value: any) {
    setSelectedToggle(value);
    getComplianceList(value);
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
      setLoader(true);

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
        showSuccessToast("Project Head Contract Sum has been Updated");
        setIsViewMode(true);
      }
      setLoader(false);
    } catch {
      setLoader(false);
    }
  }

  async function handleSwitch(
    clientId: any,
    rowObject: any,
    internalRowObject: any,
    isCheckSwitching?: boolean
  ) {
    const { check_number, check_active } = rowObject ?? {};

    const payload = {
      activateInactivateComplianceRulesPayload2: {
        bank_account_type: selectedToggle,
        is_active: isCheckSwitching
          ? !check_active
          : !internalRowObject?.is_active,
        check_number: check_number,
        rule_number: isCheckSwitching ? null : internalRowObject?.rule_number,
        clientId: clientId,
      },
    };

    try {
      setLoader(true);
      const response = await ActivateInactivateComplianceRules(payload);
    } catch {
      setLoader(false);
    }
  }

  async function establishSocketConnection(
    checkObj: any,
    internalObj: any,
    isCheck?: boolean
  ) {
    try {
      setDisableRadioButtons(true);
      await new Promise((resolve, reject) => {
        const socket: Socket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL}`, {
          transports: ["websocket"],
        });

        socket.on("connect", () => {
          handleSwitch(socket?.id, checkObj, internalObj, isCheck);
        });

        socket.on("error", (error) => {
          setDisableRadioButtons(false);
          reject(error);
          setLoader(false);
        });

        socket.on("compliance-updated", async (event: any) => {
          setDisableRadioButtons(false);
          await getComplianceList();
          showSuccessToast(event?.message);
          setLoader(false);
        });

        socket.on("force-disconnect", () => socket.disconnect());
      });
    } catch {}
  }

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.ADMIN_DASHBOARD,
              },
            ]}
            activeRoute={"Manage Compliances"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Manage compliances</h1>
          </div>
        </div>
      </div>
      <div className="grid pt_topfilters">
        <div className="pt_filters">
          <div role="group">
            <TabSwitch
              tabOptions={trustAccountRadioOptions}
              onChange={handleToggledChange}
            />
          </div>
        </div>
      </div>
      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_pageactions">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FormikControl
                control={InputType.TEXT_FIELD}
                label={"Project head contract sum"}
                name="ProjectHeadSum"
                id="ProjectHeadSum"
                required
                value={contractValue.modifiedContractSum}
                isInvalid={!contractValue.modifiedContractSum}
                onChange={handleContractSumChange}
                disabled={isViewMode}
              />
              <>
                <button
                  type="button"
                  data-tooltip="Edit"
                  data-placement="top"
                  onClick={() => setIsViewMode(false)}
                  style={{
                    width: "3rem",
                    height: "3rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0px 0px 0px 13px",
                    backgroundColor: "#104f93",
                    border: "1px solid #1583d8",
                    textDecoration: "none",
                  }}
                >
                  <i
                    className="fa-light fa-edit"
                    style={{ fontSize: "20px" }}
                  ></i>
                </button>
              </>
              <>
                <button
                  type="button"
                  data-tooltip="Save"
                  data-placement="top"
                  onClick={() => updateContractValue()}
                  style={{
                    width: "3rem",
                    height: "3rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0px 0px 0px 13px",
                    backgroundColor: "#4c9b8a",
                    border: "1px solid rgb(27, 158, 130)",
                    textDecoration: "none",
                  }}
                >
                  <i
                    className={`fa-light fa-save ${
                      isViewMode || !contractValue.contractSum ? "" : "c-p"
                    }`}
                    style={{ fontSize: "20px" }}
                  ></i>
                </button>
              </>
            </div>
          </div>
        </div>
      </div>

      <div className="tablesorter-default">
        <table className="dataTable compact stripe nowrap hover order-column">
          <thead>
            <tr>
              <th>compliance type</th>
              <th>status</th>
            </tr>
          </thead>
        </table>
      </div>
      <div className="grid">
        <div className="pt_box pt_compliance">
          {gridList?.length > 0 &&
            gridList?.map((checkObj: any, overAllDataIndex: number) => (
              <React.Fragment key={overAllDataIndex}>
                <div>
                  <details>
                    {
                      <summary
                        style={{ position: "relative" }}
                        key={overAllDataIndex}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            minWidth: "68%",
                          }}
                        >
                          {checkObj?.check_name}
                        </span>

                        <input
                          name="opt-in"
                          type="checkbox"
                          role="switch"
                          checked={checkObj.check_active}
                          className={
                            disableRadioButtons && checkObj.check_active
                              ? "disableActiveComplianceRadio"
                              : disableRadioButtons && !checkObj.check_active
                              ? "disableInactiveComplianceRadio"
                              : ""
                          }
                          disabled={disableRadioButtons}
                          onChange={() =>
                            establishSocketConnection(checkObj, {}, true)
                          }
                        />
                      </summary>
                    }

                    {checkObj?.rules.map?.((internalObj: any, index: any) => (
                      <div key={index}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            dangerouslySetInnerHTML={{
                              __html: internalObj?.content,
                            }}
                          />
                          <input
                            name="opt-in"
                            type="checkbox"
                            role="switch"
                            checked={internalObj.is_active}
                            className={
                              disableRadioButtons && internalObj.is_active
                                ? "disableActiveComplianceRadio"
                                : disableRadioButtons && !internalObj.is_active
                                ? "disableInactiveComplianceRadio"
                                : ""
                            }
                            disabled={disableRadioButtons}
                            onChange={() =>
                              establishSocketConnection(checkObj, internalObj)
                            }
                            style={{ minWidth: "38px" }}
                          />
                        </div>
                        <div>
                          {internalObj?.display_message && (
                            <div style={{ display: "flex" }}>
                              <p>
                                <b>Status:</b>
                              </p>
                              &nbsp;
                              <b>
                                <span
                                  style={{
                                    color: internalObj?.display_message_colour,
                                  }}
                                  dangerouslySetInnerHTML={{
                                    __html: internalObj?.display_message,
                                  }}
                                />
                              </b>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </details>
                  {overAllDataIndex < gridList?.length - 1 && <hr />}
                </div>
              </React.Fragment>
            ))}
        </div>
      </div>
    </div>
  );
}
