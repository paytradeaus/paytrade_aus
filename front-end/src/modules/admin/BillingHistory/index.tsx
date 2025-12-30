"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  DateFormat,
  filterByDuration,
  InputType,
} from "@/shared/constant/general";
import React, { useEffect, useState } from "react";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast } from "@/components/Toaster";

import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { fetchFiltersForAdminJournals } from "../AdminJournals/jornalList.functions";
import { getPaymentHistoryByCompanyId } from "@/modules/user/Subscriptions/subscriptions.function";
import { connectWebSocket, formatDate, getDatePickerFormat } from "@/utils";
import {
  billingHistoryHeaders,
  billingHistoryRenderData,
  pdfDataRow,
  pdfHeaders,
} from "./billingHistory.constant";
import {
  billingStatus,
  billingStatusOptions,
} from "@/modules/user/Subscriptions/subscriptions.constants";
import { useSearchParams } from "next/navigation";

function AdminBillingHistory() {
  const queryParams: any = useSearchParams();
  const subscriptionStatus = queryParams.get("status");
  const [billingGridData, setBillingGridData] = useState<any[]>([]);

  const [selectedStatusType, setSelectedStatusType] = useState<any>(null);

  const [totalRows, setTotalRows] = useState(0);

  const [tableLoader, setTableLoader] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [sortValues, setSortValues] = useState<any>("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);

  const [availableCompanyOptions, setAvailableCompanyOptions] = useState<any>(
    []
  );
  const [isComponentMounted, setIsComponentMounted] = useState(false);

  const [selectedCompany, setSelectedCompany] = useState<any>(null);

  const [selectedDate, setSelectedDate] = useState<any>("All dates");

  const [activityLogStartDate, setActivityLogStartDate] = useState(
    getDatePickerFormat()
  );
  const [activityLogEndDate, setActivityLogEndDate] = useState(
    getDatePickerFormat()
  );
  const [isCustomDate, setIsCustomDate] = useState(false);

  useEffect(() => {
    //if subscription status is failed from query params, set dropdown value as failed
    if (subscriptionStatus === "failed") {
      fetchPaymentHistory(1, entriesPerPage, subscriptionStatus);
    }
    setIsComponentMounted(true);
    getExistingCompanyProfiles();
  }, []);

  useEffect(() => {
    if (subscriptionStatus === "failed" && !isComponentMounted) {
      return;
    }
    fetchPaymentHistory(currentPage, entriesPerPage);
  }, [selectedCompany, selectedDate, activityLogStartDate, activityLogEndDate]);

  // Define actions dynamically
  const currentActions = [
    {
      label: "Export to pdf",
      style: "contrast",
      icon: "fa-light fa-file-pdf",
      onClick: (row: any) => handleDownloadPdf(row),
    },
  ];

  function handleDownloadPdf(fileObj: any) {
    const link = document.createElement("a");
    link.href = fileObj?.invoice_pdf; // Replace with your PDF URL
    link.download = `${fileObj.invoice_number}.pdf`; // The name for the downloaded file
    link.click();
  }

  function handleCompanyChange(selectedValue: string) {
    setSelectedCompany(selectedValue);
  }

  function handleStatusChange(selectionOption: any) {
    setSelectedStatusType(
      selectionOption?.value || selectionOption?.label || selectionOption
    );
    setCurrentPage(1);
    fetchPaymentHistory(1, entriesPerPage, selectionOption?.value);
  }

  function handlePageChange(value: any) {
    setCurrentPage(value);
    fetchPaymentHistory(value, entriesPerPage);
  }

  function handleRowsPerPageChange(value: any) {
    setEntriesPerPage(value);
    setCurrentPage(1);
    fetchPaymentHistory(1, value);
  }

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "billing_history",
        company_id: selectedCompany?.value ? +selectedCompany?.value : null,
        page_number: currentPage,
        page_size: entriesPerPage,
        date_filter: selectedDate == "All dates" ? "" : selectedDate,
        start_date: activityLogStartDate,
        end_date: activityLogEndDate,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        status: selectedStatusType == "All" ? null : selectedStatusType,
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

  const handleDownloadPdfFile = async () => {
    setDisablePDFBtn(true);
    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "billing_history",
        company_id: selectedCompany?.value ? +selectedCompany?.value : null,
        page_number: currentPage,
        page_size: entriesPerPage,
        date_filter: selectedDate == "All dates" ? "" : selectedDate,
        start_date: activityLogStartDate,
        end_date: activityLogEndDate,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        status: selectedStatusType == "All" ? null : selectedStatusType,
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  };

  async function fetchPaymentHistory(
    page: number,
    rowsPerPage: number,
    status?: string
  ) {
    const payload = {
      company_id: selectedCompany?.value ? +selectedCompany?.value : null,
      page_number: page,
      page_size: rowsPerPage,
      date_filter: selectedDate == "All dates" ? "" : selectedDate,
      start_date: activityLogStartDate,
      end_date: activityLogEndDate,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      status:
        subscriptionStatus === "failed" && !isComponentMounted
          ? "failed"
          : status == "All"
          ? null
          : status,
      sorting_order: sortValues?.direction || "",
      sorting_field: sortValues?.sortKey || "",
    };

    try {
      setTableLoader(true);
      const paymentHistoryData = await getPaymentHistoryByCompanyId(payload);

      if (paymentHistoryData) {
        const { payment_history, total_count } = paymentHistoryData;
        if (payment_history?.length) {
          setBillingGridData(
            payment_history?.map((obj: any) => {
              return {
                ...obj,
                paid_at: formatDate(obj?.paid_at),
                billingDate: `${
                  obj?.start_date ? formatDate(obj?.start_date) : ""
                } - ${obj?.expiry_date ? formatDate(obj?.expiry_date) : ""}`,
                showValidIcon: obj?.status == billingStatus.PAID,
                showErrorIcon: obj?.status !== billingStatus.PAID,
                status:
                  obj?.status.charAt(0).toUpperCase() + obj?.status.slice(1) ||
                  "",
              };
            })
          ); // Updating the state with the correct type
        } else {
          setBillingGridData([]);
        }
        setTotalRows(total_count);
      }
      setTableLoader(false);
    } catch (error) {
      setTableLoader(false);
    }
  }

  async function getExistingCompanyProfiles() {
    const result = await fetchFiltersForAdminJournals({});
    if (result?.company_list?.length) {
      setAvailableCompanyOptions([
        { name: "All", value: null },
        ...result.company_list,
      ]);
    }
  }

  function handleActivityChange(selectedValue: any) {
    if (selectedDate === "Custom") {
      setActivityLogStartDate(getDatePickerFormat());
      setActivityLogEndDate(getDatePickerFormat());
    }
    setSelectedDate(selectedValue);
    if (selectedValue === "Custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
    }
  }

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <BreadCrumbs
          routePaths={[
            {
              name: "Dashboard",
              path: AppRoutes.ADMIN_DASHBOARD,
            },
          ]}
          activeRoute={"Billing history"}
        />

        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Billing and payment history</h1>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="pt_topfilters">
          <GridExportActions
            pdfFile={{
              fileName: "manage-plans",
              headerRow: pdfHeaders,
              tableData: billingGridData,
              dataRow: pdfDataRow,
            }}
            resetFilterFunction={() => {
              handleStatusChange("All");
              setSelectedDate("All dates");
              setSelectedCompany({
                label: "All",
                value: null,
              });
              setIsCustomDate(false);
            }}
            hideResetButton={
              ((selectedStatusType && selectedStatusType == "All") ||
                !selectedStatusType) &&
              ((selectedCompany && selectedCompany?.label == "All") ||
                !selectedCompany) &&
              selectedDate &&
              selectedDate == "All dates"
            }
            hideExcelButton={billingGridData?.length == 0}
            hidePdfButton={billingGridData?.length == 0}
            handleDownloadExcelFile={() => {
              handleDownloadExcelFile();
            }}
            disabledOnExcel={disableExcelBtn}
            exportFromAPI={true}
            disabledPDF={disablePDFBtn}
            handleDownloadPrintPDF={() => {
              handleDownloadPdfFile();
            }}
          />
        </div>
        <div className="pt_filteroptions">
          <SearchableSelect
            placeholder="Select a company profile"
            name="bankAccounts"
            options={availableCompanyOptions}
            onChange={(value: any) => handleCompanyChange(value)}
            selectedData={selectedCompany}
            renderKey="name"
            valueKey="value"
          />
          <FormikControl
            placeholder={"Select a status"}
            name="status Type"
            options={billingStatusOptions}
            control={InputType.SELECT}
            value={selectedStatusType}
            renderKey="label"
            valueKey="value"
            returnSelectedObject
            onChange={(value: any) => handleStatusChange(value)}
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
        {isCustomDate && (
          <div className="grid">
            <div>
              <FormikControl
                label="From date"
                name="activityLogStartDate"
                control={InputType.DATE_PICKER}
                type="date"
                value={activityLogStartDate}
                onChange={(selectedDate: any) => {
                  if (selectedDate > activityLogEndDate) {
                    setActivityLogStartDate(selectedDate);
                    setActivityLogEndDate(selectedDate);
                  } else {
                    setActivityLogStartDate(selectedDate);
                  }
                }}
                minDate="" // Set any minimum date if needed
                maxDate={activityLogEndDate}
                disabled={false}
              />
            </div>
            <div>
              <FormikControl
                label="To date"
                name="activityLogEndDate"
                type="date"
                control={InputType.DATE_PICKER}
                value={activityLogEndDate}
                onChange={(selectedDate: any) => {
                  // Ensure end date is not before start date
                  if (selectedDate >= activityLogStartDate) {
                    setActivityLogEndDate(selectedDate);
                  }
                }}
                minDate={activityLogStartDate}
                maxDate="" // Set any maximum date if needed
                disabled={false}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={billingHistoryHeaders}
            gridData={billingGridData?.length > 0 ? billingGridData : []}
            gridActions={currentActions}
            displayAllStaticActions
            showLoader={tableLoader}
            loaderColSpan={8}
            renderRowList={billingHistoryRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={(value: any) =>
              handleRowsPerPageChange(value)
            }
            onPageChange={(value: any) => handlePageChange(value)}
            totalEntries={totalRows}
            onSortChange={(sortConfig) => {
              if (billingGridData?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
export default AdminBillingHistory;
