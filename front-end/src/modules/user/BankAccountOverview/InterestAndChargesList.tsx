import CustomButton from "@/components/CustomButton/CustomButton";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { buttonType, InputType } from "@/shared/constant/general";
import Link from "next/link";
import React, { Fragment, useEffect, useState } from "react";
import { useBankAccountOverviewContext } from "./BankAccountOverviewContext";
import { format, isValid } from "date-fns";
import {
  interestAndChargesArchiveHeaders,
  interestAndChargesHeaders,
  interestChargesExcelColumnNames,
  interestChargesRenderData,
  interestChargesTab,
  interestChargesTabOptions,
  interestStatusDropdownOptions,
  PAYMENT_TYPES,
} from "./BankAccountOverview.constants";
import { filterByDuration } from "@/shared/constant/data";
import { connectWebSocket, formatDate, getCompanyIdFromStorage } from "@/utils";
import {
  DeletePayments,
  fetchAllPayments,
} from "./BankAccountsOverview.function";
import TabSwitch from "@/components/TabSwitch";
import { tabOptions } from "../BankAccounts/bankAccount.constant";
import { useDispatch, useSelector } from "react-redux";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { useRouter } from "next/navigation";
import BaseModal from "@/components/BaseModal";
import { RootState } from "@/redux/store";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";

export default function InterestAndChargesList() {
  const { getBankAccountId, setRefreshOverview }: any =
    useBankAccountOverviewContext();

  const dispatch = useDispatch();
  const router = useRouter();
  const screenDetails: any = useSelector(
    (state: RootState) => state.dashBoard.screenDetails
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchValue, setSearchValue] = useState("");
  const [selectedDate, setSelectedDate] = useState<any>("All");
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);
  const [activityLogStartDate, setActivityLogStartDate] = useState<
    Date | null | any
  >(new Date(new Date().setHours(0, 0, 0, 0)));
  const [activityLogEndDate, setActivityLogEndDate] = useState<
    Date | null | any
  >(new Date(new Date().setHours(23, 59, 59, 999)));
  const [selectedInterestStatus, setSelectedInterestStatus] = useState("All");
  const [loader, setLoader] = useState(false);
  const [activeInterestTab, setActiveInterestTab] = useState<any>(
    screenDetails?.selectTab || interestChargesTab.CURRENT
  );
  const [sortValues, setSortValues] = useState<any>("");
  const [interestPaymentData, setInterestPaymentData] = useState<any>();
  const [totalRows, setTotalRows] = useState<number>(0);
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const [gridRowData, setGridRowData] = useState<any>(null);

  useEffect(() => {
    getAllPaymentList();
  }, [
    searchValue,
    selectedDate,
    selectedInterestStatus,
    activeInterestTab,
    sortValues,
  ]);

  const gridActions: any = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: buttonType.PRIMARY,
      onClick: (row: any, index: number) => {
        router.push(
          `${AppRoutes.USER_VIEW_INTEREST_CHARGES_OTHER_PAYMENT}/${row.payment_id}`
        );
      },
      displayByDefault: true,
    },

    {
      label: "Delete",
      icon: "fa-light fa-trash",
      style: buttonType.CONTRAST,
      onClick: (row: any) => {
        {
          setGridRowData(row);
          setDisplayConfirmationModal(true);
        }
      },
      conditionalApiDisplayKey: "delete",
    },
  ];

  function handleSearch(searchedValue: any) {
    if (currentPage != 1) {
      setCurrentPage(1);
    }
    if (entriesPerPage != 10) {
      setEntriesPerPage(10);
    }
    setSearchValue(searchedValue);
  }

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
    getAllPaymentList(value, entriesPerPage);
  }

  function handleRowsPerPageChange(value: any) {
    setEntriesPerPage(value);
    setCurrentPage(1);
    getAllPaymentList(1, value);
  }

  async function getAllPaymentList(pageCount?: any, rowsPerPage?: any) {
    setLoader(true);
    const payload = {
      payment_type: PAYMENT_TYPES,
      bank_account_id: getBankAccountId(),
      page_number: pageCount ?? currentPage,
      page_size: rowsPerPage ?? entriesPerPage,
      company_id: getCompanyIdFromStorage() || null,
      keyword: searchValue ?? null,
      status:
        activeInterestTab === "archivedAccounts"
          ? "Void"
          : selectedInterestStatus === "All"
          ? ""
          : selectedInterestStatus || null,
      start_date: isCustomDate ? activityLogStartDate : null,
      end_date: isCustomDate ? activityLogEndDate : null,
      date_filter: selectedDate === "All" ? "" : selectedDate,
      sorting_field: sortValues?.sortKey || "",
      sorting_order: sortValues?.direction || "",
    };
    let response = await fetchAllPayments(payload);
    setInterestPaymentData(response?.payments);

    setTotalRows(response?.total_count);
    setLoader(false);
    if (emptySearchField) {
      setEmptySearchField(false);
    }

    let printDataObjCreation = response?.payments?.map((item: any) => {
      return {
        payment_type: item?.payment_type,
        payment_date: item?.payment_date
          ? formatDate(item?.payment_date)
          : "N/A",
        payment_amount:
          `$ ${Math.abs(item.payment_amount).toFixed(2)}` || "$0.00",
        status: item?.status,
      };
    });

    setPrintDocumentData(printDataObjCreation);
  }

  function handleResetFilters() {
    setSelectedInterestStatus("");
    setSelectedDate("All");
    setEmptySearchField(true);
    setIsCustomDate(false);
    setActivityLogStartDate(new Date(new Date().setHours(0, 0, 0, 0)));
    setActivityLogEndDate(new Date(new Date().setHours(23, 59, 59, 999)));
  }

  function handleAddOtherPayments() {
    dispatch(
      setScreenDetails({
        fromScreen: "bankOverView",
        toScreen: "Interest and Charges",
        mainActiveTab: "",
        selectTab: activeInterestTab,
        subSelectTab: "",
      })
    );
    router.push(
      `${AppRoutes.USER_ADD_INTEREST_CHARGES_OTHER_PAYMENT}?bid=${Number(
        getBankAccountId()
      )}`
    );
  }

  async function handleDeleteInterestCharges() {
    try {
      setLoader(true);
      const payload = {
        payment_id: gridRowData?.payment_id,
        status: "Deleted",
      };
      const response = await DeletePayments(payload);
      if (response) {
        getAllPaymentList();
        setRefreshOverview(new Date().getTime());
      }
      setDisplayConfirmationModal(false);
      setLoader(false);
    } catch (error: any) {
      setLoader(false);
    }
  }

  const handleDownloadPdfFile = async () => {
    setDisablePDFBtn(true);

    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "interest_charges",
        payment_type: PAYMENT_TYPES,
        bank_account_id: getBankAccountId(),
        page_number: currentPage,
        page_size: entriesPerPage,
        company_id: getCompanyIdFromStorage() || null,
        keyword: searchValue ?? null,
        status:
          activeInterestTab === "archivedAccounts"
            ? "Void"
            : selectedInterestStatus === "All"
            ? ""
            : selectedInterestStatus || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
        date_filter: selectedDate === "All" ? "" : selectedDate,
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  };

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "interest_charges",
        payment_type: PAYMENT_TYPES,
        bank_account_id: getBankAccountId(),
        page_number: currentPage,
        page_size: entriesPerPage,
        company_id: getCompanyIdFromStorage() || null,
        keyword: searchValue ?? null,
        status:
          activeInterestTab === "archivedAccounts"
            ? "Void"
            : selectedInterestStatus === "All"
            ? ""
            : selectedInterestStatus || null,
        start_date: isCustomDate ? activityLogStartDate : null,
        end_date: isCustomDate ? activityLogEndDate : null,
        date_filter: selectedDate === "All" ? "" : selectedDate,
      });

      if (responseFileURL) {
        await downloadExcelFileFromAPI(responseFileURL);
      } else {
        showErrorToast("Failed to generate Excel file URL");
      }
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisableExcelBtn(false);
    }
  };

  return (
    <Fragment>
      <div className="pt_pageactions">
        <CustomButton
          buttonType={buttonType.SECONDARY}
          actionType={"button"}
          buttonName={"Add interest and charges"}
          iconClassName="fa-light fa-hexagon-plus"
          onClick={handleAddOtherPayments}
        />
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters">
          <div className="pt_filters">
            <div role="group">
              <TabSwitch
                tabOptions={interestChargesTabOptions}
                onChange={(value: any) => {
                  setActiveInterestTab(value);
                }}
                tabValue={activeInterestTab}
              />
            </div>
          </div>
          <div className="pt_pageactions">
            <div className="actionbuttons">
              <GridExportActions
                excelFile={{
                  sheetName: "interest and charges list",
                  tableData: printDocumentData,
                  LabelAndValueKey: interestChargesExcelColumnNames,
                }}
                resetFilterFunction={() => handleResetFilters()}
                hideExcelButton={printDocumentData.length === 0}
                hidePdfButton={printDocumentData.length === 0}
                hideResetButton={
                  !searchValue &&
                  (!selectedInterestStatus ||
                    selectedInterestStatus == "All") &&
                  selectedDate == "All"
                }
                exportFromAPI={true}
                disabledPDF={disablePDFBtn}
                handleDownloadExcelFile={() => {
                  handleDownloadExcelFile();
                }}
                handleDownloadPrintPDF={() => {
                  handleDownloadPdfFile();
                }}
              />
            </div>
          </div>
        </div>
        <div className="pt_filteroptions">
          <FormikControl
            control={InputType.SEARCH}
            placeholder={"Search by type"}
            onChange={(value: any) => handleSearch(value)}
            clearSearch={emptySearchField}
          />

          {activeInterestTab == interestChargesTab.CURRENT && (
            <FormikControl
              placeholder={"All status"}
              name="All status"
              options={interestStatusDropdownOptions}
              onChange={(value: any) => setSelectedInterestStatus(value)}
              control={InputType.SELECT}
              value={selectedInterestStatus}
              renderKey="label"
              valueKey="value"
            />
          )}
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
        headers={
          activeInterestTab === "archivedAccounts"
            ? interestAndChargesArchiveHeaders
            : interestAndChargesHeaders
        }
        gridData={interestPaymentData ?? []}
        renderRowList={interestChargesRenderData}
        showLoader={loader}
        gridActions={
          activeInterestTab === "archivedAccounts"
            ? [gridActions[0]]
            : gridActions
        }
        onRowClick={(data: any) => {
          router.push(
            `${AppRoutes.USER_VIEW_INTEREST_CHARGES_OTHER_PAYMENT}/${data.payment_id}`
          );
        }}
        loaderColSpan={5}
        dynamicApiGridIconsKey="payment_list_buttons"
        currentPage={currentPage}
        entriesPerPage={entriesPerPage}
        onEntriesPerPageChange={(value: any) => handleRowsPerPageChange(value)}
        onPageChange={(value: any) => handlePageChange(value)}
        totalEntries={totalRows}
        hoverOnRowClick
        onSortChange={(sortConfig) => {
          if (interestPaymentData?.length > 0) {
            setSortValues(sortConfig);
          }
        }}
      />
      {displayConfirmationModal && (
        <BaseModal
          modalId={"interestCharges delete modal"}
          displayModal={displayConfirmationModal}
          onHeaderIconClose={() => setDisplayConfirmationModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setDisplayConfirmationModal(false)}
          onConfirm={() => {
            handleDeleteInterestCharges();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">
            Are you sure you wish to Delete this payment?
          </h4>
        </BaseModal>
      )}
    </Fragment>
  );
}
