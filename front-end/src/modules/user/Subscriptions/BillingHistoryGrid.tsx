"use client";
import {
  formatDate,
  getCompanyIdFromStorage,
  getDatePickerFormat,
} from "@/utils";
import React, { Fragment, useEffect, useState } from "react";
import { getPaymentHistoryByCompanyId } from "./subscriptions.function";
import { billingStatus, billingStatusOptions } from "./subscriptions.constants";
import FormikControl from "@/components/FormikControl";
import { filterByDuration, InputType } from "@/shared/constant/general";
import { format } from "date-fns";
import { ApiResponse } from "@/shared/constant/messages";

export default function BillingHistoryGrid() {
  const [billingGridData, setBillingGridData] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState(
    billingStatusOptions[0]?.value
  );
  const [singleActivityDate, setSingleActivityDate] = useState<any>({
    value: "This Month",
    label: "This Month",
  });
  const [activityLogStartDate, setActivityLogStartDate] = useState(
    getDatePickerFormat()
  );
  const [activityLogEndDate, setActivityLogEndDate] = useState(
    getDatePickerFormat()
  );
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [activityDate, setActivityDate] = useState("");

  useEffect(() => {
    fetchPaymentHistory();
  }, [selectedStatus, activityDate, activityLogEndDate, activityLogStartDate]);

  async function fetchPaymentHistory() {
    const payload = {
      company_id: getCompanyIdFromStorage(),
      page_number: 1,
      page_size: 10,
      date_filter: null,
      start_date: null,
      end_date: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: selectedStatus == "All" ? null : selectedStatus,
      sorting_order: "",
      sorting_field: "",
    };

    try {
      const paymentHistoryData = await getPaymentHistoryByCompanyId(payload);

      if (paymentHistoryData) {
        const { payment_history } = paymentHistoryData;
        setBillingGridData(payment_history); // Updating the state with the correct type
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
    }
  }

  const handleActivityChange = (selectedValue: any) => {
    setSingleActivityDate(selectedValue);
    if (selectedValue === "Custom") {
      setIsCustomDate(true);
    } else {
      setIsCustomDate(false);
    }
    setActivityDate(selectedValue); // Perform any other actions based on the selected value
  };

  function handleDownloadPdf(fileObj: any) {
    const link = document.createElement("a");
    link.href = fileObj?.invoice_pdf; // Replace with your PDF URL
    link.download = `${fileObj.invoice_number}.pdf`; // The name for the downloaded file
    link.click();
  }

  return (
    <Fragment>
      <div className="grid">
        <div>
          <FormikControl
            placeholder={"Activity Range"}
            name="Activity Range"
            options={filterByDuration}
            onChange={handleActivityChange}
            control={InputType.SELECT}
            value={singleActivityDate}
            renderKey="label"
            valueKey="value"
            // disabled={!billingGridData?.length}
          />
        </div>

        <FormikControl
          control={InputType.SELECT}
          options={billingStatusOptions}
          name={"status"}
          placeholder={"Select a status"}
          onChange={(e: any) => setSelectedStatus(e)}
          value={selectedStatus}
          renderKey="label"
          valueKey="value"
          // disabled={!billingGridData?.length}
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
              maxDate={format(new Date(activityLogEndDate), "yyyy-MM-dd")}
              // disabled={false}
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
      <div className="grid">
        <div className="pt_defaulttable_scroll">
          <table className="pt_defaulttable">
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice Number</th>
                {/* <th>Card</th> */}
                <th>Billing Period</th>
                <th>Payment Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Export</th>
              </tr>
            </thead>
            <tbody>
              {billingGridData?.length > 0 ? (
                billingGridData.map((billingDataObj: any) => (
                  <tr key={billingDataObj?.subscription_id}>
                    <td>
                      {billingDataObj?.paid_at
                        ? formatDate(billingDataObj?.paid_at)
                        : ""}
                    </td>
                    <td>{billingDataObj?.invoice_number || ""}</td>

                    <td>
                      {`${
                        billingDataObj?.start_date
                          ? formatDate(billingDataObj?.start_date)
                          : ""
                      } - ${
                        billingDataObj?.expiry_date
                          ? formatDate(billingDataObj?.expiry_date)
                          : ""
                      }` || ""}
                    </td>
                    <td>{billingDataObj?.payment_method}</td>
                    <td>{billingDataObj?.amount_paid}</td>

                    <td
                      className={
                        billingDataObj?.status == billingStatus.PAID
                          ? "valid"
                          : "invalid"
                      }
                    >
                      {billingDataObj?.status.charAt(0).toUpperCase() +
                        billingDataObj?.status.slice(1) || ""}
                    </td>
                    <td>
                      <a
                        data-tooltip={"Export to pdf"}
                        data-placement="left"
                        onClick={(e: any) => e?.preventDefault()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering row click

                            handleDownloadPdf(billingDataObj);
                          }}
                        >
                          <i className="fa-light fa-file-pdf"></i>
                        </button>
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="
                "
                  >
                    <article className={`table-loader`}>
                      {ApiResponse.NO_RECORDS_TO_DISPLAY}
                    </article>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Fragment>
  );
}
