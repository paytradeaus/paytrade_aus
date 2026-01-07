"use client";

import React, { Fragment, useCallback, useEffect, useState } from "react";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { useDispatch } from "react-redux";
import { Row, Col, Form, Container, Button } from "react-bootstrap";
import styles from "./addEditBankStatement.module.scss";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import {
  Bank2,
  CaretRightFill,
  ExclamationTriangleFill,
} from "react-bootstrap-icons";

import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { usePathname, useRouter } from "next/navigation";

import CircleLoader from "react-spinners/CircleLoader";
import { formatDate, formatDollars } from "@/common/commonFunctions";
import {
  ADD,
  DD_MM_YYYY,
  DECIMAL_WITH_DOLLAR,
  EDIT,
  VIEW,
  YYYY_MM_DD,
} from "@/common/constants/general";

import { toast } from "@/app/Toaster";

import { ApplicationURLS } from "@/common/applicationURLS";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import commonStyles from "../../../../common/commonStyles.module.scss";

import {
  FetchAllBankAccounts,
  fetchBankStatementById,
  verifyBankStatementExistence,
} from "../backTrustAccount.functions";
import { getCookie } from "cookies-next";

import UploadAttachment from "./uploadAttachment/uploadAttachment";
import { useBankStatementContext } from "./BankTrustOverviewContext";
import { useLoaderContext } from "@/context/useLoader";
import { statementStatus } from "../bankTrustAccount.constant";
import moment from "moment";
import { lastDayOfMonth } from "date-fns";
import { jwtDecode } from "jwt-decode";

function AddEditBankStatement(props: any) {
  const AdminCompanyId = getCookie("compId");

  const { isEdit } = props;

  const { setLoader }: any = useLoaderContext();
  const dispatch = useDispatch();

  const {
    bankStatementFormik: formik,
    displayUploadContract,
    setDisplayUploadContract,
    companyId,
    bankId,
    accountId,
    screenType,
    statementId,
    setIsViewMode,
    setFormData,
    isViewMode,
    formData,
  }: any = useBankStatementContext();

  const [bankAccountName, setBankAccountName] = useState([]);

  const router = useRouter();
  const routePath = usePathname();

  const [isLoading, setIsLoading] = useState(false);

  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken"); // Adjust according to your token storage
    if (token) {
      const decodedToken: any = jwtDecode(token);
      setRole(decodedToken?.role);
    }
  }, []);

  useEffect(() => {
    getAccountName();
    if (screenType === EDIT || screenType === VIEW) {
      if (statementId || accountId) getBankStatement();
    }
  }, []);

  const handleFormCancelClick = () => {
    if (!isViewMode) {
      toast.info(
        `This bank statement has not been ${
          screenType === ADD ? "saved" : "updated"
        }.`
      );
    }
    dispatch(
      setScreenDetails({
        toScreen: "bankOverView",
        fromScreen: "bank Statement",
        mainActiveTab: "bank-statements",
        selectTab: "",
        subSelectTab: "",
      })
    );

    router.back();
  };

  function handleAmountChange2(value: any) {
    const charIndex = value.indexOf("$");
    const enteredValue = value.replace("$", "").trim();

    if (DECIMAL_WITH_DOLLAR.test(value) || value === "") {
      formik.setFieldValue(
        "modified_bank_statement_balance",
        charIndex == -1 ? `$ ${value}` : value
      ); // Update formik state with the new value
      formik.setFieldValue("bank_statement_balance", enteredValue);
    }
  }

  // Main function to handle contract value formatting
  const handleAmountChange = useCallback((e: any) => {
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

    const formattedValue = formatDollars(finalValue); // Assuming formatDollars is a function you have

    // Update form value
    formik.setFieldValue("bank_statement_balance", formattedValue);
  }, []);

  async function getAccountName() {
    const postData = {
      is_alphabetical_order: true,
      company_id: AdminCompanyId
        ? Number(AdminCompanyId)
        : Number(getCookie("companyId")) || "",
    };

    const response: any = await FetchAllBankAccounts(postData);

    if (response?.extendedBankAccounts?.length > 0) {
      const findAccount = response?.extendedBankAccounts.find(
        (x: any) => x?.bank_account_id == accountId
      );

      const modifiedData: any = [
        {
          label: findAccount?.account_name,
          value: findAccount?.bank_account_id,
        },
      ];

      setBankAccountName(modifiedData);

      await formik.setFieldValue("account_name", modifiedData[0] ?? "");
    } else {
      setBankAccountName([]);
    }
  }

  async function getBankStatement() {
    const postData = {
      payload: {
        bank_account_id: Number(accountId),
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
          new Date(response?.statement_date)
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

  async function onStatementChange(value: any) {
    const selectedDate = value ? new Date(value) : null;
    const modifiedDate = selectedDate ? lastDayOfMonth(selectedDate) : null;

    formik.setFieldValue("statement_date", modifiedDate);

    if (!modifiedDate) {
      // await formik?.setFieldError(`${fieldName} is required`);
      await formik.setFieldValue("is_statement_exist", false);
      return; // Early return if field is empty
    }

    // Construct POST data object
    const postData = {
      payload: {
        bank_account_id: bankId ? +bankId : 0,
        company_id: Number(localStorage.getItem("companyId")),
        statement_date: moment(modifiedDate).format(YYYY_MM_DD),
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
            href: "/admin/journals/trust-accounting",
            label: "View Bank Statement",
            active: routePath.startsWith(
              "/admin/journals/trust-accounting/bank"
            ),
          },
        ]
      : [
          {
            href: ApplicationURLS.USER_DASHBOARD,
            label: "Home",
            active: false,
          },
          {
            href: ApplicationURLS.USER_BANK_ACCOUNTS_LIST_CURRENT,
            label: "Bank Accounts",
            active: false,
          },
          {
            href: `${ApplicationURLS.USER_BANK_ACCOUNT_LIST_OVERVIEW}/${companyId}/${bankId}?tab=bank-statements`,
            label: "Overview",
            active: false,
          },
          {
            href: "",
            label: `${
              screenType === EDIT
                ? "Edit"
                : screenType === VIEW
                ? "View"
                : "Add"
            } Bank Statement`,
            active: true,
          },
        ];

  return (
    <div className={styles.mainCon}>
      {isLoading && (
        <div className={styles.loaderContainer}>
          <CircleLoader size={50} color="blue" />
        </div>
      )}
      {!isLoading && (
        <Container fluid>
          <ReusableBreadcrumb
            items={breadcrumbItems}
            separator={<span className={styles.separatorStyle}>&gt;</span>}
          />

          {!displayUploadContract ? (
            <Row>
              <Col className={styles.signInForm}>
                <Form
                  className={styles.formStyles}
                  onSubmit={formik.handleSubmit}
                  noValidate
                >
                  <Bank2 className={styles.contractsIconStyles}></Bank2>
                  <h5 className={styles.title}>{`${
                    screenType === EDIT
                      ? "Edit"
                      : screenType === VIEW
                      ? "View"
                      : "Add"
                  } Bank statement`}</h5>
                  {screenType !== "add" && (
                    <Fragment>
                      <div className={styles.headingFlexStyles}>
                        <h5
                          className={styles.SubHeading}
                        >{`Bank Statement Id - ${
                          formData?.bank_account_id ?? ""
                        }`}</h5>
                      </div>

                      <div className={styles.headingFlexStyles}>
                        <div>
                          <h6 className={styles.DateSubHeading}>
                            Date -&nbsp;
                          </h6>
                        </div>
                        <div>
                          <h6 className={styles.DateSubHeading}>
                            {formatDate(
                              formData?.created_on
                                ? new Date(formData?.created_on)
                                : new Date()
                            )}
                          </h6>
                        </div>
                      </div>
                    </Fragment>
                  )}
                  {formData?.status === statementStatus.LOCKED && (
                    <div className={styles.subText}>
                      This statement is already associated with an audit and
                      cannot be edited.
                    </div>
                  )}
                  <div className={styles.DropdownStyles}>
                    <SearchableSelect
                      options={bankAccountName}
                      selectedData={formik?.values?.account_name}
                      onChange={(option) =>
                        formik.setFieldValue("account_name", option)
                      }
                      placeholder="Select account name"
                      label="Account Name *"
                      disabled={isViewMode}
                      isRequired={
                        !!(
                          !formik.values.account_name &&
                          formik.touched.account_name
                        )
                      }
                      errorMessage={formik.errors.account_name}
                    />
                  </div>

                  <div className={styles.textFieldStyles}>
                    <CustomDatePicker
                      showIcon={true}
                      label="Statement Date *"
                      toggleCalendarOnIconClick
                      placeholderText="&nbsp;Select statement month and year"
                      className={
                        formik.touched.statement_date &&
                        formik.errors.statement_date
                          ? ` ${styles.datePickerError}`
                          : styles.datePicker
                      }
                      selected={formik.values.statement_date}
                      onChange={(e: any) => onStatementChange(e)}
                      disabled={isViewMode}
                      format={DD_MM_YYYY}
                      value={formik?.values?.statement_date}
                      maxDate={new Date()}
                      showMonthYearPicker={true}
                      renderMonthYearPicker={true}
                    />
                    {formik.touched.statement_date &&
                      formik.errors.statement_date && (
                        <div className={styles.errorContainer}>
                          <ExclamationTriangleFill className={styles.error} />
                          <span className={styles.errorTextStyles}>
                            {formik.errors.statement_date}
                          </span>
                        </div>
                      )}
                  </div>

                  <div className={styles.textFieldStyles}>
                    <TextField
                      type="text"
                      labelText="Bank Statement Balance *"
                      name="bank_statement_balance"
                      placeholder="Input month end balance"
                      id="bank_statement_balance"
                      // displayStartAdornment={true}
                      value={formik.values.bank_statement_balance}
                      onChange={handleAmountChange}
                      onBlur={formik.handleBlur}
                      disabled={isViewMode}
                      endingDataStyles={styles.endIconStyle}
                      className={
                        formik.touched.bank_statement_balance &&
                        formik.errors.bank_statement_balance
                          ? `${styles.inputFieldControl} ${styles.inputError}`
                          : styles.inputFieldControl
                      }
                    />
                    {formik.touched.bank_statement_balance &&
                    formik.errors.bank_statement_balance ? (
                      <div className={styles.errorText}>
                        <ExclamationTriangleFill className={styles.icon} />
                        {formik.errors.bank_statement_balance}
                      </div>
                    ) : null}
                  </div>

                  <div
                    className={`${styles.textFieldStyles} ${styles?.cursorPointer}`}
                    onClick={() => setDisplayUploadContract(true)}
                  >
                    <TextField
                      placeholder={
                        formik?.values?.statement_file?.length
                          ? "Uploaded statement"
                          : "Upload Statement"
                      }
                      type="text"
                      errorText={formik.errors.account_details}
                      isInvalid={
                        !!(
                          formik.touched.account_details &&
                          formik.errors.account_details
                        )
                      }
                      labelText="Upload *"
                      name="account_details"
                      endingData={
                        <CaretRightFill className={styles.disabledFieldIcon} />
                      }
                      endingDataStyles={styles.endIconStyle}
                      classNames={`${commonStyles.inputFieldControl} ${styles.disabledTextField}`}
                    />
                    {formik.touched.statement_file &&
                    formik.errors.statement_file ? (
                      <div className={styles.errorText}>
                        <ExclamationTriangleFill className={styles.icon} />
                        {formik.errors.statement_file}
                      </div>
                    ) : null}
                  </div>

                  {!isViewMode && (
                    <FormButton className={styles.buttonStyles} type="submit">
                      {isEdit ? "Update" : "Save"}
                    </FormButton>
                  )}

                  <Button
                    className={styles.SkipButtonStyles}
                    type="button"
                    onClick={handleFormCancelClick}
                  >
                    {isViewMode ? "Close" : "Cancel"}
                  </Button>
                </Form>
              </Col>
            </Row>
          ) : (
            <UploadAttachment />
          )}
        </Container>
      )}
    </div>
  );
}

export default AddEditBankStatement;
