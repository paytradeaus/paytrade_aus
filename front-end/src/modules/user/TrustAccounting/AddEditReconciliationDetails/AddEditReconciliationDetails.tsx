"use client";

import FormikControl from "@/components/FormikControl";
import { useLoaderContext } from "@/context/useLoader";
import {
  buttonType,
  InputType,
  quickAddRoutes,
} from "@/shared/constant/general";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { Fragment, useEffect, useState } from "react";
import * as Yup from "yup";
import { useFormik } from "formik";
import { isEqual } from "lodash";
import CustomButton from "@/components/CustomButton/CustomButton";
import BaseModal from "@/components/BaseModal";
import { getCookie } from "cookies-next";
import { FetchAllBankAccounts } from "../../AddUpdateBankAccount/AddUpdateBankAccount.function";
import { format, lastDayOfMonth } from "date-fns";
import { formatDollars, getDatePickerFormat } from "@/utils";

import { showErrorToast, showWarningToast } from "@/components/Toaster";
import {
  checkAndGetStatementBalance,
  checkReportExistence,
  editReconciliationReportDetails,
  getTrustAccountingBalanceByAccountId,
  insertReconciliationReportDetails,
  viewReconciliationReportById,
} from "./AddEditReconciliationDetails.functions";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { setReportData } from "@/redux/slices/reconciliationDetails";
import { ApiResponse } from "@/shared/constant/messages";
import TrustAccountGrid from "@/components/TrustAccountGrid/TrustAccountGrid";
import { getLedgerTrialBalanceServices } from "../TrialList/trialList.functions";
import {
  trialListHeaders,
  trialRenderRowData,
} from "../trustAccounting.constant";

export default function AddEditReconciliationDetails(props: any) {
  const { isAdd = false, isView = false, isEdit = false } = props;
  const [routePathStoredData, setRoutePathStoredData] = useState<any>(null);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { reportData }: any = useAppSelector(
    (state: RootState) => state.reportDataDetails
  );

  const queryParams: any = useSearchParams();
  const retrieveAfterAddingQuickRecord: any =
    queryParams.get("retrieve-record");
  const BankAccId = useSearchParams().get("bank") || getCookie("bankId");
  const AdminCompanyId = getCookie("compId");
  const params = useParams();

  const [accountList, setAccountList] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [openWarningModal, setOpenWarningModal] = useState(false);
  const [reportExists, setReportExists] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [data, setData] = useState<any>({});

  const { loader, setLoader, setLoaderInfo }: any = useLoaderContext();

  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [initiaLRender, setInitialRender] = useState(true);
  const [onRouteToBankStatement, setOnRouteToBankStatement] = useState(false);
  const EmptyValue = "$0.00";

  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const [initialPatchedValues, setInitialPatchedValues] = useState<any>({
    AccountName: "",
    MonthEnd: "",
    Adjustments: isEdit ? EmptyValue : "",
    modifiedAdjustments: isEdit ? EmptyValue : "",
    AdjustmentsComments: "",
    BankBalance: isEdit ? EmptyValue : "",
    DepositeBalance: isEdit ? EmptyValue : "",
    LedgerBalance: isEdit ? EmptyValue : "",
    ExpectedBalance: isEdit ? EmptyValue : "",
    isAlreadyExist: false,
  });

  const validationSchema = Yup.object().shape({
    AccountName: Yup.string().required("Account is required"),
    // MonthEnd: Yup.string().required("Reconciliation Record Date is required"),
    MonthEnd: Yup.date()
      .required("Reconciliation Record Date is required")
      .test("is-month-end", "The selected date is not a month end", (value) => {
        if (!value) return true; // Required validation will already handle empty values

        const selectedDate = new Date(value);
        const selectedYear = selectedDate.getFullYear();
        const selectedMonth = selectedDate.getMonth(); // 0-based index (0 = Jan, 1 = Feb, etc.)
        const selectedDay = selectedDate.getDate();

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        // Get the last day of the selected month
        const lastDayOfSelectedMonth = new Date(
          selectedYear,
          selectedMonth + 1,
          0
        ).getDate();

        // Validate only if it's the current month
        if (
          selectedYear === currentYear &&
          selectedMonth === currentMonth &&
          selectedDay !== lastDayOfSelectedMonth
        ) {
          return false; // Fails validation
        }
        return true; // Passes validation
      }),
    Adjustments: Yup.string(),
    modifiedAdjustments: Yup.string(),
    AdjustmentsComments: Yup.string(),
    isAlreadyExist: Yup.boolean(),
  });

  useEffect(() => {
    if (
      retrieveAfterAddingQuickRecord == quickAddRoutes.RETRIEVE_RECONCILIATION
    ) {
      getStoredFormData();
    }
  }, []);

  useEffect(() => {
    if (
      Object.keys(reportData ? reportData : {}).length > 0 &&
      selectedAccount?.value &&
      !isEdit &&
      !isView
    ) {
      onStatementChange(reportData?.MonthEnd);
    }
  }, [selectedAccount]);

  useEffect(() => {
    if (onRouteToBankStatement) {
      return;
    }
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
          label: data?.account_name,
          value: data?.bank_account_id.toString(),
          type: data?.account_type,
        }));
        setAccountList(customOption);
        if (BankAccId) {
          const matchingAccount = customOption.find(
            (option: { value: any }) => option.value === BankAccId
          );

          if (matchingAccount) {
            setSelectedAccount(matchingAccount);
            formik.setFieldValue("AccountName", matchingAccount.value);
          }
        }
        if (reportData?.AccountName && customOption?.length > 0) {
          const matchingAccount = customOption?.find(
            (account: { value: string; label: string }) =>
              account?.value === reportData?.AccountName
          );

          if (matchingAccount) {
            setSelectedAccount(matchingAccount);
            formik.setFieldValue("AccountName", matchingAccount.value);
          }
        }
      }
    })();
  }, [AdminCompanyId, selectedCompanyId, reportData]);

  useEffect(() => {
    (async () => {
      try {
        if (params?.id) {
          setLoader(true);
          const payload: any = {
            id: params.id || "",
          };
          const resAuditData: any = await viewReconciliationReportById(payload); // Replace this with the actual service function to view the audit report by ID
          if (resAuditData?.id) {
            setEditData(resAuditData);
          } else {
            showWarningToast("No data in this id");
            router.back();
          }
          setLoader(false);
        }
      } catch {}
    })();
  }, [params?.id]);

  useEffect(() => {
    if (
      (!isAdd && editData?.id) ||
      routePathStoredData?.quickAddFromReconciliation
    ) {
      const formData = routePathStoredData?.quickAddFromReconciliation
        ? routePathStoredData
        : editData;
      const fetchedDataSet = {
        AccountName:
          formData?.AccountName || formData?.bank_account_id?.toString(),
        MonthEnd:
          formData?.MonthEnd ||
          getDatePickerFormat(
            formData?.audit_date || formData?.month_end_date,
            true
          ),
        Adjustments:
          formData?.Adjustments || formData?.adjustments || EmptyValue,
        modifiedAdjustments:
          formData?.modifiedAdjustments || formData?.adjustments || EmptyValue,
        AdjustmentsComments:
          formData?.AdjustmentsComments || formData?.adjustment_comment,
        BankBalance:
          formData?.BankBalance ||
          formData?.bank_statement_balance ||
          EmptyValue,

        DepositeBalance:
          formData?.DepositeBalance ||
          formData?.deposit_withdrawal_balance ||
          EmptyValue,

        LedgerBalance:
          formData?.LedgerBalance ||
          formData?.account_ledger_balance ||
          EmptyValue,
        ExpectedBalance:
          formData?.ExpectedBalance || formData?.expected_balance || EmptyValue,
        isAlreadyExist: formData?.isAlreadyExist ?? false,
      };

      formik.setValues(fetchedDataSet);
      setInitialPatchedValues(fetchedDataSet);
      const selectedBank = accountList.find(
        (each: any) =>
          each.value ===
          (formData?.AccountName ?? formData?.bank_account_id?.toString())
      );
      setSelectedAccount(selectedBank);
    }
  }, [editData, routePathStoredData]);

  const formik: any = useFormik({
    initialValues: {
      AccountName: "",
      MonthEnd: reportData?.MonthEnd || "",
      Adjustments: reportData?.Adjustments || "",
      modifiedAdjustments: reportData?.modifiedAdjustments || "",
      AdjustmentsComments: reportData?.AdjustmentsComments || "",
      BankBalance: "",
      DepositeBalance: "",
      LedgerBalance: "",
      ExpectedBalance: "",
      isAlreadyExist: false,
    },
    validationSchema,
    onSubmit: () => handleSubmit(),
  });

  async function handleSubmit() {
    const { values }: any = formik || {};
    if (formik.values.isAlreadyExist) {
      showErrorToast("Report for the specified month end already exists");
      return;
    }
    setLoader(true);
    try {
      if (reportExists) {
        setOpenWarningModal(true);
      } else {
        const selectedDate = values.MonthEnd ? new Date(values.MonthEnd) : null;
        const monthEndDate = selectedDate ? lastDayOfMonth(selectedDate) : null;

        const formattedMonthEndDate = monthEndDate
          ? format(monthEndDate, "yyyy-MM-dd")
          : null;

        let payload: any = {
          company_id: AdminCompanyId
            ? Number(AdminCompanyId)
            : selectedCompanyId || null,
          bank_account_id: Number(values?.AccountName),
          month_end_date: formattedMonthEndDate,
          bank_statement_balance: values?.BankBalance
            ? getFormattedValue(values?.BankBalance)
            : 0,
          adjustments: values?.Adjustments
            ? getFormattedValue(values.Adjustments)
            : 0,
          adjustment_comment: values.AdjustmentsComments,
          expected_balance: values?.ExpectedBalance
            ? getFormattedValue(values.ExpectedBalance)
            : 0,
          deposit_withdrawal_balance: values?.DepositeBalance
            ? getFormattedValue(values.DepositeBalance)
            : 0,
          account_ledger_balance: values?.LedgerBalance
            ? getFormattedValue(values.LedgerBalance)
            : 0,
          reconcile_status: getReconcileStatus(),
        };

        if (isEdit && editData?.id) {
          setLoaderInfo("Updating reconciliation report...");
          payload.id = editData?.id;
          const response = await editReconciliationReportDetails(payload);
          if (response) {
            router.push(
              `/user/trust-accounting/reconciliation-record?bank=${payload?.bank_account_id}`
            );
          }
        } else {
          setLoaderInfo("Saving reconciliation report...");
          const response = await insertReconciliationReportDetails(payload);
          if (response) {
            router.push(
              `/user/trust-accounting/reconciliation-record?bank=${payload?.bank_account_id}`
            );
          }
        }
      }
    } catch {
      // Optionally, set an error state or display an error message to the user
    } finally {
      setLoader(false);
      setLoaderInfo("");
    }
  }

  function handlePageConfirmSave() {
    formik?.handleSubmit();
    setDisplayClosePageConfirmation(false);
    return true;
  }

  async function onStatementChange(value: any) {
    if (!selectedAccount?.value) return;

    const bank_account_id = Number(selectedAccount?.value);

    // Ensure value is a valid date
    const selectedDate = value ? new Date(value) : null;
    // Calculate the last date of the month

    const monthEndDate = selectedDate ? lastDayOfMonth(selectedDate) : null;

    const formattedMonthEndDate = monthEndDate
      ? format(monthEndDate, "yyyy-MM-dd")
      : null;

    formik.setFieldValue("MonthEnd", value);

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (!formattedMonthEndDate) return;

    const reportsData = {
      bank_account_id: Number(bank_account_id),
      month_end_date: formattedMonthEndDate,
      timezone,
    };

    const [result, statementBalanceResult, depoiteLedgerValues] =
      await Promise.all([
        checkReportExistence(reportsData, setLoading),
        checkAndGetStatementBalance(reportsData, setLoading),
        getTrustAccountingBalanceByAccountId(reportsData, setLoading),
      ]);

    if (result) {
      formik.setFieldValue("isAlreadyExist", true);
      showErrorToast("Report for the specified month end already exists");
    } else {
      formik.setFieldValue("isAlreadyExist", false);
    }

    if (
      statementBalanceResult &&
      statementBalanceResult?.checkAndGetStatementBalance?.status === "SUCCESS"
    ) {
      setReportExists(false);
      setOpenWarningModal(false);
      formik.setFieldValue(
        "BankBalance",
        statementBalanceResult?.checkAndGetStatementBalance?.data?.value
      );
      formik.setFieldValue(
        "ExpectedBalance",
        statementBalanceResult?.checkAndGetStatementBalance?.data?.value
      );
      formik.setFieldValue("modifiedAdjustments", "");
      formik.setFieldValue("Adjustments", ""); // Clear formatted value
    } else {
      setReportExists(true);
      setOpenWarningModal(true);
      formik.setFieldValue("BankBalance", EmptyValue);
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
      formik.setFieldValue("DepositeBalance", depositeObj?.value);
      const ledgerObj = {
        name: depositLedgerData?.unformatted_account_ledger_balance,
        value: depositLedgerData?.formatted_account_ledger_balance,
      };
      formik.setFieldValue("LedgerBalance", ledgerObj?.value);
    } else {
      formik.setFieldValue("DepositeBalance", EmptyValue);
      formik.setFieldValue("LedgerBalance", EmptyValue);
      setOpenWarningModal(true);
    }
  }

  function handleCancel() {
    if (isEqual(initialPatchedValues, formik.values) || isView) {
      handleFormCancelClick();
    } else {
      setDisplayClosePageConfirmation(true);
    }
  }

  const handleFormCancelClick = () => {
    router.push(AppRoutes.USER_TRUST_ACCOUNTING_RECONCIALIATION_RECORD);
  };

  const getFormattedValue = (value: any) => {
    if (!value) return 0; // Return 0 for empty or null input
    return parseFloat(value.replace(/[$,]/g, "")) || 0;
  };

  const getReconcileStatus = () => {
    const rawDepositeBalance = formik?.values?.DepositeBalance
      ? getFormattedValue(formik?.values?.DepositeBalance)
      : 0;
    const rawLedgerBalance = formik?.values?.LedgerBalance
      ? getFormattedValue(formik?.values?.LedgerBalance)
      : 0;
    const rawExpectedValue = formik?.values?.ExpectedBalance
      ? getFormattedValue(formik?.values?.ExpectedBalance)
      : 0;

    if (
      rawExpectedValue === rawDepositeBalance &&
      rawDepositeBalance === rawLedgerBalance
    ) {
      return "Balanced";
    } else {
      return rawExpectedValue != null &&
        rawDepositeBalance != null &&
        rawLedgerBalance != null
        ? "Unbalanced"
        : "";
    }
  };

  const handleAdjustmentsChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    let { value } = event.target;
    const isNegative = value.trim().startsWith("-"); // Allow negative adjustments
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters
    // Get the bank balance and adjustments as numbers
    const bankBalance = getFormattedValue(formik.values.BankBalance);

    if (rawValue === "") {
      // Keep a lone "-" so the user can finish typing a negative value
      const partialValue = isNegative ? "-" : "";
      formik.setFieldValue("modifiedAdjustments", partialValue);
      formik.setFieldValue("Adjustments", partialValue); // Clear formatted value

      const ExpectedBalanceValue = bankBalance
        ? `$${bankBalance.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : EmptyValue;
      formik.setFieldValue("ExpectedBalance", ExpectedBalanceValue);
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

    const formattedValue =
      (isNegative ? "-" : "") + formatDollars(finalValue); // Assuming formatDollars is a function
    formik.setFieldValue("modifiedAdjustments", formattedValue);
    formik.setFieldValue("Adjustments", formattedValue); // Formatted value with dollar sign
    const adjustments = getFormattedValue(formattedValue);

    // Calculate the expected balance
    const expectedBalance = bankBalance
      ? bankBalance + adjustments
      : adjustments;
    const ExpectedBalanceValue = expectedBalance
      ? `$${expectedBalance.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : EmptyValue;

    formik.setFieldValue("ExpectedBalance", ExpectedBalanceValue);
  };

  async function handleAddQuickRecord(route: string) {
    const postData = {
      ...formik?.values,
      quickAddFromReconciliation: true,
    };

    try {
      const res = await fetch("/api/route-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });
      const data = await res.json();

      if (data?.status == ApiResponse.SUCCESS) {
        router.push(route);
      }
    } catch {}
  }

  async function getStoredFormData() {
    try {
      const response = await fetch("/api/route-data");

      const result = await response.json();

      if (result.status == ApiResponse.SUCCESS) {
        setRoutePathStoredData(result?.data);
      }
    } catch {}
  }
  useEffect(() => {
    const fetchLedgerData = async () => {
      try {
        if (formik.values.AccountName && formik.values.MonthEnd) {
          const response = await getLedgerTrialBalanceServices(
            {
              company_id: AdminCompanyId
                ? Number(AdminCompanyId)
                : selectedCompanyId,
              bank_account_id: Number(formik.values.AccountName),
              start_date: formik.values.MonthEnd
                ? format(lastDayOfMonth(formik.values.MonthEnd), "yyyy-MM-dd")
                : null,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            setLoading
          );

          setData(response || []);
        }
      } catch {
        showErrorToast("Failed to fetch trial balance data.");
      } finally {
        setLoading(false);
      }
    };

    fetchLedgerData();
  }, [formik.values.MonthEnd, formik.values.AccountName]);

  async function onAddBankStatement() {
    setOnRouteToBankStatement(true);
    router.push(
      `${AppRoutes.USER_BANK_OVERVIEW_BANK_STATEMENT}?screen=${"add"}&bank=${
        selectedAccount?.value
      }&from=${"reconciliation"}&date=${formik?.values?.MonthEnd}`
    );
    dispatch(setReportData(formik?.values));

    setOpenWarningModal(false);
  }

  return (
    <Fragment>
      <div className="pt_smallbgimage">
        <div className="pt_centered">
          <div className="pt_centeredinner">
            <div className="pt_box_transparent_cp">
              <div className="grid">
                <div className="pt_login">
                  <h4>
                    {isEdit
                      ? "Edit reconciliation record"
                      : isView
                      ? "View reconciliation record"
                      : "Add reconciliation record"}
                  </h4>
                  <FormikControl
                    label="Account"
                    secondLabel={isView || isEdit ? "" : "Add account"}
                    onSecondLabelClick={() =>
                      handleAddQuickRecord(
                        `${AppRoutes.USER_ADD_BANK_ACCOUNTS}?quick-add=${quickAddRoutes.BANK_ACCOUNT}`
                      )
                    }
                    name="Account"
                    id="Account"
                    options={accountList}
                    disabled={isView || isEdit}
                    control={InputType.SELECT}
                    value={formik.values.AccountName}
                    error={formik.errors.AccountName}
                    showError={
                      formik.touched.AccountName && !formik.values.AccountName
                    }
                    required
                    renderKey="label"
                    valueKey="value"
                    placeholder="Select trust account"
                    onBlur={formik.handleBlur}
                    returnSelectedObject
                    onChange={(selectedOption: any) => {
                      setSelectedAccount(selectedOption);
                      formik.setFieldValue(
                        "AccountName",
                        selectedOption?.value
                      );
                      formik.setFieldValue("MonthEnd", "");
                      formik.setFieldValue("BankBalance", EmptyValue);
                      formik.setFieldValue("DepositeBalance", EmptyValue);
                      formik.setFieldValue("LedgerBalance", EmptyValue);
                      formik.setFieldValue("isAlreadyExist", false);
                      formik.setFieldValue("ExpectedBalance", EmptyValue);
                      setReportExists(false);
                      dispatch(setReportData({}));
                    }}
                  />
                  {(isView || isEdit) && (
                    <FormikControl
                      control={InputType.MONTH_YEAR_PICKER}
                      type={InputType.MONTH_YEAR_PICKER}
                      label={"Created"}
                      name={"created"}
                      onChange={() => {}}
                      placeholder="Created date"
                      disableAutoComplete={false}
                      onBlur={formik.handleBlur}
                      value={
                        editData?.report_date
                          ? getDatePickerFormat(editData?.report_date)
                          : ""
                      }
                      disabled
                    />
                  )}
                  <FormikControl
                    control={InputType.MONTH_YEAR_PICKER}
                    type={InputType.MONTH_YEAR_PICKER}
                    label={"Month end"}
                    name={"MonthEnd"}
                    error={formik.errors.MonthEnd}
                    showError={
                      formik.touched.MonthEnd && formik.errors.MonthEnd
                    }
                    required
                    onChange={
                      (selectedDate: any) => {
                        onStatementChange(selectedDate);
                        setReportExists(false);
                      }
                      // formik.setFieldValue("OpeningDate", selectedDate)
                    }
                    disableAutoComplete={false}
                    disabled={!selectedAccount?.value || isView || isEdit}
                    onBlur={formik.handleBlur}
                    value={formik.values.MonthEnd}
                    maxDate={getDatePickerFormat("", true)}
                    placeholder="Select report month end"
                  />
                  <FormikControl
                    control={InputType.TEXT_FIELD}
                    label={"Bank statement balance"}
                    error={formik.errors.BankBalance}
                    name="Bank statement balance"
                    placeholder="Bank statement balance"
                    id="Bank statement balance"
                    disabled
                    value={formik.values.BankBalance}
                    onBlur={formik.handleBlur}
                    showError={
                      formik.touched.BankBalance && formik.errors.BankBalance
                    }
                    required
                  />
                  <FormikControl
                    control={InputType.TEXT_FIELD}
                    label={"Adjustments"}
                    error={formik.errors.Adjustments}
                    name="Adjustments"
                    placeholder="Please input any required adjustments"
                    id="Adjustments"
                    disabled={isView}
                    value={formik.values.modifiedAdjustments}
                    onChange={handleAdjustmentsChange}
                    onBlur={formik.handleBlur}
                    showError={
                      (formik.touched.modifiedAdjustments &&
                        formik.errors.modifiedAdjustments) ||
                      (formik.touched.Adjustments && formik.errors.Adjustments)
                    }
                  />
                  <FormikControl
                    as="textArea"
                    // placeholder={"Input short project description/summary"}
                    // required
                    label={"Adjustments comments"}
                    name={"comments"}
                    id={"comments"}
                    control={InputType.TEXT_AREA}
                    renderKey="label"
                    valueKey="value"
                    disabled={isView}
                    error={formik.errors.AdjustmentsComments}
                    showError={
                      formik.touched.AdjustmentsComments &&
                      formik.errors.AdjustmentsComments
                    }
                    // onChange={formik.handleChange()}
                    onChange={(e: any) => {
                      let nameTrim = e?.target?.value.trim()
                        ? e?.target?.value
                        : e?.target?.value.trim();
                      formik?.setFieldValue("AdjustmentsComments", nameTrim);
                    }}
                    onBlur={formik.handleBlur("AdjustmentsComments")}
                    value={formik.values.AdjustmentsComments}
                    maxLength={250}
                  />
                  <FormikControl
                    control={InputType.TEXT_FIELD}
                    label={"Expected balance"}
                    name="Expected balance"
                    // error={formik.errors.ExpectedBalanceValue}
                    placeholder="Expected balance"
                    id="Expected balance"
                    disabled
                    value={formik.values.ExpectedBalance}
                    onBlur={formik.handleBlur}
                    required
                  />
                  <FormikControl
                    control={InputType.TEXT_FIELD}
                    label={"Deposit and withdrawal balance"}
                    name="Deposit and withdrawal balance"
                    error={formik.errors.DepositeBalance}
                    placeholder="Deposit and withdrawal balance"
                    id="Deposit and withdrawal balance"
                    disabled
                    value={formik.values.DepositeBalance}
                    onBlur={formik.handleBlur}
                    showError={
                      formik.touched.DepositeBalance &&
                      formik.errors.DepositeBalance
                    }
                    required
                  />
                  <FormikControl
                    control={InputType.TEXT_FIELD}
                    label={"Trust account ledger balance"}
                    name="Trust account ledger balance"
                    error={formik.errors.LedgerBalance}
                    placeholder="Trust account ledger balance"
                    id="Trust account ledger balance"
                    disabled
                    value={formik.values.LedgerBalance}
                    onBlur={formik.handleBlur}
                    showError={
                      formik.touched.LedgerBalance &&
                      formik.errors.LedgerBalance
                    }
                    required
                  />
                  <div className="pt_expandtable">
                    <details>
                      <summary>Trial balance statement</summary>
                      <div className="grid pt_infocol">
                        {data?.trial_balance_list?.length > 0 ? (
                          <TrustAccountGrid
                            tableHeaders={trialListHeaders}
                            gridData={data}
                            renderRowList={trialRenderRowData}
                            fontBoldLastRow
                            nestedArrayKey="trial_balance_list"
                            renderStaticFooterRow
                            hoverOnRowClick
                          />
                        ) : (
                          <p className="emptyMsg">No records to display</p>
                        )}
                      </div>
                    </details>
                  </div>
                  <FormikControl
                    control={InputType.TEXT_FIELD}
                    label={"Reconcile status"}
                    name="Reconcile status"
                    error={formik.errors.variation_name}
                    placeholder="Reconcile status"
                    id="Reconcile status"
                    disabled
                    value={getReconcileStatus()}
                    onBlur={formik.handleBlur}
                    required
                  />
                  <div className="button-container">
                    <CustomButton
                      buttonName={"Cancel"}
                      buttonType={buttonType.OUTLINE_CONTRAST}
                      actionType="button"
                      onClick={handleCancel}
                      inputButton
                      disabled={formik?.isSubmitting}
                    />
                    {!isView && (
                      <CustomButton
                        buttonName={isEdit ? "Update" : "Save"}
                        buttonType={buttonType.SECONDARY}
                        actionType="submit"
                        onClick={() => {
                          formik?.handleSubmit();
                        }}
                        disabled={loader}
                        inputButton
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {openWarningModal && reportExists && !formik?.errors?.MonthEnd && (
        <BaseModal
          modalId={"warning modal"}
          title="Bank Statement Needed"
          displayModal={openWarningModal}
          onClose={(e: any) => {
            if (e) {
              formik.setFieldValue("MonthEnd", "");
              setOpenWarningModal(false);
            }
          }}
          onHeaderIconClose={() => {
            formik.setFieldValue("MonthEnd", "");
            setOpenWarningModal(false);
          }}
          restrictOncloseFunctionInHeader
          onConfirm={() => {
            onAddBankStatement();
            return true;
          }}
          firstButtonName="Cancel"
          secondButtonName="Add bank statement"
        >
          <h4 className="text_center">
            {
              "Please add bank statement for this month end and then return to create the monthly reconciliation report."
            }
          </h4>
        </BaseModal>
      )}

      {displayClosePageConfirmation && (
        <BaseModal
          modalId={"Payment confirmation"}
          displayModal={displayClosePageConfirmation}
          onClose={handleFormCancelClick}
          onHeaderIconClose={() => setDisplayClosePageConfirmation(false)}
          onConfirm={handlePageConfirmSave}
          firstButtonName="Yes"
          secondButtonName="Save"
          restrictOncloseFunctionInHeader
        >
          <h4 className="text_center width_100">
            {" "}
            Are you sure to close and not save?
          </h4>
        </BaseModal>
      )}
    </Fragment>
  );
}
