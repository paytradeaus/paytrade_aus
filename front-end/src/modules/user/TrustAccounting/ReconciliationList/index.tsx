"use client";
import FormikControl from "@/components/FormikControl";
import DynamicTable from "@/components/Table";
import {
  DateFormat,
  filterByDuration,
  InputType,
  NA,
  tabOptions,
} from "@/shared/constant/general";

import React, { useEffect, useState } from "react";
import { ReconciliationReportType } from "../trustAccounting.types";

import {
  reconciliationRenderData,
  reconciliationListHeaders,
  reconciliationExcelColumnNames,
  reconciliationPdfDataRow,
  reconciliationListPDFHeaders,
} from "../trustAccounting.constant";

import {
  connectWebSocket,
  downloadFile,
  getCompanyIdFromStorage,
} from "@/utils";
import {
  deleteReconciliationReportDetails,
  getAllReconciliationReportList,
} from "../trustAccounting.functions";
import { format, isValid } from "date-fns";
import { FetchAllBankAccounts } from "../../BankAccounts/bankAccount.functions";
import { getCookie } from "cookies-next";
import GridExportActions from "@/components/GridExportActions";
import TabSwitch from "@/components/TabSwitch";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { AppRoutes } from "@/shared/constant/appRoutes";
import BaseModal from "@/components/BaseModal";
import { useLoaderContext } from "@/context/useLoader";
import { setReportData } from "@/redux/slices/reconciliationDetails";
import { useAppDispatch } from "@/redux/store";

export default function ReconciliationList(props: any) {
  const {
    isFromAdmin = false,
    isFromBankOverView = false,
    bankOverViewAcc = "",
  } = props;
  const router = useRouter();
  const dispatch = useAppDispatch();

  const BankAccId = useSearchParams().get("bank") || getCookie("bankId");
  const AdminCompanyId = getCookie("compId");
  const AuditDate = useSearchParams().get("audit");

  const parseDDMMYYYYToISO = (dateString: string | null): string | null => {
    if (!dateString) return null;

    const parts = dateString.split("/");
    if (parts.length !== 3) return null; // Ensure it's in the correct format

    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year) return null; // Validate values

    const parsedDate = new Date(year, month - 1, day); // Month is zero-based in JS Date
    if (isNaN(parsedDate.getTime())) return null; // Handle invalid dates

    return parsedDate.toISOString(); // Convert to ISO format
  };

  const auditDateISO = parseDDMMYYYYToISO(AuditDate);

  // Function to get date 1 year before
  const getOneYearBeforeISO = (isoDate: string | null): string | null => {
    if (!isoDate) return null;

    const date = new Date(isoDate);
    date.setFullYear(date.getFullYear() - 1); // Subtract 1 year

    return date.toISOString();
  };

  const oneYearBeforeAuditDate = getOneYearBeforeISO(auditDateISO);
  const [reconciliationListData, setReconciliationListData] = useState<
    ReconciliationReportType[]
  >([]);
  const companyName = getCookie("companyName"); // Access the company name from the cookie
  const [selectedBankAccountObj, setSelectedBankAccountObj] = useState("");
  const [tabStatus, setTabStatus] = useState("");
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>(
    BankAccId || ""
  );

  const [selectedAccountType, setSelectedAccountType] = useState("");

  const [totalRows, setTotalRows] = useState(0);
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const selectedCompanyId = Number(getCookie("companyId")) || 0;

  const [accountList, setAccountList] = useState<any>();
  const [isCustomDate, setIsCustomDate] = useState(AuditDate ? true : false);
  const [activityLogStartDate, setActivityLogStartDate] = useState<
    Date | null | any
  >(
    oneYearBeforeAuditDate
      ? new Date(oneYearBeforeAuditDate)
      : new Date(new Date().setHours(0, 0, 0, 0))
  );
  const [selectedAccountName, setSelectedAccountName] = useState<any>(null);

  const [activityLogEndDate, setActivityLogEndDate] = useState<
    Date | null | any
  >(
    auditDateISO
      ? new Date(auditDateISO)
      : new Date(new Date().setHours(23, 59, 59, 999))
  );
  const [selectedActivityRangeType, setSelectedActivityRangeType] = useState(
    AuditDate ? "Custom" : "All dates"
  );

  const [accountType, setAccountType] = useState<any>([]);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [actionDeleteData, setActionDeleteData] = useState<any>();
  const { loader, setLoader }: any = useLoaderContext();
  const [sortValues, setSortValues] = useState<any>("");
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);
  const selectedAccId = selectedAccountName?.value
    ? Number(selectedAccountName.value)
    : 0;
  const isAnyFilterActive =
    selectedAccountType ||
    selectedActivityRangeType !== "All dates" ||
    selectedAccountName?.value !==
      ((accountList?.length &&
        accountList.find(
          (account: any) =>
            account?.data?.account_type === "Retention Trust Account"
        )?.value) ||
        accountList?.[0]?.value);
  useEffect(() => {
    fetchBankAccountsList();
  }, [AdminCompanyId, BankAccId]);

  useEffect(() => {
    getReconciliationLists();
  }, [
    selectedAccountType,
    selectedCompanyId,
    selectedAccId,
    currentPage,
    entriesPerPage,
    selectedActivityRangeType,
    tabStatus,
    sortValues,
    activityLogEndDate,
    activityLogStartDate,
  ]);

  // Define actions dynamically
  const currentActions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: ReconciliationReportType) => {
        if (role === "PORTAL ADMIN") {
          //need to change
          router.push(
            `${AppRoutes.USER_TRUST_ACCOUNTING_RECONCIALIATION_RECORD_VIEW}/${row?.id}`
          );
        } else {
          router.push(
            `${AppRoutes.USER_TRUST_ACCOUNTING_RECONCIALIATION_RECORD_VIEW}/${row?.id}`
          );
        }
      },
    },
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: ReconciliationReportType) => {
        if (role === "PORTAL ADMIN") {
          //need to change
          router.push(
            `${AppRoutes.USER_TRUST_ACCOUNTING_RECONCIALIATION_RECORD_EDIT}/${row?.id}`
          );
        } else {
          router.push(
            `${AppRoutes.USER_TRUST_ACCOUNTING_RECONCIALIATION_RECORD_EDIT}/${row?.id}`
          );
        }
      },
    },
    {
      label: "Pdf download",
      icon: "fa-light fa-download",
      onClick: (row: any) =>
        handleDownloadPdfFile({
          screen_name: "reconciliation_trial",
          report_id: row?.report_id,
        }),
    },
    {
      label: "Delete",
      style: "contrast",
      icon: "fa-light fa-trash",
      onClick: (row: ReconciliationReportType) => {
        setActionDeleteData(row);
        setOpenDeleteModal(true);
      },
    },
  ];
  const archivedActions = [
    {
      label: "View",
      icon: "fa-light fa-inbox",
      style: "primary",
      onClick: (row: ReconciliationReportType) => {
        if (role === "PORTAL ADMIN") {
          //need to change
          router.push(
            `${AppRoutes.USER_TRUST_ACCOUNTING_RECONCIALIATION_RECORD_VIEW}/${row?.id}`
          );
        } else {
          router.push(
            `${AppRoutes.USER_TRUST_ACCOUNTING_RECONCIALIATION_RECORD_VIEW}/${row?.id}`
          );
        }
      },
    },
  ];

  const handleAccountChange = (selectedOption: any) => {
    setSelectedAccountName(selectedOption);
    // Assuming the account type is stored in the selectedOption data.
    setAccountType(selectedOption?.data?.account_type);
  };
  function handleTabChange(value: string) {
    setSelectedBankAccount("");
    setSelectedBankAccountObj("");
    setSelectedAccountType("");
    setCurrentPage(1);
    setEntriesPerPage(10);
    setTabStatus(value);
  }

  // Row click handler
  const handleRowClick = (id: ReconciliationReportType) => {
    router.push(
      `${AppRoutes.USER_TRUST_ACCOUNTING_RECONCIALIATION_RECORD_VIEW}/${id}`
    );
  };

  async function fetchBankAccountsList() {
    const postData = {
      payload: {
        company_id: AdminCompanyId ? Number(AdminCompanyId) : selectedCompanyId,
        is_alphabetical_order: true,
        account_type: AdminCompanyId
          ? null
          : "Project Trust Account, Retention Trust Account",
      },
    };
    const response = await FetchAllBankAccounts(postData);
    if (response?.extendedBankAccounts?.length) {
      const accountOptions = response.extendedBankAccounts.map(
        (account: any) => ({
          label: account.account_name,
          value: account.bank_account_id.toString(),
          data: {
            account_type: account.account_type,
            ...account,
          },
        })
      );
      // Add "All" option at the beginning
      const updatedAccountOptions = [
        { label: "All", value: "all" },
        ...accountOptions,
      ];

      setAccountList(updatedAccountOptions);

      // Find an RTA (Retention Trust Account) if available
      const rtaAccount = updatedAccountOptions.find(
        (option: any) => option.data?.account_type === "Retention Trust Account"
      );

      // Set the selected account
      const selectedAccount =
        rtaAccount ||
        accountOptions.find((option: any) =>
          isFromBankOverView && bankOverViewAcc
            ? option.value === bankOverViewAcc
            : option.value === BankAccId
        ) ||
        accountOptions[0];

      setSelectedAccountName(selectedAccount);
    }
  }

  async function getReconciliationLists() {
    try {
      setTableLoader(true);

      const payloadData = {
        company_id: AdminCompanyId
          ? Number(AdminCompanyId)
          : getCompanyIdFromStorage() || 0,
        bank_account_id: selectedAccId || null,
        account_type:
          selectedAccountType === "All"
            ? null
            : selectedAccountType
            ? selectedAccountType
            : null,
        date_filter:
          selectedActivityRangeType === "All dates"
            ? null
            : selectedActivityRangeType || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        page_number: currentPage,
        page_size: entriesPerPage,
        isArchived: tabStatus === tabOptions[1]?.value ? true : null,
        sorting_field: sortValues?.sortKey || "",
        sorting_order: sortValues?.direction || "",
      };

      const response: any = await getAllReconciliationReportList(payloadData);

      if (response?.report_list?.length > 0) {
        setReconciliationListData(response?.report_list);
      } else {
        setReconciliationListData([]);
      }

      setTotalRows(response?.total_count || 0);
    } catch {
    } finally {
      setTableLoader(false);
      setDisableExcelBtn(false);
    }
  }
  const handleResetFilters = () => {
    setSelectedAccountType("");
    if (accountList?.length > 0) {
      const rtaAccount = accountList.find(
        (account: any) =>
          account?.data?.account_type === "Retention Trust Account"
      );

      setSelectedAccountName(rtaAccount || accountList[0]);
    }
    setSelectedActivityRangeType("All dates");
    setIsCustomDate(false);
    setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0)));
    setActivityLogEndDate(new Date(new Date().setHours(23, 59, 59, 999)));
  };

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "reconciliation",
        company_id: AdminCompanyId
          ? Number(AdminCompanyId)
          : getCompanyIdFromStorage() || 0,
        bank_account_id: selectedAccId || null,
        account_type:
          selectedAccountType === "All"
            ? null
            : selectedAccountType
            ? selectedAccountType
            : null,
        date_filter:
          selectedActivityRangeType === "All dates"
            ? null
            : selectedActivityRangeType || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        isArchived: tabStatus === tabOptions[1]?.value ? true : null,
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

  const handleDownloadPdfFile = async (dynamicPayload?: any) => {
    setDisablePDFBtn(true);
    try {
      const payload = {
        screen_name: "reconciliation",
        company_id: AdminCompanyId
          ? Number(AdminCompanyId)
          : getCompanyIdFromStorage() || 0,
        bank_account_id: selectedAccId || null,
        account_type:
          selectedAccountType === "All"
            ? null
            : selectedAccountType
            ? selectedAccountType
            : null,
        date_filter:
          selectedActivityRangeType === "All dates"
            ? null
            : selectedActivityRangeType || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        isArchived: tabStatus === tabOptions[1]?.value ? true : null,
      };
      const clientId = await connectWebSocket();
      await getPDFUrl(
        clientId,
        dynamicPayload?.report_id ? dynamicPayload : payload
      );
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  };

  const handleDeleteFunction = async () => {
    setOpenDeleteModal(false); // Close the modal
    try {
      setLoader(true);
      let response = await deleteReconciliationReportDetails({
        id: actionDeleteData?.id,
        report_status: "Deleted",
        report_id: actionDeleteData?.report_id,
        company_id: AdminCompanyId ? Number(AdminCompanyId) : selectedCompanyId,
      });
      if (response) {
        getReconciliationLists();
      }
    } catch {
    } finally {
      setLoader(false);
    }
  };

  return (
    <>
      <div className="container-fluid">
        <div className="pt_title">
          <div className="grid pt_topfilters">
            {!isFromAdmin && (
              <div className="pt_pagetitle">
                <h1>Reconciliation list</h1>
              </div>
            )}
          </div>

          <div className="pt_pageactions companyFlex">
            <div>
              {isFromAdmin && (
                <div>
                  <h4>Company Profile - {companyName}</h4>
                </div>
              )}
            </div>
            <div className="pt_pageactions">
              <div>
                {!isFromAdmin && (
                  <Link
                    href={
                      AppRoutes.USER_TRUST_ACCOUNTING_RECONCIALIATION_RECORD_ADD
                    }
                    passHref
                    legacyBehavior
                  >
                    <a className="pt_addnewbutton">
                      <button
                        className="secondary"
                        onClick={() => {
                          dispatch(setReportData({}));
                        }}
                      >
                        <i className="fa-light fa-hexagon-plus"></i>Add
                        reconciliation
                      </button>
                    </a>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pt_filtergroup">
          <div className="grid pt_topfilters">
            <div className="pt_filters">
              {!isFromAdmin && (
                <div role="group">
                  <TabSwitch
                    tabOptions={tabOptions}
                    onChange={(value: any) => handleTabChange(value)}
                    tabValue={tabStatus}
                  />
                </div>
              )}
            </div>
            <div className="pt_pageactions">
              <div className="actionbuttons">
                <GridExportActions
                  excelFile={{
                    sheetName: "reconciliation list",
                    tableData: reconciliationListData,
                    LabelAndValueKey: reconciliationExcelColumnNames,
                  }}
                  pdfFile={{
                    fileName: "reconciliation list",
                    headerRow: reconciliationListPDFHeaders,
                    tableData: reconciliationListData,
                    dataRow: reconciliationPdfDataRow,
                  }}
                  resetFilterFunction={() => handleResetFilters()}
                  hideExcelButton={reconciliationListData.length === 0}
                  hidePdfButton={reconciliationListData.length === 0}
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
            <SearchableSelect
              placeholder="Select an account"
              name="account"
              options={accountList}
              onChange={handleAccountChange}
              selectedData={selectedAccountName}
              renderKey="label"
              valueKey="value"
            />

            <FormikControl
              placeholder={"Select a account type"}
              name="account type"
              options={[
                { label: "All", value: "All" },
                {
                  value: "Project Trust Account",
                  label: "Project Trust Account",
                },
                {
                  value: "Retention Trust Account",
                  label: "Retention Trust Account",
                },
              ]}
              control={InputType.SELECT}
              value={selectedAccountType}
              renderKey="label"
              valueKey="value"
              onChange={(value: any) => {
                setCurrentPage(1);
                setSelectedAccountType(value);
              }}
            />

            <FormikControl
              placeholder={"Activity Range"}
              name="Activity Range"
              options={filterByDuration}
              onChange={(value: any) => {
                if (value === "Custom") {
                  setIsCustomDate(true);
                } else {
                  setIsCustomDate(false);
                }
                setSelectedActivityRangeType(value);
              }}
              control={InputType.SELECT}
              value={selectedActivityRangeType}
              renderKey="label"
              valueKey="value"
            />
          </div>
        </div>
        {isCustomDate && (
          <div className="grid">
            <div>
              <FormikControl
                label="From date"
                name="activityLogStartDate"
                control={InputType.DATE_PICKER}
                type="date"
                // value={
                //   activityLogStartDate
                //     ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                //     : ""
                // }
                value={
                  activityLogStartDate &&
                  isValid(new Date(activityLogStartDate))
                    ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                    : ""
                }
                onChange={(selectedDate: any) => {
                  if (!selectedDate) {
                    setActivityLogStartDate(null);
                    return;
                  }
                  const fromDate = new Date(
                    new Date(selectedDate).setHours(0, 0, 0, 0)
                  );

                  if (fromDate > activityLogEndDate) {
                    setActivityLogStartDate(fromDate);
                    setActivityLogEndDate(new Date(selectedDate));

                    // setActivityLogEndDate(fromDate);
                  } else {
                    setActivityLogStartDate(fromDate);
                  }
                }}
                minDate="" // Set any minimum date if needed
                // maxDate={format(new Date(activityLogEndDate), "yyyy-MM-dd")}
                disabled={false}
              />
            </div>
            <div>
              <FormikControl
                label="To date"
                name="activityLogEndDate"
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

                  // Ensure end date is not before start date
                  if (toDate >= activityLogStartDate) {
                    setActivityLogEndDate(toDate);
                  }
                }}
                minDate={
                  activityLogStartDate
                    ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                    : ""
                }
                maxDate="" // Set any maximum date if needed
                disabled={false}
              />
            </div>
          </div>
        )}
        <div className="grid">
          <div className="pt_box">
            <DynamicTable
              headers={reconciliationListHeaders}
              gridData={
                reconciliationListData?.length > 0 ? reconciliationListData : []
              }
              gridActions={
                tabStatus === tabOptions[1]?.label
                  ? archivedActions
                  : currentActions
              }
              onRowClick={(data: any) => handleRowClick(data?.id)}
              displayAllStaticActions
              showLoader={tableLoader}
              loaderColSpan={11}
              renderRowList={reconciliationRenderData}
              currentPage={currentPage}
              entriesPerPage={entriesPerPage}
              onEntriesPerPageChange={setEntriesPerPage}
              onPageChange={setCurrentPage}
              totalEntries={totalRows}
              hoverOnRowClick
              onSortChange={(sortConfig) => {
                if (reconciliationListData?.length > 0) {
                  setSortValues(sortConfig);
                }
              }}
            />
          </div>
        </div>
      </div>

      {openDeleteModal && (
        <BaseModal
          modalId={"Delete confirmation"}
          displayModal={openDeleteModal}
          onClose={() => setOpenDeleteModal(false)}
          onHeaderIconClose={() => setOpenDeleteModal(false)}
          onConfirm={() => {
            handleDeleteFunction();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
          restrictOncloseFunctionInHeader
        >
          <h4 className="text_center width_100">
            Are you sure you wish to move the reconciliation record to the
            archive with status updated to delete?
          </h4>
        </BaseModal>
      )}
    </>
  );
}
