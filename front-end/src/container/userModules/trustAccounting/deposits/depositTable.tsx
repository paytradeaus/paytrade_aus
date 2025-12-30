import React, { FC } from "react";
import { Table } from "react-bootstrap";
import { GridEntryType } from "./deposits.functions"; // Adjust the path accordingly
import styles from "./deposits.module.scss";
import { formatDate } from "@/common/commonFunctions";

const TableHeader = () => (
  <thead>
    <tr>
      {/* <th className={styles.headTab1} colSpan={6}>
        Record of Deposits and Withdrawals Example retention trust account From
        1 Feb 2022 to 30 Jun 2023
      </th> */}
    </tr>
    <tr className={styles.headTab}>
      <th className={styles.headTab}>Date</th>
      <th className={styles.headTab}>Type</th>
      <th className={styles.headTab}>Transaction</th>
      <th className={styles.headTab}>Account Name</th>
      <th className={styles.headTab}>Account Number</th>
      <th className={styles.headTab}>Bsb Number</th>
      <th className={styles.headTab}>Reference</th>
      <th className={styles.headTab} style={{ textAlign: "right" }}>
        Amount
      </th>
      <th className={styles.headTab} style={{ textAlign: "right" }}>
        Balance
      </th>
    </tr>
  </thead>
);

const SlicedTable: FC<{
  data: {
    grid_entries: GridEntryType[];
    closing_balance: any;
    opening_balance: any;
    opening_date: any;
    closing_date: any;
  };
  showHeader?: boolean;
}> = ({ data, showHeader }) => {
  return (
    <Table className={styles.tableHeader}>
      {showHeader && <TableHeader />}
      <tbody className={styles.bodyTab}>
        <tr className={styles.lastRow}>
          <td className={styles.firstRowOpening}>
            {data?.opening_date ? formatDate(data?.opening_date) : null}
          </td>
          <td className={styles.lastRowOpening}></td>
          <td className={styles.lastRowOpening}>Opening Balance</td>
          <td className={styles.lastRowOpening}></td>
          <td className={styles.lastRowOpening}></td>
          <td className={styles.lastRowOpening}></td>
          <td className={styles.lastRowOpening}></td>
          <td className={styles.lastRowOpening}></td>
          <td className={`${styles.alignRight} ${styles.lastRowOpening}`}>
            {data?.opening_balance}
          </td>
        </tr>
        {data?.grid_entries?.map((row, index) => (
          <tr key={index} className={styles.bodyTab}>
            <td className={styles.bodyTab}>
              {row?.journal_date ? formatDate(row?.journal_date) : null}
            </td>
            <td className={styles.bodyTab}>{row?.type}</td>
            <td className={styles.bodyTab}>{row?.journal_description}</td>
            <td className={styles.bodyTab}>{row?.account_name}</td>
            <td className={styles.bodyTab}>{row?.account_number}</td>
            <td className={styles.bodyTab}>{row?.bsb_number}</td>
            <td className={styles.bodyTab}>{`#${row?.journal_number}`}</td>
            <td className={styles.bodyTab} style={{ textAlign: "right" }}>
              {row?.amount}
            </td>
            <td
              className={styles.bodyTab}
              style={{ fontWeight: 700, textAlign: "right" }} // Make the last column bold and align right
            >
              {row?.balance_amount}
            </td>
          </tr>
        ))}
        <tr className={styles.lastRow}>
          <td>{data?.closing_date ? formatDate(data?.closing_date) : null}</td>
          <td></td>
          <td>Closing Balance</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td className={styles.alignRight}>{data?.closing_balance}</td>
        </tr>
      </tbody>
    </Table>
  );
};

interface DepositsTableProps {
  data: any;
  loading: any;
}

const DepositsTable: FC<DepositsTableProps> = ({ data, loading }) => {
  if (loading) {
    return <div className={styles.noRecordStyle}>Loading...</div>;
  }

  return (
    <div>
      {loading ? (
        <div className={styles.noRecordStyle}>Loading...</div>
      ) : data?.grid_entries && data?.grid_entries?.length > 0 ? (
        <SlicedTable data={data} showHeader />
      ) : (
        <div className={styles.noRecordStyle}>
          There are no records to display
        </div>
      )}
    </div>
  );
};

export default DepositsTable;
