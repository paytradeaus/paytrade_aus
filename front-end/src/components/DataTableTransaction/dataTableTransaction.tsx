import React from "react";
import DataTable, {
  Alignment,
  ConditionalStyles,
} from "react-data-table-component";
import styles from "./dataTableTransaction.module.scss";

interface ReusableDataTableProps<T> {
  data: T[];
  columns: T[];
  subHeader?: boolean;
  bottomText?: any;
  subHeaderComponent?: React.ReactNode;
  pagination?: boolean;
  paginationRowsPerPageOptions?: number[];
  paginationPerPage?: number;
  progressPending?: boolean;
  paginationServer?: any;
  paginationTotalRows?: any;
  onChangeRowsPerPage?: any;
  onChangePage?: any;
  selectableRows?: any;
  selectableRowsSelected?: any;
  onSelectedRowsChange?: any;
  style?: "red" | "blue"; // Make style prop mandatory
  conditionalRowStyles?: ConditionalStyles<T>[]; // Add conditionalRowStyles prop
}

const ReusableDataTable: React.FC<ReusableDataTableProps<any>> = ({
  data,
  columns,
  subHeader,
  bottomText,
  subHeaderComponent,
  pagination,
  paginationRowsPerPageOptions,
  paginationPerPage,
  style = "red", // Set default value for style prop
  conditionalRowStyles = [], // Add default value for conditionalRowStyles prop
  ...rest
}) => {
  const paginationComponentOptions = {
    selectAllRowsItem: true,
    selectAllRowsItemText: "All",
  };

  const tableStyles = {
    red: {
      headCells: {
        style: {
          fontWeight: "600",
          fontSize: "14px",
          color: "red",
        },
      },
      bottomText: {
        style: {
          color: "#1C2475",
          fontWeight: 700,
        },
      },
      cells: {
        style: {
          paddingLeft: "8px", // override the cell padding for data cells
          paddingRight: "8px",
          width: "5px",
          color: "green",
        },
        rows: {
          style: {
            minHeight: "21px", // override the row height
            backgroundColor: "green",
            height: "-50px",
          },
        },
      },
    },
    blue: {
      headCells: {
        style: {
          fontWeight: "600",
          fontSize: "14px",
          minHeight: "21px",
          color: "black", // Customize styles for blue theme
        },
      },
      bottomText: {
        style: {
          color: "blue",
          minHeight: "21px",
          fontWeight: 700,
        },
      },
      pagination: {
        style: {
          color: "blue",
          fontWeight: 700,
          fontSize: "15px",
        },
      },
    },
  };

  //   const table1 = {

  //   }

  return (
    <DataTable
      className={styles.kgOwiN} // Assuming styles are imported here
      customStyles={{ ...tableStyles[style] }} // Apply selected style
      columns={columns}
      data={data}
      pagination={pagination}
      fixedHeader
      selectableRowsHighlight
      highlightOnHover
      subHeader={subHeader}
      subHeaderComponent={subHeaderComponent}
      subHeaderAlign={Alignment.LEFT}
      conditionalRowStyles={conditionalRowStyles} // Pass conditionalRowStyles prop
      paginationComponentOptions={paginationComponentOptions}
      {...rest}
    />
  );
};

export default ReusableDataTable;
