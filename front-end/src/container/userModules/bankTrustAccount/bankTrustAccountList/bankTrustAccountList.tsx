"use client";
import React, { useCallback, useEffect, useState } from "react";
import Overlays from "@/components/Overlayes/Overlayes";
import { ThreeDots } from "react-bootstrap-icons";
import FormButton from "@/components/Button/button";
import styles from "./bankTrustAccountList.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import { ApplicationURLS } from "@/common/applicationURLS";
import { RowsPerPageInTable } from "@/common/constants";
import { AppModal } from "@/components/model/model";
import {
  convertJsonToExcel,
  convertPositiveDecimalTwoDigit,
  formatDate,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import { DD_MM_YYYY } from "@/common/constants/general";
import { IBankTrustAccountDetails } from "../bankTrustAccount.types";
import {
  ChangeStatusOfBankAccount,
  FetchAllBankAccounts,
} from "../backTrustAccount.functions";
import {
  bankAccountShortTypes,
  bankAccountStatusOptions,
  bankAccountStatusOptionsForArchived,
  bankAccountTypeOptions,
  MESSAGE_STATUS_CHANGE,
  tabOptions,
} from "../bankTrustAccount.constant";
import TabContainer from "@/container/addGroups/tabsContainer";
import { getCookie } from "cookies-next";
import debounce from "lodash/debounce";
import CustomSubHeader from "./customSubHeader";
import { useDispatch } from "react-redux";
import {
  setAddBankAccountDetails,
  SetBankAccountTypeFromDashBoard,
  setScreenDetails,
} from "@/redux/slices/dashboardSlices";
import { RootState, useAppSelector } from "@/redux/store";
type OptionType = {
  value: string;
  label: string;
};
const BankTrustAccountList = (props: any) => {
  const { isArchived = false, overViewDetails } = props;

  const dispatch = useDispatch();
  const bankAccountTypeFromDashBoard = useAppSelector(
    (state: RootState) => state.dashBoard.bankAccountTypeFromDashBoard
  );
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const routePath = usePathname();
  const router = useRouter();
  const [statusValue, setStatusValue] = useState(isArchived ? "Archived" : "");
  const [typeValue, setTypeValue] = useState(
    bankAccountTypeFromDashBoard || ""
  );
  const [data, setData] = React.useState<any>([]); // Your initial data
  const [filteredData, setFilteredData] = React.useState(data);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [bankListData, setBankListData] = useState<IBankTrustAccountDetails[]>(
    []
  );
  const [search, setSearch] = useState("");
  // const [bankAccountTypeData, setBankAccountTypeData] =
  //   useState<OptionType | null>(null);
  const [bankAccountTypeData, setBankAccountTypeData] = useState(
    bankAccountTypeOptions?.find(
      (each: any) => each?.value === bankAccountTypeFromDashBoard
    )
  );
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [activeTab, setActiveTab] = useState(
    isArchived ? tabOptions[1].id : tabOptions[0].id
  );
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const isAnyFilterActive = search !== "" || typeValue !== "";

  useEffect(() => {
    dispatch(setScreenDetails({}));
    dispatch(setAddBankAccountDetails({}));
    return () => {
      dispatch(SetBankAccountTypeFromDashBoard(""));
      dispatch(setAddBankAccountDetails({}));
    };
  }, []);

  useEffect(() => {
    const delayedSearch = debounce(() => {
      setDebouncedSearch(search);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel; // Cleanup
  }, [search]);

  useEffect(() => {
    getFetchBankAccountsLists(page, perPage);
  }, [debouncedSearch, statusValue, typeValue]);

  const resetFilters = async () => {
    setSearch(""); // Clear search input
    setTypeValue(""); // Reset type filter
    setBankAccountTypeData({ value: "", label: "All" });
  };

  const getFetchBankAccountsLists = async (
    page: number,
    rowsPerPage: number
  ) => {
    setLoading(true);
    const bankAccountListResponse = await FetchAllBankAccounts(
      {
        account_type: typeValue || null,
        company_id: selectedCompanyId || null,
        items_per_page: rowsPerPage || null,
        page: page || null,
        search: search || null,
        status: statusValue || null,
        ...(overViewDetails?.overViewMode
          ? { project_id: overViewDetails?.data?.project_id }
          : {}),
      },
      setLoading
    );
    setBankListData(bankAccountListResponse?.extendedBankAccounts || []);
    setTotalRows(bankAccountListResponse?.total_count || 0);
    setPerPage(rowsPerPage);

    let printDataObjCreation =
      bankAccountListResponse?.extendedBankAccounts?.map((bank: any) => {
        return {
          bank_account_id: bank?.bank_account_id,
          account_name: bank?.account_name,
          account_type: bank?.account_type,
          projects_count: bank?.projects_count,
          created_on: bank?.created_on
            ? formatDate(bank?.created_on, DD_MM_YYYY)
            : "N/A",
          current_balance: bank?.current_balance
            ? `$ ${Number(bank?.current_balance).toFixed(2)}`
            : "",
          // updated_on: bank?.updated_on,
          updated_on: bank?.created_on
            ? formatDate(bank?.updated_on, DD_MM_YYYY)
            : "N/A",
          last_updated_type: bank?.last_updated_type,
          status: bank?.status,
        };
      });

    setPrintDocumentData(printDataObjCreation);
  };
  function downloadExcel() {
    const columnNames = [
      { value: "bank_account_id", label: "Bank Account ID" },
      { value: "account_name", label: "Account Name" },
      { value: "account_type", label: "Account Type" },
      { value: "projects_count", label: "Projects Count" },
      { value: "created_on", label: "Added on Date" },
      { value: "current_balance", label: "Current Balance" },
      { value: "updated_on", label: "Last Updated" },
      { value: "last_updated_type", label: "Updated Type" },
      { value: "status", label: "Status" },
    ];
    convertJsonToExcel(printDocumentData, "bank accounts list", columnNames);
  }

  const handleTypeChange = (selectedValue: any) => {
    setBankAccountTypeData(selectedValue);
    setTypeValue(selectedValue.value);
    // Perform any other actions based on the selected value
  };
  const handleOptionClick = async (data: {
    id: string;
    option: string;
    previous_status: string;
  }) => {
    const { id, option } = data;
    setActionData(data);
    if (option === "Edit") {
      router.push(
        `${ApplicationURLS.USER_BANK_ACCOUNTS_EDIT}/${selectedCompanyId}/${id}`
      );
    }
    if (option === "Overview") {
      router.push(
        `${ApplicationURLS.USER_BANK_ACCOUNT_LIST_OVERVIEW}/${selectedCompanyId}/${id}`
      );
    }
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
      setOpenModal(!openModal);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg: MESSAGE_STATUS_CHANGE[option],
      }));
      return;
    }
  };
  const handleRowView = (id: any) => {
    router.push(
      `${ApplicationURLS.USER_BANK_ACCOUNT_LIST_OVERVIEW}/${selectedCompanyId}/${id}`
    );
  };
  const handleModalPopUpFunction = async () => {
    setOpenModal(!openModal);
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
        bank_account_id: actionData.id,
        status: isArchived ? actionData.previous_status : actionData.option,
      };
      let changeStatusRes = await ChangeStatusOfBankAccount(payload);
      if (changeStatusRes) {
        await getFetchBankAccountsLists(page, perPage);
      }
    }
  };
  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData?.map((user: any) => [
      user.bank_account_id,
      user.account_name,
      user.account_type,
      user.projects_count,
      user.created_on,
      user.current_balance,
      user.updated_on,
      user.last_updated_type,
      user.status,
    ]);

    let headerNames: string[] = [
      "Bank Account ID",
      "Account Name",
      "Account Type",
      "Projects Count",
      "Added on Date",
      "Current Balance",
      "Last Updated",
      "Updated Type",
      "Status",
    ];

    // Define custom column widths for "bank-accounts" module
    const customColumnWidths = {
      "bank-accounts": {
        1: 38, // Increase the width of "Account Name"
        2: 27,
        3: 20,
        4: 23,
        5: 33, // Increase the width of "Added on Date"
      },
      // Add more module-specific column width settings here
    };

    generateAndPrintPDF(
      formatedTableData,
      headerNames,
      "bank-accounts",
      undefined
      // customColumnWidths
    );
  };

  const handlePageChange = async (page: number) => {
    setPage(page);
    await getFetchBankAccountsLists(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await getFetchBankAccountsLists(page, newPerPage);
  };
  const handleTabClick = (tabId: string) => {
    if (activeTab === tabId) {
      return;
    }

    if (tabId === "currentAccounts") {
      router.push(ApplicationURLS.USER_BANK_ACCOUNTS_LIST_CURRENT);
    } else {
      router.push(ApplicationURLS.USER_BANK_ACCOUNTS_LIST_ARCHIVED);
    }
  };

  const columns = [
    {
      name: "Account Name",
      wrap: true,
      selector: (row: IBankTrustAccountDetails) =>
        row?.account_name.length > 100
          ? `${row?.account_name.slice(0, 100)}...`
          : row?.account_name || "",
    },
    {
      name: "Type",
      selector: (row: IBankTrustAccountDetails) =>
        row?.account_type
          ? bankAccountShortTypes[
              row.account_type as keyof typeof bankAccountShortTypes
            ]
          : "",
      center: true,
    },
    {
      name: "Projects",
      center: true,
      selector: (row: IBankTrustAccountDetails) =>
        row?.created_on ? row?.projects_count : 0,
    },
    {
      name: "Current Balance",
      selector: (row: IBankTrustAccountDetails) =>
        row?.current_balance
          ? `$ ${convertPositiveDecimalTwoDigit(row?.current_balance, true)}`
          : "",
      right: true,
      grow: true,
      minWidth: "130px",
    },
    {
      name: "Last Updated",
      fixed: "right",
      grow: true,
      minWidth: "130px",
      center: true,
      selector: (row: IBankTrustAccountDetails) =>
        row?.updated_on ? formatDate(row?.updated_on, DD_MM_YYYY) : "N/A",
    },
    {
      name: "Update type",
      selector: (row: IBankTrustAccountDetails) => row?.last_updated_type,
      fixed: "right",
      grow: true,
      minWidth: "122px",
    },

    {
      name: "Status",
      selector: (row: IBankTrustAccountDetails) => row?.status,
      fixed: "right",
      center: true,
    },

    {
      name: "Actions",
      fixed: "right",
      grow: true,
      center: true,
      cell: (row: IBankTrustAccountDetails, index: number) => (
        <Overlays
          trigger="click"
          placement={"auto"}
          overlay={<span></span>}
          popoverTypes={"tableActions"}
          popoverActions={
            isArchived
              ? bankAccountStatusOptionsForArchived.filter(
                  (each) => each.value !== row?.status
                )
              : bankAccountStatusOptions.filter(
                  (each) => each.value !== row?.status
                )
          }
          optionClick={(data) => handleOptionClick(data)}
          cellData={{
            id: row?.bank_account_id,
            previous_status: row?.previous_status,
          }}
        >
          <div className={styles.dotsContainer}>
            <ThreeDots />
          </div>
        </Overlays>
      ),
    },
  ];

  const onInputChange = useCallback((e: { target: { value: string } }) => {
    const inputvalue = e?.target?.value?.trim()
      ? e?.target?.value
      : e?.target?.value?.trim();
    setSearch(inputvalue);
  }, []);

  function handleOnAdd() {
    const dynamicRoute = !overViewDetails?.overViewMode
      ? ApplicationURLS.USER_BANK_ACCOUNTS_ADD
      : `${ApplicationURLS.USER_BANK_ACCOUNTS_ADD}?project=${overViewDetails?.data?.project_id}&overview=${overViewDetails?.data?.id}`;

    router.push(dynamicRoute);
  }

  return (
    <div className={styles.dataContainer}>
      {!overViewDetails?.overViewMode && (
        <ReusableBreadcrumb
          items={[
            {
              href: ApplicationURLS.USER_DASHBOARD,
              label: "Home",
              active: false,
            },
            {
              href: "",
              label: "Bank Accounts",
              active: true,
            },
          ]}
          separator={<span className={styles.separatorStyle}>&gt;</span>}
        />
      )}
      <div
        className={
          !overViewDetails?.overViewMode
            ? styles.headerAndButtonCon
            : `${styles.headerAndButtonCon} ${"justify-content-end"}`
        }
      >
        {!overViewDetails?.overViewMode && (
          <span className={styles.headerText}>Bank Accounts</span>
        )}

        <FormButton
          className={styles.buttonStyles}
          onClick={() => handleOnAdd()}
        >
          + Account
        </FormButton>
      </div>
      {!overViewDetails?.overViewMode && (
        <TabContainer
          tabs={tabOptions}
          activeTab={activeTab}
          onTabClick={handleTabClick}
        />
      )}
      <ReusableDataTable
        columns={columns}
        data={bankListData}
        subHeader
        subHeaderComponent={
          <CustomSubHeader
            search={search}
            onInputChange={onInputChange}
            handleTypeChange={handleTypeChange}
            bankAccountTypeData={bankAccountTypeData}
            // setBankAccountTypeData={setBankAccountTypeData} // Pass it here
            printDocumentData={printDocumentData}
            handlePrintPDF={handlePrintPDF}
            downloadExcel={downloadExcel}
            resetFilters={resetFilters} // Pass reset function to child
            isAnyFilterActive={isAnyFilterActive} // Pass filter active state to child
          />
        }
        pagination
        progressPending={loading}
        paginationServer
        onRowClicked={(data: any) => handleRowView(data?.bank_account_id)}
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={handlePerRowsChange}
        onChangePage={handlePageChange}
      />
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        secondButtonLabel="No"
        firstButtonLabel="Yes"
        modalHeading={popupMessage?.headerMsg || ""}
        modalBodyContent={popupMessage?.subHeaderMsg || ""}
        onConfirm={() => {
          handleModalPopUpFunction();
        }}
      />
    </div>
  );
};

export default BankTrustAccountList;
