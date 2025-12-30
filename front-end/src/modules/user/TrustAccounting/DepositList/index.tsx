"use client";
import FormikControl from "@/components/FormikControl";
import DynamicTable from "@/components/Table";
import {
  filterByDuration,
  filterByDurationDates,
  InputType,
  NA,
  VIEW,
} from "@/shared/constant/general";

import React, { useEffect, useState } from "react";
import { AuditReportType } from "../trustAccounting.types";

import {
  depositsListHeaders,
  depositsRenderRowData,
} from "../trustAccounting.constant";

import { format, isValid } from "date-fns";
import { FetchAllBankAccounts } from "../../BankAccounts/bankAccount.functions";
import GridExportActions from "@/components/GridExportActions";
import { getCookie } from "cookies-next";
import { useRouter, useSearchParams } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import TrustAccountGrid from "@/components/TrustAccountGrid/TrustAccountGrid";
import { AppRoutes } from "@/shared/constant/appRoutes";
import BreadCrumbs from "@/components/BreadCrumbs";
import {
  getDepositsAndWithdrawalsByAccountId,
  GridEntryType,
} from "./depositList.functions";
import { connectWebSocket, formatDate } from "@/utils";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { tabTypes } from "../../AddUpdatePayments/Payments.constants";

export default function UserDeposits(props: any) {
  const {
    isFromAdmin = false,
    isFromBankOverView = false,
    bankOverViewAcc = "",
  } = props;
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

  const [companyId, setCompanyId] = useState<number | null>(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState("");
  const companyName = getCookie("companyName"); // Access the company name from the cookie
  const [selectedBankAccountObj, setSelectedBankAccountObj] = useState("");
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState<boolean>(true);
  const [singleActivityDate, setSingleActivityDate] = useState<any>({
    value: "Last Month",
    label: "Last Month",
  });
  const [accountType, setAccountType] = useState<any>([]);

  const handleAccountChange = (selectedOption: any) => {
    setSelectedAccountName(selectedOption);
    // Assuming the account type is stored in the selectedOption data.
    setAccountType(selectedOption?.data?.account_type);
  };

  const [selectedRowsInGrid, setSelectedRowsInGrid] = useState([]);
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [data, setData] = useState<any>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAuditView, setIsAuditView] = useState(false);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [selectedAccountName, setSelectedAccountName] = useState<any>(null);
  const [bankOptions, setBankOptions] = useState<any>([]);
  const [search, setSearch] = useState("");
  const [isCustomDate, setIsCustomDate] = useState(AuditDate ? true : false);
  const [activityLogStartDate, setActivityLogStartDate] = useState<
    Date | null | any
  >(
    oneYearBeforeAuditDate
      ? new Date(oneYearBeforeAuditDate)
      : new Date(new Date().setHours(0, 0, 0, 0))
  );
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [activityDate, setActivityDate] = useState(
    AuditDate ? "Custom" : "Last Month"
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
  const router = useRouter();
  const [selectedActivityRangeType, setSelectedActivityRangeType] = useState(
    AuditDate ? "Custom" : "All dates"
  );
  const [role, setRole] = useState<string | null>(null);
  const isAnyFilterActive =
    search ||
    selectedActivityRangeType !== "All dates" ||
    // selectedAccountName?.value !== accountList?.[0]?.value;
    selectedAccountName?.value !==
      ((accountList?.length &&
        accountList.find(
          (account: any) =>
            account?.data?.account_type === "Retention Trust Account"
        )?.value) ||
        accountList?.[0]?.value);
  const selectedAccId = BankAccId
    ? Number(BankAccId)
    : selectedAccountName?.value
    ? Number(selectedAccountName?.value)
    : 0;
  const handleAuditToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsAuditView(event.target.checked);
  };
  // Define actions dynamically
  const [filterDate, setFilterData] = useState<any>();

  const resetFilters = () => {
    // Reset filtering criteria
    setSingleActivityDate({ value: "Last Month", label: "Last Month" });
    setSelectedActivityRangeType("All dates");
    setIsCustomDate(false);
    setSearch("");
    setEmptySearchField(true);
    // Reset account selection to the first option (0th index of accountList)
    // if (accountList?.length > 0) {
    //   setSelectedAccountName(accountList[0]);
    // }
    if (accountList?.length > 0) {
      const rtaAccount = accountList.find(
        (account: any) =>
          account.data.account_type === "Retention Trust Account"
      );

      setSelectedAccountName(rtaAccount || accountList[0]);
    }
    // Reset date range to the previous month
    const now = new Date();
    const firstDayOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    setActivityLogStartDate(firstDayOfLastMonth);
    setActivityLogEndDate(lastDayOfLastMonth);

    // Clear search field and selected rows in the grid
    setSearch("");
    setEmptySearchField(true); // Optional, for clearing the search input
    setSelectedRowsInGrid([]);

    // Trigger re-fetching of data
    setTimeKey(new Date().getTime());
  };

  useEffect(() => {
    // Fetch and set bank accounts
    const fetchBankAccounts = async () => {
      try {
        const payload = {
          company_id:
            isFromAdmin && AdminCompanyId
              ? Number(AdminCompanyId)
              : selectedCompanyId,
          page: currentPage || null,
          items_per_page: entriesPerPage || null,
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

          // // Set the selected account
          // const selectedAccount = accountOptions.find((option: any) => {
          //   if (isFromBankOverView && bankOverViewAcc) {
          //     return option.value === bankOverViewAcc;
          //   }
          //   return option.value === BankAccId;
          // });

          // setSelectedAccountName(selectedAccount || accountOptions[0]);
          // Find an RTA (Retention Trust Account) if available
          const rtaAccount = accountOptions.find(
            (option: any) =>
              option.data.account_type === "Retention Trust Account"
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
      } catch (error) {
        console.error("Error fetching bank accounts:", error);
      }
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
  ]);

  useEffect(() => {
    getBankAccountName();
  }, []);

  useEffect(() => {
    const storedCompanyId = localStorage.getItem("companyId");

    if (AdminCompanyId) {
      setCompanyId(Number(AdminCompanyId));
    } else if (storedCompanyId) {
      setCompanyId(parseInt(storedCompanyId, 10));
    }
  }, [AdminCompanyId]);

  async function getBankAccountName() {
    const postData = {
      company_id: companyId,
    };
  }
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        if (selectedAccId) {
          const payload = {
            bank_account_id: selectedAccId,
            date_filter:
              selectedActivityRangeType === "All dates"
                ? null
                : selectedActivityRangeType || null,
            start_date: isCustomDate
              ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
              : null,
            end_date: isCustomDate
              ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
              : null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          };

          const response = await getDepositsAndWithdrawalsByAccountId(payload);

          if (response) {
            setData(response || []);
            setFilterData(response?.filter_dates);
          } else {
            setData([]);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setData([]); // Clear data on error
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    currentPage,
    entriesPerPage,
    search,
    selectedAccountName,
    singleActivityDate,
    isCustomDate,
    activityLogStartDate,
    activityLogEndDate,
    AdminCompanyId,
    selectedActivityRangeType,
  ]);

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "deposit_withdrawal_by_accountId",
        bank_account_id: selectedAccId,
        date_filter:
          selectedActivityRangeType === "All dates"
            ? null
            : selectedActivityRangeType || null,
        start_date: isCustomDate
          ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
          : null,
        end_date: isCustomDate
          ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
          : null,
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
        screen_name: "deposit_withdrawal_by_accountId",
        bank_account_id: selectedAccId,
        date_filter:
          selectedActivityRangeType === "All dates"
            ? null
            : selectedActivityRangeType || null,
        start_date: isCustomDate
          ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
          : null,
        end_date: isCustomDate
          ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
          : null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  };

  function routeTo(routeData: any) {
    let data = routeData.route;
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
          {!isFromAdmin && (
            <BreadCrumbs
              routePaths={[
                {
                  name: "Dashboard",
                  path: AppRoutes.USER_DASHBOARD,
                },

                {
                  name: "Trust accounting",
                  path: AppRoutes.USER_TRUST_ACCOUNTING,
                },
              ]}
              activeRoute={"Deposits and withdrawals"}
            />
          )}
          <div className="grid pt_topfilters">
            <div className="grid pt_topfilters">
              {!isFromAdmin && (
                <div className="pt_pagetitle">
                  <h1>Deposits and withdrawals</h1>
                </div>
              )}
            </div>
          </div>

          <div className="pt_pageactions companyFlex">
            <div>
              {isFromAdmin && (
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
                hideExcelButton={
                  !data?.grid_entries || data?.grid_entries?.length == 0
                }
                hidePdfButton={
                  !data?.grid_entries || data?.grid_entries?.length == 0
                }
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
      <div className="grid">
        <div>
          <div className="pt_filtergroup">
            <div className="pt_filteroptions">
              <SearchableSelect
                placeholder="Account Name"
                name="account"
                isInPopup
                selectedData={selectedAccountName}
                onChange={handleAccountChange}
                options={accountList} // Pass the status options here
                renderKey="label"
                valueKey="value"
              />

              <FormikControl
                placeholder={"Activity Range"}
                name="Activity Range"
                options={filterByDurationDates}
                onChange={(value: any) => {
                  console.log(value);
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
                  // setActivityLogEndDate(fromDate);
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
      )}{" "}
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
          {data.grid_entries?.length > 0 ? (
            // data.map((ledgerItems: any, index: number) => (
            <TrustAccountGrid
              tableHeaders={depositsListHeaders}
              gridData={data}
              renderRowList={depositsRenderRowData}
              fontBoldLastRow
              nestedArrayKey="grid_entries"
              fontBoldFirstRow
              renderStaticFirstRow
              renderStaticFooterRow
              hoverOnRowClick
              renderDynamicRowDatOnClick={(data) => {
                routeTo(data);
              }}
            />
          ) : (
            // ))
            <p className="emptyMsg">No records to display</p>
          )}
        </div>
      </div>
    </div>
  );
}
