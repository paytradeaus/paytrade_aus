"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { DELETE, InputType, NA } from "@/shared/constant/general";

import Link from "next/link";
import React, { useEffect, useState } from "react";

import TabSwitch from "@/components/TabSwitch";
import {
  fetchCategories,
  fetchFaqList,
  postFaqOptions,
  reorderFaq,
} from "../faq.function";
import { IFaqDetails } from "../../contentManagement.types";
import {
  excelColumnNames,
  faqHeaders,
  faqPDFHeaders,
  faqRenderData,
  pdfDataRow,
  statusOptions,
  tabs,
} from "../faq.constant";
import { useRouter } from "next/navigation";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import BaseModal from "@/components/BaseModal";
import { useLoaderContext } from "@/context/useLoader";
import { connectWebSocket } from "@/utils";

type UserData = {
  id: number;
  category: any;
  question: string;
  answer: string;
  faq_status: string;
  selectedOption?: string;
  messages?: string;
};

export default function FaqList() {
  const [faqListData, setFaqListData] = useState<IFaqDetails[]>([]);
  const router = useRouter();
  const [homeCount, setHomeCount] = useState<any>();
  const [searchValue, setSearchValue] = useState("");
  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const [displayWarningModal, setDisplayWarningModal] = useState(false);
  const { loader, setLoader }: any = useLoaderContext();
  const [rowData, setRowData] = useState<UserData | null>(null);
  const [actionData, setActionData] = useState<any>();

  const [statusType, setStatusType] = useState("All");
  const [totalRows, setTotalRows] = useState(0);
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categoryOptions, setCategoryOptions] = useState<any>([]);
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [popUpHeaderMsg, setPopUpHeaderMsg] = useState("");
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  const isAnyFilterActive =
    statusType !== "All" || selectedCategory !== "All" || searchValue;
  const [activeTab, setActiveTab] = useState("FAQs");

  const SWAP_UP = "swapUp";
  const SWAP_DOWN = "swapDown";
  const handleStatusToggle = (row: IFaqDetails) => {
    setFaqListData((prevData) =>
      prevData.map((faq) =>
        faq.id === row.id
          ? {
              ...faq,
              status: faq.status === "Inactive" ? "Active" : "Inactive",
            }
          : faq
      )
    );
  };
  useEffect(() => {
    getCategoryOptions();
  }, []);

  useEffect(() => {
    getListOfFaq();
  }, [searchValue, statusType, currentPage, entriesPerPage, selectedCategory]);

  // Define actions dynamically
  const currentActions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: IFaqDetails) => {
        router.push(
          `${AppRoutes.ADMIN_CONTENT_MANAGEMENT_EDIT}/${row?.id}?mode=edit`
        );
      },
      displayByDefault: true,
    },
    {
      label: "Mark as inactive",
      icon: "fa-light fa-hexagon-xmark",
      onClick: (row: IFaqDetails) => {
        setActionData({
          ...row,
          option: "Mark as inactive",
          status: "Inactive",
          Id: row?.id,
        });

        setPopUpHeaderMsg("Are you sure, do you want to inactive the faq?");
        setDisplayConfirmationModal(true);
      },
      conditionalApiDisplayKey: "markInActive",
    },
    {
      label: "Mark as active",
      icon: "fa-light fa-hexagon-check",
      onClick: (row: IFaqDetails) => {
        setActionData({
          ...row,
          option: "Mark as active",
          status: "Active",
          Id: row?.id,
        });

        setPopUpHeaderMsg("Are you sure, do you want to active the faq?");
        setDisplayConfirmationModal(true);
      },
      conditionalApiDisplayKey: "markActive",
    },
    {
      label: "Feature on home",
      icon: "fa-light fa-house-circle-check",
      onClick: (row: IFaqDetails) => {
        if (homeCount >= 4) {
          setPopUpHeaderMsg(
            " Already 4 FAQs are selected. Please remove an existing one to add a new FAQ."
          );
          setDisplayWarningModal(true);
        } else {
          setActionData({
            ...row,
            option: "Feature on home",
            Id: row?.id,
            homeKey: !row?.show_in_home,
          });

          setPopUpHeaderMsg(
            "Are you sure, do you want to feature this FAQ on the homepage?"
          );
          setDisplayConfirmationModal(true);
        }
      },
      conditionalApiDisplayKey: "showInHome",
    },
    {
      label: "Remove from home",
      icon: "fa-light fa-house-circle-xmark",
      style: "primary",
      onClick: (row: IFaqDetails) => {
        setActionData({
          ...row,
          option: "Remove from home",
          Id: row?.id,
          homeKey: !row?.show_in_home,
        });

        setPopUpHeaderMsg(
          "Are you sure, do you want to remove this FAQ from the homepage?"
        );
        setDisplayConfirmationModal(true);
      },
      conditionalApiDisplayKey: "removeFromHome",
    },
    {
      label: "Delete",
      style: "contrast",
      icon: "fa-light fa-trash",
      onClick: (row: IFaqDetails) => {
        setActionData({
          ...row,
          option: "Deleted",
          status: "Deleted",
          Id: row?.id,
        });

        setPopUpHeaderMsg("Are you sure, do you want to delete the faq?");
        setDisplayConfirmationModal(true);
      },
      displayByDefault: true,
    },
  ];

  // Row click handler
  const handleRowClick = (row: IFaqDetails) => {
    router.push(
      `${AppRoutes.ADMIN_CONTENT_MANAGEMENT_EDIT}/${row?.id}?mode=edit`
    );
  };

  async function getCategoryOptions() {
    await fetchCategories()
      .then((data: any) => {
        const response = data?.adminfetchAllMasterTypeDetails?.data;
        if (response && response?.length > 0) {
          const modifiedResponse = response.map((x: any) => {
            return { ...x, label: x?.value, value: x?.value };
          });
          setCategoryOptions([
            { label: "All", value: "All" },
            ...modifiedResponse,
          ]);
        } else {
          setCategoryOptions([{ label: "All", value: "All" }]);
        }
      })
      .catch((error: any) => {
        setCategoryOptions([{ label: "All", value: "All" }]);
        console.error("~ handleSubmit ~ error:", error);
      });
  }

  const handleTabClick = (tabId: string) => {
    if (activeTab !== tabId) {
      setActiveTab(tabId);
      switch (tabId) {
        case "Page List":
          router.push(AppRoutes.ADMIN_CONTENT_MANAGEMENT);
          break;
        case "FAQs":
          router.push(AppRoutes.ADMIN_CONTENT_MANAGEMENT_FAQ);
          break;
        case "Email Templates":
          router.push(AppRoutes.ADMIN_CONTENT_MANAGEMENT_EMAIL);
          break;
        default:
          break;
      }
    }
  };

  async function getListOfFaq() {
    try {
      if (emptySearchField) {
        setEmptySearchField(false);
      }
      setTableLoader(true);

      const payload = {
        page: currentPage,
        perPage: entriesPerPage,
        keyword: searchValue,
        faqstatus: statusType === "All" ? null : statusType,
        category: selectedCategory === "All" ? null : selectedCategory,
      };
      const response = await fetchFaqList(payload);

      if (response?.FAQs?.length > 0) {
        const HomeCount = response?.showInHomeCount;
        setHomeCount(HomeCount);
        const modifiedGridData = response?.FAQs.map((listObj: any) => {
          return {
            ...listObj,
            faq_list_actions: {
              markActive: listObj?.faq_status === "Inactive",
              markInActive: listObj?.faq_status === "Active",
              showInHome: !listObj?.show_in_home,
              removeFromHome: listObj?.show_in_home,
            },
            category: listObj?.category?.value,
            orderChange: (
              <>
                <button
                  className="secondary"
                  // style={{ padding: "5px", cursor: "pointer" }}
                  onClick={(e: any) => {
                    handleOrderChange(
                      selectedCategory,
                      response?.FAQs,
                      listObj,
                      SWAP_UP
                    );
                    e.stopPropagation();
                  }}
                >
                  {/* <i className="fa-light fa-circle-arrow-up fa-xl"></i> */}
                  <i className="fa-light fa-arrow-up-from-line"></i>
                </button>
                <button
                  className="primary"
                  onClick={(e: any) => {
                    handleOrderChange(
                      selectedCategory,
                      response?.FAQs,
                      listObj,
                      SWAP_DOWN
                    );
                    e.stopPropagation();
                  }}
                  // style={{ padding: "5px", cursor: "pointer" }}
                >
                  {/* <i className="fa-light fa-circle-arrow-down fa-xl"></i> */}
                  <i className="fa-light fa-arrow-down-from-line"></i>
                </button>
              </>
            ),
          };
        });
        setFaqListData(modifiedGridData);
      } else {
        setFaqListData([]);
      }

      setTotalRows(response?.totalCount || 0);
    } catch (err: any) {
    } finally {
      setTableLoader(false);
    }
  }

  const handleOrderChange = async (
    Categoryname: any,
    ListData: any,
    curObj: any,
    typeOfSwap: string
  ) => {
    // Find the index of the current FAQ object in the list
    const curIndex = ListData.findIndex((x: any) => x?.id === curObj?.id);
    // Exit the function if the current object is not found in the list
    if (curIndex === -1) return;

    let swapIndex = null;
    // Determine the index to swap based on the type of swap operation
    if (typeOfSwap === SWAP_UP && curIndex > 0) {
      swapIndex = curIndex - 2;
    } else if (typeOfSwap === SWAP_DOWN && curIndex < ListData.length - 1) {
      swapIndex = curIndex + 1; // If the reordering was successful, refresh the list of FAQ items
    }

    // Retrieve the FAQ object to swap with
    const swapObject: any = swapIndex !== null && ListData[swapIndex];

    // Prepare the data for reordering
    const postData = {
      updateOrderInput: {
        category: Categoryname === "All" ? "" : Categoryname ?? null,
        faqId: curObj?.id ?? null,
        previousFaqId: swapObject?.id ?? null,
      },
    };
    // Send a request to reorder the FAQ items
    const response = await reorderFaq(postData);
    // If the reordering was successful, refresh the list of FAQ items
    if (response) {
      getListOfFaq();
    }
  };

  const handleResetFilters = () => {
    setStatusType("All");
    setSelectedCategory("All");
    setCurrentPage(1);
    setEntriesPerPage(10);
    setEmptySearchField(true);
  };

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "content_faq",
        keyword: searchValue,
        faq_status: statusType === "All" ? null : statusType,
        category: selectedCategory === "All" ? null : selectedCategory,
      });

      if (responseFileURL) {
        await downloadExcelFileFromAPI(responseFileURL);
      } else {
        showErrorToast("Failed to generate Excel file URL");
      }
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisableExcelBtn(false);
    }
  };

  const handleDownloadPdfFile = async () => {
    setDisablePDFBtn(true);
    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "content_faq",
        keyword: searchValue,
        faq_status: statusType === "All" ? null : statusType,
        category: selectedCategory === "All" ? null : selectedCategory,
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  };

  async function handleOptionSelection() {
    setLoader(true);

    const postData: any = {
      updateFaqInput: {
        id: actionData?.Id,
        question: "",
        faq_status: actionData?.status,
        categoryId: null,
        answer: "",
        show_in_home: actionData?.homeKey,
      },
    };

    const response = await postFaqOptions(postData);
    if (response) {
      getListOfFaq();
      // showSuccessToast("FAQ list updated successfully");
    } else {
      showErrorToast("FAQ list update failed");
    }
    setDisplayConfirmationModal(false);
    setLoader(false);
  }

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.ADMIN_DASHBOARD,
              },
              {
                name: "Content Management",
                path: AppRoutes.ADMIN_CONTENT_MANAGEMENT,
              },
            ]}
            activeRoute={"FAQs"}
          />
          <br />
          <div className="pt_pagetitle">
            <h1>Content management</h1>
          </div>
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">{/* <h1>FAQs</h1> */}</div>
          <div className="pt_pageactions">
            <Link
              href={"/admin/content-management/faq/add"}
              passHref
              legacyBehavior
            >
              <a className="pt_addnewbutton">
                <button className="secondary">
                  <i className="fa-light fa-hexagon-plus"></i>Add FAQ
                </button>
              </a>
            </Link>
          </div>
        </div>
      </div>
      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters">
            <div role="group">
              <TabSwitch
                tabOptions={tabs}
                onChange={(value: any) => handleTabClick(value)}
              />
            </div>
          </div>
          <div className="pt_pageactions">
            <div className="actionbuttons">
              <GridExportActions
                excelFile={{
                  sheetName: "faq list",
                  tableData: faqListData,
                  LabelAndValueKey: excelColumnNames,
                }}
                pdfFile={{
                  fileName: "faq list",
                  headerRow: faqPDFHeaders,
                  tableData: faqListData,
                  dataRow: pdfDataRow,
                }}
                resetFilterFunction={() => handleResetFilters()}
                hideExcelButton={faqListData.length > 0 ? false : true}
                hidePdfButton={faqListData.length > 0 ? false : true}
                hideResetButton={!isAnyFilterActive}
                handleDownloadExcelFile={() => {
                  handleDownloadExcelFile();
                }}
                disabledOnExcel={disableExcelBtn}
                exportFromAPI={true}
                disabledPDF={disablePDFBtn}
                handleDownloadPrintPDF={() => {
                  handleDownloadPdfFile();
                }}
              />
            </div>
          </div>
        </div>
        <div className="pt_filteroptions">
          <FormikControl
            placeholder={"Search by questions"}
            control={InputType.SEARCH}
            onChange={(value: any) => {
              if (currentPage !== 1) setCurrentPage(1);
              setSearchValue(value);
            }}
            clearSearch={emptySearchField}
          />

          <FormikControl
            placeholder={"Category"}
            name="Category"
            options={categoryOptions}
            control={InputType.SELECT}
            value={selectedCategory}
            renderKey="label"
            valueKey="value"
            onChange={(value: any) => {
              setCurrentPage(1);
              setSelectedCategory(value);
            }}
          />

          <FormikControl
            placeholder={"Status"}
            name="status"
            options={statusOptions}
            control={InputType.SELECT}
            value={statusType}
            renderKey="label"
            valueKey="value"
            onChange={(value: any) => {
              setCurrentPage(1);
              setStatusType(value);
            }}
          />
        </div>
      </div>
      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={faqHeaders}
            gridData={faqListData?.length > 0 ? faqListData : []}
            gridActions={currentActions}
            onRowClick={handleRowClick}
            showLoader={tableLoader}
            loaderColSpan={10}
            renderRowList={faqRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
            hoverOnRowClick
            dynamicApiGridIconsKey="faq_list_actions"
          />
        </div>
      </div>
      {displayConfirmationModal && (
        <BaseModal
          modalId="resetPasswordModal"
          displayModal={displayConfirmationModal}
          onClose={() => {
            setDisplayConfirmationModal(false);
          }}
          onConfirm={async () => {
            handleOptionSelection();
            return true;
          }}
          firstButtonName="Cancel"
          secondButtonName="Yes"
        >
          {/* Modal heading can be placed here if needed */}
          <div className="text_center">
            {popUpHeaderMsg || "Do you want to reset password?"}
          </div>
        </BaseModal>
      )}
      {displayWarningModal && (
        <BaseModal
          modalId="homewarning"
          displayModal={displayWarningModal}
          onClose={() => {
            setDisplayWarningModal(false);
          }}
          firstButtonName="Cancel"
          hideSecondButton
        >
          {/* Modal heading can be placed here if needed */}
          <div className="text_center">{popUpHeaderMsg || "FAQ"}</div>
        </BaseModal>
      )}
    </div>
  );
}
