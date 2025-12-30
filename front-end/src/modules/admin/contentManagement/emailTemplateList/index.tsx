"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { InputType, NA } from "@/shared/constant/general";

import Link from "next/link";
import React, { useEffect, useState } from "react";

import TabSwitch from "@/components/TabSwitch";

import { useRouter } from "next/navigation";
import { IMailDetails } from "../contentManagement.types";
import { fetchEmailList } from "./emailTemplateList.function";
import {
  mailHeaders,
  mailRenderData,
  statusOptions,
  tabs,
} from "./emailTemplateList.constant";
import { connectWebSocket } from "@/utils";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";

export default function EmailTemplateList() {
  const [mailListData, setMailListData] = useState<IMailDetails[]>([]);
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");

  const [statusType, setStatusType] = useState("All");
  const [totalRows, setTotalRows] = useState(0);
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [emptySearchField, setEmptySearchField] = useState(false);
  const isAnyFilterActive = statusType !== "All" || searchValue;
  const [activeTab, setActiveTab] = useState("Email Templates");
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [sortValues, setSortValues] = useState<any>("");
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  useEffect(() => {
    getListOfMail();
  }, [searchValue, statusType, currentPage, entriesPerPage, sortValues]);

  // Define actions dynamically
  const currentActions = [
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: IMailDetails) => {
        router.push(`${AppRoutes.ADMIN_CONTENT_MANAGEMENT_EMAIL}/${row?.id}`);
      },
    },
  ];

  // Row click handler
  const handleRowClick = (row: IMailDetails) => {
    router.push(`${AppRoutes.ADMIN_CONTENT_MANAGEMENT_EMAIL}/${row?.id}`);
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
  async function getListOfMail() {
    try {
      if (emptySearchField) {
        setEmptySearchField(false);
      }
      setTableLoader(true);

      const payload = {
        page: currentPage,
        perPage: entriesPerPage,
        keyword: searchValue,
        category: statusType === "All" ? null : statusType,
        mailType: null,
        sortingOrder: sortValues?.direction || "",
        sortingField: sortValues?.sortKey || "",
      };
      const response = await fetchEmailList(payload);

      if (response?.mailTemplates?.length > 0) {
        const modifiedGridData = response?.mailTemplates.map((listObj: any) => {
          return {
            ...listObj,
            updated_on: listObj?.updated_on,
          };
        });

        setMailListData(modifiedGridData);
      } else {
        setMailListData([]);
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
        screen_name: "content_email_template",
        keyword: searchValue,
        category: statusType === "All" ? null : statusType,
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
        screen_name: "content_email_template",
        keyword: searchValue,
        category: statusType === "All" ? null : statusType,
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
              {
                name: "Content Management",
                path: AppRoutes.ADMIN_CONTENT_MANAGEMENT,
              },
            ]}
            activeRoute={"Email Templates"}
          />
        </div>
        <br />
        <div className="pt_pagetitle">
          <h1>Content management</h1>
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            {/* <h1>Manage Admin Users</h1> */}
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
                hideExcelButton={mailListData.length > 0 ? false : true}
                hidePdfButton={mailListData.length > 0 ? false : true}
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
            placeholder={"Search by subject"}
            control={InputType.SEARCH}
            onChange={(value: any) => {
              if (currentPage !== 1) setCurrentPage(1);
              setSearchValue(value);
            }}
            clearSearch={emptySearchField}
          />

          <FormikControl
            placeholder={"Module"}
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
            headers={mailHeaders}
            gridData={mailListData?.length > 0 ? mailListData : []}
            gridActions={currentActions}
            onRowClick={handleRowClick}
            showLoader={tableLoader}
            loaderColSpan={10}
            renderRowList={mailRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
            hoverOnRowClick
            displayAllStaticActions
            onSortChange={(sortConfig) => {
              if (mailListData?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
