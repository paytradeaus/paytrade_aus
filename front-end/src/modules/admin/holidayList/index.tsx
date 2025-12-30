"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { InputType } from "@/shared/constant/general";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  holidayListHeaders,
  holidayRenderData,
  holidayRenderWarningData,
  holidayWarningListHeaders,
} from "./holidayList.constant";
import { AdminListAllHolidays } from "./holidayList.functions";
import { useRouter } from "next/navigation";
import BaseModal from "@/components/BaseModal";
import {
  AdminUpdateHolidayDetails,
  ImportHolidayDetail,
} from "../AddUpdateHolidays/addUpdateHolidays.functions";
import { connectWebSocket } from "@/utils";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "@/components/Toaster";
import { useTokenDetails } from "@/hooks";
import { singleUploadApi } from "@/app/api/commonApi";

export default function HolidayList() {
  const router = useRouter();
  const [holidayGridData, setHolidayGridData] = useState([]);
  const [tableLoader, setTableLoader] = useState(false);
  const [sortValues, setSortValues] = useState<any>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const [displayUploadWarningModal, setDisplayUploadWarningModal] =
    useState(false);
  const [uploadWarningData, setUploadWarningData] = useState([]);
  const [uploadWarningAPIData, setUploadWarningAPIData] = useState<any>();

  const [actionData, setActionData] = useState<any>();
  const [isValidRecordAvailable, setIsValidRecordAvailable] = useState<any>();
  const { accessTokenId, decodeTokenData } = useTokenDetails();

  useEffect(() => {
    getHolidaysList(currentPage, entriesPerPage);
  }, [searchValue, sortValues]);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);

  function handleSearch(searchedValue: any) {
    if (currentPage != 1) {
      setCurrentPage(1);
    }
    if (entriesPerPage != 10) {
      setEntriesPerPage(10);
    }
    setSearchValue(searchedValue);
  }

  // Define actions dynamically
  const actions = [
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: any) =>
        router.push(`${AppRoutes.ADMIN_HOLIDAYS_EDIT}/${row?.id}`),
    },

    {
      label: "Delete",
      style: "contrast",
      icon: "fa-light fa-trash",
      onClick: (row: any) => {
        setActionData(row);
        setDisplayConfirmationModal(true);
      },
    },
  ];

  function handlePageChange(value: any) {
    setCurrentPage(value);
    getHolidaysList(value, entriesPerPage);
  }

  function handleRowsPerPageChange(value: any) {
    setEntriesPerPage(value);
    setCurrentPage(1);
    getHolidaysList(1, value);
  }

  async function getHolidaysList(
    page: number,
    rowsPerPage: number,
    selectedPlan?: string
  ) {
    try {
      setTableLoader(true);
      const postData = {
        keyword: searchValue ?? "",
        page: page,
        perPage: rowsPerPage,
        sortingOrder: sortValues?.direction || "",
        sortingField: sortValues?.sortKey || "",
      };
      const holidayListResponse = await AdminListAllHolidays(postData);

      let modifiedData = holidayListResponse?.holidays?.map((rowObj: any) => {
        return {
          ...rowObj,
          recurring_every_year: rowObj?.recurring_every_year ? "Yes" : "No",
        };
      });

      setHolidayGridData(modifiedData || []);
      setTotalRows(holidayListResponse?.totalCount || 0);

      setTableLoader(false);
    } catch {
      setTableLoader(false);
    }
  }

  async function handleDeleteHolidays() {
    try {
      setTableLoader(true);
      let payload = {
        updateHolidayDetailsInput: {
          id: actionData?.id,
          holiday_date: actionData?.holiday_date,
          holiday_name: actionData?.holiday_name,
          holiday_status: "Deleted",
          recurring_every_year: actionData?.recurring_every_year == "Yes",
        },
      };
      let changeStatusRes = await AdminUpdateHolidayDetails(payload);
      if (changeStatusRes) {
        await getHolidaysList(currentPage, entriesPerPage);
      }
      setTableLoader(false);
    } catch {
      setTableLoader(false);
    }
  }

  async function handleAddWarningHolidays(type: string) {
    try {
      setTableLoader(true);
      let payload = {
        attachmentId: uploadWarningAPIData?.id,
        actionType: type,
      };

      let changeStatusRes = await ImportHolidayDetail(payload);
      getHolidaysList(currentPage, entriesPerPage);
      setTableLoader(false);
    } catch {
      setTableLoader(false);
    }
  }

  async function handleDownloadPdfFile() {
    setDisablePDFBtn(true);

    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "holidays",
        status: "Active",
      });
      setDisablePDFBtn(false);
    } catch {
    } finally {
      setDisablePDFBtn(false);
    }
  }

  async function handleDownloadExcelFile() {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "holidays",
        status: "Active",
      });

      if (responseFileURL) {
        await downloadExcelFileFromAPI(responseFileURL);
      } else {
        showErrorToast("Failed to generate Excel file URL");
      }
    } catch {
    } finally {
      setDisableExcelBtn(false);
    }
  }

  async function handleUploadFileButton(file: any) {
    try {
      const { userId, emailId } = decodeTokenData;
      let userData = {
        admin_id: userId,
        uploaded_by: emailId,
        attachment_type: "Admin_holiday",
      };
      const fileResponse = await singleUploadApi(file, userData, accessTokenId);
      if (fileResponse?.status == "SUCCESS") {
        showSuccessToast(fileResponse?.message);
      } else if (fileResponse?.status == "WARNING") {
        showWarningToast(fileResponse?.message);
        setIsValidRecordAvailable(fileResponse?.is_valid_record_available);
        setTimeout(() => {
          setDisplayUploadWarningModal(true);
        }, 2000);
        setUploadWarningAPIData(fileResponse);
        setUploadWarningData(
          fileResponse?.holiday_record?.map((val: any) => {
            return {
              ...val,
              recurring_every_year:
                val?.recurring_every_year == "true" ? "Yes" : "No",
            };
          })
        );
      } else if (fileResponse?.status == "ERROR") {
        showErrorToast(fileResponse?.message);
      }
      getHolidaysList(currentPage, entriesPerPage);
    } catch {
    } finally {
      setDisableExcelBtn(false);
    }
  }

  return (
    <div>
      <div className="container-fluid">
        <div className="pt_title">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.ADMIN_DASHBOARD,
              },
              {
                name: "Masters",
                path: AppRoutes.ADMIN_MASTERS_LIST,
              },
            ]}
            activeRoute={"Holiday"}
          />

          <div className="grid pt_topfilters">
            <div className="pt_pagetitle">
              <h1>Holiday</h1>
            </div>

            <div className="pt_pageactions">
              <Link href={AppRoutes.ADMIN_HOLIDAYS_ADD} passHref legacyBehavior>
                <a className="pt_addnewbutton">
                  <button className="secondary">
                    <i className="fa-light fa-hexagon-plus"></i>Add holiday
                  </button>
                </a>
              </Link>
            </div>
          </div>
        </div>

        <div className="pt_filtergroup">
          <div className="grid pt_topfilters">
            <GridExportActions
              resetFilterFunction={() => {
                setEmptySearchField(true);
              }}
              hideResetButton={!searchValue}
              hideExcelButton={holidayGridData?.length == 0}
              hidePdfButton={holidayGridData?.length == 0}
              handleDownloadExcelFile={() => handleDownloadExcelFile()}
              disabledOnExcel={disableExcelBtn}
              exportFromAPI
              disabledPDF={disablePDFBtn}
              handleDownloadPrintPDF={() => handleDownloadPdfFile()}
              hideTemplateButton={false}
              hideUploadFileButton={false}
              excelFile={{
                tableData: [
                  {
                    holiday_name: "New year",
                    holiday_date: "01-01-" + (new Date().getFullYear() + 1),
                    recurring_every_year: "yes",
                  },
                ],
                sheetName: "Holidays",
                LabelAndValueKey: [
                  { label: "Holiday Name", value: "holiday_name" },
                  {
                    label: "Holiday Date",
                    value: "holiday_date",
                    isDate: true,
                  },
                  {
                    label: "Recurring yearly",
                    value: "recurring_every_year",
                  },
                ],
              }}
              handleUploadFileButton={(file) => handleUploadFileButton(file)}
            />
          </div>

          <div className="pt_filteroptions width_30">
            <FormikControl
              control={InputType.SEARCH}
              onChange={(value: any) => handleSearch(value)}
              clearSearch={emptySearchField}
              placeholder={"Search by name"}
            />
          </div>
        </div>

        <div className="grid">
          <div className="pt_box">
            <DynamicTable
              headers={holidayListHeaders}
              gridData={holidayGridData?.length > 0 ? holidayGridData : []}
              gridActions={actions}
              displayAllStaticActions={true}
              //   onRowClick={handleRowClick}
              showLoader={tableLoader}
              loaderColSpan={4}
              renderRowList={holidayRenderData}
              currentPage={currentPage}
              entriesPerPage={entriesPerPage}
              totalEntries={totalRows}
              hoverOnRowClick
              onEntriesPerPageChange={(value: any) =>
                handleRowsPerPageChange(value)
              }
              onPageChange={(value: any) => handlePageChange(value)}
              onSortChange={(sortConfig) => {
                if (holidayGridData?.length > 0) {
                  setSortValues(sortConfig);
                }
              }}
            />
          </div>
        </div>
      </div>
      {displayConfirmationModal && (
        <BaseModal
          modalId={"holidays delete modal"}
          displayModal={displayConfirmationModal}
          onHeaderIconClose={() => setDisplayConfirmationModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setDisplayConfirmationModal(false)}
          onConfirm={() => {
            handleDeleteHolidays();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">Are you sure you wish to delete?</h4>
        </BaseModal>
      )}
      {displayUploadWarningModal && (
        <BaseModal
          modalId={"Holidays warning list"}
          displayModal={displayUploadWarningModal}
          title="Holiday warning list"
          restrictOncloseFunctionInHeader
          onClose={() => {
            setDisplayUploadWarningModal(false);
            if (isValidRecordAvailable) {
              handleAddWarningHolidays("cancel");
            }
          }}
          onConfirm={() => {
            handleAddWarningHolidays("save");
            setDisplayUploadWarningModal(false);

            return true;
          }}
          firstButtonName={isValidRecordAvailable ? "Cancel" : "Close"}
          secondButtonName="Add remaining valid holidays"
          hideHeaderCloseIcon={true}
          hideSecondButton={isValidRecordAvailable ? false : true}
        >
          <DynamicTable
            headers={holidayWarningListHeaders}
            gridData={uploadWarningData?.length > 0 ? uploadWarningData : []}
            displayAllStaticActions={true}
            showLoader={tableLoader}
            loaderColSpan={4}
            renderRowList={holidayRenderWarningData}
            currentPage={1}
            entriesPerPage={uploadWarningData?.length}
            totalEntries={uploadWarningData?.length}
            hidePagination={true}
            hoverOnRowClick
          />
        </BaseModal>
      )}
    </div>
  );
}
