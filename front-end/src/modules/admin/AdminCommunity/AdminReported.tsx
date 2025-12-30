"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import BreadCrumbs from "@/components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { getReportedList } from "./community.functions";
import { format } from "date-fns";
import { reportHeader, reportRenderData } from "./community.constant";
import DOMPurify from "dompurify";
import BaseModal from "@/components/BaseModal";
import {
  deleteComments,
  deleteTopic,
} from "@/modules/general/Community/community.functions";
import { showSuccessToast } from "@/components/Toaster";

interface AdminReportedProps {
  value: string;
  from?: string;
}
type ReportList = Array<{
  admin_voter_liked_flagged: {
    first_name: string;
    last_name: string;
    __typename: string;
  };
  cmty_flag_type: any;
  created_on: string;
  flag_reason: string;
  voter_liked_flagged: any;
  title: string;
  answer_comment: string;
}>;

const AdminReported: React.FC<AdminReportedProps> = ({ value, from }) => {
  const params = useParams();
  const router = useRouter();
  console.log(params);
  const [selectedValue, setSelectedValue] = useState("");
  const [tableLoader, setTableLoader] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState({
    label: "All",
    value: "All",
  });
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [discussionData, setDiscussionData] = useState<ReportList>([]);
  const [selectedRowData, setSelectedRowData] = useState<any>(null);
  const [openDeleteTopicConfirmation, setOpenDeleteTopicConfirmation] =
    useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [sortValues, setSortValues] = useState<any>("");

  useEffect(() => {
    getReportedListData();
  }, [entriesPerPage, currentPage, selectedCategory, sortValues]);

  const getReportedListData = () => {
    setTableLoader(true);
    const sorKey: any = {
      reportedBy: "reported_by",
      created_on: "reported_on",
      cmty_flag_type: "type",
      flag_reason: "message",
    };
    getReportedList({
      listCommunityFlagsInput: {
        answer_comment_id: from === "comments" ? +params?.id[2] : null,
        discussion_idea_id: from !== "comments" ? +params?.id[1] : null,
        perPage: entriesPerPage,
        page: currentPage,
        sorting_field: sorKey[sortValues?.sortKey] || undefined,
        sorting_order: sortValues?.direction || undefined,
      },
    }).then((res) => {
      setDiscussionData(
        res.flagsList.map((val: any) => {
          return {
            ...val,
            reportedBy: val?.admin_voter_liked_flagged
              ? `${val.admin_voter_liked_flagged.first_name} ${val.admin_voter_liked_flagged.last_name}`
              : `${val?.voter_liked_flagged?.first_name} ${val.voter_liked_flagged.last_name}`,
            created_on: format(val.created_on, "dd/MM/yyyy"),
            flag_reason:
              val?.flag_reason?.length > 40 ? (
                <span data-tooltip={val?.flag_reason} data-placement="left">
                  {val?.flag_reason.slice(0, 40) + "..."}
                </span>
              ) : (
                val?.flag_reason
              ),
            cmty_flag_type:
              val?.cmty_flag_type == "Spam"
                ? "Report as spam"
                : "This post is inappropriate  ",
          };
        })
      );
      setTotalRows(res.total_count);
      setTableLoader(false);
    });
  };

  const handleDeleteTopic = async () => {
    if (from == "comments") {
      const response = await deleteComments({
        updateAnswerCommentInput: {
          answer_comment_id: +params.id[2],
          answer_comment_status: "Deleted",
          answer_comment: null,
        },
      });
      if (response) {
        showSuccessToast(`comment deleted successfully`);
        router.push(
          value === "discussion"
            ? `/admin/community/discussions/comments/${params.id[0]}/${params.id[1]}`
            : `/admin/community/product-ideas/comments/${params.id[0]}/${params.id[1]}`
        );
      }
    } else {
      const response = await deleteTopic({
        updateContentInput: {
          id: params.id[0],
          discussion_idea_status: "Deleted",
        },
      });
      if (response) {
        showSuccessToast(
          `${
            value === "discussion" ? "Discussion" : "Product idea"
          } deleted successfully`
        );
        router.push(
          value === "discussion"
            ? AppRoutes.ADMIN_COMMUNITY_DISCUSSIONS
            : AppRoutes.ADMIN_COMMUNITY_PRODUCT_IDEAS
        );
      }
    }
  };

  const breadCrumbsData = () => {
    if (from == "comments") {
      return [
        {
          name: "Dashboard",
          path: AppRoutes.USER_DASHBOARD,
        },
        {
          name: value === "discussion" ? "Discussion" : "Product idea",
          path:
            value === "discussion"
              ? AppRoutes.ADMIN_COMMUNITY_DISCUSSIONS
              : AppRoutes.ADMIN_COMMUNITY_PRODUCT_IDEAS,
        },
        {
          name: "Comments",
          path:
            value === "discussion"
              ? `/admin/community/discussions/comments/${params.id[0]}/${params.id[1]}`
              : `/admin/community/product-ideas/comments/${params.id[0]}/${params.id[1]}`,
        },
      ];
    } else {
      return [
        {
          name: "Dashboard",
          path: AppRoutes.USER_DASHBOARD,
        },
        {
          name: value === "discussion" ? "Discussion" : "Product idea",
          path:
            value === "discussion"
              ? AppRoutes.ADMIN_COMMUNITY_DISCUSSIONS
              : AppRoutes.ADMIN_COMMUNITY_PRODUCT_IDEAS,
        },
      ];
    }
  };

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={breadCrumbsData()}
            activeRoute={"Reported"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Reported</h1>
            <br />
            <div
              dangerouslySetInnerHTML={{
                __html:
                  discussionData[0]?.title ||
                  DOMPurify.sanitize(discussionData[0]?.answer_comment),
              }}
            ></div>

            <br />

            <a className="downloadfile">
              <button
                className="contrast smallbutton"
                onClick={() => {
                  setOpenDeleteTopicConfirmation(true);
                }}
                type="button"
              >
                <i className="fa-light fa-trash"></i>Delete
              </button>
            </a>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <GridExportActions
            resetFilterFunction={() =>
              setSelectedCategory({ label: "All", value: "All" })
            }
            hideExcelButton={true}
            hidePdfButton={true}
            hideResetButton={selectedCategory.value == "All" ? true : false}
          />
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={reportHeader}
            gridData={discussionData}
            showLoader={tableLoader}
            loaderColSpan={reportHeader.length}
            renderRowList={reportRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
            onSortChange={(sortConfig) => {
              setSortValues(sortConfig);
            }}
          />
        </div>
      </div>
      {openDeleteTopicConfirmation && (
        <BaseModal
          displayModal={openDeleteTopicConfirmation}
          onClose={() => setOpenDeleteTopicConfirmation(false)}
          secondButtonName="Yes"
          firstButtonName="No"
          title=""
          onConfirm={() => {
            handleDeleteTopic();
            return true;
          }}
        >
          <h4 className="text_center">Are you sure you wish to delete?</h4>
        </BaseModal>
      )}
    </div>
  );
};

export default AdminReported;
