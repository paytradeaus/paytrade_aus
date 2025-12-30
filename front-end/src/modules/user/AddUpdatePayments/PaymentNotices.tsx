import { formatDate } from "@/utils";
import React, { Fragment, useEffect, useState } from "react";
import { getNoticesListServices } from "../Notices/notices.functions";
import { getCookie } from "cookies-next";
import { usePaymentsContext } from "./PaymentContextProvider";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { useRouter } from "next/navigation";

export default function PaymentNotices() {
  const { paymentId }: any = usePaymentsContext();
  const [noticesList, setNoticesList] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetchNoticesData();
  }, []);

  async function fetchNoticesData() {
    const companyId = getCookie("companyId")
      ? Number(getCookie("companyId"))
      : "";
    const postData = {
      company_id: companyId,
      payment_id: paymentId ? +paymentId : "",
      page: 1,
      items_per_page: 10,
    };

    try {
      const response = await getNoticesListServices(postData);
      if (response?.notices_list?.length > 0) {
        setNoticesList(response.notices_list);
      } else {
        setNoticesList([]);
      }
    } catch (error) {
      console.error("Error fetching notices:", error);
      setNoticesList([]);
    }
  }

  function navigateToNoticeDetail(notice: any) {
    router.push(`${AppRoutes.USER_NOTICES_VIEW}/${notice?.id}`);
  }

  return (
    <Fragment>
      <h4>Notices</h4>
      <div className="grid">
        <div className="pt_table pt_formtable">
          <table className="dataTable compact stripe nowrap hover order-column">
            <thead>
              <tr>
                <th>Notice Type</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {noticesList.length > 0 ? (
                noticesList.map((notice: any, index: number) => (
                  <tr key={index}>
                    <td>{notice.notice_type}</td>
                    <td>
                      {notice.notice_date
                        ? formatDate(notice.notice_date)
                        : "-"}
                    </td>
                    <td>{notice.status}</td>
                    <td>
                      <a
                        style={{ textDecoration: "none", cursor: "pointer" }}
                        onClick={() => navigateToNoticeDetail(notice)}
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    There are no records to display
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Fragment>
  );
}
