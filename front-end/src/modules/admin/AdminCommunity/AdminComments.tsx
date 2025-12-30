"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import BreadCrumbs from "@/components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import TabSwitch from "@/components/TabSwitch";
import DynamicTable from "@/components/Table";
import {
  deleteComments,
  deleteTopic,
  getDiscussionIdeaById,
  getTopicComments,
} from "@/modules/general/Community/community.functions";
import { slugifyString, stripHtml } from "@/utils";
import BaseModal from "@/components/BaseModal";
import { showSuccessToast } from "@/components/Toaster";
import {
  commentsArchiveHeader,
  commentsHeader,
  commentsHeaderData,
  commentsTabOptionsList,
  productIdeaCommentsArchiveHeader,
  productIdeaCommentsHeader,
  productIdeaCommentsHeaderData,
} from "./community.constant";
import { format } from "date-fns";
import DOMPurify from "dompurify";

interface AdminCommentsProps {
  value: string;
  archived?: boolean;
}

const AdminComments: React.FC<AdminCommentsProps> = ({ value, archived }) => {
  const router = useRouter();
  const param = useParams();
  const [selectedValue, setSelectedValue] = useState("");
  const [tableLoader, setTableLoader] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState({
    label: "All",
    value: "All",
  });
  const [viewComment, setViewComment] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [discussionData, setDiscussionData] = useState<any>();
  const [commentList, setCommentList] = useState<any>([]);
  const [selectedRowData, setSelectedRowData] = useState<any>(null);
  const [openDeleteTopicConfirmation, setOpenDeleteTopicConfirmation] =
    useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState(archived ? "Archived" : "Current");
  const [sortValues, setSortValues] = useState<any>("");

  useEffect(() => {
    getListData();
  }, [entriesPerPage, currentPage, selectedCategory, sortValues]);

  useEffect(() => {
    getDiscussionIdeaByIdData();
  }, []);

  function getDiscussionIdeaByIdData() {
    getDiscussionIdeaById({
      getDiscussionIdeaId: param?.uuid,
    }).then((res) => {
      setDiscussionData(res);
    });
  }

  const handleTabClick = (tabId: React.SetStateAction<string>) => {
    if (activeTab !== tabId) {
      const path = value === "discussion" ? "discussions" : "product-ideas";
      setActiveTab(tabId);
      switch (tabId) {
        case "Current":
          router.push(
            `/admin/community/${path}/comments/${param.uuid}/${param.id}`
          );
          break;
        case "Archived":
          router.push(
            `/admin/community/${path}/comments/archived/${param.uuid}/${param.id}`
          );
          break;
        default:
          break;
      }
    }
  };

  const getListData = () => {
    setTableLoader(true);
    const sorKey: any = {
      answer_comment_owner_name: "answered_by",
      created_on: "added_date",
      flag_count: "is_reported",
      vote_count: "likes",
      answer_comment: "answer",
    };
    getTopicComments({
      listAnsCmtInput: {
        perPage: entriesPerPage,
        page: currentPage,
        id: +param.id,
        status: archived ? "Deleted" : undefined,
        sorting_field: sorKey[sortValues?.sortKey] || undefined,
        sorting_order: sortValues?.direction || undefined,
      },
    }).then((res) => {
      if (res) {
        setCommentList(
          res?.comment.map((val: any) => ({
            ...val,
            createdBy: val.answer_comment_owner_name,
            created_on: format(val.created_on, "dd/MM/yyyy"),
            flagCount: val?.flag_count,
            flag_count:
              val?.flag_count > 0 ? (
                <i
                  style={{
                    fontSize: "x-large",
                    WebkitTextStroke: "3px red",
                    cursor: archived ? "" : "pointer",
                  }}
                  className="fa-light fa-check"
                ></i>
              ) : (
                ""
              ),
            unTouched_comment: val.answer_comment,
            answer_comment:
              stripHtml(val.answer_comment)?.length > 38 ? (
                <span data-popover={stripHtml(val.answer_comment)}>
                  {stripHtml(val.answer_comment).slice(0, 38) + "..."}
                </span>
              ) : (
                stripHtml(val.answer_comment)
              ),
          }))
        );
        setTotalRows(res.total_count);
        setTableLoader(false);
      }
    });
  };

  const actions = [
    {
      label: "View " + (value === "discussion" ? "answer" : "comment"),
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: any) => {
        console.log(row);
        setSelectedRowData(row);
        setViewComment(true);
      },
      displayByDefault: true,
    },
    {
      label: "Delete",
      icon: "fa-light fa-trash",
      style: "contrast",
      onClick: (row: any) => {
        setSelectedRowData(row);
        setOpenDeleteTopicConfirmation(true);
      },
      displayByDefault: true,
    },
  ];

  const handleRowClick = (row: any, dataKey: any) => {
    if (dataKey.key == "flag_count" && row?.flagCount > 0 && !archived) {
      const path = value === "discussion" ? "discussions" : "product-ideas";
      router.push(
        `/admin/community/${path}/comments/reported/${param.uuid}/${param.id}/${row.answer_comment_id}`
      );
    }
  };

  const handleDeleteTopic = async () => {
    const response = await deleteComments({
      updateAnswerCommentInput: {
        answer_comment_id: selectedRowData.answer_comment_id,
        answer_comment_status: "Deleted",
        answer_comment: null,
      },
    });
    if (response) {
      showSuccessToast(`comment deleted successfully`);
      getListData();
    }
  };

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.USER_DASHBOARD,
              },
              {
                name: value === "discussion" ? "Discussions" : "Product ideas",
                path:
                  value === "discussion"
                    ? AppRoutes.ADMIN_COMMUNITY_DISCUSSIONS
                    : AppRoutes.ADMIN_COMMUNITY_PRODUCT_IDEAS,
              },
            ]}
            activeRoute={value === "discussion" ? "Answers" : "Comments"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>{value === "discussion" ? "Answers for," : "Comments for,"}</h1>
            <p>{discussionData?.title}</p>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters">
            <TabSwitch
              tabOptions={commentsTabOptionsList}
              onChange={handleTabClick}
              tabValue={activeTab}
            />
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={
              value === "discussion"
                ? archived
                  ? commentsArchiveHeader
                  : commentsHeader
                : archived
                ? productIdeaCommentsArchiveHeader
                : productIdeaCommentsHeader
            }
            gridData={commentList}
            gridActions={archived ? actions.splice(0, 1) : actions}
            onTableDataClick={handleRowClick}
            showLoader={tableLoader}
            loaderColSpan={commentsHeader.length}
            renderRowList={
              value === "discussion"
                ? commentsHeaderData
                : productIdeaCommentsHeaderData
            }
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
      {viewComment && (
        <BaseModal
          displayModal={viewComment}
          onClose={() => setViewComment(false)}
          hideSecondButton={true}
          firstButtonName="Close"
          title={value === "discussion" ? "Answer" : "Comment"}
          onConfirm={() => {
            return true;
          }}
        >
          <div
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(selectedRowData.unTouched_comment),
            }}
          ></div>
        </BaseModal>
      )}
    </div>
  );
};

export default AdminComments;
