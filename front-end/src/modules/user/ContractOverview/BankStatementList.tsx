import CustomButton from "@/components/CustomButton/CustomButton";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import TabSwitch from "@/components/TabSwitch";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  ADD,
  buttonType,
  EDIT,
  InputType,
  TabType,
  VIEW,
} from "@/shared/constant/general";
import { format, isValid } from "date-fns";
import Link from "next/link";
import React, { Fragment, useEffect, useState } from "react";
import {
  bankStatementPdfDataRow,
  bankStatementPdfHeaders,
  bankStatementRenderData,
  bankStatementsHeader,
} from "./ContractOverview.constants";
import { getCompanyIdFromStorage, jsDateConversion } from "@/utils";
import { downloadExcelFileFromAPI, GenerateSignedUrl } from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";
import { DD_MM_YYYY } from "@/shared/constant/identificationNumbers";
import { filterByDuration } from "@/shared/constant/data";
import { useRouter } from "next/navigation";
import { FetchAllBankStatements } from "../BankAccountOverview/BankAccountsOverview.function";
import { useContractOverviewContext } from "./ContractOverviewContext";

export default function BankStatementList() {
  const { getBankAccountId }: any = useContractOverviewContext();
  const [currentPage, setCurrentPage] = useState(1);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchValue, setSearchValue] = useState("");
  const [selectedDate, setSelectedDate] = useState<any>("All");
  const router = useRouter();

  const [emptySearchField, setEmptySearchField] = useState(false);
  const [bankTrustList, setBankTrustList] = useState([]);

  const [bankTrustListTotalCount, setBankTrustListTotalCount] = useState(0);
  const [sortValues, setSortValues] = useState<any>("");
  const [activityLogStartDate, setActivityLogStartDate] = useState<
    Date | null | any
  >(new Date(new Date().setHours(0, 0, 0, 0)));
  const [activityLogEndDate, setActivityLogEndDate] = useState<
    Date | null | any
  >(new Date(new Date().setHours(23, 59, 59, 999)));
  const [loader, setLoader] = useState(false);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);

  useEffect(() => {
    getBankTrustList();
  }, [searchValue, selectedDate, sortValues]);

  function handleSearch(searchedValue: any) {
    if (currentPage != 1) {
      setCurrentPage(1);
    }
    if (entriesPerPage != 10) {
      setEntriesPerPage(10);
    }
    setSearchValue(searchedValue);
  }

  const gridActions: any = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: any, index: number) => {
        router.push(
          `${
            AppRoutes.USER_BANK_OVERVIEW_BANK_STATEMENT
          }?screen=${VIEW}&bank=${getBankAccountId()}&statement=${
            row?.bank_statement_id
          }`
        );
      },
    },
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: any) => {
        router.push(
          `${
            AppRoutes.USER_BANK_OVERVIEW_BANK_STATEMENT
          }?screen=${EDIT}&bank=${getBankAccountId()}&statement=${
            row?.bank_statement_id
          }`
        );
      },
    },
  ];

  function handleActivityChange(selectedValue: any) {
    if (selectedDate === "Custom") {
      setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0)));
      setActivityLogEndDate(new Date(new Date().setHours(23, 59, 59, 999)));
    }
    setSelectedDate(selectedValue);
    if (selectedValue === "Custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
    }
  }

  function handlePageChange(value: any) {
    setCurrentPage(value);
    getBankTrustList(value, entriesPerPage);
  }

  function handleRowsPerPageChange(value: any) {
    setEntriesPerPage(value);
    setCurrentPage(1);
    getBankTrustList(1, value);
  }

  function handleResetFilters() {
    setSelectedDate("All");
    setEmptySearchField(true);
    setIsCustomDate(false);
    setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0)));
    setActivityLogEndDate(new Date(new Date().setHours(23, 59, 59, 999)));
  }

  async function getBankTrustList(pageCount?: number, rowsPerPage?: number) {
    const postData = {
      payload: {
        bank_account_id: getBankAccountId(),
        company_id: getCompanyIdFromStorage(),
        items_per_page: rowsPerPage ?? entriesPerPage,
        status: null,
        search: searchValue,
        page: pageCount ?? currentPage,
        date_filter: selectedDate === "All" ? "" : selectedDate,
        added_date_to: activityLogEndDate,
        added_date_from: activityLogStartDate,
        sorting_field: sortValues?.sortKey || "",
        sorting_order: sortValues?.direction || "",
      },
    };

    setLoader(true);
    const response = await FetchAllBankStatements(postData);

    try {
      if (response) {
        let modifyResponse = [];

        if (response?.bank_statements?.length) {
          modifyResponse = response?.bank_statements.map((x: any) => {
            return {
              ...x,
              statement_date: format(x?.statement_date, DD_MM_YYYY),
              created_on: format(x?.created_on, DD_MM_YYYY),
            };
          });
        }
        setBankTrustList(modifyResponse);
        setBankTrustListTotalCount(response?.total_count);
        setLoader(false);
      } else {
        setLoader(false);
      }
    } catch (err: any) {
      setLoader(false);
    }
  }

  async function handleDownloadExcelFile() {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "bank_statement",
        account_type: null,
        company_id: getCompanyIdFromStorage(),
        search: searchValue || null,
        status: null,
      });

      if (responseFileURL) {
        await downloadExcelFileFromAPI(responseFileURL);
      } else {
        showErrorToast("Failed to generate Excel file URL");
      }
    } catch (error) {
      setDisableExcelBtn(false);
    } finally {
      setDisableExcelBtn(false);
    }
  }

  return (
    <Fragment>
      <div className="pt_pageactions">
        <Link
          href={`${
            AppRoutes.USER_BANK_OVERVIEW_BANK_STATEMENT
          }?screen=${ADD}&bank=${getBankAccountId()}`}
          className="pt_addnewbutton"
        >
          <CustomButton
            buttonType={buttonType.SECONDARY}
            actionType={"button"}
            buttonName={"Add bank statement"}
            iconClassName="fa-light fa-hexagon-plus"
          />
        </Link>
      </div>

      <div className="grid pt_topfilters">
        <div className="pt_filters pt_toggles">
          <div className="pt_filteroptions">
            <FormikControl
              control={InputType.SEARCH}
              placeholder="Search by view"
              onChange={(value: any) => handleSearch(value)}
              clearSearch={emptySearchField}
            />

            <FormikControl
              placeholder={"Activity Range"}
              name="Activity Range"
              options={filterByDuration}
              onChange={handleActivityChange}
              control={InputType.SELECT}
              value={selectedDate}
              renderKey="label"
              valueKey="value"
            />
          </div>
        </div>
        <GridExportActions
          pdfFile={{
            fileName: "bank statements",
            headerRow: bankStatementPdfHeaders,
            tableData: bankTrustList,
            dataRow: bankStatementPdfDataRow,
          }}
          handleDownloadExcelFile={() => {
            handleDownloadExcelFile();
          }}
          disabledOnExcel={disableExcelBtn}
          exportFromAPI={true}
          resetFilterFunction={handleResetFilters}
          hideExcelButton={bankTrustList?.length === 0}
          hidePdfButton={bankTrustList?.length === 0}
          hideResetButton={!searchValue && selectedDate == "All"}
        />
      </div>

      {isCustomDate && (
        <div className="grid">
          <div>
            <FormikControl
              label="From date"
              name="activityLogStartDate"
              control={InputType.DATE_PICKER}
              type="date"
              // value={
              //   activityLogStartDate
              //     ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
              //     : ""
              // }
              value={
                activityLogStartDate && isValid(new Date(activityLogStartDate))
                  ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                  : ""
              }
              onChange={(selectedDate: any) => {
                if (!selectedDate) {
                  setActivityLogStartDate(null);
                  return;
                }
                const fromDate = new Date(
                  new Date(selectedDate).setHours(0, 0, 0, 0)
                );

                if (fromDate > activityLogEndDate) {
                  setActivityLogStartDate(fromDate);
                  // setActivityLogEndDate(fromDate);
                  setActivityLogEndDate(new Date(selectedDate));
                } else {
                  setActivityLogStartDate(fromDate);
                }
              }}
              minDate="" // Set any minimum date if needed
              // maxDate={format(new Date(activityLogEndDate), "yyyy-MM-dd")}
              disabled={false}
            />
          </div>
          <div>
            <FormikControl
              label="To date"
              name="activityLogEndDate"
              type="date"
              control={InputType.DATE_PICKER}
              // value={
              //   activityLogEndDate
              //     ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
              //     : ""
              // }

              value={
                activityLogEndDate && isValid(new Date(activityLogEndDate))
                  ? format(new Date(activityLogEndDate), "yyyy-MM-dd")
                  : ""
              }
              onChange={(selectedDate: any) => {
                if (!selectedDate) {
                  setActivityLogEndDate(null);
                  return;
                }
                const toDate = new Date(
                  new Date(selectedDate).setHours(23, 59, 59, 999)
                );

                // Ensure end date is not before start date
                if (toDate >= activityLogStartDate) {
                  setActivityLogEndDate(toDate);
                }
              }}
              minDate={
                activityLogStartDate
                  ? format(new Date(activityLogStartDate), "yyyy-MM-dd")
                  : ""
              }
              maxDate="" // Set any maximum date if needed
              disabled={false}
            />
          </div>
        </div>
      )}

      <DynamicTable
        headers={bankStatementsHeader}
        gridData={bankTrustList ?? []}
        renderRowList={bankStatementRenderData}
        showLoader={loader}
        gridActions={gridActions}
        loaderColSpan={4}
        currentPage={currentPage}
        entriesPerPage={entriesPerPage}
        onEntriesPerPageChange={(value: any) => handleRowsPerPageChange(value)}
        onPageChange={(value: any) => handlePageChange(value)}
        totalEntries={bankTrustListTotalCount}
        onSortChange={(sortConfig) => {
          if (bankTrustList?.length > 0) {
            setSortValues(sortConfig);
          }
        }}
      />
    </Fragment>
  );
}
