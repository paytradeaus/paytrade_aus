import { ApiResponse } from "@/shared/constant/messages";
import React, { useEffect, useState } from "react";
import PaginationComponent from "./Pagination";
import { convertPositiveDecimalTwoDigit, formatDate } from "@/utils";
import { DateFormat, InputType } from "@/shared/constant/general";
import FormikControl from "../FormikControl";

type DynamicTableProps = {
  headers: any[];
  gridData: Record<string, any>[]; // Array of objects for row data
  onRowClick?: (row: any) => void;
  enableCheckbox?: boolean; // Optional flag to include checkbox functionality
  disableCheckBox?: boolean;
  renderRowList: any;
  showLoader?: boolean;
  loaderColSpan?: number;
  perPageOptions?: Array<any>;
  currentPage?: number;
  entriesPerPage?: number;
  onEntriesPerPageChange?: (entries: number) => void;
  onPageChange?: (page: number) => void;
  totalEntries?: number;
  onGridCheckboxChange?: (data: Array<any>) => void; //returns selected grid data when enabling checkbox options
  checkBoxId?: string | number; //unique key to differentiate each object in the array
  hidePagination?: boolean;
  alignActionsDataCenter?: boolean;
  customHallowGrid?: any;
  selectedCheckboxRows?: any;
  hoverOnRowClick?: boolean;
  dynamicApiGridIconsKey?: string;
  gridActions?: any;
  displayAllStaticActions?: boolean;
  selectableRowsSingle?: boolean;
  onTableDataClick?: (data: any, row?: any) => void;
  onSortChange?: (
    sortConfig: {
      key: string;
      direction: SortDirection;
      sortKey: string;
    } | null
  ) => void;
  headerClassName?: string;
};

const entriesPerPageOptions = [10, 25, 50, 100];

type SortDirection = "ASC" | "DESC" | null;

const DynamicTable: React.FC<DynamicTableProps> = ({
  headers,
  gridData = [],
  dynamicApiGridIconsKey = "",
  onRowClick = () => {},
  renderRowList,
  showLoader = false,
  loaderColSpan = 5,
  currentPage,
  entriesPerPage,
  perPageOptions,
  onEntriesPerPageChange = () => {},
  onPageChange = () => {},
  totalEntries = 0,
  enableCheckbox = false,
  checkBoxId = "id",
  onGridCheckboxChange = () => {},
  hidePagination,
  alignActionsDataCenter = false,
  customHallowGrid = "",
  selectedCheckboxRows = [],
  hoverOnRowClick = false,
  displayAllStaticActions = false,
  selectableRowsSingle = false,
  gridActions,
  disableCheckBox = false,
  onTableDataClick = () => {},
  onSortChange = () => {},
  headerClassName = "",
}) => {
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [allSelected, setAllSelected] = useState<boolean>(false);
  const [sortedData, setSortedData] = useState<any[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: SortDirection;
  } | null>(null);

  useEffect(() => {
    setSortedData(gridData);
    setSelectedRows(selectedCheckboxRows);
    if (
      !selectableRowsSingle &&
      gridData?.length &&
      gridData.every((x: any) => x?.checked)
    ) {
      setAllSelected(true);
    } else {
      setAllSelected(false);
    }
  }, [gridData]);

  // Handle selecting or deselecting individual rows
  function handleCheckboxChange(rowData: any, renderDataIndex: any) {
    let updatedData;

    if (selectableRowsSingle) {
      // Single selection logic
      updatedData = sortedData.map((obj: any, rowIndex: number) => ({
        ...obj,
        checked: renderDataIndex === rowIndex ? !rowData?.checked : false, // Only one row can be selected
      }));
    } else {
      // Multi-selection logic
      updatedData = sortedData.map((obj: any, rowIndex: number) => ({
        ...obj,
        checked:
          renderDataIndex === rowIndex ? !rowData?.checked : !!obj?.checked,
      }));
    }

    const selectedObj = updatedData.filter((x: any) => x?.checked);

    // Update state and trigger callbacks
    setAllSelected(selectedObj.length === sortedData.length);
    setSelectedRows(selectedObj);
    setSortedData(updatedData);
    onGridCheckboxChange(selectedObj);
  }

  // Handle selecting or deselecting all rows
  function handleSelectAll() {
    const checkUncheckData = sortedData.map((obj: any) => {
      return {
        ...obj,
        checked: !allSelected,
      };
    });

    const filterSelectedData = checkUncheckData.filter((x: any) => x?.checked);

    setSortedData(checkUncheckData);
    setSelectedRows(checkUncheckData);
    onGridCheckboxChange(filterSelectedData);

    setAllSelected(!allSelected);
  }

  function onSort(headerData: any) {
    // Determine the new direction: toggle if same header was clicked previously
    let direction: SortDirection = "ASC";
    if (
      sortConfig &&
      sortConfig.key === headerData.title &&
      sortConfig.direction === "ASC"
    ) {
      direction = "DESC";
    }

    // Build the new sort configuration with the header's dataKey
    const newSortConfig = {
      key: headerData.title, // using title as the display key
      direction,
      sortKey: headerData.dataKey, // the actual dataKey for sorting
    };

    // Update state with new sort configuration
    setSortConfig(newSortConfig);
    // Pass the new sort configuration to parent or other components
    onSortChange(newSortConfig);
    // Log the header dataKey and sort direction

    // Only sort the gridData if sorting is not restricted for this header.
    if (!headerData?.restrictSorting) {
      const sortedArray = [...sortedData].sort((a, b) => {
        let aValue = a[headerData.dataKey];
        let bValue = b[headerData.dataKey];

        // If the header specifies valueModified, use a different key for comparison.
        if (headerData?.valueModified) {
          aValue = a[headerData.mainDataKey];
          bValue = b[headerData.mainDataKey];
        }

        if (aValue < bValue) {
          return direction === "ASC" ? -1 : 1;
        }
        if (aValue > bValue) {
          return direction === "ASC" ? 1 : -1;
        }
        return 0;
      });
      setSortedData(sortedArray);
    }
  }

  function activeSortingClass(headerData: any) {
    if (sortConfig?.key === headerData.title) {
      if (sortConfig?.direction === "ASC") {
        return "fa-light fa-caret-up";
      } else {
        return "fa-light fa-caret-down";
      }
    } else {
      return "fa-sort fa-light fa-caret";
    }
  }

  function renderDynamicRowData(
    rowDataKeys: any,
    rowData: any,
    index?: number
  ) {
    // Check if an input should be rendered
    if (rowDataKeys?.render) {
      return rowDataKeys.render(rowData, index);
    }
    if (rowDataKeys?.showInput) {
      return (
        <FormikControl
          control={InputType.TEXT_AREA}
          name={rowDataKeys?.key || "user_input"}
          value={rowData[rowDataKeys?.key || "user_input"] || ""}
          onChange={(e: any) => {
            const updated = [...sortedData];
            const index = rowData.__index__;
            if (index !== undefined && updated[index]) {
              const key = rowDataKeys?.key || "user_input";
              updated[index][key] = e.target.value;
              updated[index][`${key}_error`] = e.target.value.trim()
                ? ""
                : "Reason is required";
              setSortedData(updated);
            }
          }}
          placeholder="Enter the reason"
          required={false}
          showError={!!rowData?.user_input_error}
          error={rowData?.user_input_error}
        />
      );
    }
    if (rowDataKeys?.enableStatusIcons) {
      if (rowData?.showValidIcon) {
        return (
          <span className="valid">
            <i className={`fa-light fa-circle-check`}></i>{" "}
            {rowData?.[rowDataKeys?.key]}
          </span>
        );
      } else if (rowData?.showErrorIcon) {
        return (
          <span className="alert">
            <i className={`fa-light fa-triangle-exclamation`}></i>{" "}
            {rowData?.[rowDataKeys?.key]}
          </span>
        );
      } else {
        return <span>{rowData?.[rowDataKeys?.key]}</span>;
      }
    } else if (rowDataKeys?.enableHighlight) {
      return (
        <span className="tableDataHighlight">
          {rowDataKeys?.trim && rowData?.[rowDataKeys?.key]
            ? trimData(rowData[rowDataKeys.key], rowDataKeys?.trim)
            : rowData?.[rowDataKeys?.key]}
        </span>
      );
    } else if (rowDataKeys?.typeOfDate) {
      return formatDate(rowData?.[rowDataKeys?.key]);
    } else if (rowDataKeys?.enableDecimalFormat) {
      return rowData?.[rowDataKeys?.key]
        ? `$ ${convertPositiveDecimalTwoDigit(
            rowData?.[rowDataKeys?.key],
            true
          )}`
        : "";
    } else {
      return rowDataKeys?.trim && rowData?.[rowDataKeys?.key]
        ? trimData(rowData[rowDataKeys.key], rowDataKeys?.trim)
        : rowData?.[rowDataKeys?.key];
    }
  }

  function trimData(data: any, finalLimit: number) {
    return data.toString()?.slice(0, finalLimit).concat("...");
  }

  /**
   * Determines whether a dynamic action should be displayed based on various conditions.
   *
   * @param actionRow - The configuration object for the action.
   * @param gridRow - The current row data from the grid.
   * @returns `true` if the action should be displayed; otherwise, `false`.
   */
  function displayDynamicActions(actionRow: any, gridRow: any) {
    // Check if all static actions should be displayed
    // Ensure "Add Payment Claim" is not displayed if contract_count is missing
    if (actionRow?.label === "Add Payment Claim" && !gridRow?.contract_count) {
      return false;
    }
    if (
      actionRow?.label === "Add Payment Claim" &&
      gridRow?.client_supplier_status === "Draft"
    ) {
      return false;
    } else if (displayAllStaticActions && !actionRow?.comparisonRowKey) {
      return true;
    } // Check if the action should be displayed by default
    else if (actionRow?.displayByDefault) {
      return true;
    } else if (
      gridRow?.[dynamicApiGridIconsKey] && // Ensure the dynamic API key exists in gridRow
      gridRow?.[dynamicApiGridIconsKey][actionRow?.conditionalApiDisplayKey] // Check if the specific conditional API display key value is true
    ) {
      return true;
    } else if (
      actionRow?.notEqualTo &&
      gridRow[actionRow?.comparisonRowKey] &&
      // Compare its value with the conditional comparison data
      gridRow[actionRow?.comparisonRowKey] !=
        actionRow?.conditionalComparisonData
    ) {
      return true;
    } else if (
      !actionRow?.notEqualTo &&
      gridRow[actionRow?.comparisonRowKey] &&
      // Compare its value with the conditional comparison data
      gridRow[actionRow?.comparisonRowKey] ==
        actionRow?.conditionalComparisonData
    ) {
      return true;
    }
    // If none of the above conditions are met, do not display the action
    else {
      return false;
    }
  }

  function tableDataStyle(row: any) {
    if (row?.alignCenter && row?.wrapData) {
      return "text_center table_wrap";
    } else if (row?.alignCenter) {
      return "text_center";
    } else if (row?.wrapData) {
      return "table_wrap";
    }
  }

  return (
    <div className="table-wrapper">
      <div className="table-responsive tablesorter-default pt_table">
        <table className="dataTable compact stripe nowrap hover order-column">
          <thead>
            <tr>
              {enableCheckbox && (
                <th>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    disabled={
                      disableCheckBox ||
                      sortedData?.length === 0 ||
                      selectableRowsSingle
                    }
                  />
                </th>
              )}

              {headers.map((headerData, idx) => (
                <th
                  key={idx}
                  onClick={() => {
                    !headerData?.restrictSorting && onSort(headerData);
                  }}
                  className={
                    headerData?.alignCenter && !headerData?.restrictSorting
                      ? // dynamic_table_header
                        `text_center cu-pointer ${headerClassName}`
                      : !headerData?.restrictSorting
                      ? "cu-pointer"
                      : `${headerClassName}`
                  }
                >
                  {headerData?.title}
                  {!headerData?.restrictSorting && (
                    <span className="fa_sort cu-pointer">
                      <i
                        className={activeSortingClass(headerData)}
                        style={{ fontSize: "12px" }}
                      />
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!showLoader &&
              sortedData?.length > 0 &&
              sortedData.map((rowData: any, renderDataIndex) => (
                <tr
                  key={renderDataIndex}
                  onClick={() => onRowClick(rowData)}
                  className={hoverOnRowClick ? "cu-pointer" : ""}
                  // className={tableDataStyle(dataKey)}
                >
                  {enableCheckbox && (
                    <td style={{ width: "0" }}>
                      <input
                        type="checkbox"
                        checked={
                          rowData?.checked
                            ? selectedRows?.length > 0 &&
                              selectedRows.some(
                                (data: any) =>
                                  data[checkBoxId] == rowData[checkBoxId]
                              )
                            : false
                        }
                        onChange={() =>
                          handleCheckboxChange(rowData, renderDataIndex)
                        }
                        disabled={disableCheckBox}
                      />
                    </td>
                  )}

                  {renderRowList?.length > 0 &&
                    renderRowList.map(
                      (dataKey: any, renderRowKeyIndex: number) => {
                        return (
                          <td
                            key={renderRowKeyIndex}
                            className={
                              dataKey?.alignCenter && dataKey?.wrapData
                                ? "text_center table_wrap"
                                : dataKey?.wrapData
                                ? "table_wrap"
                                : ""
                            }
                            onClick={(e: any) => {
                              if (dataKey?.returnOnClickTableData) {
                                e.stopPropagation();
                                onTableDataClick(rowData, dataKey);
                              }
                            }}
                          >
                            {renderDynamicRowData(
                              dataKey,
                              rowData,
                              renderDataIndex
                            )}
                          </td>
                        );
                      }
                    )}

                  {gridActions?.length > 0 && (
                    <td
                      data-label="Actions"
                      className={alignActionsDataCenter ? "text_center" : ""}
                    >
                      {gridActions.map(
                        (action: any, actionIndex: any) =>
                          displayDynamicActions(action, rowData) && (
                            <a
                              data-tooltip={action.label}
                              data-placement="left"
                              key={actionIndex}
                              onClick={(e: any) => e?.preventDefault()}
                            >
                              <button
                                key={actionIndex}
                                className={
                                  action.style
                                    ? `${action.style} mr_zero_point_five`
                                    : "secondary mr_zero_point_five"
                                }
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent triggering row click

                                  action.onClick(rowData, renderDataIndex);
                                }}
                              >
                                {action.icon && (
                                  <i className={`fa-light ${action.icon}`}></i>
                                )}
                              </button>
                            </a>
                          )
                      )}
                    </td>
                  )}
                </tr>
              ))}
            {showLoader && (
              <tr>
                <td colSpan={loaderColSpan} className="table_article">
                  <article
                    aria-busy={"true"}
                    className={`table-loader ${customHallowGrid}`}
                  ></article>
                </td>
              </tr>
            )}
            {!showLoader && sortedData?.length === 0 && !totalEntries && (
              <tr>
                <td
                  colSpan={loaderColSpan}
                  className="
                "
                >
                  <article className={`table-loader ${customHallowGrid}`}>
                    {ApiResponse.NO_RECORDS_TO_DISPLAY}
                  </article>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!!entriesPerPage && !hidePagination && (
        <PaginationComponent
          totalEntries={totalEntries ?? 0}
          entriesPerPageOptions={perPageOptions ?? entriesPerPageOptions}
          onEntriesPerPageChange={onEntriesPerPageChange}
          onPageChange={onPageChange}
          currentPage={currentPage ?? 0}
          entriesPerPage={entriesPerPage}
        />
      )}
    </div>
  );
};

export default DynamicTable;
