"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowClockwise,
  FileEarmarkExcel,
  Printer,
  ThreeDots,
} from "react-bootstrap-icons";
import ReusableDataTable from "@/components/DataTable/dataTable";
import styles from "./delegationList.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { AppModal } from "@/components/model/model";
import { ApplicationURLS } from "@/common/applicationURLS";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { RowsPerPageInTable } from "@/common/constants";
import {
  convertJsonToExcel,
  formatDate,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import { DD_MM_YYYY } from "@/common/constants/general";
import { fetchFiltersForAdminJournals } from "@/container/journals/adminJournals.functions";
import {
  AccountDetails,
  ListAllDelegatedAccounts,
} from "./delegationList.functions";

export default function DelegationList(props: any) {
  const { isArchived = false } = props;
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [actionData, setActionData] = useState<any>();

  const [selectedAccountName, setSelectedAccountName] = useState<any>({
    value: "",
    label: "All Accounts",
  });
  const [companySelectedData, setCompanySelectedData] = useState<any>({
    value: "",
    label: "All Business Names",
  });
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [delegationListData, setDelegationListData] = useState<
    AccountDetails[]
  >([]);

  const [companyOptions, setCompanyOptions] = useState<any>([]);
  const [accountList, setAccountList] = useState<any>([]);
  const resetFilters = () => {
    setCompanySelectedData(companyOptions?.[0]); // Use setCompanySelectedData to update the state
    setSelectedAccountName(accountList?.[0]); // Also update this correctly
  };

  const isAnyFilterActive =
    companySelectedData.value !== "" || selectedAccountName.value !== "";

  const tabOptions = [
    {
      id: "Current Projects",
      label: "Current",
      hasError: false,
    },
    {
      id: "Archived Projects",
      label: "Archived",
      hasError: false,
    },
  ];
  const [selectedTab, setSelectedTab] = useState(
    isArchived ? tabOptions[1]?.id : tabOptions[0]?.id
  );

  const initialObj = { value: "", label: "All" };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchData(page, perPage);
  }, [selectedAccountName, companySelectedData]);

  const fetchFilters = async () => {
    const result = await fetchFiltersForAdminJournals({});
    if (result) {
      setAccountList([
        { value: "", label: "All Accounts" },
        ...result?.account_list.map(({ name, value }: any) => {
          return {
            label: name,
            value: Number(value),
          };
        }),
      ]);
      setCompanyOptions([
        { value: "", label: "All Business Names" },
        ...result?.company_list.map(({ name, value }: any) => {
          return { label: name, value: Number(value) };
        }),
      ]);
    }
  };

  const handlePrintPDF = () => {
    let formatTableData: any[] = printDocumentData?.map(
      (notices: AccountDetails) => [
        notices?.account_name,
        notices?.company_name,
        notices?.account_type,
        // notices?.delegated_date,
        notices?.delegation,
      ]
    );
    let headerNames: string[] = [
      "Business Name",
      "Bank Account Name",
      "Account Type",
      // "Delegated On",
      "Delegation",
    ];
    generateAndPrintPDF(formatTableData, headerNames, "delegation list", true);
  };

  function downloadExcel() {
    const columnNames = [
      { value: "company_name", label: "Business Name" },
      { value: "account_name", label: "Bank Account Name" },
      { value: "account_type", label: "Account Type" },
      // { value: "delegated_date", label: "Delegated On" },
      { value: "delegation", label: "Delegation" },
    ];
    convertJsonToExcel(printDocumentData, "delegation list", columnNames);
  }

  const handleSelectChange = (
    selectedValue: any,
    field?:
      | "project_name"
      | "account_name"
      | "notice_type"
      | "notice_source"
      | "status"
      | "company"
  ) => {
    if (field === "account_name") {
      setSelectedAccountName(selectedValue);
    }
    if (field === "company") {
      setCompanySelectedData(selectedValue);
    }
    setSelectedValue(selectedValue);
  };

  function handleTabClick(tab: any) {
    if (tab === selectedTab) {
      return;
    } else if (tab === tabOptions[0]?.id) {
      setSelectedTab(tab);
      router.push(ApplicationURLS.ADMIN_NOTICES);
    } else if (tab === tabOptions[1]?.id) {
      setSelectedTab(tab);
      router.push(ApplicationURLS.ADMIN_NOTICES_ARCHIVE);
    }
  }

  const handlePageChange = async (page: number) => {
    setPage(page);
    await fetchData(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await fetchData(page, newPerPage);
  };

  const fetchData = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    try {
      const payload = {
        company_id: companySelectedData?.value || null,
        page: page,
        items_per_page: rowsPerPage,
        bank_account_id: selectedAccountName?.value || null,
      };
      const response = await ListAllDelegatedAccounts(payload);

      setDelegationListData(response?.account_list || []);
      setTotalRows(response?.total_count || 0);
      setPerPage(rowsPerPage);
      let printDataObjCreation = response?.account_list?.map(
        (eachOne: AccountDetails) => {
          return {
            company_name: eachOne?.company_name,
            account_name: eachOne?.account_name,
            account_type: eachOne?.account_type,
            delegated_date: eachOne?.delegated_date,
            delegation: eachOne?.delegation,
          };
        }
      );

      setPrintDocumentData(printDataObjCreation);
    } catch (error) {
      console.error("Error fetching notices lists:", error);
    } finally {
      setLoading(false);
    }
  };

  const CustomSubHeader = () => (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <SearchableSelect
          options={companyOptions}
          onChange={(v) => {
            handleSelectChange(v, "company");
          }}
          disabled={false}
          placeholder="Company Profile"
          singleSelectedData={companySelectedData}
          className={styles.textFieldStyles3}
        />
        <SearchableSelect
          options={accountList}
          onChange={(name) => {
            handleSelectChange(name, "account_name");
          }}
          disabled={false}
          singleSelectedData={selectedAccountName}
          placeholder="Account Name"
          className={styles.textFieldStyles3}
        />
        {isAnyFilterActive && (
          <div>
            <button onClick={resetFilters} className={styles.resetButton}>
              <ArrowClockwise /> Reset Filters
            </button>
          </div>
        )}
      </div>
      {printDocumentData?.length > 0 && (
        <div className={styles.headerIconCon}>
          <span
            className={styles.cursorPointer}
            onClick={() => {
              if (printDocumentData?.length) {
                handlePrintPDF();
              }
            }}
            title="Print PDF"
          >
            <Printer />
          </span>
          <span
            className={styles.cursorPointer}
            onClick={() => {
              if (printDocumentData?.length) {
                downloadExcel();
              }
            }}
            title="Export to Excel"
          >
            <FileEarmarkExcel />
          </span>
        </div>
      )}
    </div>
  );

  const columns = [
    {
      name: "Business Name",
      minWidth: "200px",
      wrap: true,
      selector: (row: AccountDetails) => row.company_name,
    },
    {
      name: " Bank Account Name",
      wrap: true,
      minWidth: "200px",
      selector: (row: AccountDetails) => row.account_name,
    },
    {
      name: "Account Type",
      wrap: true,
      minWidth: "200px",
      selector: (row: AccountDetails) => row.account_type,
    },

    // {
    //   name: "Delegated On",
    //   // wrap: true,
    //   // minWidth: "200px",
    //   selector: (row: AccountDetails) =>
    //     row?.delegated_date ? formatDate(row?.delegated_date, DD_MM_YYYY) : "",
    // },
    {
      name: "Delegation",
      fixed: "right",
      center: true,
      selector: (row: AccountDetails) => row?.delegation,
    },
  ];

  return (
    <div className={styles.container}>
      <ReusableBreadcrumb
        items={[
          {
            href: ApplicationURLS.ADMIN_DASHBOARD,
            label: "Home",
            active: false,
          },

          {
            href: "",
            label: "Delegation List",
            active: true,
          },
        ]}
        separator={<span className={styles.breadcrumbSeparator}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Delegation List</span>
      </div>
      {/* <div className={styles.subHeaderTabs}>
        <TabContainer
          tabs={tabOptions}
          activeTab={selectedTab}
          onTabClick={handleTabClick}
        />
      </div> */}

      <ReusableDataTable
        columns={columns}
        data={delegationListData}
        subHeader
        subHeaderComponent={<CustomSubHeader />}
        pagination
        paginationServer
        progressPending={loading}
        paginationTotalRows={totalRows}
        onChangePage={handlePageChange}
        onChangeRowsPerPage={handlePerRowsChange}
      />
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        secondButtonLabel="No"
        firstButtonLabel="Yes"
        modalHeading={""}
        modalBodyContent={"Are you sure you want to sent?"}
        onConfirm={() => {
          // handleModalPopUpFunction();
        }}
      />
    </div>
  );
}
