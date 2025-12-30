import { DateFormat } from "@/shared/constant/general";
import { formatDate } from "@/utils";
import { Borel } from "next/font/google";
import { useEffect, useState } from "react";
import { v4 } from "uuid";

interface TrustAccountGridProps {
  tableHeaders: any[];
  gridData: any;
  renderRowList: {
    key: string;
    emptyHeader?: boolean;
    elongatedHeader?: boolean;
  }[];
  hightLightLastRowBackground?: boolean;
  hightLightLastRowBorder?: boolean;
  fontBoldLastRow?: boolean;
  hightLightFirstRowBackground?: boolean;
  hightLightFirstRowBorder?: boolean;
  fontBoldFirstRow?: boolean;
  hightLightNetRowBackground?: boolean;
  hightLightNetRowBorder?: boolean;
  fontBoldNetRow?: boolean;
  nestedArrayKey?: string;
  hoverOnRowClick?: boolean;
  dynamicColumns?: string[];
  renderStaticFirstRow?: boolean;
  renderStaticNetFooterRow?: boolean;
  renderStaticFooterRow?: boolean;
  renderOneTableHeader?: boolean;
  tableIndex?: number;
  addStaticDataWithFooter?: boolean;
  from?: string;
  onClick?: (data: any) => void;
  renderDynamicRowDatOnClick?: (data: any) => void;
}

/**
 * TrustAccountGrid component renders a trust account grid table.
 *
 * @param props - Properties for the TrustAccountGrid component.
 * @returns - TSX element representing the trust account grid table.
 */
export default function TrustAccountGrid({
  tableHeaders,
  gridData,
  renderRowList,
  hightLightLastRowBackground,
  hightLightLastRowBorder,
  fontBoldLastRow,
  nestedArrayKey = "",
  dynamicColumns = [],
  hightLightFirstRowBackground,
  hightLightFirstRowBorder,
  fontBoldFirstRow,
  hightLightNetRowBackground,
  hightLightNetRowBorder,
  fontBoldNetRow,
  hoverOnRowClick,
  renderStaticFirstRow,
  renderStaticNetFooterRow,
  renderStaticFooterRow,
  renderOneTableHeader,
  tableIndex,
  from,
  onClick,
  renderDynamicRowDatOnClick,
}: Readonly<TrustAccountGridProps>) {
  // Function to render a table header cell (TH element).
  function renderHeader(header: any) {
    if ("emptyHeader" in header && header.emptyHeader) {
      return <th className="ledgerJournals_emptyHead__rKJ1M"></th>;
    }

    // const headerClass =
    //   "elongatedHeader" in header && header.elongatedHeader
    //     ? "ledgerJournals_headTabAccnt__2ldyh"
    //     : "ledgerJournals_headTab__JyZAx";

    const headerClass =
      header.key === "journal_number_format" ||
      header.key === "debit_amount" ||
      header.key === "credit_amount" ||
      header.key === "balance_amount"
        ? "ledgerJournals_headTab__JyZAx fixedColHeader"
        : "ledgerJournals_headTab__JyZAx";

    return (
      <th
        className={headerClass}
        style={{
          textAlign: header?.isCenterAligned
            ? "center"
            : header?.isRightAlign
            ? "right"
            : "left",
        }}
      >
        {header.headerName}
      </th>
    );
  }

  // Function to retrieve data for a table body cell (TD element).
  function renderDynamicRowData(
    rowDataKeys: any,
    rowData: any,
    renderRowKeyIndex: number,
    gridRowIndex: number
  ) {
    if (rowDataKeys?.displayFirstRowKey && gridRowIndex == 0) {
      return !rowDataKeys?.restrictFirstDateFormat && rowDataKeys?.formatDate
        ? formatDate(gridData?.[rowDataKeys?.key])
        : rowData?.[rowDataKeys?.firstRowKey];
    } else if (rowDataKeys?.formatDate) {
      return formatDate(rowData?.[rowDataKeys?.key]);
    }

    return rowData?.[rowDataKeys?.key];
  }

  // Function to assign class names for table body cells (TD elements).
  function getDynamicTDClass(tableDataKeyObj: any) {
    if (tableDataKeyObj?.emptyHeader) {
      return "ledgerJournals_bodyTab__U_uaz ledgerJournals_alignLeft__6mDOz";
    } else if (tableDataKeyObj?.elongatedHeader) {
      return "ledgerJournals_bodyTab__U_uaz";
    } else if (
      [
        "journal_number_format",
        "debit_amount",
        "credit_amount",
        "balance_amount",
      ].includes(tableDataKeyObj?.key)
    ) {
      return "ledgerJournals_bodyTab__U_uaz ledgerJournals_alignRight__WaPkF fixedColCell";
    }
    return "ledgerJournals_bodyTab__U_uaz ledgerJournals_alignRight__WaPkF";
  }

  // Function to determine class names for highlighting the last row.
  function displayTotalRowHighlighted(rowIndex: number, rowType: string) {
    const isLastRow = rowIndex === gridData[nestedArrayKey]?.length - 1;

    if (
      hightLightFirstRowBackground &&
      isLastRow &&
      rowType == typeOfRow.TR_HEADER_ROW
    ) {
      return "totalrow";
    } else if (
      hightLightLastRowBackground &&
      isLastRow &&
      rowType == typeOfRow.FOOTER_ROW
    ) {
      return "totalrow";
    } else if (
      hightLightNetRowBackground &&
      isLastRow &&
      rowType == typeOfRow.NET_MOVEMENT_ROW
    ) {
      return "totalrow";
    } else if (
      hightLightLastRowBorder &&
      isLastRow &&
      rowType == typeOfRow.FOOTER_ROW
    ) {
      return "highlightrow";
    } else if (
      hightLightFirstRowBorder &&
      isLastRow &&
      rowType == typeOfRow.TR_HEADER_ROW
    ) {
      return "highlightrow";
    } else if (
      hightLightNetRowBorder &&
      isLastRow &&
      rowType == typeOfRow.NET_MOVEMENT_ROW
    ) {
      return "highlightrow";
    }
    return "";
  }

  // Function to set font weight for table body rows.
  function rowFontWeight(gridRowObjIndex: number, rowType: string) {
    let fontWeight = 400;

    if (
      fontBoldFirstRow &&
      gridRowObjIndex == 0 &&
      rowType == typeOfRow.TR_HEADER_ROW
    ) {
      fontWeight = 700;
    } else if (
      fontBoldLastRow &&
      gridRowObjIndex + 1 == gridData[nestedArrayKey]?.length &&
      rowType == typeOfRow.FOOTER_ROW
    ) {
      fontWeight = 700;
    } else if (
      fontBoldNetRow &&
      gridRowObjIndex + 1 == gridData[nestedArrayKey]?.length &&
      rowType == typeOfRow.NET_MOVEMENT_ROW
    ) {
      fontWeight = 700;
    }

    return { fontWeight: fontWeight };
  }

  function renderDynamicColumn(data: any) {
    if (
      data?.dynamicRowRendering &&
      tableHeaders.some((x: any) => dynamicColumns.includes(x?.headerName))
    ) {
      return true;
    }
    return false;
  }

  return (
    <div className="grid">
      {/* <div className="pt_box"> */}
      <div className="pt_defaulttable_scroll">
        <table className="pt_defaulttable">
          {(!renderOneTableHeader ||
            (renderOneTableHeader && tableIndex == 0)) && (
            <thead>
              <tr className="ledgerJournals_tableContainer__yUCGA">
                {tableHeaders?.length > 0 &&
                  tableHeaders.map((headerObj: any) => renderHeader(headerObj))}
              </tr>
            </thead>
          )}
          <tbody
            onClick={() => onClick && onClick(gridData)}
            className={hoverOnRowClick ? "pointerTable" : ""}
          >
            {gridData[nestedArrayKey]?.length > 0 &&
              gridData[nestedArrayKey].map(
                (gridRowObj: any, gridRowObjIndex: number) => (
                  <>
                    {gridRowObjIndex == 0 && renderStaticFirstRow && (
                      <tr
                        style={rowFontWeight(
                          gridRowObjIndex,
                          typeOfRow.TR_HEADER_ROW
                        )}
                        className={displayTotalRowHighlighted(
                          gridRowObjIndex,
                          typeOfRow.TR_HEADER_ROW
                        )}
                        key={v4()}
                      >
                        {renderRowList?.length > 0 &&
                          renderRowList.map((renderKey: any) => {
                            return (
                              <td
                                className={getDynamicTDClass(renderKey)}
                                style={{
                                  width: "73em",
                                  textAlign: renderKey?.isCenterAligned
                                    ? "center"
                                    : renderKey?.isRightAlign
                                    ? "right"
                                    : "left",
                                }}
                                key={v4()}
                              >
                                {renderKey?.formatDate
                                  ? formatDate(gridData?.[renderKey?.headerKey])
                                  : renderKey?.renderStaticData
                                  ? renderKey?.staticHeaderKey
                                  : gridData?.[renderKey?.headerKey]}
                              </td>
                            );
                          })}
                      </tr>
                    )}
                    <tr style={{ fontWeight: "400" }} key={v4()}>
                      {renderRowList?.length > 0 &&
                        renderRowList.map(
                          (renderKey: any, renderRowKeyIndex: number) => {
                            return (
                              ((renderKey?.dynamicRowRendering &&
                                renderDynamicColumn(renderKey)) ||
                                !renderKey?.dynamicRowRendering) && (
                                <td
                                  className={getDynamicTDClass(renderKey)}
                                  key={v4()}
                                  style={{
                                    fontWeight: renderKey?.boldFont ? 700 : 400,
                                    width: renderKey?.width || "auto",
                                    textAlign: renderKey?.isCenterAligned
                                      ? "center"
                                      : renderKey?.isRightAlign
                                      ? "right"
                                      : "left",
                                  }}
                                  onClick={() =>
                                    renderDynamicRowDatOnClick &&
                                    renderDynamicRowDatOnClick(gridRowObj)
                                  }
                                >
                                  {renderDynamicRowData(
                                    renderKey,
                                    gridRowObj,
                                    renderRowKeyIndex,
                                    gridRowObjIndex
                                  )}
                                </td>
                              )
                            );
                          }
                        )}
                    </tr>
                    {gridRowObjIndex == gridData[nestedArrayKey]?.length - 1 &&
                      renderStaticFooterRow && (
                        <tr
                          style={rowFontWeight(
                            gridRowObjIndex,
                            typeOfRow.FOOTER_ROW
                          )}
                          key={v4()}
                          className={displayTotalRowHighlighted(
                            gridRowObjIndex,
                            typeOfRow.FOOTER_ROW
                          )}
                        >
                          {renderRowList?.length > 0 &&
                            renderRowList.map(
                              (renderKey: any, renderRowKeyIndex: number) => {
                                return (
                                  ((renderKey?.dynamicRowRendering &&
                                    renderDynamicColumn(renderKey)) ||
                                    !renderKey?.dynamicRowRendering) && (
                                    <td
                                      className={getDynamicTDClass(renderKey)}
                                      key={v4()}
                                      style={{
                                        textAlign: renderKey?.isCenterAligned
                                          ? "center"
                                          : renderKey?.isRightAlign
                                          ? "right"
                                          : "left",
                                      }}
                                    >
                                      {renderKey?.resCombinedStaticFooterKey
                                        ? `${
                                            renderKey?.resCombinedStaticFooterKey
                                          } ${gridData?.[renderKey?.footerKey]}`
                                        : renderKey?.formatDate
                                        ? from == "ledger"
                                          ? ""
                                          : formatDate(
                                              gridData?.[renderKey?.headerKey]
                                            )
                                        : renderKey?.staticFooterKey
                                        ? renderKey?.staticFooterKey
                                        : gridData?.[renderKey?.footerKey]}
                                    </td>
                                  )
                                );
                              }
                            )}
                        </tr>
                      )}
                    {gridRowObjIndex == gridData[nestedArrayKey]?.length - 1 &&
                      renderStaticNetFooterRow && (
                        <tr
                          style={rowFontWeight(
                            gridRowObjIndex,
                            typeOfRow.NET_MOVEMENT_ROW
                          )}
                          key={v4()}
                          className={displayTotalRowHighlighted(
                            gridRowObjIndex,
                            typeOfRow.NET_MOVEMENT_ROW
                          )}
                        >
                          {renderRowList?.length > 0 &&
                            renderRowList.map(
                              (renderKey: any, renderRowKeyIndex: number) => {
                                return (
                                  ((renderKey?.dynamicRowRendering &&
                                    renderDynamicColumn(renderKey)) ||
                                    !renderKey?.dynamicRowRendering) && (
                                    <td
                                      className={getDynamicTDClass(renderKey)}
                                      key={v4()}
                                      style={{
                                        textAlign: renderKey?.isCenterAligned
                                          ? "center"
                                          : renderKey?.isRightAlign
                                          ? "right"
                                          : "left",
                                      }}
                                    >
                                      {renderKey?.renderStaticData
                                        ? renderKey?.netMovementKey
                                        : gridData?.[renderKey?.netMovementKey]}
                                    </td>
                                  )
                                );
                              }
                            )}
                        </tr>
                      )}
                  </>
                )
              )}
          </tbody>
        </table>
      </div>
      {/* </div> */}
    </div>
  );
}

const typeOfRow = {
  DYNAMIC_CENTER_ROW: "dynamicRow",
  TR_HEADER_ROW: "headerRow",
  FOOTER_ROW: "footerRow",
  NET_MOVEMENT_ROW: "netMovement",
};
