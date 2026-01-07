"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Printer, Share, ThreeDots } from "react-bootstrap-icons";
import styles from "./retentionSummary.module.scss";
import { sampleData } from "./adminConstantData";
import Overlays from "@/components/Overlayes/Overlayes";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import ReusableDataTable from "@/components/DataTable/dataTable";
import MyDatePicker from "@/components/datePicker/datePicker";
import { Button, Col, Container, Row, Table } from "react-bootstrap";
import { HalfScreenModal } from "@/components/ModalHalfScreen/modalHalfScreen";
import { fetchRetentionsSummary } from "./rtentionLIst.functions";
import { useLoaderContext } from "@/context/useLoader";
import { RowsPerPageInTable } from "@/common/constants";
import { formatDate } from "@/common/commonFunctions";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";

type UserData = {
  retention_summary_id: string;
  retained_on: string;
  retention_id: number;
  retention_type: string;
  sub_payment_id: number;
  event_id: number;
  amount: string;
  beneficiary_name: string;
  retained_account_name: string;
  payment_amount: string;
};

const RetentionSummary = ({ openModal, onClose, retentionsClaimData }: any) => {
  const [retentionSummaryData, setRetentionSummaryData] = useState([]);
  const [listTotalCount, setListTotalCount] = useState(0);
  const [loader, setLoader] = useState(false);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState(
    retentionsClaimData?.rowData?.status === "Deleted" ? "Deleted" : "Active"
  );

  const statusOptions = [
    { value: "Deleted", label: "Void" },
    { value: "Active", label: "Active" },
  ];
  const [selectedStatusName, setSelectedStatusName] = useState(
    retentionsClaimData?.rowData?.status === "Deleted"
      ? statusOptions[0]
      : statusOptions[1]
  );

  useEffect(() => {
    if (retentionsClaimData?.rowData?.retention_list_id) initialInvokeData();
  }, [retentionsClaimData, page, perPage, selectedStatus]);

  async function initialInvokeData() {
    const postData = {
      payload: {
        retention_id: retentionsClaimData?.rowData?.retention_list_id,
        page_number: page,
        items_per_page: perPage,
        status: selectedStatus || "",
      },
    };
    setLoader(true);
    const summaryResponse = await fetchRetentionsSummary(postData);

    setRetentionSummaryData(summaryResponse?.retention_summary || []);
    setListTotalCount(summaryResponse?.total_count);
    setLoader(false);
  }

  async function handlePageChange(page: number) {
    setPage(page);
  }

  async function handlePerRowsChange(newPerPage: number, page: number) {
    setPerPage(newPerPage);
  }

  const handleStatusChange = (selectedValue: any) => {
    setSelectedStatus(selectedValue?.value);
    setSelectedStatusName(selectedValue);
  };

  const columns = [
    {
      name: "Event Id",
      maxWidth: "150px",
      wrap: true,
      center: true,
      selector: (row: UserData) => row?.event_id,
    },
    {
      name: "Retained On",
      selector: (row: UserData) => formatDate(row?.retained_on),
    },
    {
      name: "Retention Id",
      selector: (row: UserData) => row?.retention_id,
    },
    {
      name: "Retention Type",
      selector: (row: UserData) => row?.retention_type,
    },
    {
      name: "Payment Date",
      selector: (row: UserData) => formatDate(row?.retained_on),
    },
    {
      name: "Retained Amount",
      selector: (row: UserData) => row?.amount,
      format: (row: any) =>
        row?.amount ? ` $ ${row?.amount?.toFixed(2)}` : "",
      right: true,
    },
    {
      name: "Payment Amount",
      selector: (row: UserData) => row?.payment_amount,
      format: (row: any) =>
        row?.payment_amount ? `$ ${row?.payment_amount?.toFixed(2)}` : "",
      right: true,
    },
    {
      name: "For Beneficiary",
      selector: (row: UserData) => row?.beneficiary_name,
    },
    {
      name: "Retained Account Name",
      selector: (row: UserData) => row?.retained_account_name,
    },
  ];

  return (
    <Container className="mt-5">
      <HalfScreenModal
        displayHalfScreenModal={openModal}
        onClose={() => onClose()}
      >
        <div className={styles.dataContainer}>
          <div className={styles.headerAndButtonCon}>
            <span className={styles.headerText}>
              {`Retention Summary - ${retentionsClaimData?.rowData?.retention_list_id}`}
            </span>
          </div>
          <div className={styles.textAndSelectCon}>
            <SearchableSelect
              options={statusOptions}
              onChange={handleStatusChange}
              disabled={false}
              placeholder="Select Status"
              selectedData={selectedStatusName}
              className={styles.statusStyles}
            />
          </div>
          <ReusableDataTable
            columns={columns}
            data={retentionSummaryData || []}
            subHeader
            pagination
            paginationServer
            paginationTotalRows={listTotalCount}
            progressPending={loader}
            onChangeRowsPerPage={handlePerRowsChange}
            onChangePage={handlePageChange}
          />
        </div>
      </HalfScreenModal>
    </Container>
  );
};

export default RetentionSummary;
