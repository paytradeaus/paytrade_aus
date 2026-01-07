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

import styles from "./paymentToDoList.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import { ApplicationURLS } from "@/common/applicationURLS";
import { RowsPerPageInTable } from "@/common/constants";
import { AppModal } from "@/components/model/model";
import {
  convertJsonToExcel,
  convertPositiveDecimalTwoDigit,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import {
  editDetailsOfAPayment,
  fetchAllPaymentsList,
} from "./paymentToDoList.functions";
import { PaymentData } from "./paymentToDoList.types";
import { filter_paid_options, tabOptions } from "./paymentToDoList.constant";
import { getCookie } from "cookies-next";
import TabContainer from "@/container/addGroups/tabsContainer";
import { TriggerPaymentNotices } from "../payApps/payments/payments.function";
import { fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList } from "@/app/api/commonAPIs";

const PaymentToDoList = () => {
  const routePath = usePathname();
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [paymentsListData, setPaymentsListData] = useState<PaymentData[]>([]);
  const [selectedData, setSingleSelectedData] = useState({
    label: "All",
    value: "",
  });
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [projectOpt, setProjectOpt] = useState<any>([]);
  const [selectedProject, setSelectedProject] = useState<any>();
  const [projectId, setProjectId] = useState("");

  const [contractOpt, setContractOpt] = useState<any>([]);
  const [fromAccOpt, setFromAccOpt] = useState<any>([]);
  const [selectedContract, setSelectedContract] = useState<any>();
  const [selectedFromAcc, setSelectedFromAcc] = useState<any>();
  const [contractId, setContractId] = useState("");
  const [fromAccId, setFromAccId] = useState("");
  const [activeTab, setActiveTab] = useState(tabOptions[0].id);

  const resetFilters = () => {
    setSelectedProject(null);
    setSelectedContract(null);
    setSelectedFromAcc(null);
    setSingleSelectedData({
      label: "All",
      value: "",
    });
    setSelectedValue("");
    setProjectId("");
    setContractId("");
    setFromAccId("");
  };

  const isAnyFilterActive =
    selectedProject?.value ||
    selectedContract?.value ||
    selectedFromAcc?.value ||
    selectedValue ||
    projectId ||
    contractId ||
    fromAccId;

  useEffect(() => {
    const fetchFilterOptions = async () => {
      const filterPayload = {
        project_id: projectId || null,
        contract_id: contractId || null,
        company_id: selectedCompanyId || null,
      };

      // Fetch the filter options for projects, contracts, and client suppliers
      const filterData =
        await fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList(
          filterPayload
        );

      if (filterData) {
        // Set Project Options
        if (filterData?.projects && filterData?.projects.length > 0) {
          const projectOptions = [
            { label: "All", value: "" },
            ...filterData.projects.map((project: any) => ({
              label: project.project_name,
              value: project.project_id,
            })),
          ];
          setProjectOpt(projectOptions);
        } else {
          setProjectOpt([]);
        }
        // Set Contract Options
        if (filterData?.contracts && filterData?.contracts.length > 0) {
          const contractOptions = [
            { label: "All", value: "" },
            ...filterData.contracts.map((contract: any) => ({
              label: contract.contract_name,
              value: contract.contract_id,
            })),
          ];
          setContractOpt(contractOptions);
        } else {
          setContractOpt([]);
        }

        if (filterData?.fromAccounts && filterData?.fromAccounts.length > 0) {
          const accountsOptions = [
            { label: "All", value: "" },
            ...filterData.fromAccounts.map((account: any) => ({
              label: account.from_account_name,
              value: account.from_account_id,
            })),
          ];
          setFromAccOpt(accountsOptions);
        } else {
          setFromAccOpt([]);
        }
      }
    };

    fetchFilterOptions();
  }, [selectedCompanyId, projectId, contractId]);

  useEffect(() => {
    getListAllAdminUsers(page, perPage);
  }, [activeTab, projectId, contractId, selectedValue, fromAccId]);

  const getListAllAdminUsers = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    const adminUserList = await fetchAllPaymentsList(
      {
        page_size: rowsPerPage,
        page_number: page,
        company_id: selectedCompanyId,
        sub_payment_type: "ToDo",
        project_id: projectId || null,
        contract_id: contractId || null,
        bank_account_id: fromAccId || null,
        status: "Unmatched",
        is_confirmed: activeTab === "Not Paid" ? false : true,
        is_late:
          selectedValue === "" ? null : selectedValue === "late" ? true : false,
      },
      setLoading
    );
    setPaymentsListData(adminUserList?.payments || []);
    setTotalRows(adminUserList?.total_count || 0);
    setPerPage(rowsPerPage);
    let printDataObjCreation = adminUserList?.payments?.map((user: any) => {
      return {
        payment_id: user?.payment_id,
        payment_amount: user?.amount
          ? `$ ${convertPositiveDecimalTwoDigit(user?.amount)}`
          : "$ 0.00",
        payment_from_account: user?.payment_from_account || "",
        status: user?.status,
      };
    });

    setPrintDocumentData(printDataObjCreation);
  };
  function downloadExcel() {
    const columnNames = [
      { value: "payment_id", label: "Payment Id" },
      { value: "payment_amount", label: "Payment Amount" },
      { value: "payment_from_account", label: "Payment From Account" },
      { value: "status", label: "Status" },
    ];
    convertJsonToExcel(printDocumentData, "payments to do list", columnNames);
  }

  const handleSelectChange = (selectedValue: any) => {
    setSingleSelectedData(selectedValue);
    setSelectedValue(selectedValue.value);
    // Perform any other actions based on the selected value
  };
  const handleProjectChange = (selectedValue: any) => {
    setSelectedProject(selectedValue);
    setProjectId(selectedValue.value);
    // Perform any other actions based on the selected value
  };
  const handleContractChange = (selectedValue: any) => {
    setSelectedContract(selectedValue);
    setContractId(selectedValue.value);
    // Perform any other actions based on the selected value
  };
  const handleFromAccChange = (selectedValue: any) => {
    setSelectedFromAcc(selectedValue);
    setFromAccId(selectedValue.value);
    // Perform any other actions based on the selected value
  };
  const handleOptionClick = async (
    data: { id: string; option: string },
    row: any
  ) => {
    const { id, option } = data;

    if (option === "Confirm Paid") {
      setActionData({
        ...data,
        claim_type: row?.claim_type || null,
        payment_type: row?.payment_type || null,
        sub_payment_type: row?.sub_payment_type || null,
      });
      setOpenModal(!openModal);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg: "Do you wish to Confirm Paid this payment? ",
      }));
    } else if (option === "view") {
      navigateToViewOptions(row);
    }
  };

  const navigateToViewOptions = (row: any) => {
    if (
      [
        "Full",
        "Part",
        "Pay Less - Full",
        "Pay Less - Part",
        "Pay - Zero",
        "3rd Party",
      ].includes(row?.payment_type)
    ) {
      router.push(
        `${ApplicationURLS.USER_PAYMENTS}?claim=${row?.payment_claim_id}&mode=view&payment=${row?.payment_id}`
      );
    } else {
      router.push(
        `${ApplicationURLS.USER_VIEW_INTEREST_CHARGES_OTHER_PAYMENT}/${row?.payment_id}`
      );
    }
  };
  const handleRowView = (row: any) => {
    navigateToViewOptions(row);
  };
  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData?.map((user: any) => [
      user.payment_id,
      user.payment_amount,
      user.payment_from_account,
      user.status,
    ]);
    let headerNames: string[] = [
      "Payment Id",
      "Payment Amount",
      "Payment From Account",
      "status",
    ];
    generateAndPrintPDF(formatedTableData, headerNames, "payments to do list");
  };

  const handleModalPopUpFunction = async () => {
    setOpenModal(!openModal);

    if (actionData.option === "Confirm Paid") {
      const { claim_type, payment_type, sub_payment_type } = actionData;
      let payload: any = {
        payment_id: actionData?.id,
      };

      if (
        sub_payment_type === "Payment" &&
        ((claim_type === "Billable" &&
          ["Full", "Part", "Pay Less - Full", "Pay Less - Part"].includes(
            payment_type
          )) ||
          [
            "Interest Withdrawal",
            "Bank Charge Applied",
            "Withdrawal",
            "Overpayment to supplier",
            "Underpayment to supplier",
            "Overpayment refund to client",
          ].includes(payment_type))
      ) {
        payload.is_paid_confirmed = true;
      } else if (
        sub_payment_type === "Payment" &&
        ((claim_type === "Receivable" &&
          ["Full", "Part", "Pay Less - Full", "Pay Less - Part"].includes(
            payment_type
          )) ||
          [
            "Interest Received",
            "Bank Charge Top Up",
            "Top Up",
            "Overpayment refund from supplier",
            "Top Up Retention",
            "Overpayment from client",
            "Underpayment from client",
          ].includes(payment_type))
      ) {
        payload.is_received_confirmed = true;
      } else if (sub_payment_type === "Retention Out") {
        payload.is_retention_confirmed = true;
      }

      let response = await editDetailsOfAPayment(
        payload,
        "Payment status has updated successfully"
      );
      if (response) {
        if (
          [
            "Full",
            "Part",
            "Pay Less - Full",
            "Pay Less - Part",
            "Pay - Zero",
            "3rd Party",
          ].includes(actionData?.payment_type)
        ) {
          await TriggerPaymentNotices({
            payment_ids: [actionData?.id],
          });
        }
        await getListAllAdminUsers(page, perPage);
      }
    }
  };

  const handlePageChange = async (page: number) => {
    setPage(page);
    await getListAllAdminUsers(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await getListAllAdminUsers(page, newPerPage);
  };

  const handleTabClick = (tabId: string) => {
    if (activeTab === tabId) {
      return;
    } else {
      setActiveTab(tabId);
    }
  };
  const columns = [
    {
      name: "Payment Id",
      // minWidth: "120px",
      wrap: true,
      selector: (row: PaymentData) => row?.payment_id || "",
    },
    {
      name: "Payment Type",
      minWidth: "110px",
      wrap: true,
      selector: (row: PaymentData) => row?.payment_type || "",
    },
    {
      name: "Payment Amount",
      minWidth: "150px",
      selector: (row: PaymentData) =>
        row?.amount
          ? `$ ${convertPositiveDecimalTwoDigit(row?.amount)}`
          : "$ 0.00",

      right: true,
    },

    {
      name: "Payment From Acct",
      minWidth: "160px",
      selector: (row: PaymentData) => row?.payment_from_account_name,
      wrap: true,
      fixed: "left",
    },
    {
      name: "Payment To Acct Name",
      minWidth: "200px",
      selector: (row: PaymentData) => row?.payment_to_account_name,
      wrap: true,
      fixed: "left",
    },
    {
      name: "Payment To Acct Number",
      minWidth: "180px",
      selector: (row: PaymentData) => row?.payment_to_account_number || "",
      wrap: true,
      fixed: "left",
    },
    {
      name: "Payment To Acct BSB",
      minWidth: "150px",
      selector: (row: PaymentData) => row?.payment_to_account_bsb_number || "",
      wrap: true,
      fixed: "left",
    },

    ...(activeTab === "Not Paid"
      ? [
          {
            wrap: true,
            center: true,
            fixed: "right",
            name: "Status",
            minWidth: "63px",
            selector: (row: PaymentData) =>
              row?.is_late ? "Overdue" : "Not paid",
          },
        ]
      : []),

    {
      name: "Actions",
      fixed: "right",
      minWidth: "100px",
      center: true,
      cell: (row: PaymentData, index: number) => (
        <Overlays
          trigger="click"
          placement={"auto"}
          overlay={<span></span>}
          popoverTypes={"tableActions"}
          popoverActions={[
            { label: "View", value: "view" },
            ...(activeTab === "Not Paid" &&
            !(
              row?.payment_type === "Pay - Zero" ||
              row?.payment_type === "3rd Party"
            )
              ? [{ label: "Confirm Paid", value: "Confirm Paid" }]
              : []),
          ]}
          optionClick={(data) => handleOptionClick(data, row)}
          cellData={{
            id: row.payment_id,
          }}
        >
          <div className={styles.dotsContainer}>
            <ThreeDots />
          </div>
        </Overlays>
      ),
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
          selectedData={selectedProject}
          className={styles.textFieldStyles}
        />
        <SearchableSelect
          options={contractOpt}
          onChange={handleContractChange}
          disabled={false}
          placeholder="Select Contract"
          selectedData={selectedContract}
          className={styles.textFieldStyles}
        />
        <SearchableSelect
          options={fromAccOpt}
          onChange={handleFromAccChange}
          disabled={false}
          placeholder="Select from Account"
          selectedData={selectedFromAcc}
          className={styles.textFieldStyles}
        />
        {activeTab === "Not Paid" && (
          <SearchableSelect
            options={filter_paid_options}
            onChange={handleSelectChange}
            placeholder="Status"
            selectedData={selectedData}
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
            active: false,
          },
          {
            href: ApplicationURLS.USER_PAYMENTS_LIST_CURRENT,
            label: "Payments",
            active: false,
          },
          {
            href: "",
            label: "Payment To Do",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Payments To Do</span>
      </div>
      <TabContainer
        tabs={tabOptions}
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
    </div>
  );
};

export default PaymentToDoList;
