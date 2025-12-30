"use client";
import React, { useEffect, useState } from "react";
import styles from "./addTransactionForMatch.module.scss";
import ReusableDataTable from "@/components/DataTable/dataTable";
import {
  convertPositiveDecimalTwoDigit,
  formatDate,
} from "@/common/commonFunctions";
import { RowsPerPageInTable } from "@/common/constants";
import { DD_MM_YYYY } from "@/common/constants/general";

import { getCookie } from "cookies-next";
import debounce from "lodash/debounce";

import { FetchAllTransactions } from "../../../backTrustAccount.functions";
import { ITransactions } from "../../../bankTrustAccount.types";
import { XLg } from "react-bootstrap-icons";

const AddTransactionForMatch = (props: any) => {
  const {
    bankAccountId,
    setTransactionIDs,
    setIsShowTransaction,
    transactionType,
  } = props;
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [transactionData, setTransactionData] = useState<ITransactions[]>([]);
  const [search, setSearch] = useState("");

  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const delayedSearch = debounce(() => {
      setDebouncedSearch(search);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel; // Cleanup
  }, [search]);

  useEffect(() => {
    getListAllAdminArticles(page, perPage);
  }, [debouncedSearch]);
  const getListAllAdminArticles = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    const transactionsResponse = await FetchAllTransactions(
      {
        page: page,
        items_per_page: rowsPerPage,
        search: search || null,
        status: "ToMatch",
        bank_account_id: bankAccountId || null,
        date_filter: null,
        date_from: null,
        date_to: null,
        company_id: selectedCompanyId || null,
        is_receivable: transactionType,
      },
      setLoading
    );
    setTransactionData(transactionsResponse?.transactions_list || []);
    setTotalRows(transactionsResponse?.total_count || 0);
    setPerPage(rowsPerPage);
  };

  const handlePageChange = async (page: number) => {
    setPage(page);
    await getListAllAdminArticles(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await getListAllAdminArticles(page, newPerPage);
  };
  const handleOptionClick = async (row: ITransactions) => {
    setTransactionIDs((previous: Array<string>) => {
      if (previous.includes(row?.id)) {
        return previous;
      }
      return [...previous, row?.id];
    });
    setIsShowTransaction(false);
    return;
  };

  const columns = [
    {
      name: "Date",
      maxWidth: "120px",
      wrap: true,
      selector: (row: ITransactions) =>
        row?.txn_date ? formatDate(row?.txn_date, DD_MM_YYYY) : "N/A",
    },
    {
      name: "Description",
      // maxWidth: "300px",
      selector: (row: ITransactions) => row?.description || "",
    },
    {
      name: "Spent",
      minWidth: "130px",
      selector: (row: ITransactions) =>
        row?.spent_amount
          ? `$ ${convertPositiveDecimalTwoDigit(row?.spent_amount, true)}`
          : "",
    },
    {
      name: "Received",
      minWidth: "130px",
      selector: (row: ITransactions) =>
        row?.received_amount
          ? `$ ${convertPositiveDecimalTwoDigit(row?.received_amount, true)}`
          : "",
      wrap: true,
    },
    {
      name: "Matched To?",
      minWidth: "150px",
      // fixed: "left",
      grow: true,
      selector: (row: ITransactions) => row?.matched_to || "",
    },
    {
      name: "Status",
      maxWidth: "150px",
      selector: (row: ITransactions) =>
        row?.status === "To Review" ? "For Review" : row?.status || "",
    },
    {
      name: "Action",
      maxWidth: "100px",
      right: true,
      selector: (row: ITransactions) => (
        <span
          onClick={() => handleOptionClick(row)}
          className={styles.addActionText}
        >
          Add
        </span>
      ),
    },
  ];
  const CustomSubHeader = () => (
    <div className={styles.customSubHeaderCon}>
      <span className={styles.sideHeading}>Add Transaction</span>
      <XLg
        className={styles.closeImage}
        onClick={() => setIsShowTransaction(false)}
      />
    </div>
  );

  return (
    <div className={styles.gridMainContainer}>
      <ReusableDataTable
        columns={columns}
        data={transactionData}
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
  );
};

export default AddTransactionForMatch;
