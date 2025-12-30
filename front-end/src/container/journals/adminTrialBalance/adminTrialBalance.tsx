"use client";
import React, { useEffect, useState } from "react";
import { Col, Row } from "react-bootstrap";
import { FileEarmarkExcel, Printer } from "react-bootstrap-icons";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import styles from "./adminTrialBalance.module.scss";
import TrialBalanceTable from "../../userModules/trustAccounting/trial/trialBalanceTable";
import { DD_MM_YYYY } from "@/common/constants/general";
import { getLedgerTrialBalanceServices } from "../../userModules/trustAccounting/trial/trialBalance.funtions";
import {
  convertJsonToExcel,
  customGeneratePDF,
} from "@/common/commonFunctions";
import { usePathname, useSearchParams } from "next/navigation";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";

const TrialBalanceStatement = () => {
  const QueryBankId = useSearchParams().get("bank");
  const routePath = usePathname();

  const [selectedAccountName, setSelectedAccountName] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);

  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (QueryBankId) {
          const response = await getLedgerTrialBalanceServices(
            {
              bank_account_id: QueryBankId ? Number(QueryBankId) : null,
              start_date: selectedDate,
            },
            setLoading
          );

          if (response) {
            setData(response);
            const printDataObjCreation = response?.trial_balance_list?.map(
              (trial: any) => ({
                account_name: trial?.account_name || "",
                closing_balance: trial?.closing_balance || "",
              })
            );
            setPrintDocumentData([
              ...printDataObjCreation,
              {
                account_name: "Balance",
                closing_balance: response?.total_closing_balance,
              },
            ]);
          } else {
            setData([]);
          }
        }
      } catch (error) {
        console.error("Error fetching ledger trial balance data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [QueryBankId, selectedDate]);

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handlePrintPDF = () => {
    // Format the table data for PDF
    const formattedPDFData = () => {
      return printDocumentData?.map((trailBalance: any, index: number) => ({
        data: [
          trailBalance?.account_name || "",
          trailBalance?.closing_balance || "",
        ],
      }));
    };

    // Define header names and styles
    const headerNames = ["Account", "Closing Balance"];
    const columnStyles = {
      // 1: { halign: "right" }, // Right-align the closing balance column
    };

    // Generate and print the PDF
    customGeneratePDF(
      formattedPDFData(),
      headerNames,
      "Trial balance statement",
      true,
      columnStyles, // Pass the column styles
      []
    );
  };

  function downloadExcel() {
    const columnNames = [
      { value: "account_name", label: "Account" },
      { value: "closing_balance", label: "Closing Balance" },
    ];
    convertJsonToExcel(
      printDocumentData,
      "Trial balance statement",
      columnNames
    );
  }

  return (
    <>
      <div className={styles.customSubHeaderCon}>
        <div className={styles.dataContainer}>
          <ReusableBreadcrumb
            items={[
              {
                href: "/admin/dashboard",
                label: "Home",
                active: routePath === "/admin/dashboard",
              },
              {
                href: "/admin/journals",
                label: "Journals",
                active: routePath === "/admin/journals",
              },
              {
                href: "/admin/journals/trial-balance",
                label: "Trial Balance",
                active: routePath === "/admin/journals/trial-balance",
              },
            ]}
            separator={<span className={styles.separatorStyle}>&gt;</span>}
          />
          <div className={styles.headerAndButtonCon}>
            <span className={styles.headerText}>Trial Balance Statement</span>
          </div>
        </div>
        <div className={styles.textAndSelectCon}>
          <Row className="w-100">
            <Col lg="3" className={styles.datepickerCustom}>
              <CustomDatePicker
                showIcon={true}
                maxDate={new Date()}
                toggleCalendarOnIconClick
                placeholderText="&nbsp;From date"
                selected={selectedDate}
                value={selectedDate}
                onChange={handleDateChange}
                disabled={false}
                format={DD_MM_YYYY}
                className={styles.DatePickerCustomStyles}
              />
            </Col>

            <Col lg="8"></Col>
            <Col lg="1">
              {data?.trial_balance_list?.length > 0 && (
                <div className={styles.headerIconCon}>
                  <span
                    className={styles.iconStyles}
                    onClick={() => {
                      if (data?.trial_balance_list?.length > 0) {
                        handlePrintPDF();
                      }
                    }}
                    title="Print PDF"
                  >
                    <Printer />
                  </span>
                  <span
                    className={styles.iconStyles}
                    onClick={() => {
                      if (data?.trial_balance_list?.length > 0) {
                        downloadExcel();
                      }
                    }}
                    title="Export to Excel"
                  >
                    <FileEarmarkExcel />
                  </span>
                </div>
              )}
            </Col>
          </Row>
        </div>
      </div>
      <div className={styles.tableStyles}>
        <TrialBalanceTable data={data} loading={loading} />
      </div>
    </>
  );
};

export default TrialBalanceStatement;
