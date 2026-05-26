import { bankOverviewTabs } from "@/modules/user/BankAccountOverview/BankAccountOverview.constants";
import {
  actionButtonType,
  getButtonType,
} from "@/modules/user/CompliancesOverview/complianceOverview.constants";
import { silenceComplianceMail } from "@/modules/user/CompliancesOverview/complianceOverview.functions";
import { setComplianceOverviewData } from "@/redux/slices/complianceOverviewDetails";
import { useAppDispatch } from "@/redux/store";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { getCookie } from "cookies-next";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

interface DetailsItemProps {
  typeOfTrustAccount?: any;
  onMuteClick?: (index: number) => void; // New prop
  data?: any;
  isAdmin?: boolean;
  mainIndex?: number;
  PayloadProjectId: number | null;
  onRefresh: VoidFunction;
}

const DetailsItem: React.FC<DetailsItemProps> = ({
  typeOfTrustAccount,
  data,
  isAdmin,
  PayloadProjectId,
  onRefresh,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();

  async function handleMuteClick(
    rowObject: any,
    rowIndex: number,
    muteOverallCheck?: boolean
  ) {
    const { check_number, rule_number, notify } = rowObject ?? {};

    const isMuted = !data?.[rowIndex]?.mails;
    setIsMuted((prevState) => !prevState); // Toggle the muted state

    const payload = {
      bank_account_type: typeOfTrustAccount,
      check_number: check_number,
      mails: isMuted, // Toggle mails based on current state
      project_id: PayloadProjectId, // Replace with actual project ID from your data
      rule_number: muteOverallCheck ? null : rule_number,
      notify: !notify,
    };

    try {
      const response = await silenceComplianceMail(payload);
      if (response) {
        onRefresh();
      }
    } catch {}
  }

  const dynamicRoute = (data: any) => {
    const { action_button_type, reference_id } = data;
    const companyId = getCookie("companyId");

    switch (action_button_type) {
      case actionButtonType.ADD_BANK_ACCOUNT:
        router.push(
          `${AppRoutes.USER_ADD_BANK_ACCOUNTS}?complianceTab=${typeOfTrustAccount}&projectId=${PayloadProjectId}&routedFrom=compliance`
        );
        break;
      case actionButtonType.EDIT_BANK_ACCOUNT:
        router.push(
          `${AppRoutes.USER_EDIT_BANK_ACCOUNTS}/${companyId}/${reference_id}?complianceTab=${typeOfTrustAccount}&projectId=${PayloadProjectId}&routedFrom=compliance`
        );
        break;
      case actionButtonType.ADD_CONTRACT:
        router.push(
          `${AppRoutes.USER_ADD_CONTRACTS}?complianceTab=${typeOfTrustAccount}&projectId=${PayloadProjectId}`
        );
        break;
      case actionButtonType.EDIT_CONTRACT:
        router.push(
          `${AppRoutes.USER_CONTRACTS_OVERVIEW}/${reference_id}?complianceTab=${typeOfTrustAccount}&projectId=${PayloadProjectId}&routedFrom=compliance`
        );
        break;
      case actionButtonType.MATCH_TRANSACTIONS: {
        const extractedId = reference_id?.split(",");
        if (extractedId?.length > 1) {
          router.push(
            `${AppRoutes.USER_BANK_ACCOUNTS_OVERVIEW}/${extractedId[0]}/${extractedId[1]}?complianceProjectId=${PayloadProjectId}`
          );
        }
        break;
      }
      case actionButtonType.SEND_NOTICE:
        router.push(
          `${AppRoutes.USER_NOTICES_VIEW}/${reference_id}?complianceTab=${typeOfTrustAccount}&projectId=${PayloadProjectId}`
        );
        break;
      case actionButtonType.RECONCILIATION:
        router.push(
          `${AppRoutes.USER_TRUST_ACCOUNTING_RECONCIALIATION_RECORD}`
        );
        break;
      case actionButtonType.REVIEW_AUDIT:
        router.push(
          `${AppRoutes.USER_TRUST_ACCOUNTING_AUDIT}?complianceTab=${typeOfTrustAccount}&projectId=${PayloadProjectId}&routedFrom=compliance`
        );
        break;
      case actionButtonType.VIEW_UNMATCHED_PAYMENTS:
        router.push(
          `${AppRoutes.USER_BANK_ACCOUNTS_OVERVIEW}/${reference_id}/${companyId}`
        );
        break;
      case actionButtonType.SEND_SCHEDULE: {
        // Task #276: fall back to the filtered Notices list when the
        // cached reference_id is missing / "null" so we never route to
        // /user/notices/view/null.
        const hasUsableId =
          reference_id != null &&
          String(reference_id).trim() !== "" &&
          String(reference_id).trim().toLowerCase() !== "null";
        if (hasUsableId) {
          router.push(
            `${AppRoutes.USER_NOTICES_VIEW}/${reference_id}?complianceTab=${typeOfTrustAccount}&projectId=${PayloadProjectId}`
          );
        } else {
          router.push(
            `${AppRoutes.USER_NOTICES}?projectId=${PayloadProjectId}&status=${encodeURIComponent(
              "Not Sent"
            )}&complianceTab=${typeOfTrustAccount}`
          );
        }
        break;
      }
      case actionButtonType.UPDATE_TRANSACTION_LIST:
        router.push(
          `/user/bank-accounts/overview/${reference_id}/${companyId}`
        );
        break;
      case actionButtonType.TOPUP_ACCOUNT:
        router.push(
          `/user/bank-accounts/overview/${reference_id}/${companyId}`
        );
        break;
      case actionButtonType.SEND_REMITTANCE: {
        // Task #276: fall back to the filtered Notices list when the
        // cached reference_id is missing / "null" so we never route to
        // /user/notices/view/null.
        const hasUsableId =
          reference_id != null &&
          String(reference_id).trim() !== "" &&
          String(reference_id).trim().toLowerCase() !== "null";
        if (hasUsableId) {
          router.push(
            `${AppRoutes.USER_NOTICES_VIEW}/${reference_id}?complianceTab=${typeOfTrustAccount}&projectId=${PayloadProjectId}`
          );
        } else {
          router.push(
            `${AppRoutes.USER_NOTICES}?projectId=${PayloadProjectId}&status=${encodeURIComponent(
              "Not Sent"
            )}&complianceTab=${typeOfTrustAccount}`
          );
        }
        break;
      }

      case actionButtonType.WITHDRAW_BALANCE:
        router.push(
          `/user/bank-accounts/overview/${reference_id}/${companyId}?active_tab=${bankOverviewTabs.INTEREST_AND_CHARGES}`
        );
        break;
      case actionButtonType.UPDATE_AND_MATCH:
        router.push(
          `/user/bank-accounts/overview/${reference_id}/${companyId}`
        );
        break;
      case actionButtonType.PAY_NOW:
        router.push(`${AppRoutes.USER_RETENTION_LIST}`);
        break;
      case actionButtonType.EDIT_PROJECT:
        router.push(`${AppRoutes.USER_PROJECTS_OVERVIEW}/${reference_id}`);
        break;
      case actionButtonType.DELEGATE_NOW:
        router.push(
          `${AppRoutes.USER_EDIT_BANK_ACCOUNTS}/${companyId}/${reference_id}?complianceTab=${typeOfTrustAccount}&projectId=${PayloadProjectId}&routedFrom=compliance`
        );
        break;
      case actionButtonType.UPLOAD_CERTIFICATE:
        router.push(
          `${AppRoutes.USER_EDIT_BANK_ACCOUNTS}/${companyId}/${reference_id}?complianceTab=${typeOfTrustAccount}&projectId=${PayloadProjectId}&routedFrom=compliance`
        );
        break;
      case actionButtonType.VIEW_PAYMENTS:
        router.push(`${AppRoutes.USER_PAYMENTS_TO_DO}`);
        break;
      default:
        break;
    }
  };

  const dynamicDataDispatch = (data: any) => {
    const { action_button_type, reference_id } = data;

    switch (action_button_type) {
      case actionButtonType.ADD_BANK_ACCOUNT:
        dispatch(
          setComplianceOverviewData({
            referenceId: reference_id,
            addBankAccount: true,
            typeOfTrustAccount: typeOfTrustAccount,
            projectId: PayloadProjectId,
          })
        );
        break;
      case actionButtonType.EDIT_BANK_ACCOUNT:
        dispatch(
          setComplianceOverviewData({
            referenceId: reference_id,
            editBankAccount: true,
            typeOfTrustAccount: typeOfTrustAccount,
            projectId: PayloadProjectId,
          })
        );
        break;
      case actionButtonType.ADD_CONTRACT:
        dispatch(
          setComplianceOverviewData({
            referenceId: reference_id,
            addContract: true,
            typeOfTrustAccount: typeOfTrustAccount,
            projectId: PayloadProjectId,
          })
        );
        break;
      case actionButtonType.EDIT_CONTRACT:
        dispatch(
          setComplianceOverviewData({
            referenceId: reference_id,
            editContract: true,
            typeOfTrustAccount: typeOfTrustAccount,
            projectId: PayloadProjectId,
          })
        );
        break;
      case actionButtonType.MATCH_TRANSACTIONS:
        dispatch(
          setComplianceOverviewData({
            referenceId: reference_id,
            matchTransactionFromCompliance: true,
            typeOfTrustAccount: typeOfTrustAccount,
            projectId: PayloadProjectId,
          })
        );
        break;

      default:
        break;
    }
  };

  const handleActionTrigger = (data: any) => {
    dynamicDataDispatch(data);
    dynamicRoute(data);
  };

  return (
    data?.length > 0 &&
    data?.map((item: any, overAllDataIndex: number) =>
      item?.results?.length > 0 ? (
        <React.Fragment key={overAllDataIndex}>
          {item?.results?.length > 0 ? (
            <div>
              <details>
                {item.results.map?.(
                  (obj: any, overallRowIndex: any) =>
                    overallRowIndex === 0 && (
                      <summary
                        style={{ position: "relative" }}
                        key={overallRowIndex}
                      >
                        <span
                          className={`numbericon ${item?.check_colour_code}`}
                          style={{
                            border: `4px solid ${item?.check_colour_code}`,
                          }}
                        >
                          {item?.display_check_number || item?.check_number}
                        </span>
                        {obj?.check_name}
                        {typeOfTrustAccount !== "Retention Trust Account"
                          ? "(Head Contractors And Related Entity Subcontractors Only)"
                          : ""}

                        <i
                          className={
                            item?.mails
                              ? "fa-light fa-bell mute-icon" // Normal state
                              : "fa-light fa-bell-slash mute-icon" // Muted state
                          }
                          onClick={(e) => {
                            e.preventDefault();
                            handleMuteClick(obj, overAllDataIndex, true);
                          }}
                          style={{
                            position: "absolute",
                            right: "25px",
                            top: "0px",
                            color: item?.mails ? "#4C9B8A" : "#E23B30",
                          }}
                        />
                      </summary>
                    )
                )}

                {item?.results.map?.((obj: any, index: any) => (
                  <div
                    key={index}
                    style={{
                      padding: "16px 0",
                      borderBottom:
                        index < item.results.length - 1
                          ? "1px solid #e0e0e0"
                          : "none",
                      marginBottom:
                        index < item.results.length - 1 ? "8px" : "0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        dangerouslySetInnerHTML={{
                          __html: obj?.content,
                        }}
                      />
                      {isAdmin && (
                        <i
                          className={
                            obj?.notify
                              ? "fa-light fa-bell mute-icon"
                              : "fa-light fa-bell-slash mute-icon"
                          }
                          onClick={(e) => {
                            e.preventDefault();
                            handleMuteClick(obj, overAllDataIndex);
                          }}
                          style={{
                            color: obj?.notify ? "#4C9B8A" : "#E23B30",
                            minWidth: "40px",
                          }}
                        />
                      )}
                    </div>
                    <div>
                      {obj?.display_message && (
                        <div style={{ display: "flex" }}>
                          <p>
                            <b>Status:</b>
                          </p>
                          &nbsp;
                          <b>
                            <span
                              style={{
                                color: obj?.display_message_colour,
                              }}
                              dangerouslySetInnerHTML={{
                                __html: obj?.display_message,
                              }}
                            />
                          </b>
                        </div>
                      )}
                      {!isAdmin && (
                        <div
                          style={{
                            marginTop: "10px",
                            marginBottom: "10px",
                          }}
                        >
                          {obj?.action_button_type &&
                            obj?.action_button_type !==
                              actionButtonType.NONE && (
                              <div className="pt_addnewbutton">
                                <button
                                  className="secondary mt-2"
                                  onClick={() => handleActionTrigger(obj)}
                                >
                                  {" "}
                                  {getButtonType(obj?.action_button_type)}
                                </button>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </details>
              {overAllDataIndex < data?.length - 1 && <hr />}
            </div>
          ) : (
            <></>
          )}
        </React.Fragment>
      ) : (
        <></>
      )
    )
  );
};

interface ProjectTrustHOCProps {
  details: Omit<DetailsItemProps, "index">[];
  typeOfTrustAccount: any; // Exclude index from the details array
  isAdmin: boolean;
  PayloadProjectId: number | null;
  onRefresh: VoidFunction;
}

const ProjectTrustHOC: React.FC<ProjectTrustHOCProps> = ({
  details,
  typeOfTrustAccount,
  PayloadProjectId,
  onRefresh,
  isAdmin,
}) => {
  return (
    <div className="grid">
      <div className="pt_box pt_compliance">
        <DetailsItem
          data={details}
          isAdmin={isAdmin}
          onRefresh={onRefresh}
          typeOfTrustAccount={typeOfTrustAccount}
          PayloadProjectId={PayloadProjectId}
        />
      </div>
    </div>
  );
};

export default ProjectTrustHOC;
