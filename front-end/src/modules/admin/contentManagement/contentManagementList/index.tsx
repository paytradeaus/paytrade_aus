"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { InputType } from "@/shared/constant/general";

import Link from "next/link";
import React, { useEffect, useState } from "react";

import { connectWebSocket } from "@/utils";
import { IContentManagementDetails } from "../contentManagement.types";
import { AdminListAllContents } from "./contentManagementList.function";
import {
  contentManagementHeaders,
  contentManagementRenderData,
  statusOptions,
  tabs,
} from "./contentManagementList.constant";
import TabSwitch from "@/components/TabSwitch";
import { useRouter } from "next/navigation";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";

export default function ContentManagementList() {
  const [contentManagementListData, setContentManagementListData] = useState<
    IContentManagementDetails[]
  >([]);
  const router = useRouter();
  const [statusType, setStatusType] = useState("All");
  const [totalRows, setTotalRows] = useState(0);
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState("Page List");
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [sortValues, setSortValues] = useState<any>("");
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  const [emptySearchField, setEmptySearchField] = useState(false);
  const isAnyFilterActive = statusType !== "All";

  useEffect(() => {
    fetchAdminUsersLists();
  }, [statusType, currentPage, entriesPerPage, sortValues]);

  // Define actions dynamically
  const currentActions = [
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",

      onClick: (row: IContentManagementDetails) => {
        router.push(`${AppRoutes.ADMIN_CONTENT_MANAGEMENT}/${row?.id}`);
      },
    },
  ];
  const handleRowClick = (id: any) => {
    router.push(`${AppRoutes.ADMIN_CONTENT_MANAGEMENT}/${id}`);
  };
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

  async function fetchAdminUsersLists() {
    try {
      if (emptySearchField) {
        setEmptySearchField(false);
      }
      setTableLoader(true);
      const payload = {
        page: currentPage,
        perPage: entriesPerPage,
        keyword: null,
        pageType: statusType === "All" ? null : statusType,
        sortingOrder: sortValues?.direction || "",
        sortingField: sortValues?.sortKey || "",
      };
      const response = await AdminListAllContents(payload);

      if (response?.Contents?.length > 0) {
        const modifiedGridData = response?.Contents.map((listObj: any) => {
          return {
            ...listObj,
            names: listObj?.first_name
              ? `${listObj.first_name} ${listObj?.last_name || ""}`
              : listObj?.last_name || "",
            updated_on: listObj?.updated_on,
          };
        });

        setContentManagementListData(modifiedGridData);
      } else {
        setContentManagementListData([]);
      }

      setTotalRows(response?.totalCount || 0);
    } catch (err: any) {
    } finally {
      setTableLoader(false);
    }
  }

  const handleResetFilters = () => {
    setStatusType("All");
    setCurrentPage(1);
    setEntriesPerPage(10);
    setEmptySearchField(true);
  };

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "content_page",
        keyword: null,
        pageType: statusType === "All" ? null : statusType,
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
        screen_name: "content_page",
        keyword: null,
        pageType: statusType === "All" ? null : statusType,
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
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
                path: AppRoutes.ADMIN_DASHBOARD,
              },
            ]}
            activeRoute={"Content management"}
          />
        </div>

        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Content management</h1>
          </div>
          <div className="pt_pageactions">
            <Link href={""} passHref legacyBehavior>
              <a style={{ cursor: "auto" }}>
                <button style={{ visibility: "hidden" }}>
                  <i className="fa-light fa-hexagon-plus"></i>
                  {""}
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
                resetFilterFunction={() => handleResetFilters()}
                hideExcelButton={true}
                hidePdfButton={true}
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
          <div>
            <FormikControl
              placeholder={"Page Type"}
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
      </div>
      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={contentManagementHeaders}
            gridData={
              contentManagementListData?.length > 0
                ? contentManagementListData
                : []
            }
            gridActions={currentActions}
            onRowClick={(data: any) => handleRowClick(data?.id)}
            showLoader={tableLoader}
            loaderColSpan={10}
            renderRowList={contentManagementRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
            hoverOnRowClick
            displayAllStaticActions
            onSortChange={(sortConfig) => {
              if (contentManagementListData?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
