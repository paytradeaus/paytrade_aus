import React, { Fragment, useEffect, useState } from "react";
import { Card } from "react-bootstrap";
import styles from "./toDoCard.module.scss";
import {
  fetchCompliances,
  fetchPaymentsToDo,
  fetchUnsentNotices,
} from "@/container/userDashboardPage/userDashboardPage.function";
import { getCookie } from "cookies-next";
import { formatDate } from "@/common/commonFunctions";
import { ApplicationURLS } from "@/common/applicationURLS";
import { useRouter } from "next/navigation";
import { YOU_ARE_UPTO_DATE } from "@/common/constants/messages";
import { FullPageLoader } from "@/components/Loader/fullPageLoader";
import { RootState, useAppSelector } from "@/redux/store";

const typeOfList = {
  NOTICES: "notices",
  TO_DO_PAYMENTS: "toDoPayments",
  COMPLIANCE: "compliance",
};

const ToDoCard: React.FC = () => {
  const [paymentsTodoList, setPaymentsTodoList] = useState([]);
  const [noticesList, setNoticesList] = useState([]);
  const [compliancesList, setCompliancesList] = useState([]);
  const [displayNoPaymentsData, setDisplayNoPaymentsData] = useState(false);
  const [displayNoDataMessage, setDisplayNoDataMessage] = useState(false);
  const router = useRouter();

  const [loader, setLoader] = useState(false);

  const updatedCompany: any = useAppSelector(
    (state: RootState) => state.companyStore.updatedcompany
  );

  useEffect(() => {
    initialInvoke();
  }, [updatedCompany?.company_id]);

  async function initialInvoke() {
    try {
      // Show loader before starting
      // setLoader(true);

      // Execute all API calls in parallel
      await Promise.allSettled([
        getPaymentsToDoList(),
        getUnsentNoticesList(),
        getCompliancesList(),
      ]);

      // Hide loader after all API calls are completed
      setLoader(false);
    } catch (error) {
      setLoader(false);
    }
  }

  async function getPaymentsToDoList() {
    try {
      const postData = {
        payload: {
          page_size: null,
          page_number: null,
          company_id: Number(getCookie("companyId")) || null,
          sub_payment_type: "ToDo",
          project_id: null,
          contract_id: null,
          status: "Unmatched",
          is_confirmed: false,
          is_late: null,
        },
      };

      const response = await fetchPaymentsToDo(postData);

      if (response) {
        setPaymentsTodoList(response?.payments);
        setDisplayNoPaymentsData(response?.payments?.length === 0);
        return true;
      }
      return false;
    } catch (err: any) {
      return false;
    }
  }

  async function getUnsentNoticesList() {
    try {
      const postData = {
        payload: {
          company_id: Number(getCookie("companyId")),
        },
      };

      const response = await fetchUnsentNotices(postData);

      if (response) {
        setNoticesList(response);
        setDisplayNoDataMessage(response?.length === 0);
        return true;
      }
      return false;
    } catch (err: any) {
      return false;
    }
  }

  async function getCompliancesList() {
    try {
      const postData = {
        payload: {
          company_id: Number(getCookie("companyId")),
        },
      };

      const response = await fetchCompliances(postData);

      if (response) {
        setCompliancesList(response);
        setDisplayNoDataMessage(response?.length === 0);
        return true;
      }
      return false;
    } catch (err: any) {
      return false;
    }
  }

  function getNoRecordData(listType: string) {
    if (displayNoDataMessage || displayNoPaymentsData) {
      const noRecordRow = (
        <div className={styles.noRecordRow}>{YOU_ARE_UPTO_DATE} </div>
      );

      switch (listType) {
        case typeOfList.COMPLIANCE:
          if (compliancesList?.length === 0) {
            return noRecordRow;
          }
          break;
        case typeOfList.NOTICES:
          if (noticesList?.length === 0) {
            return noRecordRow;
          }
          break;
        case typeOfList.TO_DO_PAYMENTS:
          if (paymentsTodoList?.length === 0) {
            return noRecordRow;
          }
          break;
        default:
          return null;
      }
    } else {
      return "";
    }
  }

  return (
    <Card className={styles.CardStyles}>
      {loader && <FullPageLoader setLoading={loader} />}
      <Card.Body className={styles.CardBodyStyle}>
        <div>
          <Card.Title className={styles.CardTitleStyles}>To Do</Card.Title>
          <Card.Subtitle className={styles.CardSubtitleStyle}>
            Payments
          </Card.Subtitle>
          {/* <div className={styles.DiscriptionStyles}>
            Project name - Contract name - Amount - Due Date
          </div> */}
          <div className={styles.ScrollableContent}>
            {paymentsTodoList?.length > 0
              ? paymentsTodoList.map((data: any, index: number) => (
                  <div
                    key={index}
                    className="d-flex justify-content-between my-1"
                  >
                    <div key={index} className={styles.DiscriptionStyles}>
                      {`${data?.project_name ?? "N/A"} - ${
                        data?.contract_name ?? "N/A"
                      } - $ ${
                        data?.formatted_amount ? data?.formatted_amount : 0.0
                      } - ${
                        data?.due_date ? formatDate(data?.due_date) : "N/A"
                      }`}
                    </div>
                  </div>
                ))
              : getNoRecordData(typeOfList.TO_DO_PAYMENTS)}
          </div>
          {paymentsTodoList?.length > 0 && (
            <div
              className={styles.BottomLinkStyles}
              onClick={() =>
                router.push(`${ApplicationURLS.USER_PAYMENT_TO_DO_LIST}`)
              }
            >
              View
            </div>
          )}
        </div>

        <hr></hr>
        <Card.Subtitle className={styles.CardSubtitleStyle}>
          Notices
        </Card.Subtitle>
        {/* <div className={styles.DiscriptionStyles}>
          Account name - notice type - status
        </div> */}
        <div className={styles.ScrollableContent}>
          {noticesList?.length > 0
            ? noticesList.map((data: any, index: number) => (
                <div
                  key={index}
                  className="d-flex justify-content-between my-1"
                >
                  <div className={styles.DiscriptionStyles}>
                    {`${data?.bank_account_name} - ${data?.notice_type} - ${data?.status}`}
                  </div>
                </div>
              ))
            : getNoRecordData(typeOfList.NOTICES)}
        </div>
        {noticesList?.length > 0 && (
          <div
            className={styles.BottomLinkStyles}
            onClick={() => router.push(`${ApplicationURLS.USER_NOTICES}`)}
          >
            View
          </div>
        )}

        <hr></hr>
        <Card.Subtitle className={styles.CardSubtitleStyle}>
          Compliance
        </Card.Subtitle>
        <div className={styles.ComplianceDiscriptionLayoutStyles}>
          {/* <div className={styles.DiscriptionStyles}>
            Project - Account name - Number of issues
          </div> */}
        </div>
        <div className={styles.ScrollableContent}>
          {compliancesList?.length > 0
            ? compliancesList.map((data: any, index: number) => (
                <div
                  key={index}
                  className="d-flex justify-content-between my-1"
                >
                  <div className={styles.DiscriptionStyles}>
                    {`${data?.project_name ?? "N/A"} - ${
                      data?.bank_account_name ?? "N/A"
                    } - ${data?.number_of_issues ?? 0}`}
                  </div>
                  <div
                    className={styles.BottomLinkStyles}
                    onClick={() =>
                      router.push(
                        `${ApplicationURLS.USER_COMPLIANCE_OVERVIEW}?project=${data?.project_id}`
                      )
                    }
                  >
                    View
                  </div>
                </div>
              ))
            : getNoRecordData(typeOfList.COMPLIANCE)}
        </div>
      </Card.Body>
    </Card>
  );
};

export default ToDoCard;
