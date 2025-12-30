import React, { Fragment, useState } from "react";
import { Timeline, TimelineEvent } from "react-event-timeline";
import styles from "./timeline.module.scss";
import { Button } from "react-bootstrap";
import { ApplicationURLS } from "@/common/applicationURLS";
import { actionButtonType } from "@/container/userModules/compliance/complianceConstantData";
import { setComplianceOverviewData } from "@/redux/slices/complianceOverviewDetails";
import { useAppDispatch } from "@/redux/store";
import { getCookie } from "cookies-next";
import { useRouter } from "next/navigation";
import customStyles from "./timeline.module.scss";
import { PlusCircleDotted, DashCircleDotted } from "react-bootstrap-icons";

interface TimelineProps {
  overallData: any;
  projectId: string;
  typeOfTrustAccount: string;
  isAdmin: boolean;
}

const TimelineComponent: React.FC<TimelineProps> = ({
  overallData,
  typeOfTrustAccount,
  projectId,
  isAdmin,
}) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [openIndex, setOpenIndex] = useState<number | null>(0); // Allow `null` for the state type

  const getButtonType = (buttonType: string) => {
    switch (buttonType) {
      case actionButtonType.ADD_BANK_ACCOUNT:
        return "Add Bank Account";
      case actionButtonType.ADD_CONTRACT:
        return "Add Contract";
      case actionButtonType.EDIT_BANK_ACCOUNT:
        return "Edit Bank Account";
      case actionButtonType.EDIT_PROJECT:
        return "Edit Project";
      case actionButtonType.MATCH_TRANSACTIONS:
        return "Match Transactions";
      case actionButtonType.SEND_NOTICE:
        return "Send Notices";
      case actionButtonType.RECONCILIATION:
        return "Reconciliation";
      case actionButtonType.REVIEW_AUDIT:
        return "Review Audit";
      case actionButtonType.VIEW_UNMATCHED_PAYMENTS:
        return "View Unmatched Payments";
      case actionButtonType.SEND_SCHEDULE:
        return "Send Schedule";
      case actionButtonType.UPDATE_TRANSACTION_LIST:
        return "Update Transaction List";
      case actionButtonType.TOPUP_ACCOUNT:
        return "Top Up Account";
      case actionButtonType.SEND_REMITTANCE:
        return "Send Remittance";

      case actionButtonType.WITHDRAW_BALANCE:
        return "Withdraw Balance";
      case actionButtonType.UPDATE_AND_MATCH:
        return "Update and Match";
      case actionButtonType.PAY_NOW:
        return "Pay Now";
      case actionButtonType.DELEGATE_NOW:
        return "Delegate Now";
      case actionButtonType.UPLOAD_CERTIFICATE:
        return "Upload Certificate";

      case actionButtonType.NONE:
        return "";
      default:
        return "";
    }
  };

  const dynamicRoute = (data: any) => {
    const { action_button_type, reference_id } = data;
    const companyId = getCookie("companyId");

    switch (action_button_type) {
      case actionButtonType.ADD_BANK_ACCOUNT:
        router.push(
          `${ApplicationURLS.USER_BANK_ACCOUNTS_ADD}?complianceTab=${typeOfTrustAccount}&projectId=${projectId}`
        );
        break;
      case actionButtonType.EDIT_BANK_ACCOUNT:
        router.push(
          `${ApplicationURLS.USER_BANK_ACCOUNTS_EDIT}/${companyId}/${reference_id}?complianceTab=${typeOfTrustAccount}&projectId=${projectId}`
        );
        break;
      case actionButtonType.ADD_CONTRACT:
        router.push(
          `${ApplicationURLS.USER_ADD_CONTRACTS}?complianceTab=${typeOfTrustAccount}&projectId=${projectId}`
        );
        break;
      case actionButtonType.EDIT_CONTRACT:
        router.push(
          `${ApplicationURLS.USER_ADD_CONTRACTS}?complianceTab=${typeOfTrustAccount}&projectId=${projectId}`
        );
        break;
      case actionButtonType.MATCH_TRANSACTIONS:
        router.push(
          `${ApplicationURLS.USER_BANK_ACCOUNT_LIST_OVERVIEW}/${companyId}/${reference_id}?complianceTab=${typeOfTrustAccount}&projectId=${projectId}`
        );
        break;
      case actionButtonType.SEND_NOTICE:
        router.push(
          `${ApplicationURLS.USER_NOTICES_VIEW}/${reference_id}?complianceTab=${typeOfTrustAccount}&projectId=${projectId}`
        );
        break;
      case actionButtonType.RECONCILIATION:
        router.push(
          `${ApplicationURLS.USER_TRUST_ACCOUNTING}?tab=Reconciliation+Record`
        );
        break;
      case actionButtonType.REVIEW_AUDIT:
        router.push(`${ApplicationURLS.USER_TRUST_ACCOUNTING}?tab=Audit`);
        break;
      case actionButtonType.VIEW_UNMATCHED_PAYMENTS:
        router.push(ApplicationURLS.USER_BANK_ACCOUNT_LIST_OVERVIEW);
        break;
      case actionButtonType.SEND_SCHEDULE:
        router.push(
          `${ApplicationURLS.USER_NOTICES_VIEW}/${reference_id}?complianceTab=${typeOfTrustAccount}&projectId=${projectId}`
        );
        break;
      case actionButtonType.UPDATE_TRANSACTION_LIST:
        router.push(
          `/user/bank-accounts/overview/${companyId}/${reference_id}`
        );
        break;
      case actionButtonType.TOPUP_ACCOUNT:
        router.push(
          `/user/bank-accounts/overview/${companyId}/${reference_id}`
        );
        break;
      case actionButtonType.SEND_REMITTANCE:
        router.push(
          `${ApplicationURLS.USER_NOTICES_VIEW}/${reference_id}?complianceTab=${typeOfTrustAccount}&projectId=${projectId}`
        );
        break;

      case actionButtonType.WITHDRAW_BALANCE:
        router.push(
          `/user/bank-accounts/overview/${companyId}/${reference_id}`
        );
        break;
      case actionButtonType.UPDATE_AND_MATCH:
        router.push(
          `/user/bank-accounts/overview/${companyId}/${reference_id}`
        );
        break;
      case actionButtonType.PAY_NOW:
        router.push(`${ApplicationURLS.USER_RETENTIONS_LIST_CURRENT}`);
        break;
      case actionButtonType.EDIT_PROJECT:
        router.push(`${ApplicationURLS.USER_PROJECT_OVERVIEW}/${reference_id}`);
        break;
      case actionButtonType.DELEGATE_NOW:
        router.push(
          `${ApplicationURLS.USER_BANK_ACCOUNTS_EDIT}/${companyId}/${reference_id}?complianceTab=${typeOfTrustAccount}&projectId=${projectId}`
        );
        break;
      case actionButtonType.UPLOAD_CERTIFICATE:
        router.push(
          `${ApplicationURLS.USER_BANK_ACCOUNTS_EDIT}/${companyId}/${reference_id}?complianceTab=${typeOfTrustAccount}&projectId=${projectId}`
        );
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
            projectId: projectId,
          })
        );
        break;
      case actionButtonType.EDIT_BANK_ACCOUNT:
        dispatch(
          setComplianceOverviewData({
            referenceId: reference_id,
            editBankAccount: true,
            typeOfTrustAccount: typeOfTrustAccount,
            projectId: projectId,
          })
        );
        break;
      case actionButtonType.ADD_CONTRACT:
        dispatch(
          setComplianceOverviewData({
            referenceId: reference_id,
            addContract: true,
            typeOfTrustAccount: typeOfTrustAccount,
            projectId: projectId,
          })
        );
        break;
      case actionButtonType.EDIT_CONTRACT:
        dispatch(
          setComplianceOverviewData({
            referenceId: reference_id,
            editContract: true,
            typeOfTrustAccount: typeOfTrustAccount,
            projectId: projectId,
          })
        );
        break;
      case actionButtonType.MATCH_TRANSACTIONS:
        dispatch(
          setComplianceOverviewData({
            referenceId: reference_id,
            matchTransactionFromCompliance: true,
            typeOfTrustAccount: typeOfTrustAccount,
            projectId: projectId,
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
    <div className={styles.timelineContainer}>
      <Timeline
        lineColor="#1C2475"
        lineStyle={{ left: "18px" }}
        style={{ padding: "10px 0 0 0" }}
      >
        {overallData &&
          overallData.length > 0 &&
          overallData.map((overAllDataObj: any, overallRowIndex: number) =>
            overAllDataObj?.results?.length > 0 ? (
              overAllDataObj.results.map(
                (resultsObj: any, rowIndex: number) => (
                  <Fragment key={rowIndex}>
                    {rowIndex === 0 && (
                      <div
                        onClick={() => setOpenIndex(overallRowIndex)}
                        style={{ cursor: "pointer" }}
                      >
                        <TimelineEvent
                          bubbleStyle={{
                            border: overAllDataObj?.check_colour_code
                              ? `2px solid ${overAllDataObj?.check_colour_code}`
                              : "2px solid #1C2475",
                            backgroundColor: "white",
                            width: "36px",
                            height: "36px",
                            textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                            boxShadow:
                              "0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)",
                          }}
                          createdAt=""
                          icon={
                            <span
                              className={styles.icon}
                              style={{
                                color: overAllDataObj?.check_colour_code,
                              }}
                            >
                              {overAllDataObj?.check_number}
                            </span>
                          }
                          title=""
                          contentStyle={{
                            backgroundColor: "#0b5dd731",
                            borderRadius: "5px",
                            fontWeight: "600",
                            fontSize: "16px",
                            color: "#0A58CA",
                          }}
                        >
                          <div className={styles.expandIcon}>
                            <span>
                              {resultsObj?.check_name}{" "}
                              <span className={styles.hintText}>
                                {typeOfTrustAccount !==
                                "Retention Trust Account"
                                  ? "(Head Contractors And Related Entity Sub Contractors Only)"
                                  : ""}
                              </span>{" "}
                            </span>

                            <span>
                              {openIndex === rowIndex ? (
                                <DashCircleDotted />
                              ) : (
                                <PlusCircleDotted />
                              )}
                            </span>
                          </div>
                        </TimelineEvent>
                      </div>
                    )}
                    {openIndex === overallRowIndex && (
                      <div className={styles.bodyContent}>
                        <div
                          dangerouslySetInnerHTML={{
                            __html: resultsObj?.content,
                          }}
                        />
                        <div>
                          {resultsObj?.display_message && (
                            <div className="d-flex">
                              <div className={customStyles.status}>Status:</div>
                              <span
                                style={{
                                  color: resultsObj?.display_message_colour,
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: resultsObj?.display_message,
                                }}
                              />
                            </div>
                          )}
                          {!isAdmin && (
                            <div className="my-3">
                              {resultsObj?.action_button_type &&
                                resultsObj?.action_button_type !==
                                  actionButtonType.NONE && (
                                  <Button
                                    className={styles.statusbtn}
                                    onClick={() =>
                                      handleActionTrigger(resultsObj)
                                    }
                                  >
                                    {getButtonType(
                                      resultsObj?.action_button_type
                                    )}
                                  </Button>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Fragment>
                )
              )
            ) : (
              <></>
            )
          )}
      </Timeline>
    </div>
  );
};

export default TimelineComponent;
