"use client";
import React, { useEffect, useState } from "react";
import Overlays from "@/components/Overlayes/Overlayes";
import { FileEarmarkExcel, Printer, ThreeDots } from "react-bootstrap-icons";
import styles from "./billingHistory.module.scss";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";

import { RowsPerPageInTable } from "@/common/constants";
import {
  convertJsonToExcel,
  formatDate,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import { useLoaderContext } from "@/context/useLoader";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { Modal } from "react-bootstrap";
import { XLg } from "react-bootstrap-icons";
import Image from "next/image";
import Logo from "../../../../../public/assets/payTradeLogo.png";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import { DD_MM_YYYY } from "@/common/constants/general";
import {
  subscriptionDateOptions,
  statusOptions,
} from "./billinHistory.contants";
import {
  getPaymentHistoryByCompanyId,
  PaymentHistoryType,
} from "./billingHistory.functions";
import { getCookie } from "cookies-next";
import { format } from "date-fns";

const BillingHistory = (props: any) => {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);

  const [printDocumentData, setPrintDocumentData] = useState<any>([]);

  const [singleActivityDate, setSingleActivityDate] = useState<any>({
    value: "",
    label: "All Date",
  });
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [activityDate, setActivityDate] = useState("");
  const [activityLogStartDate, setActivityLogStartDate] = useState(
    new Date(new Date().setHours(0, 0, 0, 0))
  );

  const [activityLogEndDate, setActivityLogEndDate] = useState(
    new Date(new Date().setHours(23, 59, 59, 999))
  );
  const [isCustomDate, setIsCustomDate] = useState(false);
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [gridData, setGridData] = useState<PaymentHistoryType[]>([]);
  const [selectedStatus, setSelectedStatus] = useState();
  const [selectedStatusName, setSelectedStatusName] = useState();

  const capitalizeFirstLetter = (status?: string) => {
    if (!status) return "";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  useEffect(() => {
    fetchPaymentHistory(page, perPage);
  }, [
    page,
    perPage,
    activityDate,
    activityLogStartDate,
    activityLogEndDate,
    selectedStatus,
  ]);

  const fetchPaymentHistory = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    const payload = {
      company_id: selectedCompanyId || null,
      page_number: page,
      page_size: rowsPerPage,
      date_filter: singleActivityDate?.value,
      start_date: isCustomDate
        ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
        : null,
      end_date: isCustomDate
        ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
        : null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: selectedStatus || "",
    };

    try {
      const paymentHistoryData = await getPaymentHistoryByCompanyId(
        payload,
        setLoading
      );

      if (paymentHistoryData) {
        const { payment_history, total_count } = paymentHistoryData;
        setGridData(payment_history); // Updating the state with the correct type
        setTotalRows(total_count); // Assuming totalRows is handled correctly elsewhere
        setPrintDocumentData(
          payment_history.map((history) => ({
            paid_at: history?.paid_at ? formatDate(history?.paid_at) : "",
            invoice_number: history?.invoice_number,
            start_date:
              `${
                history?.start_date ? formatDate(history?.start_date) : ""
              } - ${
                history?.expiry_date ? formatDate(history?.expiry_date) : ""
              }` || "",
            payment_method: history?.payment_method,
            amount_paid: history?.amount_paid,
            status: capitalizeFirstLetter(history?.status),
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
    } finally {
      setLoading(false);
    }
  };

  async function handlePageChange(page: number) {
    setPage(page);
    await fetchPaymentHistory(page, perPage);
  }

  async function handlePerRowsChange(newPerPage: number, page: number) {
    setPerPage(newPerPage);
    await fetchPaymentHistory(page, perPage);
  }

  function downloadExcel() {
    const columnNames = [
      { value: "paid_at", label: "Date" },
      { value: "invoice_number", label: "Invoice or Credit Number" },
      { value: "start_date", label: "Billing Period" },
      { value: "payment_method", label: "Payment Method" },
      { value: "amount_paid", label: "Amount" },
      { value: "status", label: "Status" },
    ];
    convertJsonToExcel(
      printDocumentData,
      "Billing and payment history",
      columnNames
    );
  }

  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData?.map((user: any) => [
      user?.paid_at,
      user?.invoice_number,
      user?.start_date,
      user?.payment_method,
      user?.amount_paid,
      user?.status,
    ]);
    let headerNames: string[] = [
      "Date",
      "Invoice or Credit Number",
      "Billing Period",
      "Payment Method",
      "Amount",
      "Status",
    ];
    generateAndPrintPDF(
      formatedTableData,
      headerNames,
      "Billing and payment history",
      true
    );
  };

  const handleStatusChange = (selectedValue: any) => {
    setSelectedStatus(selectedValue?.value);
    setSelectedStatusName(selectedValue);
  };

  const columns = [
    {
      name: "Date",
      selector: (row: PaymentHistoryType) => {
        return row?.paid_at ? formatDate(row?.paid_at) : "";
      },

      wrap: true,
      left: true,
    },
    {
      name: "Invoice or Credit Number",
      selector: (row: PaymentHistoryType) => row?.invoice_number || "",
      wrap: true,
    },
    {
      name: "Billing Period",
      selector: (row: PaymentHistoryType) =>
        `${row?.start_date ? formatDate(row?.start_date) : ""} - ${
          row?.expiry_date ? formatDate(row?.expiry_date) : ""
        }` || "",
      wrap: true,
      center: true,
    },
    {
      name: "Payment Method",
      selector: (row: PaymentHistoryType) => row?.payment_method || "",
      wrap: true,
      left: true,
    },
    {
      name: "Amount",
      selector: (row: PaymentHistoryType) => row?.amount_paid || "",
      wrap: true,
    },
    {
      name: "Status",
      selector: (row: PaymentHistoryType) =>
        row?.status.charAt(0).toUpperCase() + row?.status.slice(1) || "",
      wrap: true,
      center: true,
    },
    {
      name: "Action",
      wrap: true,
      cell: (row: PaymentHistoryType) => (
        <span
          className={styles.exportPdfText}
          onClick={(event: any) => {
            event?.preventDefault();
            window.location.href = row?.invoice_pdf;
          }}
        >
          Export To PDF
        </span>
      ),
    },
  ];

  const CustomSubHeader = () => (
    <div className={styles.customSubHeaderCon}>
      <div className={styles.textAndSelectCon}>
        <SearchableSelect
          options={statusOptions}
          onChange={handleStatusChange}
          disabled={false}
          placeholder="Select Status"
          selectedData={selectedStatusName}
          className={styles.textFieldStyles}
        />
        <SearchableSelect
          options={subscriptionDateOptions}
          onChange={handleActivityChange}
          placeholder="Dates"
          selectedData={singleActivityDate}
          className={styles.textFieldStyles}
        />

        {isCustomDate && (
          <>
            <CustomDatePicker
              showIcon={true}
              toggleCalendarOnIconClick
              placeholderText="&nbsp;From date"
              selected={activityLogStartDate}
              value={activityLogStartDate}
              onChange={(selectedDate: Date) => {
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
              disabled={false}
              format={DD_MM_YYYY}
              className={styles.DatePickerCustomStyles}
            />
            <CustomDatePicker
              showIcon={true}
              toggleCalendarOnIconClick
              placeholderText="&nbsp;To date"
              selected={activityLogEndDate}
              value={activityLogEndDate}
              onChange={(selectedDate: Date) => {
                let toDate = new Date(selectedDate);
                if (toDate < activityLogStartDate) {
                  return;
                } else {
                  setTimeKey(new Date().getTime());
                  setActivityLogEndDate(toDate);
                }
              }}
              disabled={false}
              format={DD_MM_YYYY}
              maxDate={new Date()}
              className={styles.DatePickerCustomStyles}
            />
          </>
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

  function onClose() {
    router.back();
  }

  const handleActivityChange = (selectedValue: any) => {
    setTimeKey(new Date().getTime());
    setSingleActivityDate(selectedValue);
    setIsCustomDate(selectedValue.value === "Custom");
    setActivityDate(selectedValue.value);
  };

  return (
    <Modal
      show={true}
      fullscreen={true}
      scrollable
      className="full-screen-modal-container"
    >
      <Modal.Header className={styles.header}>
        <Image src={Logo.src} alt="Pay trade" width={80} height={40} />
        <XLg className={styles.closeImage} onClick={onClose} />
      </Modal.Header>
      <Modal.Body>
        <div className={styles.dataContainer}>
          <div className={styles.headerAndButtonCon}>
            <span className={styles.headerText}>
              Billing And Payment History
            </span>
          </div>
          <ReusableDataTable
            columns={columns}
            data={gridData?.length > 0 ? gridData : []} // This should be the data fetched from the API
            subHeader
            subHeaderComponent={<CustomSubHeader />}
            pagination
            progressPending={loading}
            paginationServer
            paginationTotalRows={totalRows}
            onChangeRowsPerPage={handlePerRowsChange}
            onChangePage={handlePageChange}
          />
        </div>
      </Modal.Body>
      {/* <Modal.Footer className={styles.footer}>
        <Button
          className={`${styles.closeButton} ${closeButtonStyle}`}
          onClick={onClose}
        >
          Close
        </Button>
      </Modal.Footer> */}
    </Modal>
  );
};

export default BillingHistory;
