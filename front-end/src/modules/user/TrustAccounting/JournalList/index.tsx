"use client";
import FormikControl from "@/components/FormikControl";
import {
  filterByDurationDates,
  InputType,
  NA,
  VIEW,
} from "@/shared/constant/general";

import React, { useEffect, useState } from "react";
import {
  journalRenderRowData,
  journalsListHeaders,
  trustListHeaders,
} from "../trustAccounting.constant";
import { format, isValid } from "date-fns";
import { FetchAllBankAccounts } from "../../BankAccounts/bankAccount.functions";
import GridExportActions from "@/components/GridExportActions";
import { getCookie } from "cookies-next";
import { useRouter, useSearchParams } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import TrustAccountGrid from "@/components/TrustAccountGrid/TrustAccountGrid";
import {
  getLedgerJournalServices,
  LedgerJournalsType,
} from "./journalList.functions";
import { showErrorToast } from "@/components/Toaster";
import { AppRoutes } from "@/shared/constant/appRoutes";
import BreadCrumbs from "@/components/BreadCrumbs";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { connectWebSocket, formatDate } from "@/utils";
import { tabTypes } from "../../AddUpdatePayments/Payments.constants";

export default function Journals(props: any) {
  const {
    isFromAdmin = false,
    isFromBankOverView = false,
    bankOverViewAcc = "",
    overViewDetails = {},
  } = props;
  const BankAccId = useSearchParams().get("bank") || getCookie("bankId");
  const AdminCompanyId = getCookie("compId");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [ledgerJournalListData, setLedgerJournalListData] = useState<
    LedgerJournalsType[]
  >([]);
  const router = useRouter();

  const companyName = getCookie("companyName"); // Access the company name from the cookie
  const [singleActivityDate, setSingleActivityDate] = useState<any>({
    value: "Last Month",
    label: "Last Month",
  });
  const [accountType, setAccountType] = useState<any>([]);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const handleAccountChange = (selectedOption: any) => {
    setSelectedAccountName(selectedOption);
    // Assuming the account type is stored in the selectedOption data.
    setAccountType(selectedOption?.data?.account_type);
  };
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

  const [selectedRowsInGrid, setSelectedRowsInGrid] = useState([]);
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [currentPage, setCurrentPage] = useState(1);
  const [isAuditView, setIsAuditView] = useState(false);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [selectedAccountName, setSelectedAccountName] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [isCustomDate, setIsCustomDate] = useState(AuditDate ? true : false);
  const [activityLogStartDate, setActivityLogStartDate] = useState<
    Date | null | any
  >(
    oneYearBeforeAuditDate
      ? new Date(oneYearBeforeAuditDate)
      : new Date(new Date().setHours(0, 0, 0, 0))
  );
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [activityLogEndDate, setActivityLogEndDate] = useState<
    Date | null | any
  >(
    auditDateISO
      ? new Date(auditDateISO)
      : new Date(new Date().setHours(23, 59, 59, 999))
  );
  const [accountList, setAccountList] = useState<any>();

  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  const [selectedActivityRangeType, setSelectedActivityRangeType] = useState(
    AuditDate ? "Custom" : "All dates"
  );
  const [filterDate, setFilterData] = useState<any>();

  const isAnyFilterActive =
    search ||
    selectedActivityRangeType !== "All dates" ||
    isCustomDate === true ||
    selectedAccountName?.value !==
      ((accountList?.length &&
        accountList.find(
          (account: any) =>
            account?.data?.account_type === "Retention Trust Account"
        )?.value) ||
        accountList?.[0]?.value);

  const handleAuditToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsAuditView(event.target.checked);
  };

  const resetFilters = () => {
    // Reset filtering criteria
    setSingleActivityDate({ value: "Last Month", label: "Last Month" });
    setSelectedActivityRangeType("All dates");
    setIsCustomDate(false);
    setSearch("");
    setEmptySearchField(true);

    if (accountList?.length > 0) {
      const rtaAccount = accountList.find(
        (account: any) =>
          account.data.account_type === "Retention Trust Account"
      );

      setSelectedAccountName(rtaAccount || accountList[0]);
    }
    setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0))); // Reset start date
    setActivityLogEndDate(new Date(new Date().setHours(23, 59, 59, 999))); // Reset end date
    setSearch("");
    setEmptySearchField(true); // Optional, for clearing the search input
    setSelectedRowsInGrid([]);
    setTimeKey(new Date().getTime());
  };

  useEffect(() => {
    const fetchBankAccounts = async () => {
      try {
        const payload = {
          company_id:
            isFromAdmin && AdminCompanyId
              ? Number(AdminCompanyId)
              : selectedCompanyId,
          page: currentPage || 1,
          items_per_page: entriesPerPage || 10,
          is_alphabetical_order: true,
          account_type: AdminCompanyId
            ? null
            : "Project Trust Account, Retention Trust Account",
        };

        const response = await FetchAllBankAccounts({ payload });

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

          setAccountList(accountOptions);
          // setCompanyName(response.company_name || "");

          // When rendered inside the Bank Account Overview's Journals tab,
          // the account-select dropdown is hidden and we must pin the
          // selection to the bank account the user is actually viewing.
          // Otherwise the previous default-to-RTA fallback would surface
          // journals for a *different* account (or none at all).
          const overBankViewAccId =
            overViewDetails?.overBankViewMode &&
            overViewDetails?.data?.bank_account_id
              ? overViewDetails.data.bank_account_id.toString()
              : null;

          const overBankViewAccount = overBankViewAccId
            ? accountOptions.find(
                (option: any) => option.value === overBankViewAccId
              )
            : null;

          // Find an RTA (Retention Trust Account) if available
          const rtaAccount = accountOptions.find(
            (option: any) =>
              option.data.account_type === "Retention Trust Account"
          );

          // Set the selected account
          const selectedAccount =
            overBankViewAccount ||
            rtaAccount ||
            accountOptions.find((option: any) =>
              isFromBankOverView && bankOverViewAcc
                ? option.value === bankOverViewAcc
                : option.value === BankAccId
            ) ||
            accountOptions[0];
          setSelectedAccountName(selectedAccount);
        }
      } catch {}
    };

    fetchBankAccounts();
  }, [
    AdminCompanyId,
    selectedCompanyId,
    BankAccId,
    currentPage,
    entriesPerPage,
    isFromBankOverView,
    bankOverViewAcc,
    overViewDetails?.overBankViewMode,
    overViewDetails?.data?.bank_account_id,
  ]);

  // Effect to handle company ID persistence
  useEffect(() => {
    const storedCompanyId = localStorage.getItem("companyId");

    if (isFromAdmin && AdminCompanyId) {
      setCompanyId(Number(AdminCompanyId));
    } else if (storedCompanyId) {
      setCompanyId(parseInt(storedCompanyId, 10));
    }
  }, [AdminCompanyId]);
  useEffect(() => {
    fetchData(currentPage, entriesPerPage);
  }, [
    companyId,
    currentPage,
    entriesPerPage,
    search,
    selectedAccountName,
    singleActivityDate,
    activityLogStartDate,
    activityLogEndDate,
    AdminCompanyId,
    selectedActivityRangeType,
  ]);

  const fetchData = async (currentPage: number, entriesPerPage: number) => {
    if (emptySearchField) {
      setEmptySearchField(false);
    }
    setLoading(true);
    if (!selectedAccountName?.value) return;
    try {
      // Build the payload for fetching ledger journals
      const payload = {
        // company_id: AdminCompanyId ? Number(AdminCompanyId) : companyId,
        page_number: currentPage,
        page_size: entriesPerPage,
        search: search || null,
        bank_account_id: selectedAccountName?.value
          ? Number(selectedAccountName?.value)
          : null,
        date_filter:
          selectedActivityRangeType === "All dates"
            ? null
            : selectedActivityRangeType || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
      };

      // Fetch ledger journal data
      const response = await getLedgerJournalServices(payload);

      if (response?.data) {
        // Process the response data and format it
        const formattedData = response.data.ledger_journals_list.map(
          (entry: any) => ({
            journal_number: entry.journal_number,
            audit_id: entry.audit_id,
            journal_description: entry.journal_description,
            date: entry.date ?? NA,
            total_credit: entry.total_credit || "",
            total_debit: entry.total_debit || "",
            accounts: entry.accounts.map((account: any) => ({
              account_name: account.account_name || "N/A",
              description: account.description || "",
              debit: account.debit || "",
              credit: account.credit || "",
              audit_id: account.audit_id,
            })),
            original: entry,
          })
        );
        setFilterData(response?.data?.filter_dates);
        // Update state with formatted data and total count
        setLedgerJournalListData(formattedData);
        setTotalRows(response.data.total_count);
      } else {
        // Handle empty or unsuccessful response
        setLedgerJournalListData([]);
        setTotalRows(0);
      }
    } catch {
      // Handle errors during fetch
      showErrorToast("Failed to fetch ledger journal data.");
    } finally {
      // Turn off loading state after operation
      setLoading(false);
    }
  };
  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "journal_by_accountId",
        search: search || null,
        bank_account_id: selectedAccountName?.value
          ? Number(selectedAccountName?.value)
          : null,
        is_audit_view: isAuditView ? true : false,
        date_filter:
          selectedActivityRangeType === "All dates"
            ? null
            : selectedActivityRangeType || null,
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
        screen_name: "journal_by_accountId",
        search: search || null,
        bank_account_id: selectedAccountName?.value
          ? Number(selectedAccountName?.value)
          : null,
        is_audit_view: isAuditView ? true : false,
        date_filter:
          selectedActivityRangeType === "All dates"
            ? null
            : selectedActivityRangeType || null,
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

  function routeTo(routeData: any) {
    let data = routeData?.original?.route;
    if (data?.route_to == "claim") {
      let paymentObj: any = 0;
      if (data?.payment_list?.length > 0) {
        const isPartPayment = data?.payment_list.some(
          (x: any) =>
            x?.payment_type === tabTypes.PART ||
            x?.payment_type === tabTypes.PAY_LESS_PART
        );

        if (isPartPayment) {
          paymentObj = data?.payment_list.findLast(
            (x: any) =>
              x?.payment_type === tabTypes.PART ||
              x?.payment_type === tabTypes.PAY_LESS_PART
          );
        }
      }
      router.push(
        `${AppRoutes.USER_VIEW_CLAIMS}/${data?.payment_claim_id}?type=${
          data?.cash_retention_type
        }&cash-retention-type=${
          data?.cash_retention_type === "Claim" ? "" : "RetentionClaim"
        }&beneficiary=${data?.beneficiary_type || ""}&payment-type=${
          paymentObj
            ? paymentObj?.payment_type
            : data?.payment_list?.length > 0
            ? data?.payment_list[0]?.payment_type
            : ""
        }&payment=${
          paymentObj
            ? paymentObj?.payment_id
            : data?.payment_list?.length > 0
            ? data?.payment_list[0]?.payment_id
            : ""
        }&ctype=${data?.claim_type}`
      );
    } else if (data?.route_to == "payment") {
      if (data?.payment_claim_id && data?.payment_id) {
        router.push(
          `${AppRoutes.USER_ADD_PAYMENT}?claim=${data?.payment_claim_id}&mode=${VIEW}&payment=${data?.payment_id}`
        );
      } else {
        router.push(
          `${AppRoutes.USER_VIEW_INTEREST_CHARGES_OTHER_PAYMENT}/${data?.payment_id}`
        );
      }
    }
  }
  return (
    <div className="container-fluid">
      <div className="grid">
        <div className="pt_title">
          {!overViewDetails?.overViewMode &&
            !isFromAdmin &&
            !overViewDetails?.overBankViewMode && (
              <BreadCrumbs
                routePaths={[
                  {
                    name: "Dashboard",
                    path: AppRoutes.USER_DASHBOARD,
                  },

                  {
                    name: "Trust Accounting",
                    path: AppRoutes.USER_TRUST_ACCOUNTING,
                  },
                ]}
                activeRoute={"Journals"}
              />
            )}

          <div className="grid pt_topfilters">
            {!overViewDetails?.overViewMode &&
              !isFromAdmin &&
              !overViewDetails?.overBankViewMode && (
                <div className="grid pt_topfilters">
                  <div className="pt_pagetitle">
                    <h1>Journals</h1>
                  </div>
                </div>
              )}
            <div className="pt_pageactions companyFlex">
              {!overViewDetails?.overViewMode &&
                isFromAdmin &&
                !overViewDetails?.overBankViewMode && (
                  <div>
                    <h4>Company Profile - {companyName || "fhgfhfh"}</h4>
                  </div>
                )}
            </div>
            <div className="actionbuttons">
              <GridExportActions
                resetFilterFunction={() => {
                  resetFilters();
                }}
                hideExcelButton={ledgerJournalListData.length === 0}
                hidePdfButton={ledgerJournalListData.length === 0}
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
      </div>

      <div className="filterSet">
        <div>
          <fieldset>
            <label>
              <input
                name="audit"
                type="checkbox"
                role="switch"
                checked={isAuditView}
                onChange={handleAuditToggle}
              />
              Audit view
            </label>
          </fieldset>
        </div>
        <div>
          <div className="pt_filtergroup">
            <div className="pt_filteroptions">
              <div className="tableAlign">
                {isAuditView && (
                  <FormikControl
                    placeholder={"Search by claim id, payment id"}
                    control={InputType.SEARCH}
                    onChange={(value: any) => {
                      if (currentPage !== 1) setCurrentPage(1);
                      setSearch(value);
                    }}
                    name={search}
                    value={search}
                    clearSearch={emptySearchField}
                  />
                )}
              </div>
              {!overViewDetails?.overBankViewMode && (
                <div className="tableAlign">
                  <SearchableSelect
                    placeholder="Account Name"
                    name="account"
                    isInPopup
                    selectedData={selectedAccountName}
                    onChange={handleAccountChange}
                    options={accountList} // Pass the status options here
                    renderKey="label"
                    valueKey="value"
                    disabled={isFromBankOverView}
                  />
                </div>
              )}
              <div className="tableAlign">
                <FormikControl
                  placeholder={"Activity Range"}
                  name="Activity Range"
                  options={filterByDurationDates}
                  onChange={(value: any) => {
                    console.log(value);
                    if (value === "Custom") {
                      setIsCustomDate(true);
                    } else {
                      setActivityLogStartDate(
                        new Date(new Date().setHours(0, 0, 0, 0))
                      );
                      setActivityLogEndDate(
                        new Date(new Date().setHours(0, 0, 0, 0))
                      );
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
          </div>
        </div>
      </div>

      {isCustomDate && (
        <div className="grid">
          <div>
            <FormikControl
              label="From date"
              name="From date"
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
              onChange={(selectedDate: string) => {
                if (!selectedDate) {
                  setActivityLogStartDate(null);
                  return;
                }
                let fromDate = new Date(
                  new Date(selectedDate).setHours(0, 0, 0, 0)
                );
                if (fromDate > activityLogEndDate) {
                  setActivityLogStartDate(fromDate);
                  setActivityLogEndDate(new Date(selectedDate));
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
              name="To date"
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
              onChange={(selectedDate: string) => {
                if (!selectedDate) {
                  setActivityLogEndDate(null);
                  return;
                }
                let toDate = new Date(selectedDate);
                if (toDate < activityLogStartDate) {
                  return;
                } else {
                  setActivityLogEndDate(toDate);
                }
              }}
              maxDate="" // Set any maximum date if needed
              disabled={false}
            />
          </div>
        </div>
      )}
      {selectedActivityRangeType !== "Custom" &&
        filterDate?.start_date &&
        filterDate?.end_date && (
          <div className="trust-accounting-date-range-box">
            <div className="trust-accounting-date-column">
              <span className="trust-accounting-date-label">From date</span>
              <span className="trust-accounting-date-value">
                {formatDate(filterDate?.start_date)}
              </span>
            </div>
            <span className="trust-accounting-date-arrow">→</span>
            <div className="trust-accounting-date-column">
              <span className="trust-accounting-date-label">To date</span>
              <span className="trust-accounting-date-value">
                {formatDate(filterDate?.end_date)}
              </span>
            </div>
          </div>
        )}
      <div className="grid">
        <div className="pt_box">
          {ledgerJournalListData && ledgerJournalListData.length > 0 ? (
            ledgerJournalListData.map((ledgerItems: any, index: number) => (
              <TrustAccountGrid
                key={index}
                tableHeaders={
                  isAuditView ? trustListHeaders : journalsListHeaders
                }
                gridData={ledgerItems}
                renderRowList={journalRenderRowData}
                fontBoldLastRow
                nestedArrayKey="accounts"
                dynamicColumns={["Audit Id"]}
                renderStaticFooterRow
                hoverOnRowClick
                onClick={(data) => {
                  routeTo(data);
                }}
              />
            ))
          ) : (
            <p className="emptyMsg">No records to display</p>
          )}
        </div>
      </div>
    </div>
  );
}
