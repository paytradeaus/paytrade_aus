"use client";
import React, { useEffect, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import Overlays from "@/components/Overlayes/Overlayes";
import { Printer, ThreeDots, FileEarmarkExcel } from "react-bootstrap-icons";

import styles from "./toDoList.module.scss";
import { useRouter } from "next/navigation";
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
} from "./../../../paymentToDoList/paymentToDoList.functions";
import { PaymentData } from "./../../../paymentToDoList/paymentToDoList.types";
import { getCookie } from "cookies-next";
import { filter_paid_options } from "@/container/userModules/paymentToDoList/paymentToDoList.constant";
import { fetchFiltersOfPaymentClaimsPaymentsAndRetentionsList } from "@/app/api/commonAPIs";

const ToDoList = (props: any) => {
  const { bankAccountId } = props;
  const selectedCompanyId = Number(getCookie("companyId")) || 0;

  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [paymentsListData, setPaymentsListData] = useState<PaymentData[]>([]);

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
  const [selectedValue, setSelectedValue] = useState("");
  const [contractOpt, setContractOpt] = useState<any>([]);
  const [selectedContract, setSelectedContract] = useState<any>();
  const [contractId, setContractId] = useState("");
  const [singleSelectedData, setSingleSelectedData] = useState({
    label: "All",
    value: "",
  });
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
        }
      }
    };

    fetchFilterOptions();
  }, [selectedCompanyId, projectId, contractId]);

  useEffect(() => {
    getListAllAdminUsers(page, perPage);
  }, [projectId, contractId, selectedValue]);

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
        status: "Unmatched",
        is_confirmed: false,
        bank_account_id: bankAccountId || null,
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
      const { claim_type, payment_type } = actionData;
      let payload: any = {
        payment_id: actionData?.id,
      };

      // First scenario condition
      if (
        (claim_type === "Billable" &&
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
        ].includes(payment_type)
      ) {
        payload.is_paid_confirmed = true;
      }

      // Second scenario condition
      else if (
        (claim_type === "Receivable" &&
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
        ].includes(payment_type)
      ) {
        payload.is_received_confirmed = true;
      }
      let response = await editDetailsOfAPayment(
        payload,
        "Payment status has updated successfully"
      );
      if (response) {
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

  const handleSelectChange = (selectedValue: any) => {
    setSingleSelectedData(selectedValue);
    setSelectedValue(selectedValue.value);
    // Perform any other actions based on the selected value
  };

  const columns = [
    {
      name: "Payment Id",
      wrap: true,
      selector: (row: PaymentData) => row?.payment_id || "",
    },
    {
      name: "Payment Type",
      wrap: true,
      minWidth: "110px",
      selector: (row: PaymentData) => row?.payment_type || "",
    },
    {
      name: "Payment Amount",
      right: true,
      minWidth: "150px",
      selector: (row: PaymentData) =>
        row?.amount
          ? `$ ${convertPositiveDecimalTwoDigit(row?.amount)}`
          : "$ 0.00",
      wrap: true,
      fixed: "left",
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

    {
      wrap: true,
      center: true,
      fixed: "right",
      name: "Status",
      minWidth: "63px",
      selector: (row: PaymentData) =>
        row?.is_late ? "not paid - late" : "not paid",
    },

    {
      name: "Actions",
      fixed: "right",
      minWidth: "100px",
      center: true,
      cell: (row: PaymentData, index: number) => (
        <Overlays
          trigger="click"
          placement={"bottom"}
          overlay={<span></span>}
          popoverTypes={"tableActions"}
          popoverActions={[
            { label: "View", value: "view" },
            // { label: "Confirm Paid", value: "Confirm Paid" },
            ...(!(
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
        <SearchableSelect
          options={filter_paid_options}
          onChange={handleSelectChange}
          placeholder="Status"
          singleSelectedData={singleSelectedData}
          className={styles.textFieldStyles}
        />
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

export default ToDoList;
