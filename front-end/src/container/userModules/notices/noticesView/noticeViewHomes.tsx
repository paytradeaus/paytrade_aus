"use client";
import React, { useEffect, useState } from "react";

import styles from "./noticesView.module.scss";

import { useParams } from "next/navigation";

import { INoticeViewData } from "../notices.types";
import { FetchDetailsOfANotice } from "../notices.functions";
import PaidNoticeView from "./paidNoticeView";
import NoticesViewType from "./noticesView";

const NoticesViewHome = (props: any) => {
  const { isView = false, isAdmin = false, ...rest } = props;
  const params = useParams();
  const [noticeData, setNoticeData] = useState<INoticeViewData>();

  const [wrongIdCheck, setWrongIdCheck] = useState(false);

  useEffect(() => {
    (async () => {
      if (isView && params?.id) {
        const payload: any = {
          id: params?.id || "",
        };
        const resourceData = await FetchDetailsOfANotice(payload);
        if (resourceData?.notice_id) {
          setNoticeData(resourceData);
        } else {
          setWrongIdCheck(true);
        }
      }
    })();
  }, []);

  switch (noticeData?.ViewType) {
    case "Basic":
      return (
        <NoticesViewType isView={true} data={noticeData} isAdmin={isAdmin} />
      );
    case "Paid":
    case "Paid-delegated":
      return (
        <PaidNoticeView isView={true} data={noticeData} isAdmin={isAdmin} />
      );

    default:
      <div className={styles.dataContainer}>
        {wrongIdCheck && (
          <div className={styles.noDataStyle}>No data available on this id</div>
        )}
      </div>;
  }
};

export default NoticesViewHome;
