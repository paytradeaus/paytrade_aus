"use client";
import CustomButton from "@/components/CustomButton/CustomButton";
import FormikControl from "@/components/FormikControl";
import {
  buttonType,
  EDIT,
  InputType,
  quickAddRoutes,
  VIEW,
} from "@/shared/constant/general";
import React, { Fragment, useEffect, useState } from "react";
import { useFormik } from "formik";
import * as yup from "yup";
import { useRouter, useSearchParams } from "next/navigation";
import {
  formatDollars,
  getCompanyIdFromStorage,
  getDatePickerFormat,
  getLastDateOfCurrentMonth,
  removeCommas,
} from "@/utils";
import { getCookie } from "cookies-next";
import {
  addBankAccount,
  FetchAllBankAccounts,
  fetchBankStatementById,
  fetchBankStatementFile,
  updateBankStatement,
  verifyBankStatementExistence,
} from "../BankAccountsOverview.function";
import moment from "moment";
import { DD_MM_YYYY } from "@/shared/constant/identificationNumbers";
import UploadBankStatement from "./UploadBankStatement";
import { useLoaderContext } from "@/context/useLoader";
import { singleUploadApi } from "@/app/api/commonApi";
import { useTokenDetails } from "@/hooks";
import {
  bankOverviewTabs,
  statementStatus,
} from "../BankAccountOverview.constants";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { ApiResponse } from "@/shared/constant/messages";

export default function AddUpdateBankStatement() {
  const router = useRouter();
  const queryParams = useSearchParams();

  const statementId = queryParams.get("statement");
  const bankId = queryParams.get("bank");
  const redirectedFrom = queryParams.get("from");
  const ReconciliationDate = queryParams.get("date");
  const quickAddProject: any = queryParams.get("quick-add");
  const screenType = queryParams.get("screen");
  const routingBack = queryParams.get("routing");
  const AdminCompanyId = getCookie("compId");
  const { setLoader }: any = useLoaderContext();
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const [routedData, setRoutedData] = useState<any>(null);
  const quickAddRecord: any = queryParams.get("quick-add");
  const [bankAccountName, setBankAccountName] = useState<any>([]);
  const [formData, setFormData] = useState<any>(null);
  const [displayUploadStatement, setDisplayUploadStatement] = useState(false);

  const [isViewMode, setIsViewMode] = useState(screenType === VIEW);

  const validationSchema = yup.object().shape({
    account_name: yup.object().required("Account name is required"),

    statement_date: yup
      .string()
      .required("Statement date is required")
      .test("statement date", function (value: any, formData: any) {
        const is_statement_exist = formData.parent.is_statement_exist;
        if (!value) return true; // Handle empty email
        if (is_statement_exist) {
          return formData.createError({
            path: formData.path,
            message: "Selected bank statement date already exist",
          });
        }
        return true;
      })
      .test("is-month-end", "The selected date is not a month end", (value) => {
        if (!value) return false; // Required validation will already handle empty values

        const selectedDate = new Date(value);
        const selectedYear = selectedDate.getFullYear();
        const selectedMonth = selectedDate.getMonth();
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

    bank_statement_balance: yup
      .string()
      .required("Bank statement balance is required"),
    statement_file: yup
      .array()
      .min(1, "Upload is required")
      .required("Upload is required"),
  });

  const formik: any = useFormik({
    initialValues: {
      account_name: "",
      statement_date: "",
      is_statement_exist: false,
      bank_statement_balance: "",
      statement_file: "",
    },
    validationSchema,
    onSubmit: () => handleFormSubmit(),
  });

  useEffect(() => {
    if ((screenType === EDIT || screenType === VIEW) && statementId) {
      getStatementFile();
      getBankStatement();
    }
    getAccountName();

    if (quickAddProject) {
      getOnQuickAddRecord();
    }
  }, []);

  async function getOnQuickAddRecord() {
    try {
      const response = await fetch("/api/route-data");

      const result = await response.json();

      if (result.status == ApiResponse.SUCCESS) {
        setRoutedData(result?.data);
      }
    } catch {}
  }

  useEffect(() => {
    if (redirectedFrom === "reconciliation" || redirectedFrom == "audit") {
      formik.setFieldValue("statement_date", ReconciliationDate);
    }
  }, [redirectedFrom, ReconciliationDate]);

  async function getBankStatement() {
    const postData = {
      payload: {
        bank_account_id: Number(bankId),
        bank_statement_id: Number(statementId),
      },
    };
    try {
      setLoader(true);
      const response: any = await fetchBankStatementById(postData);

      if (response?.bank_account_id) {
        setFormData(response);
        setIsViewMode(
          response?.status === statementStatus.LOCKED || screenType === VIEW
        );
        formik.setFieldValue(
          "statement_date",
          getDatePickerFormat(response?.statement_date, true)
        );
        formik.setFieldValue(
          "bank_statement_balance",
          response?.bank_statement_balance
            ? formatDollars(response?.bank_statement_balance.toString())
            : ""
        );
        setLoader(false);
      }
      setLoader(false);
    } catch {
      setLoader(false);
    }
  }

  async function getStatementFile() {
    const postData = {
      payload: {
        data: {
          bank_statement_id: statementId ? Number(statementId) : null,
        },
        fileAttachmentOrDocumentType: "Bank statement",
      },
    };

    const response = await fetchBankStatementFile(postData);
    if (response?.length > 0) {
      formik?.setFieldValue("statement_file", response);
    }
  }

  async function getAccountName() {
    const postData = {
      is_alphabetical_order: true,
      company_id: AdminCompanyId
        ? Number(AdminCompanyId)
        : Number(getCompanyIdFromStorage()) || "",
    };

    const response: any = await FetchAllBankAccounts(postData);

    const findAccount: any = response?.extendedBankAccounts.find(
      (x: any) => x?.bank_account_id == bankId
    );

    if (response?.extendedBankAccounts?.length > 0) {
      setBankAccountName([findAccount]);

      await formik.setFieldValue("account_name", findAccount ?? "");
    } else {
      setBankAccountName([]);
    }
  }

  async function onStatementChange(value: any) {
    const modifiedDate = value;

    formik.setFieldValue("statement_date", modifiedDate);

    if (!modifiedDate) {
      await formik.setFieldValue("is_statement_exist", false);
      return; // Early return if field is empty
    }

    // Construct POST data object
    const postData = {
      payload: {
        bank_account_id: bankId ? +bankId : 0,
        company_id: Number(getCompanyIdFromStorage()),
        statement_date: `${modifiedDate}-${getLastDateOfCurrentMonth(
          modifiedDate
        )}`,
      },
    };

    // Check data existence using verifyClientSuppliersExistence
    const response = await verifyBankStatementExistence(postData);

    // Update error field based on existence check results
    if (response?.isBankStatementAlreadyExists) {
      const isExistingDate =
        moment(modifiedDate).format(DD_MM_YYYY) ===
        moment(formData?.statement_date).format(DD_MM_YYYY);
      if (screenType === EDIT && isExistingDate) {
        await formik.setFieldValue("is_statement_exist", false);
        return;
      }
      await formik.setFieldValue("is_statement_exist", true);
    } else {
      await formik.setFieldValue("is_statement_exist", false);
    }
  }

  // Main function to handle contract value formatting
  function handleAmountChange(e: any) {
    let { value } = e.target;
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    // Allow clearing the input value (setting to empty)
    if (rawValue === "" || rawValue === "$ ") {
      formik.setFieldValue("bank_statement_balance", "");
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
      return;
    }

    if (decimalPart) {
      decimalPart = decimalPart.slice(0, 2); // Limit decimal places to two digits
    }

    let finalValue =
      decimalPart !== undefined ? `${integerPart}.${decimalPart}` : integerPart;

    if (finalValue.replace(".", "").length > 13) {
      return; // Prevent more than 13 characters total (ignoring the decimal)
    }

    const formattedValue = formatDollars(finalValue); // Assuming formatDollars is a function you have

    // Update form value
    formik.setFieldValue("bank_statement_balance", formattedValue);
  }

  async function handleFormSubmit() {
    const { values } = formik;

    try {
      setLoader(true);
      let fileResponse = null;
      if (screenType === "add") {
        const filePostData: any = {
          uploaded_by: decodeTokenData?.emailId,
          attachment_type: "Bank_statements",
        };

        fileResponse = await singleUploadApi(
          modifiedFileName(),
          filePostData,
          accessTokenId
        );
      }
      const paymentValues = removeCommas(values?.bank_statement_balance);
      const onlyValues = paymentValues.replace(/[^0-9.]/g, "");

      const commonPayload = {
        statement_date: values?.statement_date
          ? `${values?.statement_date}-${getLastDateOfCurrentMonth(
              values?.statement_date
            )}`
          : "",
        bank_statement_balance: onlyValues ? Number(onlyValues) : 0,
        bank_statement_name: values?.statement_file[0]?.name
          ? `PayTrade-${moment().format("DD/MM/YYYY")}-${
              values?.account_name?.account_name
            }-${values?.account_name?.account_number}-${
              values?.statement_file[0]?.name
            }-${values?.statement_date}`
          : formData?.bank_statement_name,
      };

      const addPostData: any = {
        payload: {
          company_id: Number(getCompanyIdFromStorage()) || null,
          bank_account_id: values?.account_name?.bank_account_id,
          bank_statement_attachment_id:
            fileResponse?.id || formData?.bank_statement_id,
          financial_institution: "",
          ...commonPayload,
        },
      };
      const updatePostData: any = {
        payload: {
          bank_statement_attachment_id:
            fileResponse?.id || formData?.bank_statement_attachment_id,
          bank_statement_id: statementId ? Number(statementId) : "",
          ...commonPayload,
        },
      };

      const dynamicApi =
        screenType === EDIT
          ? updateBankStatement(updatePostData)
          : addBankAccount(addPostData);
      const bankStatementResponse = await dynamicApi;
      if (bankStatementResponse) {
        handleClose();
      }
      setLoader(false);
    } catch {
      setLoader(false);
    }
  }

  function modifiedFileName() {
    const { values }: any = formik;

    const fileType = values?.statement_file[0]?.type;
    const fileExtension = fileType.slice(fileType.lastIndexOf("/") + 1);

    const fileName = `${values.account_name.account_name}-statement-${
      moment().month() + 1
    }-${moment().year()}.${fileExtension}`;

    const renamedFile = new File([values?.statement_file[0]], fileName, {
      type: values?.statement_file[0].type,
    });

    return renamedFile;
  }

  function handleClose() {
    if (routingBack) {
      router.back();
    } else if (redirectedFrom === "reconciliation") {
      router.push(AppRoutes.USER_TRUST_ACCOUNTING_RECONCIALIATION_RECORD_ADD);
    } else if (quickAddRecord) {
      if (routedData?.quickAddFromAudit) {
        router.push(
          `${AppRoutes.USER_TRUST_ACCOUNTING_AUDIT_ADD}?retrieve-record=${quickAddRoutes.RETRIEVE_AUDIT}&routedFrom=auditList`
        );
      }
    } else {
      router.push(
        `${
          AppRoutes.USER_BANK_ACCOUNTS_OVERVIEW
        }/${bankId}/${getCompanyIdFromStorage()}?active_tab=${
          bankOverviewTabs.BANK_STATEMENTS
        }`
      );
    }
  }

  return (
    <Fragment>
      <div className="pt_centered">
        <div className="pt_centeredinner">
          <div className="pt_box_transparent">
            <div className="pt_login">
              <h4>
                {isViewMode
                  ? "View bank statement"
                  : screenType === EDIT
                  ? "Edit bank statement"
                  : "Add bank statement"}
              </h4>
              <br />

              <FormikControl
                control={InputType.SELECT}
                label={"Account name"}
                options={bankAccountName}
                name="account_name"
                id="account_name"
                renderKey={"account_name"}
                valueKey={"bank_account_id"}
                required
                value={formik.values.account_name}
                onChange={(option: any) =>
                  formik.setFieldValue("account_name", option)
                }
                returnSelectedObject
                error={formik.errors.account_name}
                showError={
                  formik.touched.account_name && formik.errors.account_name
                }
                disabled
              />

              <FormikControl
                control={InputType.MONTH_YEAR_PICKER}
                type={InputType.MONTH_YEAR_PICKER}
                label={"Statement date"}
                error={formik.errors.statement_date}
                showError={
                  formik.touched.statement_date && formik.errors.statement_date
                }
                required
                disableAutoComplete={false}
                name="statement_date"
                id="statement_date"
                value={formik.values.statement_date}
                onChange={(e: any) => onStatementChange(e)}
                maxDate={getDatePickerFormat("", true)}
                onBlur={formik.handleBlur}
                disabled={isViewMode || redirectedFrom === "reconciliation"}
                // hint={"Month, yyyy"}
              />

              <FormikControl
                control={InputType.TEXT_FIELD}
                name="bank_statement_balance"
                label="Bank statement balance"
                required={true}
                value={formik.values.bank_statement_balance}
                onChange={(e: any) => handleAmountChange(e)}
                error={formik.errors.bank_statement_balance}
                showError={
                  formik.touched.bank_statement_balance &&
                  formik.errors.bank_statement_balance
                }
                placeholder="Input month end balance"
                disabled={isViewMode}
              />

              <CustomButton
                buttonName={
                  formik.values.statement_file?.length > 0
                    ? "Statement uploaded"
                    : "Upload statement"
                }
                buttonType={buttonType.OUTLINE_CONTRAST}
                error={formik.errors.statement_file}
                showError={
                  formik.touched.statement_file && formik.errors.statement_file
                }
                actionType="submit"
                onClick={() => setDisplayUploadStatement(true)}
                inputButton
                label="Upload"
                required
              />

              <br />
              <br />
              <div className="button-container">
                <CustomButton
                  buttonName={isViewMode ? "Close" : "Cancel"}
                  buttonType={buttonType.OUTLINE_CONTRAST}
                  actionType="button"
                  onClick={() => handleClose()}
                  inputButton
                />
                {!isViewMode && (
                  <CustomButton
                    buttonName={"Save"}
                    buttonType={buttonType.SECONDARY}
                    actionType="submit"
                    onClick={formik.handleSubmit}
                    inputButton
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {displayUploadStatement && (
        <UploadBankStatement
          showUploadModel={displayUploadStatement}
          formik={formik}
          hideModal={() => setDisplayUploadStatement(false)}
          isViewMode={isViewMode}
        />
      )}
    </Fragment>
  );
}
