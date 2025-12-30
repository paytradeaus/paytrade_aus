"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  DateFormat,
  filterByDuration,
  InputType,
} from "@/shared/constant/general";
import React, { useEffect, useState } from "react";
import {
  allOption,
  noticesListArchiveHeaders,
  noticesListHeaders,
  noticesListPDFHeaders,
  noticesRenderData,
  pdfDataRow,
  statusNotices,
} from "./noticesList.constant";
import BaseModal from "@/components/BaseModal";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { fetchFiltersForAdminNotices } from "./noticesList.functions";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";

import { connectWebSocket, formatDate, getDatePickerFormat } from "@/utils";
import { useLoaderContext } from "@/context/useLoader";
import TabSwitch from "@/components/TabSwitch";
import { listTabOptions } from "@/shared/constant/data";
import { useRouter } from "next/navigation";
import {
  getNoticesListServices,
  UpdateNotice,
} from "@/modules/user/Notices/notices.functions";

export default function AdminNotices({ archiveMode }: any) {
  const router = useRouter();
  const { setLoader }: any = useLoaderContext();

  const [noticesListData, setNoticesListData] = useState<any[]>([]);
  const [selectedNoticesType, setSelectedNoticesType] = useState<any>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [tabStatus] = useState(archiveMode ? "Archived" : "Current");
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [accDropdownOptions, setAccDropdownOptions] = useState<any[]>([]);
  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const [actionData, setActionData] = useState<any>();
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [companyDropdownOptions, setCompanyDropdownOptions] = useState<any>([]);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<any>("All dates");
  const [activityLogStartDate, setActivityLogStartDate] = useState(
    getDatePickerFormat()
  );
  const [activityLogEndDate, setActivityLogEndDate] = useState(
    getDatePickerFormat()
  );
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [noticesTypeOptions, setNoticesTypeOptions] = useState<any>([]);
  const [selectedNoticesStatus, setSelectedNoticesStatus] = useState<
    string | null
  >(null);
  const [sortValues, setSortValues] = useState<any>("");
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  useEffect(() => {
    initialInvoke();
  }, []);

  function initialInvoke() {
    setSelectedNoticesStatus(statusNotices[1]?.value);
    getNoticesFilter();
  }

  useEffect(() => {
    getNoticesList(currentPage, entriesPerPage, statusNotices[1]?.value);
  }, [
    selectedCompany,
    selectedDate,
    selectedNoticesType,
    activityLogStartDate,
    activityLogEndDate,
    selectedAccount,
    sortValues,
  ]);

  // Define actions dynamically
  const gridActions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: any) => {
        router.push(
          `${AppRoutes.ADMIN_NOTICES_VIEW}/${row?.id}?prevTab=${tabStatus}`
        );
      },
    },
    {
      label: "Mark as sent",
      style: "contrast",
      icon: "fa-light fa-file-check",
      onClick: (row: any) => {
        setActionData(row);
        setDisplayConfirmationModal(true);
      },
      comparisonRowKey: "status",
      conditionalComparisonData: "Sending",
    },
  ];

  async function getNoticesList(
    page: number,
    rowsPerPage: number,
    selectedNoticeStatus?: string | null
  ) {
    try {
      setTableLoader(true);
      setNoticesListData([]);
      const postData = {
        company_id: selectedCompany?.value ? +selectedCompany?.value : null,
        delegated_qbcc: true,
        payment_id: null,
        page: page,
        items_per_page: rowsPerPage,
        notice_type: selectedNoticesType?.value || null,
        status: archiveMode ? "Deleted" : selectedNoticeStatus,
        payment_claim_id: null,
        bank_account_id: selectedAccount?.value
          ? +selectedAccount?.value
          : null,
        date_filter: selectedDate == "All dates" ? "" : selectedDate || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
        sorting_order: sortValues?.direction || "",
        sorting_field: sortValues?.sortKey || "",
      };

      const response: any = await getNoticesListServices(postData);

      if (response?.notices_list?.length) {
        setNoticesListData(
          response.notices_list.map((x: any) => {
            return {
              ...x,
              notice_date: formatDate(x?.notice_date),
            };
          }) ?? []
        );
      } else {
        setNoticesListData([]);
      }
      setTotalRows(response?.total_count || 0);

      setTableLoader(false);
    } catch (err: any) {
      setTableLoader(false);
    }
  }

  async function getNoticesFilter() {
    const postData = {
      company_id: selectedCompany?.value || null,
      bank_account_id: selectedAccount || null,
      account_type: "",
      notice_type: selectedNoticesType?.value || null,
      status: archiveMode ? "Deleted" : "",
      delegated_qbcc: true,
    };
    const result = await fetchFiltersForAdminNotices(postData);
    if (result) {
      setCompanyDropdownOptions(
        result.company_list?.length ? [allOption, ...result.company_list] : []
      );
      setAccDropdownOptions(
        result.account_list?.length ? [allOption, ...result.account_list] : []
      );
      setNoticesTypeOptions(
        result.notice_type_list?.length
          ? [allOption, ...result.notice_type_list]
          : []
      );
    }
  }

  async function handleSendNotices() {
    try {
      setDisplayConfirmationModal(false);
      setLoader(true);
      let postData = {
        notice_id: actionData?.notice_id,
        status: "Sent",
      };
      const response = await UpdateNotice(postData, true);

      if (response) {
        await getNoticesList(1, entriesPerPage, selectedNoticesStatus);
      }
      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  function handlePageChange(value: any) {
    setCurrentPage(value);
    getNoticesList(value, entriesPerPage);
  }

  function handleRowsPerPageChange(value: any) {
    setEntriesPerPage(value);
    setCurrentPage(1);
    getNoticesList(1, value);
  }

  function handleCompanyChange(selectedValue: string) {
    setSelectedCompany(selectedValue);
  }

  function handleNoticesChange(selectionOption: any) {
    setSelectedNoticesType(selectionOption);
  }

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "notices",
        company_id: selectedCompany?.value ? +selectedCompany?.value : null,
        delegated_qbcc: true,
        payment_id: null,
        page: currentPage,
        items_per_page: entriesPerPage,
        notice_type: selectedNoticesType?.value || null,
        status: archiveMode
          ? "Deleted"
          : selectedNoticesStatus == "All"
          ? null
          : selectedNoticesStatus,
        payment_claim_id: null,
        bank_account_id: selectedAccount?.value
          ? +selectedAccount?.value
          : null,
        date_filter: selectedDate == "All dates" ? "" : selectedDate || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
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
        screen_name: "notices",
        company_id: selectedCompany?.value ? +selectedCompany?.value : null,
        delegated_qbcc: true,
        payment_id: null,
        page: currentPage,
        items_per_page: entriesPerPage,
        notice_type: selectedNoticesType?.value || null,
        status: archiveMode
          ? "Deleted"
          : selectedNoticesStatus == "All"
          ? null
          : selectedNoticesStatus,
        payment_claim_id: null,
        bank_account_id: selectedAccount?.value
          ? +selectedAccount?.value
          : null,
        date_filter: selectedDate == "All dates" ? "" : selectedDate || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  };

  function handleActivityChange(selectedValue: any) {
    if (selectedDate === "Custom") {
      setActivityLogStartDate(getDatePickerFormat());
      setActivityLogEndDate(getDatePickerFormat());
    }
    setSelectedDate(selectedValue);
    if (selectedValue === "Custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
    }
  }

  function handleTabChange(value: string) {
    router.push(
      value === "Archived"
        ? AppRoutes.ADMIN_NOTICES_ARCHIVE
        : AppRoutes.ADMIN_NOTICES_CURRENT
    );
  }

  function handleAccountChange(selectedValue: any) {
    setSelectedAccount(selectedValue);
  }

  function handleNoticeStatusChange(selectedStatus: string) {
    setSelectedNoticesStatus(selectedStatus);
    getNoticesList(
      currentPage,
      entriesPerPage,
      selectedStatus == "All" ? null : selectedStatus
    );
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
            ]}
            activeRoute={"Notices"}
          />

          <div className="grid pt_topfilters">
            <div className="pt_pagetitle">
              <h1>Notices</h1>
            </div>
          </div>
        </div>

        <div className="pt_filtergroup">
          <div className="grid pt_topfilters">
            <div className="pt_filters ">
              <TabSwitch
                tabOptions={listTabOptions}
                tabValue={tabStatus}
                onChange={(value: any) => handleTabChange(value)}
              />
            </div>
            <GridExportActions
              pdfFile={{
                fileName: "notices",
                headerRow: noticesListPDFHeaders,
                tableData: noticesListData,
                dataRow: pdfDataRow,
              }}
              resetFilterFunction={() => {
                setSelectedDate("All dates");
                setSelectedCompany(null);
                setSelectedAccount(null);
                setIsCustomDate(false);
                setSelectedNoticesType(null);
                setSelectedNoticesStatus(statusNotices[1]?.value);
              }}
              hideResetButton={
                (!selectedCompany ||
                  (selectedCompany?.label &&
                    selectedCompany?.label == "All")) &&
                selectedDate &&
                selectedDate == "All dates" &&
                selectedNoticesStatus &&
                selectedNoticesStatus == statusNotices[1]?.value &&
                (!selectedNoticesType ||
                  (selectedNoticesType?.label &&
                    selectedNoticesType?.label == "All")) &&
                (!selectedAccount ||
                  (selectedAccount?.label && selectedAccount?.label == "All"))
              }
              hideExcelButton={noticesListData?.length == 0}
              hidePdfButton={noticesListData?.length == 0}
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
          <div className="pt_filteroptions">
            <SearchableSelect
              placeholder="Select a company"
              name="bankAccounts"
              options={companyDropdownOptions}
              onChange={(value: any) => handleCompanyChange(value)}
              selectedData={selectedCompany}
              renderKey="name"
              valueKey="value"
            />
            <SearchableSelect
              placeholder="Select an account"
              name="accountName"
              options={accDropdownOptions}
              onChange={(selectedValue: any) =>
                handleAccountChange(selectedValue)
              }
              selectedData={selectedAccount}
              renderKey="name"
              valueKey="value"
            />
            <SearchableSelect
              placeholder={"Select a notices type"}
              name="status Type"
              options={noticesTypeOptions}
              selectedData={selectedNoticesType}
              renderKey="name"
              valueKey="value"
              onChange={(value: any) => handleNoticesChange(value)}
            />

            {!archiveMode && (
              <FormikControl
                name="noticeStatus"
                options={statusNotices}
                onChange={(status: any) => {
                  handleNoticeStatusChange(status);
                }}
                value={selectedNoticesStatus}
                renderKey="label"
                valueKey="value"
                control={InputType.SELECT}
              />
            )}
            <FormikControl
              placeholder={"Activity Range"}
              name="Activity Range"
              options={filterByDuration}
              onChange={handleActivityChange}
              control={InputType.SELECT}
              value={selectedDate}
              renderKey="label"
              valueKey="value"
            />
          </div>
          {isCustomDate && (
            <div className="grid">
              <div>
                <FormikControl
                  label="From date"
                  name="activityLogStartDate"
                  control={InputType.DATE_PICKER}
                  type="date"
                  value={activityLogStartDate}
                  onChange={(selectedDate: any) => {
                    if (selectedDate > activityLogEndDate) {
                      setActivityLogStartDate(selectedDate);
                      setActivityLogEndDate(selectedDate);
                    } else {
                      setActivityLogStartDate(selectedDate);
                    }
                  }}
                  minDate="" // Set any minimum date if needed
                  maxDate={activityLogEndDate}
                  disabled={false}
                />
              </div>
              <div>
                <FormikControl
                  label="To date"
                  name="activityLogEndDate"
                  type="date"
                  control={InputType.DATE_PICKER}
                  value={activityLogEndDate}
                  onChange={(selectedDate: any) => {
                    // Ensure end date is not before start date
                    if (selectedDate >= activityLogStartDate) {
                      setActivityLogEndDate(selectedDate);
                    }
                  }}
                  minDate={activityLogStartDate}
                  maxDate="" // Set any maximum date if needed
                  disabled={false}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid">
          <div className="pt_box">
            <DynamicTable
              headers={
                tabStatus == listTabOptions[1]?.label
                  ? noticesListArchiveHeaders
                  : noticesListHeaders
              }
              gridData={noticesListData?.length > 0 ? noticesListData : []}
              gridActions={
                tabStatus == listTabOptions[1]?.label
                  ? [gridActions[0]]
                  : gridActions
              }
              showLoader={tableLoader}
              loaderColSpan={8}
              renderRowList={noticesRenderData}
              currentPage={currentPage}
              entriesPerPage={entriesPerPage}
              onEntriesPerPageChange={(value: any) =>
                handleRowsPerPageChange(value)
              }
              onRowClick={(row: any) =>
                router.push(
                  `${AppRoutes.ADMIN_NOTICES_VIEW}/${row?.id}?prevTab=${tabStatus}`
                )
              }
              hoverOnRowClick
              onPageChange={(value: any) => handlePageChange(value)}
              totalEntries={totalRows}
              displayAllStaticActions
              onSortChange={(sortConfig) => {
                if (noticesListData?.length > 0) {
                  setSortValues(sortConfig);
                }
              }}
            />
          </div>
        </div>
      </div>
      {displayConfirmationModal && (
        <BaseModal
          modalId={"cancel subscription modal"}
          displayModal={displayConfirmationModal}
          onHeaderIconClose={() => setDisplayConfirmationModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setDisplayConfirmationModal(false)}
          onConfirm={() => {
            handleSendNotices();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">Are you sure you want to send?</h4>
        </BaseModal>
      )}
    </div>
  );
}
