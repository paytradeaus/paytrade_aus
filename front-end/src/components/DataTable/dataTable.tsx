import React from "react";
import DataTable, {
  Alignment,
  ConditionalStyles,
  defaultThemes,
} from "react-data-table-component";
import styles from "./dataTable.module.scss";

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
  selectableRowsSingle?: any;
  clearSelectedRows?: any;
  selectableRowSelected?: any;
  customStyles?: any;
  onRowClicked?: (a: any) => void;
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
  onRowClicked,
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
        },
      },
      bottomText: {
        style: {
          color: "#1C2475",
          fontWeight: 700,
        },
      },
      pagination: {
        style: {
          color: "#1C2475",
          fontWeight: 700,
          fontSize: "15px",
        },
      },
    },
    blue: {
      headCells: {
        style: {
          fontWeight: "600",
          fontSize: "14px",
          backgroundColor: "#A3B0C9",
          color: "white", // Customize styles for blue theme
        },
      },
      bottomText: {
        style: {
          color: "blue",
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

  const customStyles = {
    header: {
      style: {
        minHeight: "56px",
      },
    },
    headRow: {
      style: {
        borderTopStyle: "solid",
        borderTopWidth: "1px",
        borderTopColor: defaultThemes.default.divider.default,
      },
    },
    headCells: {
      style: {
        "&:not(:last-of-type)": {
          borderRightStyle: "solid",
          borderRightWidth: "1px",
          borderRightColor: defaultThemes.default.divider.default,
        },
      },
    },
    cells: {
      style: {
        "&:not(:last-of-type)": {
          borderRightStyle: "solid",
          borderRightWidth: "1px",
          borderRightColor: defaultThemes.default.divider.default,
        },
      },
    },
  };
  const rowHoverStyle: ConditionalStyles<any> = {
    when: () => true,
    style: {
      cursor: onRowClicked ? "pointer" : "default",
    },
  };

  return (
    <DataTable
      className={styles.tableContainer} // Assuming styles are imported here
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
      conditionalRowStyles={[rowHoverStyle, ...conditionalRowStyles]}
      paginationComponentOptions={paginationComponentOptions}
      {...rest}
      onRowClicked={onRowClicked}
    />
  );
};

export default ReusableDataTable;
