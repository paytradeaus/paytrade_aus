"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import BreadCrumbs from "@/components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import TabSwitch from "@/components/TabSwitch";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { getList } from "./community.functions";
import { format } from "date-fns";
import {
  categoryDropDownData,
  deleteTopic,
} from "@/modules/general/Community/community.functions";
import Link from "next/link";
import { slugifyString } from "@/utils";
import BaseModal from "@/components/BaseModal";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "@/components/Toaster";
import {
  discussionRenderData,
  discussionsHeader,
  productIdeaHeader,
  productIdeaRenderData,
  tabOptionsList,
} from "./community.constant";
import { generateBotQuestion, generateBotAnswers } from "./community.functions";

interface AdminTopicProps {
  value: string;
}

const AdminTopic: React.FC<AdminTopicProps> = ({ value }) => {
  const routePath = usePathname();
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState("");
  const [tableLoader, setTableLoader] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState({
    label: "All",
    value: "All",
  });
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [discussionData, setDiscussionData] = useState([]);
  const [selectedRowData, setSelectedRowData] = useState<any>(null);
  const [openDeleteTopicConfirmation, setOpenDeleteTopicConfirmation] =
    useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState(
    value === "discussion" ? "Discussions" : "Product ideas"
  );
  const [sortValues, setSortValues] = useState<any>("");
  const [botQuestionLoading, setBotQuestionLoading] = useState(false);
  const [botAnswerLoading, setBotAnswerLoading] = useState<string | null>(null);
  const [openBotAnswerConfirm, setOpenBotAnswerConfirm] = useState(false);

  useEffect(() => {
    getListData();
  }, [entriesPerPage, currentPage, selectedCategory, sortValues]);

  useEffect(() => {
    getCategory();
  }, []);

  const handleTabClick = (tabId: React.SetStateAction<string>) => {
    if (activeTab !== tabId) {
      setActiveTab(tabId);
      switch (tabId) {
        case "Discussions":
          router.push(AppRoutes.ADMIN_COMMUNITY_DISCUSSIONS);
          break;
        case "Product ideas":
          router.push(AppRoutes.ADMIN_COMMUNITY_PRODUCT_IDEAS);
          break;
        default:
          break;
      }
    }
  };

  const getListData = () => {
    const contentType = value === "discussion" ? "Discussion" : "Idea";
    setTableLoader(true);
    const sorKey: any = {
      title: "discussion_title",
      createdBy: "created_by",
      created_on: "created_on",
      isReported: "is_reported",
      view_count: "views",
      like_count: "likes",
      answer_comment_count: "answers",
      edited_on: "last_updated",
    };
    getList({
      listDiscussionIdeasInput: {
        keyword: search,
        page: currentPage,
        perPage: entriesPerPage,
        category:
          selectedCategory.value === "All" ? "" : selectedCategory.value,
        cmtyContentType: contentType,
        sort_mode: "",
        sorting_field: sorKey[sortValues?.sortKey] || undefined,
        sorting_order: sortValues?.direction || undefined,
      },
    }).then((res) => {
      setDiscussionData(
        res.discussionIdeas.map((val: any) => ({
          ...val,
          createdBy: val?.author
            ? `${val?.author?.first_name} ${val?.author?.last_name}`
            : `${val?.admin_author?.first_name} ${val?.admin_author?.last_name}`,
          created_on: format(val?.created_on, "dd/MM/yyyy"),
          edited_on: val?.edited_on ? format(val?.edited_on, "dd/MM/yyyy") : "",
          isReported:
            val?.flag_count > 0 ? (
              <i
                style={{
                  fontSize: "x-large",
                  WebkitTextStroke: "1px red",
                  cursor: "pointer",
                }}
                className="fa-light fa-check"
              ></i>
            ) : (
              ""
            ),
          answerCount: val?.answer_comment_count,
          answer_comment_count:
            val?.answer_comment_count > 0 ? (
              <span className="cu-pointer">{val?.answer_comment_count}</span>
            ) : (
              ""
            ),
          originalTitle: val.title,
          title:
            val?.title?.length > 20 ? (
              <span data-tooltip={val?.title} data-placement="right">
                {val?.title.slice(0, 20) + "..."}
              </span>
            ) : (
              val?.title
            ),
          vote_count: val.vote_count || "",
          view_count: val.view_count || "",
          like_count: val.like_count || "",
        }))
      );
      setTotalRows(res.totalCount);
      setTableLoader(false);
    });
  };

  const getCategory = () => {
    const masterType =
      value === "discussion" ? "Discussion Topic" : "Idea Category";
    categoryDropDownData({ masterType }).then((response) => {
      if (response.length > 0) {
        const options = response.map((each: any) => ({
          label: each.value,
          value: each.value,
        }));
        options.unshift({ label: "All", value: "All" });
        setCategoryOptions(options);
      }
    });
  };

  const handleGenerateBotQuestion = async () => {
    setBotQuestionLoading(true);
    try {
      const result = await generateBotQuestion();
      if (result?.success) {
        showSuccessToast(
          `Bot question created: "${result.questionTitle}" with ${result.answersCreated} answer(s)`
        );
        getListData();
      } else {
        showErrorToast(result?.message || "Failed to generate bot question");
      }
    } catch (error: any) {
      showErrorToast("Failed to generate bot question");
    } finally {
      setBotQuestionLoading(false);
    }
  };

  const handleGenerateBotAnswers = async () => {
    if (!selectedRowData) return;
    setBotAnswerLoading(selectedRowData.id);
    setOpenBotAnswerConfirm(false);
    try {
      const result = await generateBotAnswers(selectedRowData.id);
      if (result?.success) {
        showSuccessToast(
          `Generated ${result.answersCreated} bot answer(s) for this discussion`
        );
        getListData();
      } else {
        showErrorToast(result?.message || "Failed to generate bot answers");
      }
    } catch (error: any) {
      showErrorToast("Failed to generate bot answers");
    } finally {
      setBotAnswerLoading(null);
    }
  };

  const actions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: any) => {
        const path = value === "discussion" ? "discussions" : "product-ideas";
        console.log(row);
        router.push(
          `/community/${path}/${slugifyString(
            row?.category?.value || "All"
          )}/${slugifyString(row.originalTitle)}/${row.id}`
        );
      },
      displayByDefault: true,
    },
    ...(value === "discussion"
      ? [
          {
            label: botAnswerLoading ? "Generating..." : "Generate Bot Answers",
            icon: botAnswerLoading ? "fa-light fa-spinner fa-spin" : "fa-light fa-robot",
            style: "primary",
            onClick: (row: any) => {
              if (botAnswerLoading) return;
              setSelectedRowData(row);
              setOpenBotAnswerConfirm(true);
            },
            displayByDefault: true,
          },
        ]
      : []),
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
    const path = value === "discussion" ? "discussions" : "product-ideas";
    if (dataKey.key == "isReported" && row?.flag_count > 0) {
      if (row.flag_reason_discussion == "no comments") {
        showInfoToast("no comments");
      } else {
        router.push(
          `/admin/community/${path}/reported/${row.id}/${row.discussion_idea_id}`
        );
      }
    } else if (dataKey.key == "answer_comment_count" && row?.answerCount > 0) {
      router.push(
        `/admin/community/${path}/comments/${row.id}/${row.discussion_idea_id}`
      );
    }
  };

  const handleDeleteTopic = async () => {
    const response = await deleteTopic({
      updateContentInput: {
        id: selectedRowData.id,
        discussion_idea_status: "Deleted",
      },
    });
    if (response) {
      showSuccessToast(
        `${
          value === "discussion" ? "Discussion" : "Product idea"
        } deleted successfully`
      );
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
            ]}
            activeRoute={activeTab}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>{activeTab}</h1>
          </div>
          <div className="pt_pageactions" style={{ display: "flex", gap: "8px" }}>
            {value === "discussion" && (
              <button
                className="contrast"
                onClick={handleGenerateBotQuestion}
                disabled={botQuestionLoading}
                style={{ whiteSpace: "nowrap" }}
              >
                <i className={botQuestionLoading ? "fa-light fa-spinner fa-spin" : "fa-light fa-robot"}></i>
                {botQuestionLoading ? "Generating..." : "Generate Bot Question"}
              </button>
            )}
            <a className="pt_addnewbutton">
              <Link
                href={
                  value === "discussion"
                    ? "/community/start-discussion"
                    : "/community/create-product-idea"
                }
              >
                <button className="secondary">
                  <i className="fa-light fa-hexagon-plus"></i>
                  {value === "discussion"
                    ? "Start a discussion"
                    : "Create product idea"}
                </button>
              </Link>
            </a>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters">
            <TabSwitch
              tabOptions={tabOptionsList}
              onChange={handleTabClick}
              tabValue={activeTab}
            />
          </div>
          <GridExportActions
            resetFilterFunction={() =>
              setSelectedCategory({ label: "All", value: "All" })
            }
            hideExcelButton={true}
            hidePdfButton={true}
            hideResetButton={selectedCategory.value == "All" ? true : false}
          />
        </div>
        <div className="pt_filteroptions" style={{ width: "25vw" }}>
          <SearchableSelect
            placeholder="Search category"
            name="accountType"
            options={categoryOptions}
            selectedData={selectedCategory}
            renderKey="label"
            valueKey="value"
            onChange={(value) => setSelectedCategory(value)}
          />
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={
              value === "discussion" ? discussionsHeader : productIdeaHeader
            }
            gridData={discussionData}
            gridActions={actions}
            onTableDataClick={handleRowClick}
            showLoader={tableLoader}
            loaderColSpan={
              value === "discussion"
                ? discussionsHeader.length
                : productIdeaHeader.length
            }
            renderRowList={
              value === "discussion"
                ? discussionRenderData
                : productIdeaRenderData
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
      {openBotAnswerConfirm && (
        <BaseModal
          displayModal={openBotAnswerConfirm}
          onClose={() => setOpenBotAnswerConfirm(false)}
          secondButtonName="Generate"
          firstButtonName="Cancel"
          title=""
          onConfirm={() => {
            handleGenerateBotAnswers();
            return true;
          }}
        >
          <h4 className="text_center">
            Generate 1-3 bot answers for this discussion?
          </h4>
          <p className="text_center" style={{ marginTop: "8px", color: "#666" }}>
            This will use AI to create realistic community responses.
          </p>
        </BaseModal>
      )}
    </div>
  );
};

export default AdminTopic;
