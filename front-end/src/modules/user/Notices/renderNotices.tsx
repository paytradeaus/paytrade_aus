"use client";
import React, { useEffect, useState } from "react";
import { FetchDetailsOfANotice } from "./notices.functions";
import { useParams, useSearchParams } from "next/navigation";
import { useLoaderContext } from "@/context/useLoader";
import UpdateBasicNotices from "./UpdateBasicNotices";
import UpdatePremiumNotices from "./UpdatePremiumNotices";

export default function RenderNotices({ isAdmin }: any) {
  const params = useParams();

  const { setLoader }: any = useLoaderContext();
  const [noticeData, setNoticeData] = useState<any>(null);
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const queryParams = useSearchParams();
  const isArchived = queryParams.get("prevTab");

  useEffect(() => {
    fetchNotices();
  }, []);

  async function fetchNotices() {
    try {
      if (params?.id) {
        const payload: any = {
          id: params?.id || "",
        };
        setLoader(true);
        const resourceData: any = await FetchDetailsOfANotice(payload);
        if (resourceData?.notice_id) {
          setNoticeData(resourceData);
        } else {
          setWrongIdCheck(true);
        }
        setLoader(false);
      }
    } catch {
      setLoader(false);
    }
  }

  switch (noticeData?.ViewType) {
    case "Basic":
      return (
        <UpdateBasicNotices
          isView={true}
          apiData={noticeData}
          isAdmin={isAdmin}
          isArchived={isArchived == "Archived"}
        />
      );
    case "Paid":
    case "Paid-delegated":
      return (
        <UpdatePremiumNotices
          isView={true}
          apiData={noticeData}
          isAdmin={isAdmin}
          isArchived={isArchived == "Archived"}
        />
      );

    default:
      return (
        <div className={"text_center"}>
          {wrongIdCheck && <div>No data available on this id</div>}
        </div>
      );
  }
}
