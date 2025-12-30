"use client";
import React, { useEffect, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import Overlays from "@/components/Overlayes/Overlayes";
import {
  Printer,
  ThreeDots,
  FileEarmarkExcel,
  ArrowClockwise,
} from "react-bootstrap-icons";
import styles from "./retentionList.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import { ApplicationURLS } from "@/common/applicationURLS";
import { RowsPerPageInTable } from "@/common/constants";
import { AppModal } from "@/components/model/model";
import {
  convertJsonToExcel,
  formatDate,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import { getCookie, setCookie } from "cookies-next";
import { RetentionData } from "./rtentionLIst.functions";
import { tabOptions } from "../bankTrustAccount/bankTrustAccount.constant";
import TabContainer from "@/container/addGroups/tabsContainer";
import { DeletePayments } from "../bankTrustAccount/backTrustAccount.functions";
import { fetchAllRetentionInPaymentsList } from "./rtentionLIst.functions";
import RetentionSummary from "./retentionSummary";
import { useDispatch } from "react-redux";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList } from "@/app/api/commonAPIs";

const RetentionLists = (props: any) => {
  const { isArchived = false } = props;
  const dispatch = useDispatch();
  const routePath = usePathname();
  const router = useRouter();
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [selectedStatus, setSelectedStatus] = useState(
    isArchived ? "Completed" : ""
  );
  const [selectedStatusName, setSelectedStatusName] = useState({
    label: "All",
    value: "",
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [setCreateVisible, SetCreateVisible] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [paymentsListData, setPaymentsListData] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [selectedToggle, setSelectedToggle] = useState<string>("All");
  const [paymentType, setPaymentType] = useState("All");
  const [claimType, setClaimType] = useState("");
  const [projectOpt, setProjectOpt] = useState<any>([]);
  const [selectedProject, setSelectedProject] = useState<any>();
  const [projectId, setProjectId] = useState("");
  const [contractOpt, setContractOpt] = useState<any>([]);
  const [selectedContract, setSelectedContract] = useState<any>();
  const [contractId, setContractId] = useState("");
  const [clientId, setClientId] = useState("");
  const [activeTab, setActiveTab] = useState(
    isArchived ? tabOptions[1].id : tabOptions[0].id
  );
  const [displayViewSummary, setDisplayViewSummary] = useState(false);

  const tabs = [
    { id: "currentAccounts", label: "Current", hasError: false },
    { id: "archivedAccounts", label: "Completed", hasError: true },
  ];

  useEffect(() => {
    dispatch(setScreenDetails({}));

    const fetchFilters = async () => {
      setLoading(true);
      const filtersResponse =
        await fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList({
          client_supplier_id: null,
          project_id: projectId || null,
          contract_id: contractId || null,
          company_id: selectedCompanyId || null,
        });

      if (filtersResponse) {
        // Update project options
        const projectListData = filtersResponse?.projects || [];
        if (projectListData.length > 0) {
          const modifiedOpt = projectListData.map((each: any) => ({
            label: each?.project_name,
            value: each?.project_id,
          }));
          setProjectOpt([{ label: "All", value: null }, ...modifiedOpt]);
        }

        // Update contract options
        const contractListData = filtersResponse?.contracts || [];
        if (contractListData.length > 0) {
          const modifiedContracts = contractListData.map((contract: any) => ({
            label: contract?.contract_name,
            value: contract?.contract_id,
          }));
          setContractOpt([{ label: "All", value: null }, ...modifiedContracts]);
        }
      }
      setLoading(false);
    };

    // Only fetch filters if either projectId or contractId is set
    fetchFilters();
  }, [projectId, contractId]);

  useEffect(() => {
    getPaymentsListData(page, perPage);
  }, [
    selectedToggle,
    paymentType,
    projectId,
    contractId,
    claimType,
    clientId,
    selectedStatus,
  ]);

  const resetFilters = () => {
    setSelectedProject(null);
    setSelectedContract(null);
    setSelectedStatusName({ label: "All", value: "" });
    setSelectedStatus("");
    setProjectId("");
    setContractId("");
    setClientId("");
  };

  const isAnyFilterActive =
    selectedProject?.value ||
    selectedContract?.value ||
    selectedStatus ||
    projectId ||
    contractId;

  const getPaymentsListData = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    const adminUserList = await fetchAllRetentionInPaymentsList(
      {
        company_id: selectedCompanyId,
        page_number: page,
        items_per_page: rowsPerPage,
        status: isArchived ? "Completed" : selectedStatus || null,
        project_id: projectId || null,
        contract_id: contractId || null,
      },
      setLoading
    );
    setPaymentsListData(adminUserList?.data || []);
    setTotalRows(adminUserList?.total_count || 0);
    setPerPage(rowsPerPage);
    let printDataObjCreation = adminUserList?.data?.map(
      (user: RetentionData) => {
        return {
          retention_list_id: user?.retention_list_id || "",
          project_name: user?.project_name || "",
          contract_name: user?.contract_name || "",
          claim_type: user?.claim_type || "",
          Retention_Trust_Account: user?.retention_trust_account_name || "",
          Retained_Amount: `$ ${
            user?.retained_amount
              ? Number(user.retained_amount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : "0.00"
          }`,
          Beneficiary: user?.beneficiary_name || "",
          status: user?.status || "",
        };
      }
    );

    setPrintDocumentData(printDataObjCreation);
  };
  function downloadExcel() {
    const columnNames = [
      { value: "retention_list_id", label: "Retention Id" },
      { value: "project_name", label: "Project" },
      { value: "contract_name", label: "Contract" },
      { value: "claim_type", label: "Retention Type" },
      { value: "Retention_Trust_Account", label: "Retention Trust Account" },
      { value: "Retained_Amount", label: "Retained Amount" },
      { value: "Beneficiary", label: "Beneficiary" },
      { value: "status", label: "Status" },
    ];
    convertJsonToExcel(printDocumentData, "retention list", columnNames);
  }

  const handleProjectChange = (selectedValue: any) => {
    setProjectId(selectedValue.value);
    setSelectedProject(selectedValue);
  };

  const handleContractChange = (selectedValue: any) => {
    setContractId(selectedValue.value);
    setSelectedContract(selectedValue);
  };

  const handleStatusChange = (selectedValue: any) => {
    setSelectedStatus(selectedValue?.value);
    setSelectedStatusName(selectedValue);
    // Perform any other actions based on the selected valuef
  };

  const statusOptions = [
    { label: "All", value: "" },
    { label: "Claim completed", value: "Claim completed" },
    { label: "Claim generated", value: "Claim generated" },
    { label: "Void", value: "Deleted" },
    { label: "Payment generated", value: "Payment generated" },
    { label: "Retained", value: "Retained" },
  ];

  const handleOptionClick = async (
    data: { id: string; option: string },
    row: RetentionData
  ) => {
    const { id, option } = data;

    setActionData({ ...data, rowData: row });
    if (option === "Delete") {
      setOpenModal(!openModal);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg:
          "Are you sure you wish to move this Payment to the archive?",
      }));
    }
    if (option === "View Original Payment") {
      router.push(
        `${ApplicationURLS.USER_PAYMENTS}?mode=view&payment=${
          row?.payment_id
        }&claim=${row?.payment_claim_id}&crt=${"RetentionClaim"}`
      );
    }
    if (option === "Create Retention Claim") {
      const baseURL =
        row?.beneficiary_type === "Self"
          ? ApplicationURLS.USER_RETENTION_CHANGE_ADD
          : ApplicationURLS.USER_PAYMENT_CLAIMS_ADD;

      router.push(
        `${baseURL}?cash-retention-type=${"RetentionClaim"}&claim-type=${
          row?.claim_type
        }&cid=${row?.contract_id}&pid=${row?.project_id}&type=${
          row?.cash_retention_type
        }&sid=${row?.sub_payment_id}&rid=${row?.retention_list_id}&rpaymentid=${
          row?.payment_id
        }`
      );

      setCookie("retentionAmount", row?.retained_amount);
    }
    if (option === "View Summary") {
      setDisplayViewSummary(true);
    }
    if (option === "Withdraw") {
      const formattedDate = formatDate(new Date(row?.due_date));
      router.push(
        `${
          ApplicationURLS.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT
        }?type=Withdrawal&claim=${"RetentionClaim"}&due=${formattedDate}&amount=${
          row?.retained_amount
        }&bid=${row?.retention_account_id}&rid=${row?.retention_list_id}`
      );
    }
  };

  const handleRowView = (data: any) => {
    setActionData({ rowData: data });
    setDisplayViewSummary(true);
  };

  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData?.map((user: any) => [
      user?.retention_list_id,
      user?.project_name,
      user?.contract_name,
      user?.claim_type,
      user?.Retention_Trust_Account,
      user?.Retained_Amount,
      user?.Beneficiary,
      user?.status,
    ]);
    let headerNames: string[] = [
      "Retention Id",
      "Project",
      "Contract",
      "Retention Type",
      "Retention Trust Account",
      "Retained Amount",
      "Beneficiary",
      "Status",
    ];
    generateAndPrintPDF(formatedTableData, headerNames, "retention list", true);
  };

  const handleModalPopUpFunction = async () => {
    setOpenModal(!openModal);
    if (actionData.option === "Delete") {
      const payload = {
        payment_id: actionData?.id,
        status: "Deleted",
      };
      const response = await DeletePayments(payload);
      if (response) {
        await getPaymentsListData(page, perPage);
      }
    }
  };
  const handlePageChange = async (page: number) => {
    setPage(page);
    await getPaymentsListData(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await getPaymentsListData(page, newPerPage);
  };

  const handleTabClick = (tabId: string) => {
    if (activeTab === tabId) {
      return;
    }

    if (tabId === "currentAccounts") {
      router.push(ApplicationURLS.USER_RETENTIONS_LIST_CURRENT);
    } else {
      router.push(ApplicationURLS.USER_RETENTIONS_LIST_COMPLETED);
    }
  };

  const columns = [
    {
      name: "Retention Id",
      selector: (row: RetentionData) => row?.retention_list_id || "",
      wrap: true,
      center: true,
    },
    {
      name: "Project",
      selector: (row: RetentionData) => row?.project_name || "",
      wrap: true,
      fixed: "left",
    },
    {
      name: "Contract",
      selector: (row: RetentionData) => row?.contract_name || "",
      wrap: true,
      fixed: "left",
    },
    {
      name: "Retention Type",
      selector: (row: RetentionData) => row?.claim_type || "",
      wrap: true,
      center: true,
    },
    {
      name: "Retention Trust Account",
      selector: (row: RetentionData) => row?.retention_trust_account_name || "",
      wrap: true,
      fixed: "left",
    },
    {
      name: "Retained Amount",
      selector: (row: RetentionData) => row?.retained_amount || "",
      format: (row: any) =>
        row?.retained_amount !== null && row?.retained_amount !== undefined
          ? `$ ${Number(row.retained_amount).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : "$ 0.00",
      right: true,
    },
    {
      name: "Beneficiary",
      selector: (row: RetentionData) => row?.beneficiary_name || "",
      wrap: true,
      left: true,
    },
    {
      name: "Status",
      selector: (row: RetentionData) => row?.status || "",
      right: true,
      wrap: true,
    },
    {
      name: "Actions",
      fixed: "right",
      grow: true,
      center: true,
      cell: (row: RetentionData, index: number) => {
        let actions = [];

        if (isArchived) {
          actions = [
            { label: "View Original Payment", value: "View Original Payment" },
            { label: "View Summary", value: "View Summary" },
          ];
        } else {
          actions = [
            { label: "View Original Payment", value: "View Original Payment" },
            { label: "View Summary", value: "View Summary" },
          ];

          if (
            row?.retained_amount > 0 &&
            row?.status !== "Deleted" &&
            row?.status !== "Claim generated" &&
            row?.status !== "Payment generated"
          ) {
            if (row?.beneficiary_type === "Self") {
              actions.push({ label: "Withdraw", value: "Withdraw" });
              actions.push({
                label: "Create 3rd Party Claim",
                value: "Create Retention Claim",
              });
            } else {
              actions.push({
                label: "Create Retention Claim",
                value: "Create Retention Claim",
              });
            }
          }
        }

        return (
          <Overlays
            trigger="click"
            placement={"auto"}
            overlay={<span></span>}
            popoverTypes={"tableActions"}
            popoverActions={actions}
            optionClick={(data) => handleOptionClick(data, row)}
            cellData={{
              id: row?.payment_id,
            }}
          >
            <div className={styles.dotsContainer}>
              {/* <ThreeDots onClick={() => handleThreeDotsClick(row)} /> */}
              <ThreeDots />
            </div>
          </Overlays>
        );
      },
    },
  ];

  const CustomSubHeader = () => (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <SearchableSelect
          options={projectOpt}
          onChange={handleProjectChange}
          disabled={false}
          placeholder="Select Project"
          singleSelectedData={selectedProject}
          className={styles.textFieldStyles}
        />
        <SearchableSelect
          options={contractOpt}
          onChange={handleContractChange}
          disabled={false}
          placeholder="Select Contract"
          singleSelectedData={selectedContract}
          className={styles.textFieldStyles}
        />
        {!isArchived && (
          <SearchableSelect
            options={statusOptions}
            onChange={handleStatusChange}
            disabled={false}
            placeholder="Select Status"
            singleSelectedData={selectedStatusName}
            className={styles.textFieldStyles}
          />
        )}
        {isAnyFilterActive && (
          <button
            onClick={resetFilters}
            title="Reset Filters"
            className={styles.resetButton}
          >
            <ArrowClockwise className={styles.iconSpacing} />
            Reset Filters
          </button>
        )}
      </div>
      {printDocumentData?.length > 0 && (
        <div className={styles.headerIconCon}>
          <span
            className={styles.iconStyles}
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
            className={styles.iconStyles}
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
  return (
    <div className={styles.dataContainer}>
      <ReusableBreadcrumb
        items={[
          {
            href: ApplicationURLS.USER_DASHBOARD,
            label: "Home",
            active: routePath === ApplicationURLS.USER_DASHBOARD,
          },
          {
            href: "",
            label: "Retention List",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Retention List</span>
      </div>
      <TabContainer
        tabs={tabs}
        activeTab={activeTab}
        onTabClick={handleTabClick}
      />
      <ReusableDataTable
        columns={columns}
        data={paymentsListData}
        subHeader
        subHeaderComponent={<CustomSubHeader />}
        pagination
        progressPending={loading}
        paginationServer
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={handlePerRowsChange}
        onChangePage={handlePageChange}
        onRowClicked={(data: any) => handleRowView(data)}
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
      {displayViewSummary && (
        <RetentionSummary
          openModal={displayViewSummary}
          onClose={() => setDisplayViewSummary(false)}
          retentionsClaimData={actionData}
        />
      )}
    </div>
  );
};

export default RetentionLists;
