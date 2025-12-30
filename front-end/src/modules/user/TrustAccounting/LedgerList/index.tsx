"use client";
import FormikControl from "@/components/FormikControl";
import {
  filterByDurationDates,
  InputType,
  VIEW,
} from "@/shared/constant/general";
import React, { useEffect, useState } from "react";
import {
  ledgerexcelColumnNames,
  ledgerListHeaders,
  ledgerRenderRowData,
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
  getBeneficiaryList,
  getLedgerServices,
  LedgerType,
} from "./LedgerList.functions";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { connectWebSocket, formatDate } from "@/utils";
import { tabTypes } from "../../AddUpdatePayments/Payments.constants";

export default function UserLedger(props: any) {
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
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [ledgerListData, setLedgerListData] = useState<LedgerType[]>([]);
  const [filterDate, setFilterData] = useState<any>();

  const [singleActivityDate, setSingleActivityDate] = useState<any>({
    value: "Last Month",
    label: "Last Month",
  });
  const [accountType, setAccountType] = useState<any>([]);
  const companyName = getCookie("companyName"); // Access the company name from the cookie
  const handleAccountChange = (selectedOption: any) => {
    setSelectedAccountName(selectedOption);
    // Assuming the account type is stored in the selectedOption data.
    setAccountType(selectedOption?.data?.account_type);
  };
  const handleBeneficiaryChange = (selectedOption: any) => {
    setSelectedBeneficiary(selectedOption);
  };
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [selectedRowsInGrid, setSelectedRowsInGrid] = useState([]);
  const [timeKey, setTimeKey] = useState(new Date().getTime());

  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [selectedAccountName, setSelectedAccountName] = useState<any>(null);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<any>(null);
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
  const router = useRouter();
  const [selectedActivityRangeType, setSelectedActivityRangeType] =
    useState("All dates");
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);
  const [beneficiaryList, setBeneficiaryList] = useState([]);

  const isAnyFilterActive =
    search ||
    isCustomDate === true ||
    selectedBeneficiary ||
    selectedActivityRangeType !== "All dates" ||
    selectedAccountName?.value !==
      ((accountList?.length &&
        accountList.find(
          (account: any) =>
            account?.data?.account_type === "Retention Trust Account"
        )?.value) ||
        accountList?.[0]?.value);

  const resetFilters = () => {
    // Reset filtering criteria
    setSingleActivityDate({ value: "Last Month", label: "Last Month" });
    setSelectedActivityRangeType("All dates");
    setIsCustomDate(false);
    setSearch("");
    setEmptySearchField(true);
    setSelectedBeneficiary(null);

    if (accountList?.length > 0) {
      const rtaAccount = accountList.find(
        (account: any) =>
          account.data.account_type === "Retention Trust Account"
      );

      setSelectedAccountName(rtaAccount || accountList[0]);
    }

    setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0))); // Reset start date
    setActivityLogEndDate(new Date(new Date().setHours(23, 59, 59, 999))); // Reset end date

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
          company_id: AdminCompanyId
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
    const storedCompanyId = localStorage.getItem("companyId");

    if (AdminCompanyId) {
      setCompanyId(Number(AdminCompanyId));
    } else if (storedCompanyId) {
      setCompanyId(parseInt(storedCompanyId, 10));
    }
  }, [AdminCompanyId]);

  useEffect(() => {
    fetchData(currentPage, entriesPerPage);
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
    selectedBeneficiary,
  ]);

  useEffect(() => {
    fetchBeneficiaryList();
  }, [
    selectedAccountName,
    isCustomDate,
    selectedActivityRangeType,
    activityLogStartDate,
    activityLogEndDate,
  ]);

  const fetchBeneficiaryList = async () => {
    if (!selectedAccountName?.value) return;
    try {
      const response = await getBeneficiaryList({
        company_id: AdminCompanyId ? Number(AdminCompanyId) : selectedCompanyId,
        bank_account_id: selectedAccountName?.value
          ? Number(selectedAccountName?.value)
          : "",
        date_filter:
          selectedActivityRangeType === "All dates"
            ? null
            : selectedActivityRangeType || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
      });
      setBeneficiaryList(response?.beneficiary_list);
    } catch {}
  };

  const fetchData = async (currentPage: number, entriesPerPage: number) => {
    setLoading(true);
    if (!selectedAccountName?.value) return;
    try {
      const response = await getLedgerServices({
        company_id: AdminCompanyId ? Number(AdminCompanyId) : selectedCompanyId,
        page_number: currentPage,
        page_size: entriesPerPage,
        bank_account_id: selectedAccountName?.value
          ? Number(selectedAccountName?.value)
          : "",
        date_filter:
          selectedActivityRangeType === "All dates"
            ? null
            : selectedActivityRangeType || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
        beneficiary: selectedBeneficiary?.value || null,
      });
      if (response) {
        const newdata = response?.grid_entries?.map((prev: any) => {
          return {
            ...prev,
          };
        });
        setFilterData(response?.filter_dates);
        setLedgerListData(newdata || []);

        setTotalRows(response?.total_count || 0);
        setCurrentPage(entriesPerPage);
      } else {
        setLedgerListData([]);
        setTotalRows(0);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };
  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "ledger_by_accountId",
        // search: search || null,
        bank_account_id: selectedAccountName?.value
          ? Number(selectedAccountName?.value)
          : "",
        date_filter:
          selectedActivityRangeType === "All dates"
            ? null
            : selectedActivityRangeType || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
        beneficiary: selectedBeneficiary?.value || null,
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
        screen_name: "ledger_by_accountId",
        // search: search || null,
        bank_account_id: selectedAccountName?.value
          ? Number(selectedAccountName?.value)
          : "",
        date_filter:
          selectedActivityRangeType === "All dates"
            ? null
            : selectedActivityRangeType || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
        beneficiary: selectedBeneficiary?.value || null,
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
                  name: "Trust Accounting",
                  path: AppRoutes.USER_TRUST_ACCOUNTING,
                },
              ]}
              activeRoute={"Account ledger"}
            />
          )}
          <div className="grid pt_topfilters">
            <div className="grid pt_topfilters">
              {!isFromAdmin && (
                <div className="pt_pagetitle">
                  <h1>Account ledger</h1>
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
                excelFile={{
                  sheetName: "ledger list",
                  tableData: ledgerListData,
                  LabelAndValueKey: ledgerexcelColumnNames,
                }}
                resetFilterFunction={() => {
                  resetFilters();
                }}
                handleDownloadExcelFile={() => {
                  handleDownloadExcelFile();
                }}
                hideExcelButton={ledgerListData.length === 0}
                hidePdfButton={ledgerListData.length === 0}
                hideResetButton={!isAnyFilterActive}
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
              <SearchableSelect
                placeholder="Account/Beneficiary"
                name="Beneficiary"
                selectedData={selectedBeneficiary}
                onChange={handleBeneficiaryChange}
                options={beneficiaryList}
                renderKey="name"
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
                  setTimeKey(new Date().getTime());
                  setActivityLogStartDate(fromDate);
                  setActivityLogEndDate(new Date(selectedDate));
                } else {
                  setTimeKey(new Date().getTime());
                  setActivityLogStartDate(fromDate);
                }
              }}
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
                  setTimeKey(new Date().getTime());
                  setActivityLogEndDate(toDate);
                }
              }}
              minDate={
                activityLogStartDate
                  ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                  : ""
              }
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
          {ledgerListData && ledgerListData.length > 0 ? (
            ledgerListData.map((ledgerItems: any, index: number) => (
              <TrustAccountGrid
                key={index}
                tableIndex={index}
                renderOneTableHeader
                tableHeaders={ledgerListHeaders}
                gridData={ledgerItems}
                renderRowList={ledgerRenderRowData}
                fontBoldLastRow
                nestedArrayKey="entries"
                fontBoldFirstRow
                hightLightNetRowBackground
                renderStaticFirstRow
                fontBoldNetRow
                renderStaticNetFooterRow
                renderStaticFooterRow
                hoverOnRowClick
                renderDynamicRowDatOnClick={(data) => {
                  routeTo(data);
                }}
                from="ledger"
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
