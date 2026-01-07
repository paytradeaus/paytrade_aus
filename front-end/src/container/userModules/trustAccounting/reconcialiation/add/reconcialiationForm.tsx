"use client";
import React, { Fragment, useEffect, useState } from "react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { ExclamationTriangleFill, FilePost } from "react-bootstrap-icons";
import { Button, Container, Form } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import FormButton from "@/components/Button/button";
import customStyles from "./reconcialiationForm.module.scss";
import { ApplicationURLS } from "@/common/applicationURLS";
import { FetchAllBankAccounts } from "@/container/userModules/bankTrustAccount/backTrustAccount.functions";
import { getCookie } from "cookies-next";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import { DD_MM_YYYY } from "@/common/constants/general";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  checkAndGetStatementBalance,
  checkReportExistence,
  editReconciliationReportDetails,
  getTrustAccountingBalanceByAccountId,
  insertReconciliationReportDetails,
  viewReconciliationReportById,
} from "./reconcialiationForm.functions";
import { format } from "date-fns";
import { AppModal } from "@/components/model/model";
import { lastDayOfMonth } from "date-fns";
import { toast } from "react-toastify";
import { useLoaderContext } from "@/context/useLoader";
import { jwtDecode } from "jwt-decode";
import { formatDollars } from "@/common/commonFunctions";
import moment from "moment";

const validationSchema = () =>
  Yup.object().shape({
    AccountName: Yup.object().required("Account is required"),
    MonthEnd: Yup.string().test("unique", "monthend", function (value) {
      const isMonthEndEnabled = this.parent.AccountName;
      if (
        Object.keys(isMonthEndEnabled ? isMonthEndEnabled : {}).length > 0 &&
        !value
      ) {
        return this.createError({ message: "Month End is required" });
      }
      return true;
    }),
    isAlreadyExist: Yup.boolean(),
    Adjustments: Yup.string(),
    modifiedAdjustments: Yup.string(),
    AdjustmentsComments: Yup.string(),
    BankBalance: Yup.object(),
    DepositeBalance: Yup.object(),
    LedgerBalance: Yup.object(),
  });

const ReconcialiationForm = (props: any) => {
  const BankAccId = useSearchParams().get("bank") || getCookie("bankId");
  const AdminCompanyId = getCookie("compId");

  const { isEdit = false, isView = false, ...rest } = props;
  const params = useParams();

  const [accountList, setAccountList] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [openWarningModal, setOpenWarningModal] = useState(false);
  const [reportExists, setReportExists] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const { loader, setLoader }: any = useLoaderContext();

  const selectedCompanyId = Number(getCookie("companyId")) || 0;

  const EmptyObj = { name: "", value: "" };

  const router = useRouter();
  const routePath = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken"); // Adjust according to your token storage
    if (token) {
      const decodedToken: any = jwtDecode(token);
      setRole(decodedToken?.role);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (params?.id) {
          const payload: any = {
            id: params?.id || "",
          };
          const reportData: any = await viewReconciliationReportById(payload);
          if (reportData?.id) {
            setEditData({
              ...reportData,
              adjustments: String(reportData.adjustments),
            });
            const ReporDate: any = reportData?.month_end_date
              ? new Date(reportData?.month_end_date)
              : "";

            const bankacc: any = {
              label: reportData?.account_name,
              value: reportData?.bank_account_id,
            };
            formik.setValues({
              AccountName: bankacc,
              MonthEnd: ReporDate,
              isAlreadyExist: false,
              Adjustments: reportData?.adjustments || "",
              modifiedAdjustments: reportData?.adjustments || "",
              AdjustmentsComments: reportData?.adjustment_comment,
              BankBalance: {
                name: reportData?.bank_statement_balance
                  ? Number(
                      reportData?.bank_statement_balance?.replaceAll(
                        /[$,]/g,
                        ""
                      )
                    )
                  : 0,
                value: reportData?.bank_statement_balance,
              },
              DepositeBalance: {
                name: reportData?.deposit_withdrawal_balance
                  ? Number(
                      reportData?.deposit_withdrawal_balance?.replaceAll(
                        /[$,]/g,
                        ""
                      )
                    )
                  : 0,
                value: reportData?.deposit_withdrawal_balance,
              },
              LedgerBalance: {
                name: reportData?.account_ledger_balance
                  ? Number(
                      reportData?.account_ledger_balance?.replaceAll(
                        /[$,]/g,
                        ""
                      )
                    )
                  : 0,
                value: reportData?.account_ledger_balance,
              },
            });
          } else {
          }
        }
      } catch (error) {
        console.error("Error fetching reconciliation report ID:", error);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const response = await FetchAllBankAccounts({
        company_id: AdminCompanyId ? Number(AdminCompanyId) : selectedCompanyId,
        page: 1,
        items_per_page: null,
        is_alphabetical_order: true,
        account_type: AdminCompanyId
          ? null
          : "Project Trust Account, Retention Trust Account",
      });
      if (response?.extendedBankAccounts?.length > 0) {
        const customOption = response.extendedBankAccounts.map((data: any) => ({
          label: data.account_name,
          value: data.bank_account_id.toString(),
        }));
        setAccountList(customOption);
        if (BankAccId) {
          const matchingAccount = customOption.find(
            (option: { value: any }) => option.value === BankAccId
          );
          // console.log("🚀 ~ matchingAccount:", matchingAccount);
          if (matchingAccount) {
            setSelectedAccount(matchingAccount);
            formik.setFieldValue("AccountName", matchingAccount);
          }
        }
      }
    })();
  }, [AdminCompanyId, selectedCompanyId]);

  const formik = useFormik({
    initialValues: {
      AccountName: "",
      MonthEnd: "",
      isAlreadyExist: false,
      Adjustments: "",
      modifiedAdjustments: "",
      AdjustmentsComments: "",
      BankBalance: { name: 0, value: "" },
      DepositeBalance: { name: 0, value: "" },
      LedgerBalance: { name: 0, value: "" },
    },
    validationSchema,
    onSubmit: async (values) => {
      if (formik.values.isAlreadyExist) {
        toast.error("Report for the specified month end already exists");
        return;
      }
      setLoader(true);
      try {
        if (reportExists) {
          setOpenWarningModal(true);
        } else {
          let payload: any = {
            company_id: AdminCompanyId
              ? Number(AdminCompanyId)
              : selectedCompanyId || null,
            bank_account_id: selectedAccount
              ? Number(selectedAccount?.value)
              : null,
            month_end_date: values.MonthEnd
              ? moment(values.MonthEnd).format("YYYY-MM-DD")
              : "",
            bank_statement_balance: values?.BankBalance?.name
              ? Number(values?.BankBalance?.name)
              : null,
            adjustments:
              values?.Adjustments && values.Adjustments?.replaceAll(/[$]/g, "")
                ? Number(values.Adjustments?.replaceAll(/[$]/g, ""))
                : 0,
            adjustment_comment: values.AdjustmentsComments || "NA",
            expected_balance: expectedBalance,
            deposit_withdrawal_balance: values?.DepositeBalance?.name,
            account_ledger_balance: values?.LedgerBalance?.name,
            reconcile_status: getReconcileStatus(),
          };

          let modifiedPayload: any = {
            id: editData?.id,
            company_id: AdminCompanyId
              ? Number(AdminCompanyId)
              : selectedCompanyId || null,
            bank_account_id: editData?.bank_account_id,
            month_end_date: values.MonthEnd
              ? new Date(values.MonthEnd).toISOString()
              : null,
            bank_statement_balance: values?.BankBalance?.name
              ? Number(values?.BankBalance?.name)
              : null,
            // adjustments:
            //   values?.Adjustments && values.Adjustments?.replaceAll(/[$]/g, "")
            //     ? Number(values.Adjustments?.replaceAll(/[$]/g, ""))
            //     : 0,
            adjustments:
              values?.Adjustments && typeof values.Adjustments === "string"
                ? Number(values.Adjustments.replaceAll(/[$,]/g, ""))
                : 0,

            adjustment_comment: values.AdjustmentsComments || "NA",
            expected_balance: expectedBalance,
            deposit_withdrawal_balance: values?.DepositeBalance?.name,
            account_ledger_balance: values?.LedgerBalance?.name,
            reconcile_status: getReconcileStatus(),
          };

          if (isEdit) {
            const response = await editReconciliationReportDetails(
              modifiedPayload
            );
            if (response) {
              const tabParam = new URLSearchParams({
                tab: "Reconciliation Record",
              }).toString();
              // router.push(
              //   `/user/trust-accounting?${tabParam}&bank=${payload?.bank_account_id}`
              // );
              if (role === "PORTAL ADMIN") {
                router.push(
                  `/admin/journals/trust-accounting?${tabParam}&bank=${payload?.bank_account_id}`
                );
              } else {
                router.push(
                  `/user/trust-accounting?${tabParam}&bank=${payload?.bank_account_id}`
                );
              }
            }
          } else {
            const response = await insertReconciliationReportDetails(payload);
            if (response) {
              const tabParam = new URLSearchParams({
                tab: "Reconciliation Record",
              }).toString();
              if (role === "PORTAL ADMIN") {
                router.push(
                  `/admin/journals/trust-accounting?${tabParam}&bank=${payload?.bank_account_id}`
                );
              } else {
                router.push(
                  `/user/trust-accounting?${tabParam}&bank=${payload?.bank_account_id}`
                );
              }
            }
          }
        }
      } catch (error) {
        console.error("An error occurred during form submission:", error);
        // Optionally, set an error state or display an error message to the user
      } finally {
        setLoader(false); // Re-enable the save button
      }
    },
  });

  const getFormattedValue = (value: any) => {
    // Ensure value is a number, or return 0 if it is invalid
    const numValue = parseFloat(value) || 0;
    return numValue;
  };

  // Get the bank balance and adjustments as numbers
  const bankBalance = getFormattedValue(formik.values.BankBalance?.name);
  const adjustments = getFormattedValue(
    formik.values.Adjustments?.replaceAll(/[$]/g, "")
  );

  // Calculate the expected balance
  const expectedBalance = bankBalance ? bankBalance + adjustments : adjustments;

  const ExpectedBalanceValue = expectedBalance
    ? `$${expectedBalance.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : 0;

  const getReconcileStatus = () => {
    // Parse the required values
    const expectedBalanceValue = expectedBalance ? expectedBalance : 0;

    const depositBalance = formik.values.DepositeBalance?.name
      ? parseFloat(String(formik.values.DepositeBalance?.name))
      : 0;

    const ledgerBalance = formik.values.LedgerBalance?.name
      ? parseFloat(String(formik.values.LedgerBalance?.name))
      : 0;

    if (
      expectedBalanceValue === depositBalance &&
      depositBalance === ledgerBalance
    ) {
      return "Balanced";
    } else {
      return expectedBalanceValue != null &&
        depositBalance != null &&
        ledgerBalance != null
        ? "Unbalanced"
        : "";
    }
  };

  const handleAccountChange = (selected: any) => {
    setSelectedAccount(selected);
    formik.setFieldValue("AccountName", selected);
    formik.setFieldValue("MonthEnd", "");
    formik.setFieldValue("BankBalance", EmptyObj);
    formik.setFieldValue("DepositeBalance", EmptyObj);
    formik.setFieldValue("LedgerBalance", EmptyObj);
    formik.setFieldValue("isAlreadyExist", false);
  };

  const handleCancel = () => {
    const tabParam = new URLSearchParams({
      tab: "Reconciliation Record",
    }).toString();
    if (role === "PORTAL ADMIN") {
      router.push(
        `/admin/journals/trust-accounting?${tabParam}&bank=${getCookie(
          "bankId"
        )}`
      );
    } else {
      router.push(`/user/trust-accounting?${tabParam}`);
    }
  };

  const handleAdjustmentsChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    let { value } = event.target;
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    if (rawValue === "") {
      formik.setFieldValue("modifiedAdjustments", "");
      formik.setFieldValue("Adjustments", ""); // Clear formatted value
      return;
    }

    // Handle leading zeros (ignore for decimal values like "0.1")
    if (
      rawValue.startsWith("0") &&
      rawValue.length > 1 &&
      rawValue[1] !== "."
    ) {
      rawValue = rawValue.slice(1); // Prevent leading zeros
    }

    const decimalParts = rawValue.split(".");

    if (decimalParts.length > 2) {
      return; // Prevent multiple decimal points
    }

    let [integerPart, decimalPart] = decimalParts;

    // Only limit the integer part to 11 digits
    if (integerPart.length > 11) {
      integerPart = integerPart.slice(0, 11);
    }

    if (decimalPart) {
      decimalPart = decimalPart.slice(0, 2); // Limit decimal places to two digits
    }

    let finalValue =
      decimalPart !== undefined ? `${integerPart}.${decimalPart}` : integerPart;

    if (finalValue.replace(".", "").length > 13) {
      return; // Prevent more than 13 characters total (ignoring the decimal)
    }

    const formattedValue = formatDollars(finalValue); // Assuming formatDollars is a function
    formik.setFieldValue("modifiedAdjustments", formattedValue);
    formik.setFieldValue("Adjustments", finalValue); // Formatted value with dollar sign
  };

  async function onStatementChange(value: any) {
    if (selectedAccount) {
      const { value: bank_account_id } = selectedAccount;

      // Ensure value is a valid date
      const selectedDate = value ? new Date(value) : null;
      // Calculate the last date of the month
      const monthEndDate = selectedDate ? lastDayOfMonth(selectedDate) : null;
      const formattedMonthEndDate = monthEndDate
        ? format(monthEndDate, "yyyy-MM-dd")
        : null;
      formik.setFieldValue("MonthEnd", monthEndDate);

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const reportData = {
        bank_account_id: Number(bank_account_id),
        month_end_date: formattedMonthEndDate,
        timezone,
      };

      const [result, statementBalanceResult, depoiteLedgerValues] =
        await Promise.all([
          checkReportExistence(reportData, setLoading),
          checkAndGetStatementBalance(reportData, setLoading),
          getTrustAccountingBalanceByAccountId(reportData, setLoading),
        ]);

      if (result) {
        formik.setFieldValue("isAlreadyExist", true);
        toast.error("Report for the specified month end already exists");
      } else {
        formik.setFieldValue("isAlreadyExist", false);
      }

      if (
        statementBalanceResult &&
        statementBalanceResult?.checkAndGetStatementBalance?.status ===
          "SUCCESS"
      ) {
        setReportExists(false);
        setOpenWarningModal(false);
        formik.setFieldValue(
          "BankBalance",
          statementBalanceResult?.checkAndGetStatementBalance?.data
        );
      } else {
        setReportExists(true);
        setOpenWarningModal(true);
        formik.setFieldValue("BankBalance", EmptyObj);
      }

      if (
        statementBalanceResult &&
        statementBalanceResult?.checkAndGetStatementBalance?.status ===
          "SUCCESS" &&
        depoiteLedgerValues &&
        depoiteLedgerValues?.getTrustAccountingBalanceByAccountId?.status ===
          "SUCCESS"
      ) {
        const depositLedgerData =
          depoiteLedgerValues?.getTrustAccountingBalanceByAccountId?.data;

        const depositeObj = {
          name: depositLedgerData?.unformatted_deposit_and_withdrawal_balance,
          value: depositLedgerData?.formatted_deposit_and_withdrawal_balance,
        };
        formik.setFieldValue("DepositeBalance", depositeObj);
        const ledgerObj = {
          name: depositLedgerData?.unformatted_account_ledger_balance,
          value: depositLedgerData?.formatted_account_ledger_balance,
        };
        formik.setFieldValue("LedgerBalance", ledgerObj);
      } else {
        formik.setFieldValue("DepositeBalance", EmptyObj);
        formik.setFieldValue("LedgerBalance", EmptyObj);

        setOpenWarningModal(true);
      }
    } else {
      formik.setFieldValue("DepositeBalance", EmptyObj);
      formik.setFieldValue("LedgerBalance", EmptyObj);
      formik.setFieldValue("BankBalance", EmptyObj);
    }
  }

  const breadcrumbItems =
    role === "PORTAL ADMIN"
      ? [
          {
            href: ApplicationURLS.ADMIN_DASHBOARD,
            label: "Home",
            active: routePath === ApplicationURLS.ADMIN_DASHBOARD,
          },
          {
            href: "/admin/journals",
            label: "Journals",
            active: routePath === "/admin/journals",
          },
          {
            href: "/admin/journals/trust-accounting",
            label: "Trust Accounting",
            active: routePath === "/admin/journals/trust-accounting",
          },
          {
            href: `/admin/journals/trust-accounting/${
              isView ? "view" : isEdit ? "edit" : "add"
            }`,
            label: isView
              ? "View Reconciliation Record"
              : isEdit
              ? "Edit Reconciliation Record"
              : "Add Reconciliation Record",
            active: routePath.startsWith("/admin/journals/trust-accounting"),
          },
        ]
      : [
          {
            href: "/user/dashboard",
            label: "Home",
            active: routePath === "/user/dashboard",
          },
          {
            href: "/user/trust-accounting",
            label: "Trust Accounting",
            active: routePath === "/user/trust-accounting",
          },
          {
            href: `/user/trust-accounting/${
              isView ? "view" : isEdit ? "edit" : "add"
            }`,
            label: isView
              ? "View Reconciliation Record"
              : isEdit
              ? "Edit Reconciliation Record"
              : "Add Reconciliation Record",
            active: routePath.startsWith("/user/trust-accounting"),
          },
        ];

  return (
    <Fragment>
      <div className={customStyles?.breadcrumb}>
        <ReusableBreadcrumb
          items={breadcrumbItems}
          separator={<span className={customStyles.separatorStyle}>&gt;</span>}
        />
      </div>
      <Container fluid>
        <Form className={customStyles.card} onSubmit={formik.handleSubmit}>
          <FilePost className={customStyles?.profileIcon} />
          <div className="mb-5">
            <h5 className={customStyles.title}>
              Monthly Reconciliation Report
            </h5>
          </div>
          <div className={customStyles.textFieldStyles}>
            <SearchableSelect
              options={accountList}
              onChange={handleAccountChange}
              disabled={isView || isEdit}
              label="Account *"
              placeholder="Select trust account"
              selectedData={formik?.values?.AccountName}
              className={customStyles.textFieldStyles}
              isRequired={
                !!(!formik.values.AccountName && formik.touched.AccountName)
              }
              errorMessage={formik.errors.AccountName}
            />
          </div>
          <div className={customStyles.textFieldStyles}>
            <CustomDatePicker
              showIcon={true}
              label="Month End *"
              toggleCalendarOnIconClick
              placeholderText="Select Report Month End"
              className={
                formik.touched.MonthEnd && formik.errors.MonthEnd
                  ? ` ${customStyles.datePickerError}`
                  : ""
              }
              selected={formik.values.MonthEnd}
              onChange={(e: any) => onStatementChange(e)}
              disabled={!selectedAccount || isView}
              format={DD_MM_YYYY}
              value={formik?.values?.MonthEnd}
              maxDate={new Date()}
              showMonthYearPicker={true}
              renderMonthYearPicker={true}
            />
            {formik.errors.MonthEnd && (
              <div className={customStyles.errorContainer}>
                <ExclamationTriangleFill className={customStyles.error} />
                <span className={customStyles.errorTextStyles}>
                  {formik.errors.MonthEnd}
                </span>
              </div>
            )}
          </div>
          <div className={customStyles.textFieldStyles}>
            <TextField
              type="text"
              labelText="Bank Statement Balance *"
              placeholder=""
              disabled={true}
              value={formik.values.BankBalance?.value || "$0.00"}
              name="BankBalance"
              id="BankBalance"
              endingDataStyles={customStyles.endIconStyle}
            />
          </div>
          <div className={customStyles.textFieldStyles}>
            <TextField
              type="text"
              labelText="Adjustments"
              placeholder="Please Input Any Required Adjustments"
              name="modifiedAdjustments"
              id="modifiedAdjustments"
              inputMode="numeric"
              disabled={isView}
              value={formik.values.modifiedAdjustments}
              onChange={handleAdjustmentsChange}
              onBlur={formik.handleBlur}
              endingDataStyles={customStyles.endIconStyle}
            />
          </div>
          <div className={customStyles.textFieldStyles}>
            <TextField
              type="text"
              as="textarea"
              labelText="Adjustments Comments"
              disabled={isView}
              placeholder="Please Input Reason for Adjustments"
              name="AdjustmentsComments"
              id="AdjustmentsComments"
              value={formik.values.AdjustmentsComments}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              endingDataStyles={customStyles.endIconStyle}
            />
          </div>
          <div className={customStyles.textFieldStyles}>
            <TextField
              type="text"
              labelText="Expected Balance *"
              placeholder=""
              name="ExpectedBalance"
              id="ExpectedBalance"
              disabled={true}
              value={ExpectedBalanceValue ? ExpectedBalanceValue : "$0.00"}
              endingDataStyles={customStyles.endIconStyle}
            />
          </div>
          <div className={customStyles.textFieldStyles}>
            <TextField
              type="text"
              labelText="Deposit and Withdrawal Balance *"
              placeholder=""
              disabled={true}
              name="DepositeBalance"
              id="DepositeBalance"
              value={formik.values.DepositeBalance?.value || "$0.00"}
              endingDataStyles={customStyles.endIconStyle}
            />
          </div>
          <div className={customStyles.textFieldStyles}>
            <TextField
              type="text"
              labelText="Trust Account Ledger Balance *"
              placeholder=""
              disabled={true}
              name="LedgerBalance"
              id="LedgerBalance"
              value={formik.values.LedgerBalance?.value || "$0.00"}
              endingDataStyles={customStyles.endIconStyle}
            />
          </div>
          <div className={customStyles.textFieldStyles}>
            <TextField
              type="text"
              labelText="Reconcile Status *"
              disabled={true}
              placeholder=""
              name="Reconcile"
              id="Reconcile"
              value={getReconcileStatus()}
              endingDataStyles={customStyles.endIconStyle}
            />
          </div>
          {!isView && (
            <FormButton
              className={customStyles.submitButton}
              disabled={loader}
              type="submit"
            >
              {isEdit ? "Update" : "Save"}
            </FormButton>
          )}
          <Button
            className={customStyles.cancelButton}
            type="button"
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </Form>
        <AppModal
          show={openWarningModal}
          onHide={() => setOpenWarningModal(false)}
          firstButtonLabel="Ok"
          modalHeading="Bank Statement Needed"
          modalBodyTitle=""
          modalBodyContent={
            "Please add bank statement for this month end and then return to create the monthly reconciliation report."
          }
          onConfirm={() => setOpenWarningModal(false)}
        />
      </Container>
    </Fragment>
  );
};

export default ReconcialiationForm;
