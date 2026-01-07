"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowClockwise,
  FileEarmarkExcel,
  Printer,
  ThreeDots,
} from "react-bootstrap-icons";
import ReusableDataTable from "@/components/DataTable/dataTable";
import Overlays from "@/components/Overlayes/Overlayes";
import styles from "./noticesList.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { AppModal } from "@/components/model/model";
import { ApplicationURLS } from "@/common/applicationURLS";
import TabContainer from "@/container/addGroups/tabsContainer";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { getNoticesListServices, NoticesListType } from "./notices.functions";
import { RowsPerPageInTable } from "@/common/constants";
import { getProjectsLists } from "@/container/contracts/contracts.functions";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import { FetchAllBankAccounts } from "../bankTrustAccount/backTrustAccount.functions";
import {
  convertJsonToExcel,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import { format } from "date-fns";
import { fetchFiltersForAdminNotices } from "@/container/adminModules/noticesList/noticesList.functions";
import { bankAccountShortTypes } from "../bankTrustAccount/bankTrustAccount.constant";

export default function NoticesList(props: any) {
  const { isArchived = false, overViewDetails = {} } = props;
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [page, setPage] = useState(1);
  const [projectOpt, setProjectOpt] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [accountList, setAccountList] = useState<any>();
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [actionData, setActionData] = useState<any>();
  const [selectedNoticesType, setSelectedNoticesType] = useState<any>("");
  const [selectedProjectName, setSelectedProjectName] = useState<any>("");
  const [selectedAccountName, setSelectedAccountName] = useState<any>("");
  const [selectedStatus, setSelectedStatus] = useState<any>({
    value: "",
    label: "All",
  });
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [noticesListData, setNoticesListData] = useState<NoticesListType[]>([]);
  const queryParams: any = useSearchParams();
  const paymentClaimId = queryParams.get("payment-claim");
  const [noticesTypeOptions, setNoticesTypeOptions] = useState<any>([]);

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
  const statusNotices = [
    { value: "", label: "All" },
    { value: "Draft", label: "Draft" },
    { value: "Not Sent", label: "Not Sent" },
    { value: "Sending", label: "Sending" },
    { value: "Sent", label: "Sent" },
    { value: "Sent - Onboarded", label: "Sent - Onboarded" },
  ];

  useEffect(() => {
    deleteCookie("noticeListPath");
    fetchFilters();
  }, [selectedAccountName, selectedNoticesType, selectedProjectName]);

  useEffect(() => {
    fetchData(page, perPage);
  }, [selectedValue]);

  const fetchFilters = async () => {
    const result = await fetchFiltersForAdminNotices({
      company_id: selectedCompanyId || null,
      bank_account_id: selectedAccountName?.value || null,
      account_type: "",
      notice_type: selectedNoticesType?.value || null,
      project_id: overViewDetails?.overViewMode
        ? overViewDetails?.project_id
          ? Number(overViewDetails?.project_id)
          : null
        : selectedProjectName?.value
        ? Number(selectedProjectName?.value)
        : null,

      status: isArchived ? "Deleted" : "",
    });
    if (result) {
      setAccountList([
        { label: "All", value: "" },
        ...result?.account_list.map(({ name, value }: any) => {
          return {
            label: name,
            value: Number(value),
          };
        }),
      ]);

      setNoticesTypeOptions([
        { label: "All", value: "" },
        ...result.notice_type_list.map(({ name, value }: any) => ({
          label: name,
          value: value,
        })),
      ]);
      setProjectOpt([
        { label: "All", value: "" },
        ...result.project_list.map(({ name, value }: any) => ({
          label: name,
          value: value,
        })),
      ]);
    }
  };

  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData?.map(
      (notices: NoticesListType) => [
        notices?.project_name,
        notices?.account_name,
        notices?.bank_account_type,
        notices?.notice_type,
        notices?.notice_source,
        notices?.status,
      ]
    );
    let headerNames: string[] = [
      "Project Name",
      "Account Name",
      "Account Type",
      "Notice Type",
      "Notice Source",
      "Status",
    ];
    generateAndPrintPDF(
      formatedTableData,
      headerNames,
      "current-notices",
      true
    );
  };

  function downloadExcel() {
    const columnNames = [
      { value: "project_name", label: "Project Name" },
      { value: "account_name", label: "Account Name" },
      { value: "bank_account_type", label: "Account Type" },
      { value: "notice_type", label: "Notices Type" },
      { value: "notice_source", label: "Notices Sources" },
      { value: "status", label: "Status" },
    ];
    convertJsonToExcel(printDocumentData, "current notices list", columnNames);
  }
  const resetFilters = () => {
    setSelectedNoticesType("");
    setSelectedProjectName("");
    setSelectedAccountName("");
    setSelectedStatus({ value: "", label: "All" });
    setSelectedValue("");
  };

  const isAnyFilterActive =
    selectedNoticesType !== "" ||
    selectedProjectName !== "" ||
    selectedAccountName !== "" ||
    selectedValue !== "" ||
    selectedStatus.label !== "All";

  const handleSelectChange = (
    selectedValue: any,
    field?:
      | "project_name"
      | "account_name"
      | "notice_type"
      | "notice_source"
      | "status"
  ) => {
    if (field === "notice_type") {
      setSelectedNoticesType(selectedValue);
    }
    if (field === "project_name") {
      setSelectedProjectName(selectedValue);
    }
    if (field === "account_name") {
      setSelectedAccountName(selectedValue);
    }
    if (field === "status") {
      setSelectedStatus(selectedValue);
    }
    setSelectedValue(selectedValue);
    // Perform any other actions based on the selected value
  };

  const handleOptionClick = async (data: { id: string; option: string }) => {
    const { id, option } = data;

    setActionData(data);
    if (option === "Delete") {
      setOpenModal(!openModal);
    }
    if (option === "View") {
      setCookie("noticeListPath", ApplicationURLS.USER_NOTICES);
      router.push(`${ApplicationURLS.USER_NOTICES_VIEW}/${id}`);
    }
  };

  function handleTabClick(tab: any) {
    if (tab === selectedTab) {
      return;
    } else if (tab === tabOptions[0]?.id) {
      setSelectedTab(tab);
      router.push(ApplicationURLS.USER_NOTICES);
    } else if (tab === tabOptions[1]?.id) {
      setSelectedTab(tab);
      router.push(ApplicationURLS.USER_NOTICESARCHIVE);
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
      const payloadData = {
        company_id: selectedCompanyId,
        page: page,
        items_per_page: rowsPerPage,
        notice_type: selectedNoticesType?.value
          ? selectedNoticesType?.value
          : "",
        bank_account_id: selectedAccountName?.value
          ? Number(selectedAccountName?.value)
          : null,
        status: isArchived
          ? "Deleted"
          : selectedStatus?.value
          ? selectedStatus?.value
          : "",
        project_id: overViewDetails?.overViewMode
          ? overViewDetails?.project_id
            ? Number(overViewDetails?.project_id)
            : null
          : selectedProjectName?.value
          ? Number(selectedProjectName?.value)
          : null,
        contract_id: overViewDetails?.overViewMode
          ? overViewDetails?.contract_id
            ? Number(overViewDetails?.contract_id)
            : null
          : null,
        payment_claim_id: paymentClaimId ? +paymentClaimId : null,
      };
      const response = await getNoticesListServices(payloadData);

      setNoticesListData(response?.notices_list || []);
      setTotalRows(response?.total_count || 0);
      setPerPage(rowsPerPage);
      let printDataObjCreation = response?.notices_list?.map(
        (notices: NoticesListType) => {
          return {
            notice_id: notices?.notice_id,
            notice_type: notices?.notice_type,
            account_name: notices?.account_name,
            bank_account_type: notices?.bank_account_type,
            notice_source: notices?.notice_source,
            project_id: notices?.project_id,
            project_name: notices?.project_name,
            status: notices?.status,
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

  const handleRowView = (id: any) => {
    setCookie("noticeListPath", ApplicationURLS.USER_NOTICES);
    router.push(`${ApplicationURLS.USER_NOTICES_VIEW}/${id}`);
  };

  const CustomSubHeader = () => (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <SearchableSelect
          options={accountList}
          onChange={(name) => {
            handleSelectChange(name, "account_name");
          }}
          disabled={false}
          selectedData={selectedAccountName}
          placeholder="Account Name"
          className={styles.textFieldStyles3}
        />
        {!(
          overViewDetails?.screenName === "contracts" ||
          overViewDetails?.screenName === "projects"
        ) && (
          <SearchableSelect
            options={projectOpt}
            onChange={(project) => {
              handleSelectChange(project, "project_name");
            }}
            disabled={false}
            selectedData={selectedProjectName}
            placeholder="Project Name"
            className={styles.textFieldStyles3}
          />
        )}
        <SearchableSelect
          options={noticesTypeOptions}
          onChange={(v) => {
            handleSelectChange(v, "notice_type");
          }}
          disabled={false}
          selectedData={selectedNoticesType}
          placeholder="Notices Type"
          className={styles.textFieldStyles3}
        />
        {!isArchived && (
          <SearchableSelect
            options={statusNotices}
            onChange={(status) => {
              handleSelectChange(status, "status");
            }}
            disabled={false}
            selectedData={selectedStatus}
            placeholder="Status"
            className={styles.textFieldStyles}
          />
        )}
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
      name: "Date Generated",
      minWidth: "200px",
      wrap: true,
      selector: (row: NoticesListType) =>
        row?.notice_date
          ? format(new Date(row?.notice_date), "dd MMM yyyy h:mm a")
          : "N/A",
    },
    {
      name: "Project Name",
      minWidth: "200px",
      wrap: true,
      selector: (row: NoticesListType) => row.project_name,
    },
    {
      name: "Account Name",
      wrap: true,
      minWidth: "200px",
      selector: (row: NoticesListType) => row.account_name,
    },
    {
      name: "Type",
      wrap: true,
      // minWidth: "200px",
      selector: (row: NoticesListType) =>
        row.bank_account_type
          ? bankAccountShortTypes[
              row.bank_account_type as keyof typeof bankAccountShortTypes
            ]
          : "",
    },
    {
      name: "Notice Type",
      wrap: true,
      minWidth: "200px",
      selector: (row: NoticesListType) => row.notice_type,
    },
    {
      name: "Notice Source",
      wrap: true,
      minWidth: "200px",
      selector: (row: NoticesListType) => row.notice_source,
    },
    {
      name: "Status",
      fixed: "right",
      center: true,
      selector: (row: NoticesListType) => row.status,
      cell: (row: NoticesListType) => (
        <span style={{ color: row.status === "Not Sent" ? "red" : "" }}>
          {row.status}
        </span>
      ),
    },
    ...(!isArchived
      ? [
          {
            name: "Actions",
            fixed: "right",
            grow: true,
            center: true,
            cell: (row: NoticesListType, index: number) => (
              <Overlays
                trigger="click"
                placement={index === 0 ? "bottom-end" : "auto"}
                overlay={<span></span>}
                popoverTypes={"tableActions"}
                popoverActions={[{ label: "View", value: "View" }]}
                customPopupstyles={styles.customPopupstyles}
                cellData={{
                  id: row?.id,
                }}
                optionClick={(data) => handleOptionClick(data)} // Pass user_id
                popperConfig={{
                  modifiers: [
                    {
                      name: "offset",
                      options: {
                        offset: [20, 10], // Adjust the offset as needed
                      },
                    },
                  ],
                }}
              >
                <div style={{ cursor: "pointer" }}>
                  <ThreeDots />
                </div>
              </Overlays>
            ),
          },
        ]
      : []),
  ];

  //Render Template
  return (
    <div className={styles.container}>
      {!overViewDetails?.overViewMode && (
        <>
          {" "}
          <ReusableBreadcrumb
            items={[
              {
                href: ApplicationURLS.USER_DASHBOARD,
                label: "Home",
                active: false,
              },

              {
                href: ApplicationURLS.USER_NOTICES,
                label: "Notices",
                active: true,
              },
            ]}
            separator={<span className={styles.breadcrumbSeparator}>&gt;</span>}
          />
          <div className={styles.headerAndButtonCon}>
            <span className={styles.headerText}>Notices</span>
          </div>
          <div className={styles.subHeaderTabs}>
            <TabContainer
              tabs={tabOptions}
              activeTab={selectedTab}
              onTabClick={handleTabClick}
            />
          </div>
        </>
      )}
      <ReusableDataTable
        columns={columns}
        data={noticesListData}
        subHeader
        subHeaderComponent={<CustomSubHeader />}
        pagination
        paginationServer
        progressPending={loading}
        paginationTotalRows={totalRows}
        onChangePage={handlePageChange}
        onChangeRowsPerPage={handlePerRowsChange}
        onRowClicked={(data: any) => {
          if (!isArchived) handleRowView(data?.id);
        }}
      />

      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        secondButtonLabel="No"
        firstButtonLabel="Yes"
        modalHeading={""}
        modalBodyContent={"Are you sure you wnt to delete"}
        onConfirm={() => {
          // handleModalPopUpFunction();
        }}
      />
    </div>
  );
}
