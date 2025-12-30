import React, { useState, useEffect, useCallback, useRef } from "react";
import { Table, Spinner } from "react-bootstrap";
import styles from "./ledgerJournals.module.scss";
import { LedgerJournalsType } from "./adminConstantData";
import { formatDate } from "@/common/commonFunctions";

// Component to render table headers
const TableHeader = ({
  showTitle = false,
  auditToggle,
}: {
  showTitle?: boolean;
  auditToggle?: boolean;
}) => (
  <thead>
    <tr className={styles.tableContainer}>
      <th className={styles.emptyHead}></th>
      <th className={styles.headTabAccnt}>Account</th>
      {auditToggle && <th className={styles.headTabAudit}>Audit Id</th>}
      <th className={styles.headTab}>Debit</th>
      <th className={styles.headTab}>Credit</th>
    </tr>
  </thead>
);

// Component to render sliced table
const SlicedTable = ({
  data,
  showHeader,
  loading,
  auditToggle,
}: {
  data: LedgerJournalsType[];
  showHeader?: boolean;
  loading?: boolean;
  auditToggle?: boolean;
}) => (
  <div className={styles.tableContainer}>
    {data.map((obj: any, objInd: number) => (
      <Table key={objInd} className={styles.tableContainer}>
        <TableHeader showTitle={showHeader} auditToggle={auditToggle} />
        <tbody>
          {obj?.accounts?.map((row: any, index: number) => (
            <tr
              key={`${objInd}-${index}`}
              className={styles.equalColumns}
              style={{ fontWeight: 400 }}
            >
              <td className={`${styles.bodyTab} ${styles.alignLeft}`}>
                {index === 0 ? (obj?.date ? formatDate(obj.date) : null) : null}
              </td>
              <td className={styles.bodyTab}>{row.account_name}</td>
              {auditToggle && (
                <td className={styles.bodyTabAudit}>{row.audit_id}</td>
              )}
              <td className={`${styles.bodyTab} ${styles.alignRight}`}>
                {row.debit}
              </td>
              <td className={`${styles.bodyTab} ${styles.alignRight}`}>
                {row.credit}
              </td>
              <td className={styles.bodyTab}>{row.total_count}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 700 }}>
            <td className={styles.bodyTab}></td>
            <td className={styles.bodyTab}>{obj?.journal_description}</td>
            {auditToggle && <td className={styles.bodyTab}></td>}
            <td className={`${styles.bodyTab} ${styles.alignRight}`}>
              {obj?.total_debit}
            </td>
            <td className={`${styles.bodyTab} ${styles.alignRight}`}>
              {obj?.total_credit}
            </td>
          </tr>
        </tbody>
      </Table>
    ))}
  </div>
);

// Component to handle loading and displaying all data
export const LedgerJournalTable = ({
  data,
  auditToggle,
}: {
  data: LedgerJournalsType[];
  auditToggle: boolean;
}) => {
  const [visibleData, setVisibleData] = useState<LedgerJournalsType[]>([]);
  const [loading, setLoading] = useState(false); // Start with no loading state
  const [currentIndex, setCurrentIndex] = useState(0); // Index for data chunk
  const chunkSize = 10; // Load 10 records at a time
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load initial chunk of data
    setVisibleData(data.slice(0, chunkSize));
    setCurrentIndex(chunkSize);
  }, [data]);

  const loadMoreData = useCallback(() => {
    if (loading || currentIndex >= data.length) return;

    setLoading(true);
    setTimeout(() => {
      const nextIndex = currentIndex + chunkSize;
      const newEndIndex = Math.min(nextIndex, data.length);
      setVisibleData((prevData) => [
        ...prevData,
        ...data.slice(currentIndex, newEndIndex),
      ]);
      setCurrentIndex(newEndIndex);
      setLoading(false);
    }, 1000); // Simulate network delay
  }, [currentIndex, data, chunkSize, loading]);

  const handleScroll = useCallback(() => {
    if (
      containerRef.current &&
      containerRef.current.scrollTop + containerRef.current.clientHeight >=
        containerRef.current.scrollHeight - 10
    ) {
      loadMoreData();
    }
  }, [loadMoreData]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  return (
    <div
      ref={containerRef}
      className={styles.scrollableContainer}
      style={{ position: "relative" }}
    >
      <SlicedTable
        data={visibleData}
        auditToggle={auditToggle}
        showHeader
        loading
      />
      {loading && (
        <div className={`${styles.loaderContainer} ${styles.blinking}`}>
          <Spinner animation="border" />
        </div>
      )}
    </div>
  );
};

export default LedgerJournalTable;
