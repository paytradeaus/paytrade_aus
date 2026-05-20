"use client";
import FormikControl from "@/components/FormikControl";
import DynamicTable from "@/components/Table";
import { filterByDuration, InputType, NA } from "@/shared/constant/general";
import React, { useEffect, useState } from "react";
import { AuditReportType } from "../trustAccounting.types";
import { auditRenderData, auditListHeaders } from "../trustAccounting.constant";
import { connectWebSocket, formatDate } from "@/utils";
import { getAllAuditReportList } from "../trustAccounting.functions";
import { format, isValid } from "date-fns";
import { FetchAllBankAccounts } from "../../BankAccounts/bankAccount.functions";
import Link from "next/link";
import GridExportActions from "@/components/GridExportActions";
import { getCookie } from "cookies-next";
import { useRouter, useSearchParams } from "next/navigation";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { setReduxAuditData } from "@/redux/slices/auditDetails";
import { useDispatch } from "react-redux";

export default function AuditList(props: any) {
  const { isFromAdmin = false } = props;
  const dispatch = useDispatch();
  const BankAccId = useSearchParams().get("bank") || getCookie("bankId");
  const AdminCompanyId = getCookie("compId");
  const [auditListData, setAuditListData] = useState<AuditReportType[]>([]);
  const companyName = getCookie("companyName"); // Access the company name from the cookie
  const [sortValues, setSortValues] = useState<any>("");
  const [selectedBankAccount, setSelectedBankAccount] = useState("");
  const [selectedBankAccountObj, setSelectedBankAccountObj] = useState("");
  const [selectedAccountType, setSelectedAccountType] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);
  const [bankAccountID, setBankAccID] = useState(Number(BankAccId));
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [selectedAccountName, setSelectedAccountName] = useState<any>(null);
  const [bankOptions, setBankOptions] = useState<any>([]);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [activityLogStartDate, setActivityLogStartDate] = useState<
    Date | null | any
  >(new Date(new Date().setHours(0, 0, 0, 0)));
  const [activityLogEndDate, setActivityLogEndDate] = useState<
    Date | null | any
  >(new Date(new Date().setHours(23, 59, 59, 999)));
  const router = useRouter();
  const [selectedActivityRangeType, setSelectedActivityRangeType] =
    useState("All dates");
  const [role, setRole] = useState<string | null>(null);
  const defaultAccount =
    bankOptions.find(
      (account: any) => account.account_type === "Retention Trust Account"
    ) || bankOptions[0];
  const isAnyFilterActive =
    selectedBankAccount !== (defaultAccount?.value || "") ||
    selectedAccountType ||
    selectedActivityRangeType !== "All dates";

  useEffect(() => {
    fetchBankAccountsList();
  }, [AdminCompanyId, BankAccId, selectedCompanyId, sortValues]);

  useEffect(() => {
    getAuditLists();
  }, [
    selectedCompanyId,
    bankAccountID,
    selectedAccountType,
    selectedBankAccount,
    currentPage,
    entriesPerPage,
    selectedActivityRangeType,
    activityLogEndDate,
    activityLogStartDate,
  ]);

  // Define actions dynamically
  const currentActions = [
    {
      label: "View",
      icon: "fa-light fa-file-lines",
      style: "primary",
      onClick: (row: AuditReportType) => {
        router.push(`${AppRoutes.USER_TRUST_ACCOUNTING_AUDIT_VIEW}/${row?.id}`);
      },
    },
    {
      label: "Edit",
      icon: "fa-light fa-file-pen",
      onClick: (row: AuditReportType) => {
        router.push(
          `${AppRoutes.USER_TRUST_ACCOUNTING_AUDIT_EDIT}/${row?.id}?routedFrom=auditList`
        );
      },
    },
  ];

  // Row click handler
  const handleRowClick = (id: AuditReportType) => {
    router.push(
      `${AppRoutes.USER_TRUST_ACCOUNTING_AUDIT_VIEW}/${id}?routedFrom=auditList`
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
        sorting_field: sortValues?.sortKey || "",
        sorting_order: sortValues?.direction || "",
      },
    };
    const response = await FetchAllBankAccounts(postData);
    if (response?.extendedBankAccounts?.length > 0) {
      const formatResponse: any = [
        { label: "All", value: "all" }, // "All" option at the beginning
        ...(response?.extendedBankAccounts?.map((bank: any) => ({
          label: bank?.account_name,
          value: bank?.bank_account_id,
          account_type: bank?.account_type, // Include account_type for filtering
        })) || []),
      ];

      setBankOptions(formatResponse);

      // Find Retention Trust Account
      const retentionTrustAccount = formatResponse.find(
        (option: any) => option.account_type === "Retention Trust Account"
      );

      // Set selected account to Retention Trust Account, or fallback to first option
      const defaultAccount = retentionTrustAccount || formatResponse[0];

      setSelectedBankAccount(defaultAccount?.value);
      setSelectedBankAccountObj(defaultAccount);
    } else {
      setBankOptions([]);
    }

    // const response = await FetchAllBankAccounts(postData);
    // if (response?.extendedBankAccounts?.length > 0) {
    //   const formatResponse: any = [
    //     ...(response?.extendedBankAccounts?.map((bank: any) => ({
    //       label: bank?.account_name,
    //       value: bank?.bank_account_id,
    //     })) || []),
    //   ];
    //   setBankOptions(formatResponse);
    //   const selectedOption = formatResponse.find(
    //     (option: any) => option.value === Number(BankAccId)
    //   );
    //   setSelectedBankAccount(selectedOption?.value || formatResponse[0]?.value);
    //   setSelectedBankAccountObj(selectedOption || formatResponse[0] || "");
    // } else {
    //   setBankOptions([]);
    // }
  }
  function handleRouteToAuditPage(bankAccountId: number) {
    router.push(`/admin/trust-accounting?bank=${bankAccountId}`);
  }
  async function getAuditLists() {
    if (!selectedBankAccount) return;
    try {
      setTableLoader(true);

      const payload: any = {
        company_id: AdminCompanyId ? Number(AdminCompanyId) : selectedCompanyId,
        bank_account_id:
          selectedBankAccount === "All"
            ? null
            : selectedBankAccount
            ? Number(selectedBankAccount)
            : null,
        account_type: AdminCompanyId
          ? null
          : selectedAccountType === "All"
          ? null
          : selectedAccountType,
        date_filter:
          selectedActivityRangeType === "All dates"
            ? null
            : selectedActivityRangeType || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        page_number: currentPage,
        page_size: entriesPerPage,
      };

      const response: any = await getAllAuditReportList(payload);

      if (response?.report_list?.length > 0) {
        const modifiedGridData = response?.report_list.map((listObj: any) => {
          return {
            ...listObj,
            bank_statement_modified: <a>View</a>,
            ledger_journals_modified: <a>View</a>,
            ledger_modified: <a>View</a>,
            trail_balance_modified: <a>View</a>,
            deposit_withdraw_modified: <a>View</a>,
            reconciliation_modified: <a>View</a>,
            audit_report_modified: <a>View</a>,
            audit_date: listObj?.audit_date
              ? formatDate(listObj?.audit_date)
              : NA,
          };
        });

        setAuditListData(modifiedGridData);
      } else {
        setAuditListData([]);
      }

      setTotalRows(response?.total_count || 0);
    } catch (err: any) {
    } finally {
      setTableLoader(false);
    }
  }
  const handleFileDownload = async (rowData: any) => {
    const pdfFiles = rowData?.file_details?.filter(
      (file: any) => file?.file_type === "application/pdf"
    );

    if (!pdfFiles?.length) {
      // showErrorToast("No PDF files available to download.");
      return;
    }

    for (const file of pdfFiles) {
      try {
        const response = await fetch(file.file_path);
        const blob = await response.blob();

        if (blob.type === "application/pdf") {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = file.file_name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          // showErrorToast(`Invalid PDF file: ${file.file_name}`);
        }
      } catch (error) {
        console.error("Download failed for:", file.file_name, error);
        // showErrorToast(`Failed to download: ${file.file_name}`);
      }
    }
  };

  const handleBankRowClick = (tab: string, row: AuditReportType) => {
    const tabParam = new URLSearchParams({
      tab,
    }).toString();
    if (role === "PORTAL ADMIN") {
      router.push(
        `/admin/journals/trust-accounting/bank?screen=view&company=${
          AdminCompanyId ? Number(AdminCompanyId) : selectedCompanyId
        }&bank=${row?.bank_account_id}&account=${
          row?.bank_account_id
        }&statement=${row?.statement_id}`
      );
    } else {
      router.push(
        `/user/bank-accounts/overview/bank-statement?screen=view&bank=${row?.bank_account_id}&statement=${row?.statement_id}&routing=other`
      );
    }
  };

  const handleTrustAccountingRowClick = (tab: string, row: AuditReportType) => {
    const tabParam = tab;

    const selectedAccountDetails = JSON.stringify({
      account_name: row.account_name,
      bank_account_id: row.bank_account_id,
    });

    if (role === "PORTAL ADMIN") {
      //need to change
      router.push(
        `/admin/trust-accounting?${tabParam}&bank=${
          row?.bank_account_id
        }&comp=${row?.company_id}&selectedAccount=${encodeURIComponent(
          selectedAccountDetails
        )}`
      );
    } else {
      router.push(
        `/user/trust-accounting/${tabParam}?bank=${
          row?.bank_account_id
        }&selectedAccount=${encodeURIComponent(selectedAccountDetails)}&audit=${
          row?.audit_date
        }`
      );
    }
  };

  const handleResetFilters = () => {
    setCurrentPage(1);
    setEntriesPerPage(10);

    if (bankOptions?.length > 0) {
      const rtaAccount = bankOptions.find(
        (account: any) => account.account_type === "Retention Trust Account"
      );

      const defaultAccount = rtaAccount || bankOptions[0]; // Default to RTA if available, else first option

      setSelectedBankAccount(defaultAccount?.value);
      setSelectedAccountName(defaultAccount);
      setSelectedBankAccountObj(defaultAccount);
    } else {
      setSelectedBankAccount("");
      setSelectedAccountName(null);
      setSelectedBankAccountObj("");
    }

    setSelectedAccountType("");
    setSelectedActivityRangeType("All dates"); // Reset activityDate state
    setIsCustomDate(false); // Reset custom date state
    setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0))); // Reset start date to today
    setActivityLogEndDate(new Date(new Date().setHours(23, 59, 59, 999))); // Reset end date to today
  };

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "trial_balance_by_accountId",
        company_id: AdminCompanyId ? Number(AdminCompanyId) : selectedCompanyId,
        bank_account_id:
          selectedBankAccount === "All"
            ? null
            : selectedBankAccount
            ? Number(selectedBankAccount)
            : null,
        account_type: AdminCompanyId
          ? null
          : selectedAccountType === "All"
          ? null
          : selectedAccountType,
        date_filter:
          selectedActivityRangeType === "All dates"
            ? null
            : selectedActivityRangeType || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
        screen_name: "trial_balance_by_accountId",
        company_id: AdminCompanyId ? Number(AdminCompanyId) : selectedCompanyId,
        bank_account_id:
          selectedBankAccount === "All"
            ? null
            : selectedBankAccount
            ? Number(selectedBankAccount)
            : null,
        account_type: AdminCompanyId
          ? null
          : selectedAccountType === "All"
          ? null
          : selectedAccountType,
        date_filter:
          selectedActivityRangeType === "All dates"
            ? null
            : selectedActivityRangeType || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        page_number: null,
        page_size: null,
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
        <div className="grid pt_topfilters">
          {!isFromAdmin && (
            <div className="pt_pagetitle">
              <h1>Audit list</h1>
            </div>
          )}
        </div>

        <div className="pt_pageactions companyFlex">
          <div>
            {isFromAdmin && (
              <div>
                <h4>Company Profile - {companyName || "fhgfhfh"}</h4>
              </div>
            )}
          </div>
          <div>
            {!isFromAdmin && (
              <Link
                href={`${AppRoutes.USER_TRUST_ACCOUNTING_AUDIT_ADD}?routedFrom=auditList`}
                passHref
                legacyBehavior
              >
                <a className="pt_addnewbutton">
                  <button
                    className="secondary"
                    onClick={() => {
                      dispatch(setReduxAuditData({}));
                    }}
                  >
                    <i className="fa-light fa-hexagon-plus"></i>Add audit
                  </button>
                </a>
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
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
          <FormikControl
            control={InputType.SELECT}
            placeholder="Select a account"
            name="account"
            options={bankOptions}
            value={selectedBankAccountObj?.value || ""}
            renderKey="label"
            valueKey="value"
            returnSelectedObject
            onChange={(selected: any) => {
              setCurrentPage(1);
              setBankAccID(selected);
              setSelectedBankAccount(selected?.value);
              setSelectedBankAccountObj(selected);
              // handleRouteToAuditPage(selected);
            }}
          />

          <FormikControl
            placeholder={"Select a account type"}
            name="account type"
            options={[
              // { label: "All", value: "All" },
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
                activityLogStartDate && isValid(new Date(activityLogStartDate))
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
            headers={auditListHeaders}
            gridData={auditListData?.length > 0 ? auditListData : []}
            gridActions={currentActions}
            displayAllStaticActions
            onRowClick={(data: any) => handleRowClick(data?.id)}
            showLoader={tableLoader}
            loaderColSpan={10}
            renderRowList={auditRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
            onTableDataClick={(rowData: any, dataKey) => {
              switch (dataKey.key) {
                case "bank_statement_modified":
                  handleBankRowClick("bank-statements", rowData);
                  break;
                case "ledger_journals_modified":
                  handleTrustAccountingRowClick("journals", rowData);
                  break;
                case "ledger_modified":
                  handleTrustAccountingRowClick("account-ledger", rowData);
                  break;
                case "trail_balance_modified":
                  handleTrustAccountingRowClick("trial", rowData);
                  break;
                case "deposit_withdraw_modified":
                  handleTrustAccountingRowClick("deposits", rowData);
                  break;
                case "reconciliation_modified":
                  handleTrustAccountingRowClick(
                    "reconciliation-record",
                    rowData
                  );
                  break;
                case "audit_report_modified":
                  handleFileDownload(rowData);
                  break;
                default:
                  return null;
              }
            }}
            onSortChange={(sortConfig) => {
              if (auditListData?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
            hoverOnRowClick
          />
        </div>
      </div>
    </div>
  );
}
