"use client";
import FormikControl from "@/components/FormikControl";
import { InputType } from "@/shared/constant/general";
import React, { useEffect, useState } from "react";
import {
  trialListHeaders,
  trialRenderRowData,
} from "../trustAccounting.constant";
import { format } from "date-fns";
import { FetchAllBankAccounts } from "../../BankAccounts/bankAccount.functions";
import GridExportActions from "@/components/GridExportActions";
import { getCookie } from "cookies-next";
import { useRouter, useSearchParams } from "next/navigation";
import TrustAccountGrid from "@/components/TrustAccountGrid/TrustAccountGrid";
import { showErrorToast } from "@/components/Toaster";
import { AppRoutes } from "@/shared/constant/appRoutes";
import BreadCrumbs from "@/components/BreadCrumbs";
import { getLedgerTrialBalanceServices } from "./trialList.functions";
import { getDatePickerFormat } from "@/utils";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { connectWebSocket } from "@/utils";

export default function UserTrialList(props: any) {
  const {
    isFromAdmin = false,
    isFromBankOverView = false,
    bankOverViewAcc = "",
  } = props;

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

  const BankAccId = useSearchParams().get("bank") || getCookie("bankId");
  const AdminCompanyId = getCookie("compId");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [accountType, setAccountType] = useState<any>([]);
  const companyName = getCookie("companyName"); // Access the company name from the cookie
  const handleAccountChange = (selectedOption: any) => {
    setSelectedAccountName(selectedOption);
    // Assuming the account type is stored in the selectedOption data.
    setAccountType(selectedOption?.data?.account_type);
  };
  const [data, setData] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [selectedAccountName, setSelectedAccountName] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [activityLogStartDate, setActivityLogStartDate] = useState<Date | null>(
    auditDateISO ? new Date(auditDateISO) : new Date()
  );

  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [activityLogEndDate, setActivityLogEndDate] = useState(
    new Date(new Date().setHours(23, 59, 59, 999))
  );
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [accountList, setAccountList] = useState<any>();
  const isAnyFilterActive =
    selectedDate !== new Date().toISOString().split("T")[0] ||
    selectedAccountName?.value !==
      ((accountList?.length &&
        accountList.find(
          (account: any) =>
            account?.data?.account_type === "Retention Trust Account"
        )?.value) ||
        accountList?.[0]?.value);

  const handleDateChange = (date: Date | null, isStartDate: boolean) => {
    if (isStartDate) {
      setActivityLogStartDate(date);
      if (date && date > activityLogEndDate!) setActivityLogEndDate(date);
    }
  };

  const resetFilters = () => {
    if (accountList?.length > 0) {
      const rtaAccount = accountList.find(
        (account: any) =>
          account.data.account_type === "Retention Trust Account"
      );

      setSelectedAccountName(rtaAccount || accountList[0]);
      setActivityLogStartDate(
        auditDateISO ? new Date(auditDateISO) : new Date()
      );
      setSelectedDate(new Date().toISOString().split("T")[0]);
    }
  };

  useEffect(() => {
    // Fetch and set bank accounts
    const fetchBankAccounts = async () => {
      try {
        const payload = {
          company_id: AdminCompanyId
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
  }, [AdminCompanyId, selectedCompanyId, BankAccId]);

  // Effect to handle company ID persistence
  useEffect(() => {
    const storedCompanyId = localStorage.getItem("companyId");

    if (AdminCompanyId) {
      setCompanyId(Number(AdminCompanyId));
    } else if (storedCompanyId) {
      setCompanyId(parseInt(storedCompanyId, 10));
    }
  }, [AdminCompanyId]);

  useEffect(() => {
    const fetchLedgerData = async () => {
      try {
        if (selectedAccountName) {
          const response = await getLedgerTrialBalanceServices(
            {
              company_id: AdminCompanyId
                ? Number(AdminCompanyId)
                : selectedCompanyId,
              bank_account_id: Number(selectedAccountName.value),
              start_date: selectedDate,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            setLoading
          );

          setData(response || []);
        }
      } catch (error) {
        showErrorToast("Failed to fetch trial balance data.");
      } finally {
        setLoading(false);
      }
    };

    fetchLedgerData();
  }, [selectedAccountName, selectedDate]);

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "trial_balance_by_accountId",
        company_id: AdminCompanyId ? Number(AdminCompanyId) : selectedCompanyId,
        bank_account_id: Number(selectedAccountName.value),
        start_date: selectedDate,
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
        bank_account_id: Number(selectedAccountName.value),
        start_date: selectedDate,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
              activeRoute={"Trial balance statement"}
            />
          )}
          <div className="grid pt_topfilters">
            <div className="grid pt_topfilters">
              {!isFromAdmin && (
                <div className="pt_pagetitle">
                  <h1>Trial balance statement</h1>
                </div>
              )}
            </div>
          </div>
          <div className="pt_pageactions companyFlex">
            <div>
              {isFromAdmin && (
                <div>
                  <h4>Company Profile - {companyName ?? ""}</h4>
                </div>
              )}
            </div>
            <div className="actionbuttons">
              <GridExportActions
                resetFilterFunction={() => {
                  resetFilters();
                }}
                hideExcelButton={
                  !data?.trial_balance_list ||
                  data?.trial_balance_list?.length == 0
                }
                hidePdfButton={
                  !data?.trial_balance_list ||
                  data?.trial_balance_list?.length == 0
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
              <FormikControl
                control={InputType.SELECT}
                placeholder="Account Name"
                name="account"
                options={accountList}
                value={selectedAccountName?.value || ""}
                renderKey="label"
                valueKey="value"
                returnSelectedObject
                onChange={handleAccountChange}
              />

              <FormikControl
                name="activityLogStartDate"
                control={InputType.DATE_PICKER}
                type="date"
                value={
                  activityLogStartDate
                    ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                    : ""
                }
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const selectedValue: any = e;
                  if (selectedValue) {
                    const newDate = new Date(selectedValue);
                    handleDateChange(selectedValue, true);
                    setSelectedDate(selectedValue); // Ensure `selectedDate` is updated
                  }
                }}
                maxDate={getDatePickerFormat()}
                disabled={false}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid blockTrial">
        <div className="pt_box">
          <div className="trial">
            {data?.trial_balance_list?.length > 0 ? (
              <TrustAccountGrid
                tableHeaders={trialListHeaders}
                gridData={data}
                renderRowList={trialRenderRowData}
                fontBoldLastRow
                nestedArrayKey="trial_balance_list"
                renderStaticFooterRow
                hoverOnRowClick
              />
            ) : (
              <p className="emptyMsg">No records to display</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
