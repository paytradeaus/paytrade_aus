import React, { useState, useEffect, useCallback, useRef } from "react";
import { Table, Spinner } from "react-bootstrap";
import styles from "./ledger.module.scss";
import { LedgerType } from "./adminConstantData";
import { formatDate } from "@/common/commonFunctions";

// Component to render table headers
const TableHeader = ({ showTitle }: { showTitle: boolean }) => (
  <thead>
    <tr className={styles.tableContainer}>
      <th className={styles.headTab}>Date</th>
      <th className={styles.headTab}>Transaction</th>
      <th className={styles.headTab}>Reference</th>
      <th className={styles.headDeCreTab}>Debit</th>
      <th className={styles.headDeCreTab}>Credit</th>
      <th className={styles.headDeCreTab}>Balance</th>
    </tr>
  </thead>
);

// Component to render sliced table data
const SlicedTable = ({ data }: { data: LedgerType[] }) => (
  <Table className={styles.ledgerTable}>
    <TableHeader showTitle={true} />
    <tbody>
      {data?.map((obj: any, objInd: number) => (
        <React.Fragment key={objInd}>
          <tr>
            <td
              className={`${styles.bodyTab} ${styles.alignRight} ${styles.headingTabBold}`}
            >
              {obj.account_name}
            </td>
            <td className={styles.bodyTab}></td>
            <td className={styles.bodyTab}></td>
            <td className={styles.bodyTab}></td>
            <td className={styles.bodyTab}></td>
            <td
              className={`${styles.bodyTab} ${styles.alignRight} ${styles.headingTabBold}`}
            >
              {obj.opening_balance}
            </td>
          </tr>
          {obj.entries?.map((row: any, index: number) => (
            <tr
              key={`${objInd}-${index}`}
              className={styles.equalColumns}
              style={{ fontWeight: 400 }}
            >
              <td className={`${styles.bodyTab} ${styles.alignRight}`}>
                {formatDate(row?.journal_date)}
              </td>
              <td className={styles.bodyTab}>{row?.journal_description}</td>
              <td className={styles.bodyTab}>
                {row?.journal_number ? `#${row?.journal_number}` : ""}
              </td>
              <td className={`${styles.bodyTab} ${styles.alignRight}`}>
                {row?.debit_amount}
              </td>
              <td className={`${styles.bodyTab} ${styles.alignRight}`}>
                {row?.credit_amount}
              </td>
              <td className={styles.headingTabBold}>{row?.balance_amount}</td>
            </tr>
          ))}
          <tr key={`total-${objInd}`} style={{ fontWeight: 700 }}>
            <td className={styles.bodyTab}></td>
            <td className={styles.bodyTab}>Total {obj?.account_name}</td>
            <td className={styles.bodyTab}></td>
            <td className={`${styles.bodyTab} ${styles.amountAlign}`}>
              {obj?.total_debit_amount}
            </td>
            <td className={`${styles.bodyTab} ${styles.amountAlign}`}>
              {obj?.total_credit_amount}
            </td>
            <td className={styles.bodyTab}></td>
          </tr>
          <tr className={styles.topBottomBorder}>
            <td className={styles.bodyTab}></td>
            <td className={styles.bodyTab}>Net Movement</td>
            <td className={styles.bodyTab}></td>
            <td className={`${styles.bodyTab} ${styles.amountAlign}`}>
              {obj?.debit_net_movement}
            </td>
            <td className={`${styles.bodyTab} ${styles.amountAlign}`}>
              {obj?.credit_net_movement}
            </td>
            <td className={styles.bodyTab}></td>
          </tr>
        </React.Fragment>
      ))}
    </tbody>
  </Table>
);

// Component to handle lazy loading and displaying all data
export const LedgerTable = ({ data }: { data: LedgerType[] }) => {
  const [visibleData, setVisibleData] = useState<LedgerType[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading
  const [currentIndex, setCurrentIndex] = useState(2); // Start index after initial 2 records
  const chunkSize = data.length - 2; // Remaining data to be loaded
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set initial 2 records and start loading
    setVisibleData(data.slice(0, 2));
  }, [data]);

  useEffect(() => {
    // Load rest of the data after initial records
    if (currentIndex < data.length) {
      setTimeout(() => {
        setVisibleData((prevData) => [
          ...prevData,
          ...data.slice(currentIndex),
        ]);
        setLoading(false);
      }, 1000); // Simulate network delay
    }
    if (currentIndex == data.length) {
      setLoading(false);
    }
  }, [currentIndex, data]);

  return (
    <div
      ref={containerRef}
      className={styles.scrollableContainer}
      style={{ position: "relative" }}
    >
      <SlicedTable data={visibleData} />
      {loading && (
        <div className={`${styles.loaderContainer} ${styles.blinking}`}>
          <Spinner animation="border" />
        </div>
      )}
    </div>
  );
};

export default LedgerTable;
