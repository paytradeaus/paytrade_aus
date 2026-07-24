"use client";
import React, { useEffect, useState } from "react";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";

import { useRouter, useSearchParams } from "next/navigation";

import * as Yup from "yup";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";

import { useLoaderContext } from "@/context/useLoader";

import { useFormik } from "formik";

import { showErrorToast, showInfoToast } from "@/components/Toaster";
import {
  DeletePayments,
  GetClientSupplierList,
  GetProjectList,
  UpdateInterestChargesPaymentStatus,
} from "../otherPayments.functions";
import { useTokenDetails } from "@/hooks";
import {
  dateStringToUtcConversion,
  formatDate,
  formatDollars,
  getDatePickerFormat,
  removeCommas,
} from "@/utils";
import { getListActionButtons } from "@/app/api/commonApi";
import BaseModal from "@/components/BaseModal";
import { checkBoxConfirmationMessage } from "../otherPayments.constants";
import FormikControl from "@/components/FormikControl";
import { buttonType, DateFormat, InputType } from "@/shared/constant/general";
import CustomButton from "@/components/CustomButton/CustomButton";
import { AppRoutes } from "@/shared/constant/appRoutes";
import ShowMatchTxnTable from "../showingMatchTransactions";
import { fetchAllPaymentClaims } from "../../PayApps/payApps.functions";
import { ListAllPaymentsInput } from "../../PaymnetsToDo/paymentToDoList.functions";
import { DD_MM_YYYY } from "@/shared/constant/identificationNumbers";
import ClaimSummaryViewForOtherPayments from "../claimSummaryView";
import PaymentSummaryViews from "../paymentSummaryView";
import ShowPaymentTxnTable from "../showingPaymentTransactions";
import {
  unMappingPayments,
  viewXeroSyncLog,
} from "../../UserIntegrations/integration.functions";
import { CreateClaimInPaytrade } from "../../UserIntegrations/XeroDashboard/XeroSyncLogDetails/syncLog.functions";

const OverPaymentRefundToClient = (props: any) => {
  const queryParams = useSearchParams();
  const {
    isEdit,
    handleAddPayment,
    trustAccountList,
    data,
    isView,
    fromMatchScreen,
    fromMatchScreenBankID,
  } = props;
  const dispatch = useDispatch();
  const screenDetails: any = useSelector(
    (state: RootState) => state.dashBoard.screenDetails
  );

  const router = useRouter();
  const { setLoader }: any = useLoaderContext();
  const deleteParam: any = queryParams.get("delete");
  const unmapidParam: any = queryParams.get("unmapid");
  const syncId: any = queryParams.get("syncId");

  const [selectedValue, setSelectedValue] = useState<any>("");
  const [interestOpenModal, setInterestOpenModal] = useState(false);
  const [deleteDisabled, setDeleteDisabled] = useState<boolean>(true);
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [actionsBtnData, setActionsBtnData] = useState<any>({});
  const [openModal, setOpenModal] = useState(false);
  const [displayOnCancel, setDisplayOnCancel] = useState(false);
  const [overPaymentList, setOverPaymentList] = useState<any>([]);
  const [overPaymentsSelectedValue, setOverPaymentsSelectedValue] =
    useState<any>();
  const [accountError, setAccountError] = useState<any>();
  const [projectSelectedValue, setProjectSelectedValue] = useState<any>();
  const [supplierSelectedValue, setSupplierSelectedValue] = useState<any>();
  const [projectListData, setProjectListData] = useState<any>();
  const [supplierListData, setSupplierListData] = useState<any>();
  const [projectId, setProjectId] = useState<any>();
  const [paymentClaimsOptions, setPaymentClaimsOptions] = useState([]);
  const [aLLPaymentOptions, setALLPaymentOptions] = useState([]);

  const [paymentClaimSelectedData, setPaymentClaimSelectedData] =
    useState<any>();
  const [paymentSelectedData, setPaymentSelectedData] = useState<any>();

  const validationSchema = Yup.object().shape({
    clientSupplier: Yup.number().required("Supplier is required"),
    accountId: Yup.number().required("Payment to account is required"),
    paymentClaimId: Yup.number().required("Payment Claim is required"),
    associatedPaymentId: Yup.number().required("Payment is required"),
    project: Yup.number().required("Project is required"),
    // accountNumber: Yup.number().required("Account Number amount is required"),
    paymentAmount: Yup.string()
      .required("Payment amount is required")
      .test("max-payment", function (value) {
        const { maxLimitOverpayment } = this.parent;
        const cleanedValue = (value ?? "").replace(/[^0-9.]/g, "");
        const numericValue = parseFloat(cleanedValue);
        if (!isNaN(numericValue) && numericValue > maxLimitOverpayment) {
          return this.createError({
            message: `Payment amount should not exceed ${formatDollars(
              maxLimitOverpayment?.toString()
            )}`,
          });
        }
        return true;
      }),
    paymentDate: Yup.string()
      .required("Payment date is required")
      .test(
        "payment Date",
        "Payment Date must be greater than bank account opening Date",
        function (value) {
          if (selectedValue?.value) {
            let dataCon = new Date(selectedValue?.data?.opening_date);
            return new Date(value) >= dataCon;
          } else {
            return true;
          }
        }
      ),
    // memo: Yup.string(),
    confirmPaid: Yup.boolean(),
    overpayment: Yup.string().required("Overpayment is required"),
  });

  useEffect(() => {
    const bankIDFrom = queryParams?.get("bid");
    if (bankIDFrom) {
      try {
        formik.setFieldValue("accountId", bankIDFrom);
        let accountList =
          trustAccountList?.find(
            (each: any) => each?.value === bankIDFrom?.toString()
          ) || {};
        // setSelectedValue(accountList);
        if (accountList?.data?.account_type !== "Retention Trust Account") {
          formik.setFieldValue("accountId", bankIDFrom);
          setSelectedValue(accountList);
        } else {
          formik.setFieldValue("accountId", bankIDFrom);
          setSelectedValue(accountList);
          showErrorToast(
            "Overpayment Refund cannot be added against the Retention Trust Account"
          );
          setAccountError(
            "Overpayment Refund cannot be added against the Retention Trust Account"
          );
        }
      } catch (error) {
        console.error("Failed to parse JSON:", error);
      }
    }
  }, [queryParams]);

  useEffect(() => {
    const bankIDFrom = fromMatchScreen ? fromMatchScreenBankID : null;
    if (bankIDFrom) {
      try {
        formik.setFieldValue("accountId", bankIDFrom);
        let accountList =
          trustAccountList?.find(
            (each: any) => each?.value === bankIDFrom?.toString()
          ) || {};
        // setSelectedValue(accountList);
        if (accountList?.data?.account_type !== "Retention Trust Account") {
          formik.setFieldValue("accountId", bankIDFrom);
          setSelectedValue(accountList);
        } else {
          formik.setFieldValue("accountId", bankIDFrom);
          setSelectedValue(accountList);
          // showErrorToast(
          //   "Overpayment Refund cannot be added against the Retention Trust Account"
          // );
          setAccountError(
            "Overpayment Refund cannot be added against the Retention Trust Account"
          );
        }
      } catch (error) {
        console.error("Failed to parse JSON:", error);
      }
    }
  }, [fromMatchScreen, fromMatchScreenBankID]);

  useEffect(() => {
    handleGetProjectList();
  }, []);

  useEffect(() => {
    if (projectId) {
      handleGetSupplierList();
    }
  }, [projectId]);

  useEffect(() => {
    if (supplierSelectedValue?.value) {
      handleGetPaymentClaimList();
    }
  }, [supplierSelectedValue?.value]);
  useEffect(() => {
    if (paymentClaimSelectedData?.value) {
      handleGetAllPaymentList();
    }
  }, [selectedValue?.value, paymentClaimSelectedData?.value]);

  useEffect(() => {
    if (data) {
      setProjectId(data?.project_id);
    }
  }, [data]);
  useEffect(() => {
    if (
      trustAccountList &&
      data?.payment_id &&
      supplierListData &&
      projectListData &&
      overPaymentList
    ) {
      let supplierList = supplierListData.find(
        (each: any) => each?.value === data?.client_supplier_id?.toString()
      ) || {
        label: data?.client_supplier_id?.toString(),
        value: data?.client_supplier_id?.toString(),
      };
      setSupplierSelectedValue(supplierList);

      let projectList =
        projectListData.find(
          (each: any) => each?.value === data?.project_id?.toString()
        ) || {};
      setProjectSelectedValue(projectList);

      let accountList =
        trustAccountList.find(
          (each: any) => each?.value === data?.payment_from_account?.toString()
        ) || {};
      setSelectedValue(accountList);

      let claimsOptionsFilter =
        paymentClaimsOptions.find(
          (each: any) => each?.value === data?.payment_claim_id?.toString()
        ) || {};
      setPaymentClaimSelectedData(claimsOptionsFilter);

      let paymentOptionsFilter =
        aLLPaymentOptions.find(
          (each: any) => each?.value === data?.associated_payment_id?.toString()
        ) || {};
      setPaymentSelectedData(paymentOptionsFilter);
      let OverpaymentOptionsFilter =
        overPaymentList.find(
          (each: any) =>
            each?.value === data?.associated_overpayment_id?.toString()
        ) || {};
      setOverPaymentsSelectedValue(OverpaymentOptionsFilter);
      formik.setValues({
        clientSupplier: data ? String(data?.client_supplier_id) : "",
        project: data ? String(data?.project_id) : "",
        accountId: data ? String(data?.payment_from_account) : "",
        supplier: "",
        accountNumber: "",
        paymentClaimId: data ? String(data?.payment_claim_id) : "",
        associatedPaymentId: data ? String(data?.associated_payment_id) : "",
        paymentAmount: data?.payment_amount
          ? formatDollars(data?.payment_amount.toFixed(2).toString())
          : "",
        paymentDate: data ? getDatePickerFormat(data?.payment_date) : "",
        memo: data ? String(data?.memo) : "",
        confirmPaid: data ? data?.is_paid_confirmed : false,
        overpayment: data ? data?.associated_overpayment_id : "",
        maxLimitOverpayment: "",
      });
      (async () => {
        const Payload = {
          payment_id: data?.payment_id,
        };
        const response = await getListActionButtons(Payload);

        if (response && response?.payment_overview_buttons) {
          setActionsBtnData(response?.payment_overview_buttons);
        } else {
          setActionsBtnData({});
        }
      })();
    }
  }, [
    data,
    isEdit,
    trustAccountList,
    supplierListData,
    projectListData,
    aLLPaymentOptions,
    paymentClaimsOptions,
    overPaymentList,
  ]);

  const formik = useFormik({
    initialValues: {
      clientSupplier: data ? String(data?.client_supplier_id) : "",
      project: data ? String(data?.project_id) : "",
      accountId: data ? String(data?.payment_from_account) : "",
      supplier: "",
      accountNumber: "",
      paymentAmount: "",
      paymentClaimId: "",
      associatedPaymentId: "",
      paymentDate: data ? getDatePickerFormat(data?.payment_date) : "",
      memo: data ? String(data?.memo) : "",
      confirmPaid: data ? data?.is_paid_confirmed : false,
      overpayment: "",
      maxLimitOverpayment: "",
      // Add other form fields here
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      if (accountError) return;
      setLoader(true);
      // Handle form submission
      const companyId = Number(localStorage.getItem("companyId"));
      const paymentValues = removeCommas(values?.paymentAmount);
      const onlyValues = paymentValues.replace(/[^0-9.]/g, "");
      const payload: any = {
        company_id: companyId,
        payment_type: "Overpayment refund to client",
        payment_from_account: Number(values?.accountId),
        client_supplier_id: Number(values?.clientSupplier),
        project_id: Number(values?.project),
        payment_amount: onlyValues ? Number(onlyValues) : 0,
        total_amount: onlyValues ? Number(onlyValues) : 0,
        payment_date: values?.paymentDate || null,
        input_date: new Date().toISOString(),
        payment_claim_id: Number(values?.paymentClaimId),
        associated_payment_id: Number(values?.associatedPaymentId),
        associated_overpayment_id: Number(values?.overpayment),
        is_paid_confirmed: values?.confirmPaid,
        memo: values?.memo,
      };
      try {
        if (!isEdit) {
          await handleAddPayment(payload);
        } else {
          if (formik.values.confirmPaid === data?.is_paid_confirmed) {
            showInfoToast("No changes to save");
            return;
          }
          await handleUpdatePayment(values?.confirmPaid);
        }
      } catch (error) {
        console.error("Error handling form submission:", error);
      } finally {
        setLoader(false);
      }
    },
  });

  const handleGetProjectList = async () => {
    try {
      const companyId = Number(localStorage.getItem("companyId"));
      const payload = {
        companyId: companyId,
      };
      const response = await GetProjectList(payload);

      if (response.length > 0) {
        const customProjectOption = response.map((data: any) => ({
          label: data.project_name,
          value: data.project_id.toString(),
          data: data,
        }));
        setProjectListData(customProjectOption);
      }
    } catch (error: any) {
      console.log(error);
    }
  };

  useEffect(() => {
    const handleGetOverpaymentList = async () => {
      try {
        console.log(formik.values.associatedPaymentId);
        const response = await ListAllPaymentsInput({
          company_id: Number(localStorage.getItem("companyId")),
          page_number: 1,
          page_size: null,
          status: null,
          project_id: projectId || null,
          contract_id: null,
          cash_retention_type: null,
          claim_type: null,
          client_supplier_id: Number(supplierSelectedValue?.value) || null,
          bank_account_id: Number(selectedValue?.value) || null,
          claim_id: Number(paymentClaimSelectedData?.value) || null,
          payment_type: "Overpayment",
          payment_id: isEdit
            ? data?.associated_payment_details?.associated_payment_id
            : +formik.values.associatedPaymentId,
        });
        console.log(response);
        if (response?.payments?.length > 0) {
          const customPaymentClaimOptions = response?.payments.map(
            (data: any) => ({
              label: `${data.payment_id}-$ ${data.total_amount
                .toFixed(2)
                .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}(${data.payment_type})`,
              value: data.payment_id.toString(),
              data: data,
            })
          );
          setOverPaymentList(customPaymentClaimOptions);
        } else {
          setOverPaymentList([]);
        }
      } catch (error: any) {
        console.log(error);
      }
    };
    if (formik.values.associatedPaymentId) handleGetOverpaymentList();
  }, [formik.values.associatedPaymentId]);

  useEffect(() => {
    if (overPaymentsSelectedValue?.data?.total_amount) {
      formik.setFieldValue(
        "paymentAmount",
        formatDollars(overPaymentsSelectedValue?.data?.total_amount?.toString())
      );
      formik.setFieldValue(
        "maxLimitOverpayment",
        overPaymentsSelectedValue?.data?.total_amount
      );
    }
  }, [overPaymentsSelectedValue]);

  const handleGetSupplierList = async () => {
    try {
      const companyId = Number(localStorage.getItem("companyId"));
      const payload = {
        company_id: companyId,
        project_id: data?.project_id || projectId || null,
      };

      const response = await GetClientSupplierList(payload);
      if (response?.client_suppliers_list.length > 0) {
        const customSupplierOption = response?.client_suppliers_list
          .filter((each: any) => each?.client_supplier_type !== "Supplier")
          .map((data: any) => ({
            label: data.client_supplier_name,
            value: data.client_supplier_id.toString(),
            data: data,
          }));
        setSupplierListData(customSupplierOption);
      } else {
        setSupplierListData([]);
      }
    } catch (error: any) {
      console.log(error);
    }
  };

  const handleGetPaymentClaimList = async () => {
    try {
      const companyId = Number(localStorage.getItem("companyId"));

      const response: any = await fetchAllPaymentClaims({
        cash_retention_type: null,
        claim_type: "Receivable",
        contract_id: null,
        company_id: companyId || null,
        items_per_page: null,
        page: 1,
        project_id: projectId || null,
        status: null,
        client_supplier_id: Number(supplierSelectedValue?.value) || null,
      });

      if (response?.payment_claims?.length > 0) {
        const customPaymentClaimOptions = response?.payment_claims.map(
          (data: any) => ({
            label: `${data.payment_claim_id}-${formatDate(
              data.due_date,
              DD_MM_YYYY
            )}-$ ${data.claim_amount
              .toFixed(2)
              .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}(${data.contract_name})`,
            value: data.payment_claim_id.toString(),
            data: data,
          })
        );
        setPaymentClaimsOptions(customPaymentClaimOptions);
      } else {
        setPaymentClaimsOptions([]);
      }
    } catch (error: any) {
      console.log(error);
    }
  };

  const handleGetAllPaymentList = async () => {
    try {
      const companyId = Number(localStorage.getItem("companyId"));
      const allPaymentsListData = await ListAllPaymentsInput({
        payment_type: "All",
        company_id: companyId,
        page_number: 1,
        page_size: null,
        status: null,
        project_id: projectId || null,
        contract_id: null,
        cash_retention_type: null,
        claim_type: null,
        client_supplier_id: Number(supplierSelectedValue?.value) || null,
        bank_account_id: Number(selectedValue?.value) || null,
        claim_id: Number(paymentClaimSelectedData?.value) || null,
      });

      if (allPaymentsListData?.payments?.length > 0) {
        const customPaymentOptions = allPaymentsListData?.payments.map(
          (data: any) => ({
            label: `${data.payment_id}-$ ${data.total_amount
              .toFixed(2)
              .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}(${data.payment_type})`,
            value: data.payment_id.toString(),
            data: data,
          })
        );
        setALLPaymentOptions(customPaymentOptions);
      } else {
        setALLPaymentOptions([]);
      }
    } catch (error: any) {
      console.log(error);
    }
  };

  const handleDeleteInterestCharges = async () => {
    try {
      setDeleteDisabled(true);
      const payload = {
        payment_id: data?.payment_id,
        status: "Deleted",
      };
      const response = await DeletePayments(payload);
      if (response) {
        dispatch(
          setScreenDetails({
            ...screenDetails,
            fromScreen: "addInterest",
            toScreen: "bankOverView",
            mainActiveTab: "Interest and Charges",
            selectTab: "archivedAccounts",
          })
        );

        // need to change once overview done
        router.back();

        // const companyId = Number(localStorage.getItem("companyId"));
        // router.push(
        //   `${ApplicationURLS.USER_BANK_ACCOUNT_LIST_OVERVIEW}/${companyId}/${data?.payment_from_account}`
        // );
      }
      setInterestOpenModal(false);
    } catch (error: any) {
      console.log(error);
    }
  };
  const onDeleteClick = () => {
    setDeleteDisabled(false);
    setInterestOpenModal(!interestOpenModal);
    setPopupMessage((prev) => ({
      headerMsg: "",
      subHeaderMsg: "Are you sure you wish to delete this payment?",
    }));
  };
  const handleSelectChange = (selectedValue: any) => {
    setSelectedValue(selectedValue);
    if (selectedValue?.data?.account_type !== "Retention Trust Account") {
      setAccountError(null);
    } else {
      // showErrorToast(
      //   "Overpayment Refund cannot be added against the Retention Trust Account"
      // );
      setAccountError(
        "Overpayment Refund cannot be added against the Retention Trust Account"
      );
    }
  };
  // Main function to handle contract value formatting
  const handleAmountChange = (e: any) => {
    let { value } = e.target;
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    // Allow clearing the input value (setting to empty)
    if (rawValue === "" || rawValue === "$ ") {
      formik.setFieldValue("paymentAmount", "");
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
    formik.setFieldValue("paymentAmount", formattedValue);
  };

  const handleUpdatePayment = async (status: any) => {
    let syncData: any = null;

    async function createClaim() {
      await CreateClaimInPaytrade({
        associatedRetentionSubPaymentId: null,
        retentionId: null,
        invoiceId: syncData?.api_payload?.invoice_id || null,
        tenantId: syncData?.api_payload?.tenant_id || null,
        syncId: syncData?.id,
        syncRunType: syncData?.api_payload?.sync_run_type || null,
      });
    }
    try {
      const payload: any = {
        is_paid_confirmed: status,
        is_received_confirmed: false,
        payment_id: data?.payment_id,
        is_retention_confirmed: false,
      };
      // include delete flag (if needed)
      if (deleteParam === "true") {
        payload.delete_paytrade_only = true;
      }
      const response = await UpdateInterestChargesPaymentStatus(payload);
      if (response) {
        // Fetch sync log for claim creation
        if (syncId) {
          syncData = await viewXeroSyncLog({
            viewXeroSyncLogId: syncId,
          });
        }
        dispatch(
          setScreenDetails({
            ...screenDetails,
            fromScreen: "addInterest",
            toScreen: "bankOverView",
            mainActiveTab: "Interest and Charges",
          })
        );
        // --- CASE A: If unmapid exists → run unmap first
        if (unmapidParam) {
          await unMappingPayments({ paymentId: unmapidParam });
        }

        // --- CASE B: ALWAYS create claim (unmap or no unmap)
        if (syncId) {
          await createClaim();
        }
        // need to change once overview done
        router.back();
        // const companyId = Number(localStorage.getItem("companyId"));
        // router.push(
        //   `${ApplicationURLS.USER_BANK_ACCOUNT_LIST_OVERVIEW}/${companyId}/${data?.payment_from_account}`
        // );
      }
    } catch (error: any) {
      console.log(error);
    }
  };

  const handleBackWithReduxSet = () => {
    if (!isView && !isEdit) {
      showInfoToast("No changes saved");
    }
    dispatch(
      setScreenDetails({
        ...screenDetails,
        fromScreen: "addInterest",
        toScreen: "bankOverView",
        mainActiveTab: "Interest and Charges",
      })
    );
    router.back();
  };

  const handleBack = () => {
    if (fromMatchScreen) {
      showInfoToast("No changes saved");
      return;
    }
    if (
      isEdit &&
      actionsBtnData?.edit &&
      formik.values.confirmPaid !== data?.is_paid_confirmed
    ) {
      setDisplayOnCancel(true);
      return;
    }
    handleBackWithReduxSet();
  };

  function onConfirmPaidChange(value: boolean) {
    if (value) {
      setOpenModal(true);
    } else {
      formik.setFieldValue("confirmPaid", value);
    }
  }
  function handleConfirmCheck() {
    formik.setFieldValue("confirmPaid", true);
    setOpenModal(false);
  }
  return (
    <>
      <div>
        <div style={{ marginBottom: "0.8rem" }}>
          <SearchableSelect
            placeholder="Select Account Type"
            name="other payments"
            label="Account"
            onChange={(selectedOption: any) => {
              formik.handleChange("accountId")(selectedOption?.value || "");
              formik.handleChange("associatedPaymentId")("");
              setPaymentSelectedData(null);
              handleSelectChange(selectedOption);
            }}
            disabled={
              data?.payment_id || screenDetails?.fromScreen === "bankOverView"
            }
            selectedData={selectedValue}
            options={trustAccountList}
            isRequired={
              !formik.values.accountId && formik.touched.accountId
                ? true
                : false
            }
            errorMessage={formik.errors.accountId}
            renderKey="label"
            valueKey="value"
            required
          />
        </div>
        <div style={{ marginBottom: "0.8rem" }}>
          <SearchableSelect
            placeholder="Select Project"
            name="other payments"
            label="Project"
            onChange={(selectedOption: any) => {
              formik.handleChange("project")(selectedOption?.value || "");
              formik.handleChange("clientSupplier")("");
              formik.handleChange("paymentClaimId")("");
              formik.handleChange("associatedPaymentId")("");
              formik.handleChange("overpayment")("");
              formik.handleChange("maxLimitOverpayment")("");
              formik.handleChange("paymentAmount")("");
              setOverPaymentsSelectedValue(null);
              setSupplierSelectedValue(null);
              setPaymentClaimSelectedData(null);
              setPaymentSelectedData(null);
              setProjectId(selectedOption?.data?.project_id);
            }}
            disabled={data?.payment_id}
            selectedData={projectSelectedValue}
            options={projectListData}
            isRequired={
              !formik.values.project && formik.touched.project ? true : false
            }
            errorMessage={formik.errors.project}
            renderKey="label"
            valueKey="value"
            required
          />
        </div>
        <div style={{ marginBottom: "0.8rem" }}>
          <SearchableSelect
            placeholder="Select client "
            name="other payments"
            label="Client"
            onChange={(selectedOption: any) => {
              formik.handleChange("clientSupplier")(
                selectedOption?.value || ""
              );
              formik.handleChange("paymentClaimId")("");
              formik.handleChange("associatedPaymentId")("");
              formik.handleChange("overpayment")("");
              formik.handleChange("maxLimitOverpayment")("");
              formik.handleChange("paymentAmount")("");
              setOverPaymentsSelectedValue(null);
              setPaymentClaimSelectedData(null);
              setPaymentSelectedData(null);
              setSupplierSelectedValue(selectedOption);
            }}
            disabled={data?.payment_id || !projectId}
            selectedData={supplierSelectedValue}
            options={supplierListData}
            isRequired={
              !formik.values.clientSupplier && formik.touched.clientSupplier
                ? true
                : false
            }
            errorMessage={formik.errors.clientSupplier}
            renderKey="label"
            valueKey="value"
            required
          />
        </div>
        <div style={{ marginBottom: "0.8rem" }}>
          <SearchableSelect
            placeholder="Select Claims"
            name="other payments"
            label="Claims"
            onChange={(selectedOption: any) => {
              formik.handleChange("paymentClaimId")(
                selectedOption?.value || ""
              );
              formik.handleChange("associatedPaymentId")("");
              setPaymentSelectedData(null);
              setPaymentClaimSelectedData(selectedOption);
            }}
            disabled={
              data?.client_supplier_id || !formik?.values?.clientSupplier
            }
            selectedData={paymentClaimSelectedData}
            options={paymentClaimsOptions}
            isRequired={
              !formik.values.paymentClaimId && formik.touched.paymentClaimId
                ? true
                : false
            }
            errorMessage={formik.errors.paymentClaimId}
            renderKey="label"
            valueKey="value"
            required
          />
        </div>
        <div style={{ marginBottom: "0.8rem" }}>
          <SearchableSelect
            placeholder="Select Payments"
            name="other payments"
            label="Payments"
            onChange={(selectedOption: any) => {
              formik.handleChange("associatedPaymentId")(
                selectedOption?.value || ""
              );
              setPaymentSelectedData(selectedOption);
            }}
            disabled={data?.payment_claim_id || !formik?.values?.paymentClaimId}
            selectedData={paymentSelectedData}
            options={aLLPaymentOptions}
            isRequired={
              !formik.values.associatedPaymentId &&
              formik.touched.associatedPaymentId
                ? true
                : false
            }
            errorMessage={formik.errors.associatedPaymentId}
            renderKey="label"
            valueKey="value"
            required
          />
        </div>
        <div style={{ marginBottom: "0.8rem" }}>
          <SearchableSelect
            placeholder="Select Overpayment"
            name="other payments"
            label="Overpayment"
            onChange={(selectedOption: any) => {
              formik.handleChange("overpayment")(selectedOption?.value || "");
              setOverPaymentsSelectedValue(selectedOption);
            }}
            disabled={data?.payment_id}
            selectedData={overPaymentsSelectedValue}
            options={overPaymentList}
            errorMessage={formik.errors.overpayment}
            isRequired={
              !formik.values.overpayment && formik.touched.overpayment
                ? true
                : false
            }
            renderKey="label"
            valueKey="value"
            required
          />
        </div>
        <FormikControl
          control={InputType.TEXT_FIELD}
          label={"Payment Amount"}
          error={formik?.errors?.paymentAmount}
          name="paymentAmount"
          id={"paymentAmount"}
          placeholder="Enter payment Amount"
          disabled={data?.payment_id ? true : false}
          value={formik?.values?.paymentAmount || ""}
          onChange={handleAmountChange}
          onBlur={formik.handleBlur}
          showError={
            formik.touched.paymentAmount && formik.errors.paymentAmount
          }
          required
        />
        <FormikControl
          control={InputType.DATE_PICKER}
          label={"Payment Date"}
          name={"paymentDate"}
          id={"paymentDate"}
          error={formik.errors.paymentDate}
          showError={formik.touched.paymentDate && formik.errors.paymentDate}
          required
          onChange={(selectedDateValue: any) => {
            formik.setFieldValue("paymentDate", selectedDateValue);
          }}
          onBlur={formik.handleBlur("paymentDate")}
          value={formik.values.paymentDate}
          minDate={
            selectedValue?.data?.opening_date
              ? formatDate(
                  selectedValue?.data?.opening_date,
                  DateFormat.YYYY_MM_DD
                )
              : ""
          }
          disabled={data?.payment_id ? true : false}
          maxDate={formatDate(new Date(), DateFormat.YYYY_MM_DD)}
        />
        <FormikControl
          // required
          id={"confirmPaid"}
          // label={"Confirm - Paid"}
          name={"confirmPaid"}
          control={InputType.CHECKBOX}
          options={[
            {
              value: Boolean(formik.values.confirmPaid),
              label: "Confirm - Paid",
            },
          ]}
          disabled={isView || (isEdit && !actionsBtnData?.edit)}
          selectedValue={formik.values.confirmPaid || "false"}
          onChange={(e: any) => onConfirmPaidChange(e?.target?.checked)}
        />
        <FormikControl
          as="textArea"
          // placeholder={"Input short project description/summary"}
          // required
          label={"Memo"}
          name={"memo"}
          id={"memo"}
          control={InputType.TEXT_AREA}
          renderKey="label"
          valueKey="value"
          disabled={data?.payment_id}
          error={formik.errors.memo}
          showError={formik.touched.memo && formik.errors.memo}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur("memo")}
          value={formik.values.memo}
          maxLength={250}
        />
        {(isView || isEdit) && (
          <ClaimSummaryViewForOtherPayments
            patchData={data?.associated_payment_details}
          />
        )}
        {(isView || isEdit) && (
          <PaymentSummaryViews patchData={data?.associated_payment_details} />
        )}
        {(isView || isEdit) && (
          <div className="pt_expandtable" style={{ marginTop: "0.8rem" }}>
            <details>
              <summary>History </summary>

              <h4>Matched Transactions</h4>
              <ShowMatchTxnTable paymentId={data?.payment_id} />
              <br />
              <h4>Payment Transactions</h4>
              <ShowPaymentTxnTable paymentId={data?.payment_id} />
              <br />
            </details>
          </div>
        )}
        <br />
        {fromMatchScreen ? (
          <footer style={{ textAlign: "right" }}>
            <button
              type="submit"
              className="secondary"
              style={{ width: "auto" }}
              data-target="addpayment"
              onClick={() => {
                formik?.handleSubmit();
              }}
            >
              Add
            </button>
          </footer>
        ) : (
          <div className="grid">
            <CustomButton
              buttonName={"Cancel"}
              buttonType={buttonType.OUTLINE_CONTRAST}
              actionType="button"
              onClick={() => handleBack()}
              inputButton
            />

            {(isView || isEdit) && actionsBtnData?.delete && (
              <CustomButton
                buttonName={"Delete"}
                buttonType={buttonType.PRIMARY}
                actionType="button"
                onClick={() => onDeleteClick()}
                inputButton
              />
            )}
            {isView && actionsBtnData?.edit && (
              <CustomButton
                buttonName={"Edit"}
                buttonType={buttonType.SECONDARY}
                actionType="button"
                onClick={() => {
                  dispatch(
                    setScreenDetails({
                      fromScreen: "bankOverView",
                      toScreen: "Interest and Charges",
                      mainActiveTab: "",
                      selectTab: "",
                      subSelectTab: "",
                    })
                  );
                  router.push(
                    `${AppRoutes.USER_EDIT_INTEREST_CHARGES_OTHER_PAYMENT}/${data?.payment_id}`
                  );
                }}
                inputButton
              />
            )}
            {((!isView && isEdit && actionsBtnData?.edit) ||
              (!isView && !isEdit)) && (
              <CustomButton
                buttonName={isEdit ? "Update" : "Save"}
                buttonType={buttonType.SECONDARY}
                actionType="submit"
                onClick={() => {
                  formik?.handleSubmit();
                }}
                inputButton
              />
            )}
          </div>
        )}
      </div>
      {interestOpenModal && (
        <BaseModal
          modalId={"Delete type"}
          title={popupMessage?.headerMsg || ""}
          displayModal={interestOpenModal}
          onClose={() => setInterestOpenModal(false)}
          // onHeaderIconClose={() => setInterestOpenModal(false)}
          onConfirm={() => {
            handleDeleteInterestCharges();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
          disableSecondButton={deleteDisabled}
          // restrictOncloseFunctionInHeader
        >
          <h4 className="text_center">{popupMessage?.subHeaderMsg || ""}</h4>
        </BaseModal>
      )}
      {openModal && (
        <BaseModal
          modalId={"checkbox status popup"}
          displayModal={openModal}
          onHeaderIconClose={() => setOpenModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setOpenModal(false)}
          onConfirm={() => {
            handleConfirmCheck();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">
            {`${checkBoxConfirmationMessage} Paid?`}{" "}
          </h4>
        </BaseModal>
      )}

      {displayOnCancel && (
        <BaseModal
          modalId={"Display cancel popup"}
          displayModal={displayOnCancel}
          onHeaderIconClose={() => setDisplayOnCancel(false)}
          restrictOncloseFunctionInHeader
          onClose={() => {
            setDisplayOnCancel(false);
            handleBackWithReduxSet();
          }}
          onConfirm={() => {
            setDisplayOnCancel(false);
            formik?.handleSubmit();
            return true;
          }}
          firstButtonName="Yes"
          secondButtonName="Save"
        >
          <h4 className="text_center">
            {"Are you sure to close and not save?"}
          </h4>
        </BaseModal>
      )}
    </>
  );
};

export default OverPaymentRefundToClient;
