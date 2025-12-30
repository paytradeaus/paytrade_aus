import React, { useEffect, useState, FC } from "react";
import { Table } from "react-bootstrap";
import styles from "./trial.module.scss";
import {
  getLedgerTrialBalanceServices,
  LedgerTrialBalanceType,
} from "./trialBalance.funtions";

const SlicedTable: FC<{
  data: {
    trial_balance_list: LedgerTrialBalanceType[];
    total_closing_balance?: any;
  };
  showHeader?: boolean;
}> = ({ data, showHeader = false }) => {
  return (
    <Table className={styles.tableContainer}>
      {showHeader && (
        <thead>
          <tr className={styles.headBorder}>
            <th className={styles.headTab}>Account</th>
            <th className={`${styles.headTab} ${styles.alignRight}`}>
              Closing Balance
            </th>
          </tr>
        </thead>
      )}
      <tbody>
        {data?.trial_balance_list?.map((row, index) => (
          <tr key={index} style={{ fontWeight: 400 }}>
            <td className={styles.bodyTab}>{row?.account_name}</td>
            <td className={styles.alignRight}>{row?.closing_balance}</td>
          </tr>
        ))}
        <tr className={styles.lastRow}>
          <td>Balance</td>
          <td className={styles.alignRight}>{data?.total_closing_balance}</td>
        </tr>
      </tbody>
    </Table>
  );
};

interface TrialBalanceTableProps {
  loading: any;
  data: any;
}

const TrialBalanceTable: FC<TrialBalanceTableProps> = ({ data, loading }) => {
  return (
    <div>
      {loading ? (
        <div className={styles.noRecordStyle}>Loading...</div>
      ) : data?.trial_balance_list && data?.trial_balance_list?.length > 0 ? (
        <SlicedTable data={data} showHeader />
      ) : (
        <div className={styles.noRecordStyle}>
          There are no records to display
        </div>
      )}
    </div>
  );
};

export default TrialBalanceTable;
