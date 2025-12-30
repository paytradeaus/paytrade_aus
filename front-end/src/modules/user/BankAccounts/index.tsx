"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import TabSwitch from "@/components/TabSwitch";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { InputType, NA } from "@/shared/constant/general";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { IBankTrustAccountDetails } from "./bankTrustAccount.types";
import {
  bankAccountHeaders,
  bankAccountRenderData,
  bankAccountTypeOptions,
  queryParamsData,
  queryParamsVar,
  tabOptions,
} from "./bankAccount.constant";
import {
  connectWebSocket,
  convertPositiveDecimalTwoDigit,
  formatDate,
  getCompanyIdFromStorage,
} from "@/utils";
import {
  ChangeStatusOfBankAccount,
  FetchAllBankAccounts,
} from "./bankAccount.functions";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { useRouter, useSearchParams } from "next/navigation";
import BaseModal from "@/components/BaseModal";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { useDispatch } from "react-redux";
import { overviewModeType } from "../PaymentsList/PaymentList.constants";
import { projectOverviewTabs } from "../Projects/ProjectOverview/ProjectOverview.constant";

// Row data interface (Optional but recommended)
interface RowData {
  id: string;
  type: string;
  amount: string;
  fromAccount: string;
  toAccountName: string;
  toAccountNumber: string;
  toAccountBSB: string;
  status: string;
  bank_account_id: string;
}

const BankAccounts = (props: any) => {
  const { isArchived = false, overViewDetails } = props;

  const dispatch = useDispatch();

  const router = useRouter();
  const [bankListData, setBankListData] = useState<IBankTrustAccountDetails[]>(
    []
  );
  const [entireBankListData, setEntireBankListData] = useState<
    IBankTrustAccountDetails[]
  >([]);
  const queryParams = useSearchParams();
  const accountType = queryParams.get(queryParamsVar.ACCOUNT_TYPE);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const [selectedAccType, setSelectedAccType] = useState<any>("");

  const [totalRows, setTotalRows] = useState(0);

  const [tabStatus] = useState(isArchived ? "Archived" : "Current");

  const [tableLoader, setTableLoader] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [sortValues, setSortValues] = useState<any>("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [emptySearchField, setEmptySearchField] = useState(false);

  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const [actionData, setActionData] = useState<any>();
  const [initialRender, setInitialRender] = useState(true);
  const filteredBankAccountOptions = bankAccountTypeOptions.filter(
    (option) =>
      !(
        overViewDetails?.overViewMode &&
        overViewDetails?.data?.project_id &&
        option.value === "Cash Account"
      )
  );
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  useEffect(() => {
    dispatch(setScreenDetails({}));

    if (accountType) {
      initialInvoke();
    } else {
      getFetchBankAccountsLists(currentPage, entriesPerPage, selectedAccType);
    }
    setInitialRender(false);
  }, []);

  function initialInvoke() {
    let defaultOption = "All";
    if (accountType === queryParamsData.PTA) {
      defaultOption = "Project Trust Account";
    } else if (accountType === queryParamsData.RTA) {
      defaultOption = "Retention Trust Account";
    } else if (
      accountType === queryParamsData.cash &&
      !(overViewDetails?.overViewMode && overViewDetails?.data?.project_id)
    ) {
      defaultOption = "Cash Account";
    }

    setSelectedAccType({ value: defaultOption, label: defaultOption });
    getFetchBankAccountsLists(1, entriesPerPage, defaultOption);
  }

  useEffect(() => {
    getFetchBankAccountsLists(
      currentPage,
      entriesPerPage,
      selectedAccType?.value
    );
  }, [searchValue, tabStatus, sortValues, overViewDetails?.data?.project_id]);

  // Define actions dynamically
  const currentActions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: RowData) => {
        onRouteFromProjectOverview();
        router.push(
          overViewDetails?.overViewMode
            ? `${AppRoutes.USER_BANK_ACCOUNTS_OVERVIEW}/${
                row?.bank_account_id
              }/${getCompanyIdFromStorage()}?project=${
                overViewDetails?.data?.project_id
              }&overview=${overViewDetails?.data?.id}`
            : `${AppRoutes.USER_BANK_ACCOUNTS_OVERVIEW}/${
                row?.bank_account_id
              }/${getCompanyIdFromStorage()}`
        );
      },
    },
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: RowData) => {
        onRouteFromProjectOverview();
        router.push(
          overViewDetails?.overViewMode
            ? `${
                AppRoutes.USER_EDIT_BANK_ACCOUNTS
              }/${getCompanyIdFromStorage()}/${row?.bank_account_id}?project=${
                overViewDetails?.data?.project_id
              }&overview=${overViewDetails?.data?.id}`
            : `${
                AppRoutes.USER_EDIT_BANK_ACCOUNTS
              }/${getCompanyIdFromStorage()}/${row?.bank_account_id}`
        );
      },
    },
    {
      label: "Close",
      icon: "fa-light fa-xmark",
      onClick: (row: RowData) => {
        console.log("Claiming for row:", row);
      },
    },
    {
      label: "Delete",
      style: "contrast",
      icon: "fa-light fa-trash",
      onClick: (row: RowData) => {
        setActionData({ ...row, option: "Deleted" });
        setDisplayConfirmationModal(true);
      },
    },
  ];

  const archivedActions = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: RowData) => {
        onRouteFromProjectOverview();
        router.push(
          `${AppRoutes.USER_BANK_ACCOUNTS_OVERVIEW}/${
            row?.bank_account_id
          }/${getCompanyIdFromStorage()}`
        );
      },
    },
    {
      label: "Move to main list",
      icon: "fa-light fa-inbox-out",
      onClick: (row: RowData) => {
        setDisplayConfirmationModal(true);
        setActionData({ ...row, option: "Moved" });
      },
    },
  ];

  // Row click handler
  const handleRowClick = (row: RowData) => {
    router.push(
      `${AppRoutes.USER_BANK_ACCOUNTS_OVERVIEW}/${
        row?.bank_account_id
      }/${getCompanyIdFromStorage()}`
    );
  };

  async function getFetchBankAccountsLists(
    pageNumber: number,
    rowsPerPage: number,
    accType: string = "",
    getEntireData?: boolean
  ) {
    try {
      setBankListData([]);
      if (emptySearchField) {
        setEmptySearchField(false);
      }
      if (overViewDetails?.overViewMode && !overViewDetails?.data?.project_id) {
        return;
      }
      setTableLoader(true);
      const postData = {
        payload: {
          account_type: accType === "All" ? null : accType,
          company_id: getCompanyIdFromStorage(),
          items_per_page: !getEntireData ? rowsPerPage || entriesPerPage : null,
          page: !getEntireData ? pageNumber || currentPage : null,
          search: searchValue || null,
          status: tabStatus == "Current" ? null : tabStatus,
          ...(overViewDetails?.overViewMode
            ? { project_id: overViewDetails?.data?.project_id } // Adding project_id from overview details
            : {}),
          sorting_field: sortValues?.sortKey || "",
          sorting_order: sortValues?.direction || "",
        },
      };
      const response = await FetchAllBankAccounts(postData);

      if (response?.extendedBankAccounts?.length > 0) {
        const modifiedGridData = response?.extendedBankAccounts.map(
          (listObj: any) => {
            return {
              ...listObj,
              created_on: listObj?.created_on
                ? formatDate(listObj?.created_on)
                : NA,
              updated_on: listObj?.updated_on
                ? formatDate(listObj?.updated_on)
                : NA,
              showValidIcon: listObj?.status == "Open",
              showErrorIcon: !!(
                listObj?.status == "Deleted" || listObj?.status == "Completed"
              ),
              current_balance: listObj?.current_balance
                ? `$ ${convertPositiveDecimalTwoDigit(
                    listObj?.current_balance,
                    true
                  )}`
                : "$0.00",
            };
          }
        );
        if (getEntireData) {
          setEntireBankListData(modifiedGridData);
        } else {
          setBankListData(modifiedGridData);
        }
      } else {
        setBankListData([]);
      }

      setTotalRows(response?.total_count || 0);

      setTableLoader(false);
    } catch {
      setTableLoader(false);
    } finally {
      setDisableExcelBtn(false);
    }
  }

  function handleTabChange(value: string) {
    router.push(
      value === "Archived"
        ? AppRoutes.USER_BANK_ACCOUNTS_ARCHIVED
        : AppRoutes.USER_BANK_ACCOUNTS_CURRENT
    );
  }

  function handleAccountChange(selectionOption: any) {
    if (
      overViewDetails?.overViewMode &&
      overViewDetails?.data?.project_id &&
      selectionOption.value === "Cash Account"
    ) {
      return; // Prevent selecting "Cash Account" in projectoverview mode
    }

    setSelectedAccType(selectionOption);
    setCurrentPage(1);
    getFetchBankAccountsLists(1, entriesPerPage, selectionOption?.value);
  }

  function handlePageChange(value: any) {
    setCurrentPage(value);
    getFetchBankAccountsLists(value, entriesPerPage, selectedAccType?.value);
  }

  function handleRowsPerPageChange(value: any) {
    setEntriesPerPage(value);
    setCurrentPage(1);
    getFetchBankAccountsLists(1, value, selectedAccType?.value);
  }

  function handleSearch(searchedValue: any) {
    if (currentPage != 1) {
      setCurrentPage(1);
    }
    if (entriesPerPage != 10) {
      setEntriesPerPage(10);
    }
    setSearchValue(searchedValue);
  }

  const handleModalPopUpFunction = async () => {
    setDisplayConfirmationModal(!displayConfirmationModal);
    const { option } = actionData;

    if (
      option === "Deleted" ||
      option === "Transferred" ||
      option === "Archived" ||
      option === "Active" ||
      option === "Closed" ||
      option === "Open" ||
      option === "Draft" ||
      option === "Moved"
    ) {
      let payload = {
        bank_account_id: actionData?.bank_account_id,
        status: isArchived ? actionData.previous_status : option,
      };
      let changeStatusRes = await ChangeStatusOfBankAccount(payload);
      if (changeStatusRes) {
        await getFetchBankAccountsLists(currentPage, entriesPerPage);
      }
    }
  };

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "bank_account",
        account_type: selectedAccType === "All" ? null : selectedAccType?.value,
        company_id: getCompanyIdFromStorage(),
        search: searchValue || null,
        status: tabStatus == "Current" ? null : tabStatus,
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
  };

  async function handleDownloadPdfFile() {
    setDisablePDFBtn(true);

    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "bank_account",
        account_type: selectedAccType === "All" ? null : selectedAccType?.value,
        company_id: getCompanyIdFromStorage(),
        search: searchValue || null,
        status: tabStatus == "Current" ? null : tabStatus,
      });
      setDisablePDFBtn(false);
    } catch {
    } finally {
      setDisablePDFBtn(false);
    }
  }

  function onRouteFromProjectOverview() {
    if (overViewDetails?.overViewType == overviewModeType.PROJECTS) {
      dispatch(
        setScreenDetails({
          fromScreen: "projectOverview",
          toScreen: "bankAccounts",
          mainActiveTab: projectOverviewTabs.BANK_ACCOUNTS,
        })
      );
    }
  }

  return (
    <div>
      <div className="container-fluid">
        <div className="pt_title">
          {!overViewDetails?.overViewMode && (
            <BreadCrumbs
              routePaths={[
                {
                  name: "Dashboard",
                  path: AppRoutes.USER_DASHBOARD,
                },
              ]}
              activeRoute={"Bank/trust accounts"}
            />
          )}
          <div className="grid pt_topfilters">
            {!overViewDetails?.overViewMode && (
              <div className="pt_pagetitle">
                <h1>Bank/trust accounts</h1>
              </div>
            )}
            <div className="pt_pageactions">
              <Link
                // href={AppRoutes.USER_ADD_BANK_ACCOUNTS}
                href={
                  overViewDetails?.overViewMode
                    ? `${AppRoutes.USER_ADD_BANK_ACCOUNTS}?project=${overViewDetails?.data?.project_id}&overview=${overViewDetails?.data?.id}`
                    : `${AppRoutes.USER_ADD_BANK_ACCOUNTS}`
                }
                passHref
                legacyBehavior
              >
                <a className="pt_addnewbutton">
                  <button
                    className="secondary"
                    onClick={() => onRouteFromProjectOverview()}
                  >
                    <i className="fa-light fa-hexagon-plus"></i>Add bank account
                  </button>
                </a>
              </Link>
            </div>
          </div>
        </div>

        <div className="pt_filtergroup">
          <div className="grid pt_topfilters">
            {!overViewDetails?.overViewMode && (
              <div className="pt_filters ">
                <TabSwitch
                  tabOptions={tabOptions}
                  tabValue={tabStatus}
                  onChange={(value: any) => handleTabChange(value)}
                />
              </div>
            )}
            <GridExportActions
              resetFilterFunction={() => {
                handleAccountChange("");
                setEmptySearchField(true);
              }}
              hideResetButton={!selectedAccType && !searchValue}
              hideExcelButton={bankListData?.length == 0}
              hidePdfButton={bankListData?.length == 0}
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
            <FormikControl
              control={InputType.SEARCH}
              onChange={(value: any) => handleSearch(value)}
              clearSearch={emptySearchField}
            />

            <SearchableSelect
              placeholder="Select an account type"
              name="bankAccounts"
              options={filteredBankAccountOptions}
              onChange={(value: any) => handleAccountChange(value)}
              selectedData={selectedAccType}
              renderKey="label"
              valueKey="value"
            />
          </div>
        </div>

        <div className="grid">
          <div className="pt_box">
            <div className="grid">
              <h4>{tabStatus || "Current"}</h4>
            </div>
            <DynamicTable
              headers={bankAccountHeaders}
              gridData={bankListData?.length > 0 ? bankListData : []}
              gridActions={
                tabStatus === tabOptions[1]?.label
                  ? archivedActions
                  : currentActions
              }
              displayAllStaticActions={true}
              onRowClick={handleRowClick}
              showLoader={tableLoader}
              loaderColSpan={10}
              renderRowList={bankAccountRenderData}
              currentPage={currentPage}
              entriesPerPage={entriesPerPage}
              onEntriesPerPageChange={(value: any) =>
                handleRowsPerPageChange(value)
              }
              onPageChange={(value: any) => handlePageChange(value)}
              totalEntries={totalRows}
              hoverOnRowClick
              onSortChange={(sortConfig) => {
                if (bankListData?.length > 0) {
                  setSortValues(sortConfig);
                }
              }}
            />
          </div>
        </div>
      </div>
      {displayConfirmationModal && (
        <BaseModal
          modalId={"bank accounts delete modal"}
          displayModal={displayConfirmationModal}
          onHeaderIconClose={() => setDisplayConfirmationModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setDisplayConfirmationModal(false)}
          onConfirm={() => {
            handleModalPopUpFunction();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">
            {!isArchived
              ? "Are you sure you wish to delete this account?"
              : "Are you sure you wish to Move to main list this account?"}
          </h4>
        </BaseModal>
      )}
    </div>
  );
};
export default BankAccounts;
