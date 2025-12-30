import React from "react";

interface TableComponentProps {
  data: any[];
  headers: string[];
  title: string;
  subtitle: string;
  styles: {
    table: string;
    headingText: string;
    subHead: string;
    tableBody: string;
    tableBody1: string;
    firstRowGreen: string;
    lastRowBorder: string;
  };
}

const TableComponent: React.FC<TableComponentProps> = ({
  data,
  headers,
  title,
  subtitle,
  styles,
}) => {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.headingText} colSpan={headers.length}>
            {title}
          </th>
        </tr>
        <tr>
          <th className={styles.subHead} colSpan={headers.length}>
            {subtitle}
          </th>
        </tr>
        <tr className="text-center">
          {headers.map((header, index) => (
            <th key={index} className={styles.tableBody}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={index} className={index === 0 ? styles.firstRowGreen : ""}>
            {Object.values(row).map((cell, cellIndex) => (
              <td
                key={cellIndex}
                className={`${styles.tableBody1} ${
                  index === data.length - 1 ? styles.lastRowBorder : ""
                }`}
              >
                {/* {cell} */}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TableComponent;
