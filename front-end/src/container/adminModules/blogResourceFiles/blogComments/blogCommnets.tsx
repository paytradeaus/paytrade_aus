"use client";
import React, { useEffect, useState } from "react";
import Overlays from "@/components/Overlayes/Overlayes";
import { ThreeDots } from "react-bootstrap-icons";
import styles from "./blogCommnets.module.scss";
import { useParams } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import { formatDate } from "@/common/commonFunctions";
import { RowsPerPageInTable } from "@/common/constants";
import { DD_MM_YYYY } from "@/common/constants/general";
import { AppModal } from "@/components/model/model";
import { BlogComment } from "../blogResource.types";
import {
  AdminListAllBlogComments,
  AdminManageBlogComment,
} from "../blogResource.functions";
import Link from "next/link";
import { ApplicationURLS } from "@/common/applicationURLS";
import CommentsListSubHeader from "./customSubHeader";

const CommentsList = () => {
  const status = [
    { value: "", label: "All" },
    { value: "Pending", label: "Pending" },
    { value: "Approved", label: "Approved" },
    { value: "Rejected", label: "Rejected" },
  ];

  const params = useParams();
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [blogResourceData, setBlogResourceData] = useState<BlogComment[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [statusValue, setStatusValue] = useState("");
  const [statusSelectedData, setStatusSelectedData] = useState();
  const [activityLogStartDate, setActivityLogStartDate] = useState(
    new Date(new Date().setHours(0, 0, 0, 0))
  );
  const [activityLogEndDate, setActivityLogEndDate] = useState(
    new Date(new Date().setHours(23, 59, 59, 999))
  );
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [activityDate, setActivityDate] = useState("");
  const [singleActivyDate, setSingleActivyDate] = useState<any>({
    value: "This Month",
    label: "This Month",
  });
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
        status: statusValue,
        blog: params?.id || "",
      },
      setLoading
    );
    setBlogResourceData(commentList?.comments || []);
    setTotalRows(commentList?.totalCount || 0);
    setPerPage(rowsPerPage);
  };

  const handleStatusChange = (selectedValue: any) => {
    setStatusSelectedData(selectedValue);
    setStatusValue(selectedValue.value);
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
    status: string;
  }) => {
    const { id, option, status } = data;
    setActionData(data);
    if (option === "Delete") {
      setOpenModal(!openModal);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg: "Are you sure you wish to delete this blog comment ?",
      }));
    }
    if (option === "status") {
      let statusName = status === "Approved" ? "Approve" : "Reject";
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
        comment_status: actionData?.status,
        commentId: actionData?.id,
      };
      let response = await AdminManageBlogComment(
        payload,
        `User comment ${(actionData?.status).toLowerCase()}.`
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
  const columns = [
    {
      name: "User ID",
      grow: true,
      center: true,
      selector: (row: BlogComment) => (
        <Link
          href={`${ApplicationURLS.ADMIN_NORMAL_USERS_EDIT}/${row?.comment_by}`}
        >
          {row?.comment_by}
        </Link>
      ),
    },
    {
      name: "User Name",
      grow: true,
      minWidth: "150px",
      wrap: true,
      selector: (row: BlogComment) => row?.comment_owner_name,
    },
    {
      name: "Comment Posted",
      fixed: "left",
      // wrap: true,
      cell: (row: BlogComment, index: number) => (
        <Overlays
          trigger="hover"
          placement={"auto-start"}
          popoverTypes={row?.comment?.length > 250 ? "tooltip" : undefined}
          overlay={<span></span>}
          cellData={{
            message: row?.comment,
          }}
          customPopupstyles={styles.customPopupstyles}
        >
          <span>{`${
            row?.comment?.length > 250
              ? `${row?.comment.slice(0, 250)}...`
              : row?.comment
          }`}</span>
        </Overlays>
      ),
    },
    {
      name: "Status",
      fixed: "right",
      grow: true,
      center: true,
      selector: (row: BlogComment) => row?.comment_status,
    },
    {
      name: "Date",
      grow: true,
      center: true,
      minWidth: "150px",
      selector: (row: BlogComment) =>
        row?.created_on ? formatDate(row?.created_on, DD_MM_YYYY) : "N/A",
    },

    {
      name: "Actions",
      fixed: "right",
      grow: true,
      center: true,
      cell: (row: BlogComment, index: number) => (
        <Overlays
          trigger="click"
          // placement={"bottom-end"}
          placement={
            blogResourceData?.length > 3 &&
            blogResourceData?.length == index + 1
              ? "top-end"
              : "bottom-end"
          }
          overlay={<span></span>}
          popoverTypes={"tableActions"}
          popoverActions={[
            {
              label:
                row?.comment_status === "Pending"
                  ? "Approve"
                  : row?.comment_status === "Approved"
                  ? "Reject"
                  : "Approve",
              value: "status",
            },
            { label: "Delete", value: "Delete", isDelete: true },
          ]}
          customPopupstyles={styles.customPopupstyles}
          optionClick={(data) => handleOptionClick(data)}
          cellData={{
            id: row?.id,
            // name: row?.title,
            status:
              row?.comment_status === "Pending"
                ? "Approved"
                : row?.comment_status === "Approved"
                ? "Rejected"
                : "Approved",
          }}
          popperConfig={{
            modifiers: [
              {
                name: "offset",
                options: {
                  offset: [20, 10], // Adjust the offset as needed
                },
              },
            ],
          }}
        >
          <div className={styles.dotsContainer}>
            <ThreeDots />
          </div>
        </Overlays>
      ),
    },
  ];

  return (
    <div className={styles.dataContainer}>
      <ReusableDataTable
        columns={columns}
        data={blogResourceData}
        subHeader
        subHeaderComponent={
          <CommentsListSubHeader
            status={status}
            handleStatusChange={handleStatusChange}
            handleActivityChange={handleActivityChange}
            singleActivyDate={singleActivyDate}
            isCustomDate={isCustomDate}
            activityLogStartDate={activityLogStartDate}
            setActivityLogStartDate={setActivityLogStartDate}
            activityLogEndDate={activityLogEndDate}
            setActivityLogEndDate={setActivityLogEndDate}
          />
        }
        pagination
        progressPending={loading}
        paginationServer
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={handlePerRowsChange}
        onChangePage={handlePageChange}
      />
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        secondButtonLabel="No"
        firstButtonLabel="Yes"
        modalHeading={popupMessage?.headerMsg || ""}
        modalBodyContent={popupMessage?.subHeaderMsg || ""}
        onConfirm={() => {
          handleModalPopUpFunction();
        }}
      />
    </div>
  );
};

export default CommentsList;
