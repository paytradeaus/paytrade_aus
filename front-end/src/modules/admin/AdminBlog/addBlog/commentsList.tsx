"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BlogComment } from "../blogResource.types";
import Link from "next/link";
import {
  AdminListAllBlogComments,
  AdminManageBlogComment,
} from "./addEditBlog.function";
import BaseModal from "@/components/BaseModal";
import DynamicTable from "@/components/Table";
import {
  BlogCommentRenderData,
  blogCommentsHeader,
  statusOption,
} from "../BlogList/blogList.constant";
import { formatDate } from "@/utils";
import { DD_MM_YYYY } from "@/shared/constant/identificationNumbers";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import FormikControl from "@/components/FormikControl";
import { InputType } from "@/shared/constant/general";
import { format, isValid } from "date-fns";
import { noticesDateOptions } from "../../AdminNotices/noticesList.constant";
import DOMPurify from "dompurify";

const CommentsList = () => {
  const params = useParams();
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [blogResourceData, setBlogResourceData] = useState<BlogComment[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [statusValue, setStatusValue] = useState<any>("");
  const [statusSelectedData, setStatusSelectedData] = useState();
  const [activityLogStartDate, setActivityLogStartDate] = useState<
    Date | null | any
  >(new Date(new Date().setHours(0, 0, 0, 0)));
  const [activityLogEndDate, setActivityLogEndDate] = useState<
    Date | null | any
  >(new Date(new Date().setHours(23, 59, 59, 999)));
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [activityDate, setActivityDate] = useState("");
  const [singleActivyDate, setSingleActivyDate] = useState<any>({
    value: "This Month",
    label: "This Month",
  });
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [selectedRowsInGrid, setSelectedRowsInGrid] = useState([]);

  useEffect(() => {
    getListAllBlogComments(1, perPage);
  }, []);

  useEffect(() => {
    getListAllBlogComments(page, perPage);
  }, [statusValue, activityDate, activityLogEndDate, activityLogStartDate]);

  const getListAllBlogComments = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    const commentList = await AdminListAllBlogComments(
      {
        date_filter: activityDate || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
        page: page,
        perPage: rowsPerPage,
        status: statusValue?.value,
        blog: params?.id || "",
      },
      setLoading
    );
    setBlogResourceData(
      commentList?.comments?.map(
        (val: {
          comment_by: any;
          comment_owner_name: any;
          comment: string;
          comment_status: any;
          created_on: any;
        }) => {
          return {
            ...val,
            "User ID": (
              <Link href={"/admin/users/edit/" + val.comment_by}>
                {val.comment_by}
              </Link>
            ),
            "User Name": val.comment_owner_name,
            "Comment Posted": (
              <div
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(val?.comment || ""),
                }}
              />
            ),
            Status: val.comment_status,
            Date: val?.created_on ? formatDate(val?.created_on) : "N/A",
          };
        }
      ) || []
    );
    setTotalRows(commentList?.totalCount || 0);
    setPerPage(rowsPerPage);
  };

  const handleStatusChange = (selectedValue: any) => {
    setStatusValue(selectedValue);
  };

  const handlePageChange = async (page: number) => {
    setPage(page);
    await getListAllBlogComments(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await getListAllBlogComments(page, newPerPage);
  };
  const handleOptionClick = async (data: {
    id: string;
    option: string;
    Status: string;
  }) => {
    const { id, option, Status } = data;
    setActionData(data);
    if (option === "Delete") {
      setOpenModal(!openModal);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg: "Are you sure you wish to delete this blog comment ?",
      }));
    }
    if (option === "status") {
      let statusName = Status === "Approved" ? "Approve" : "Reject";
      setOpenModal(!openModal);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg: `Are you sure you wish to ${statusName} this blog comment?`,
      }));
    }
  };
  const handleModalPopUpFunction = async () => {
    setOpenModal(!openModal);
    if (actionData.option === "Delete") {
      let payload = {
        comment_status: "Deleted",
        commentId: actionData?.id,
      };
      let response = await AdminManageBlogComment(
        payload,
        "Blog Comment has been deleted."
      );
      if (response) {
        await getListAllBlogComments(page, perPage);
      }
    }
    if (actionData.option === "status") {
      let payload = {
        comment_status: actionData?.Status,
        commentId: actionData?.id,
      };
      let response = await AdminManageBlogComment(
        payload,
        `User comment ${(actionData?.Status).toLowerCase()}.`
      );
      if (response) {
        await getListAllBlogComments(page, perPage);
      }
    }
  };
  const handleActivityChange = (selectedValue: any) => {
    setSingleActivyDate(selectedValue);
    if (selectedValue.value === "Custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
    }
    setActivityDate(selectedValue.value); // Perform any other actions based on the selected value
  };

  const actions = [
    {
      label: "Approve",
      icon: "fa-light fa-check",
      onClick: (row: any) => {
        handleOptionClick({ ...row, option: "status", Status: "Approved" });
      },
      conditionalComparisonData: "Pending",
      comparisonRowKey: "Status",
    },
    {
      label: "Approve",
      icon: "fa-light fa-check",
      onClick: (row: any) => {
        handleOptionClick({ ...row, option: "status", Status: "Approved" });
      },
      conditionalComparisonData: "Rejected",
      comparisonRowKey: "Status",
    },
    {
      label: "Reject",
      icon: "fa-light fa-ban",
      onClick: (row: any) => {
        handleOptionClick({ ...row, option: "status", Status: "Rejected" });
      },
      conditionalComparisonData: "Approved",
      comparisonRowKey: "Status",
    },
    {
      label: "Delete",
      icon: "fa-light fa-trash",
      onClick: (row: any) => {
        handleOptionClick({ ...row, option: "Delete" });
      },
      displayByDefault: true,
    },
  ];

  return (
    <>
      <div className="pt_filteroptions">
        <SearchableSelect
          placeholder={"Select a status"}
          name="Category"
          options={statusOption}
          selectedData={statusValue}
          renderKey="label"
          valueKey="value"
          onChange={handleStatusChange}
        />
        <SearchableSelect
          placeholder={"Select a month"}
          name="status"
          options={noticesDateOptions}
          selectedData={singleActivyDate}
          renderKey="label"
          valueKey="value"
          onChange={handleActivityChange}
        />
      </div>
      <br />
      {isCustomDate && (
        <div className="grid">
          <div>
            <FormikControl
              label="From date"
              name="From date"
              control={InputType.DATE_PICKER}
              type="date"
              // value={
              //   activityLogStartDate
              //     ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
              //     : ""
              // }
              value={
                activityLogStartDate && isValid(new Date(activityLogStartDate))
                  ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                  : ""
              }
              onChange={(selectedDate: any) => {
                if (!selectedDate) {
                  setActivityLogStartDate(null);
                  return;
                }
                let fromDate = new Date(
                  new Date(selectedDate).setHours(0, 0, 0, 0)
                );
                if (fromDate > activityLogEndDate) {
                  setSelectedRowsInGrid([]);
                  setTimeKey(new Date().getTime());
                  setActivityLogStartDate(fromDate);
                  setActivityLogEndDate(new Date(selectedDate));

                  // setActivityLogEndDate(fromDate);
                } else {
                  setSelectedRowsInGrid([]);
                  setTimeKey(new Date().getTime());
                  setActivityLogStartDate(fromDate);
                }
              }}
              minDate=""
              disabled={false}
            />
          </div>
          <div>
            <FormikControl
              label="To date"
              name="To date"
              type="date"
              control={InputType.DATE_PICKER}
              // value={
              //   activityLogEndDate
              //     ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
              //     : ""
              // }
              value={
                activityLogEndDate && isValid(new Date(activityLogEndDate))
                  ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
                  : ""
              }
              onChange={(selectedDate: any) => {
                if (!selectedDate) {
                  setActivityLogEndDate(null);
                  return;
                }
                const toDate = new Date(
                  new Date(selectedDate).setHours(23, 59, 59, 999)
                );
                if (toDate < activityLogStartDate) {
                  return;
                } else {
                  setSelectedRowsInGrid([]);
                  setTimeKey(new Date().getTime());
                  setActivityLogEndDate(toDate);
                }
              }}
              maxDate=""
              disabled={false}
            />
          </div>
        </div>
      )}
      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={blogCommentsHeader}
            gridData={blogResourceData}
            gridActions={actions}
            showLoader={loading}
            loaderColSpan={blogCommentsHeader.length}
            renderRowList={BlogCommentRenderData}
            currentPage={page}
            entriesPerPage={perPage}
            onEntriesPerPageChange={handlePageChange}
            onPageChange={setPage}
            totalEntries={totalRows}
          />
        </div>
      </div>
      {openModal && (
        <BaseModal
          displayModal={openModal}
          onClose={() => setOpenModal(false)}
          firstButtonName="No"
          secondButtonName="Yes"
          title={popupMessage?.headerMsg || ""}
          onConfirm={() => {
            handleModalPopUpFunction();
            return true;
          }}
        >
          {popupMessage?.subHeaderMsg || ""}
        </BaseModal>
      )}
    </>
  );
};

export default CommentsList;
