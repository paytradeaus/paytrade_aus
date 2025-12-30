import Overlays from "@/components/Overlayes/Overlayes";
import React, { Fragment, useEffect, useState } from "react";
import { Table } from "react-bootstrap";
import { ThreeDots } from "react-bootstrap-icons";
import customStyles from "./payments.module.scss";
import { getNoticesListServices } from "../../notices/notices.functions";
import { usePaymentsContext } from "./paymentsContext";
import { getCookie } from "cookies-next";
import { formatDate } from "@/common/commonFunctions";

import { ApplicationURLS } from "@/common/applicationURLS";
import { useRouter } from "next/navigation";

export default function Notices() {
  const { paymentId }: any = usePaymentsContext();
  const router = useRouter();

  const [noticesListData, setNoticesListData] = useState([]);

  useEffect(() => {
    getNoticesList();
  }, []);

  async function getNoticesList() {
    const postData = {
      company_id: getCookie("companyId") ? Number(getCookie("companyId")) : "",
      payment_id: paymentId ? +paymentId : "",
      page: 1,
      items_per_page: 10,
    };
    const response = await getNoticesListServices(postData);

    if (response?.notices_list?.length > 0) {
      setNoticesListData(response?.notices_list);
    } else {
      setNoticesListData([]);
    }
  }

  function navigateToNotices(rowData: any) {
    router.push(`${ApplicationURLS.USER_NOTICES_VIEW}/${rowData?.id}`);
  }

  return noticesListData?.length > 0 ? (
    <Fragment>
      <div className={customStyles.notice}>Notices</div>
      <Table>
        <thead>
          <tr>
            <th>Notice Type</th>
            <th>Date</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {noticesListData?.map((data: any, index: number) => (
            <tr key={index}>
              <td>{data?.notice_type}</td>
              <td>{data?.notice_date ? formatDate(data?.notice_date) : ""}</td>
              <td>{data?.status}</td>
              <td>
                <span
                  className={customStyles.gridAction}
                  onClick={() => navigateToNotices(data)}
                >
                  View
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* <div className={customStyles.disclaimerPolicy}>
        Please pay the total amount on or before the due date for payment. If
        you are unable to pay the total amount, Please respond with a payment
        schedule within 15 business days after the date you received this
        invoice/payment claim as required under the Building Industry Fairness
        (Security of Payment) ACT 2017
      </div> */}
    </Fragment>
  ) : (
    <></>
  );
}
