"use client";
import BreadCrumbs from "@/components/BreadCrumbs";
import CustomButton from "@/components/CustomButton/CustomButton";
import FormikControl from "@/components/FormikControl";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { buttonType, InputType } from "@/shared/constant/general";
import { useEffect, useState } from "react";
import {
  addNewAccountApi,
  createTaxTypeApi,
  createTrackingCategory,
  disconnectFromXero,
  getTaxRates,
  getTrackingCategories,
  getXeroAccountCodes,
  getXeroDetailsForCompany,
  pauseOrUnpauseXero,
  syncAllContactsByCompanyId,
  updateSettings,
} from "../../integration.functions";
import { useRouter, useSearchParams } from "next/navigation";
import * as Yup from "yup";
import { useFormik } from "formik";
import {
  accountTypeOptions,
  canonicalXeroTaxCodes,
  taxRateOptions,
  yesNoOptions,
} from "../../integration.constant";
import BaseModal from "@/components/BaseModal";
import { v4 as uuidv4 } from "uuid";
import { showErrorToast } from "@/components/Toaster";
import {
  CreateBillsInPaytrade,
  CreateClaimInPaytrade,
  CreatePaymentInXero,
  SyncAllInvoicesOrBillsByCompanyId,
  SyncAllPaymentsByCompanyId,
} from "../XeroSyncLogDetails/syncLog.functions";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";

export default function XeroSettings() {
  const router = useRouter();

  const [trackingCategories, setTrackingCategories] = useState([]);
  const [createCategory, setCreateCategory] = useState("");
  const [disableSave, setDisableSave] = useState(false);
  const [xeroDetails, setXeroDetails] = useState<any>("");
  const [accountCodesList, setAccountCodesList] = useState([]);
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const [initialFormikValue, setInitialFormikValue] = useState<any>();
  const [showAddNewAccount, setShowAddNewAccount] = useState(false);
  const [showAddNewTaxRate, setShowAddNewTaxRate] = useState(false);
  const [xeroDeleteModal, setXeroDeleteModal] = useState(false);
  const [accountType, setAccountType] = useState("");
  const [taxData, setTaxData] = useState({
    totalSimpleTax: 0,
    effectiveTaxRatePercent: 0,
  });
  const [taxCodeOptions, setTaxCodeOptions] = useState<any[]>([]);
  const [xeroTaxRates, setXeroTaxRates] = useState<any[]>([]);
  const [taxCheckLoading, setTaxCheckLoading] = useState(false);
  const [creatingTaxType, setCreatingTaxType] = useState<string | null>(null);

  const queryParams: any = useSearchParams();
  const syncId: any = queryParams.get("syncId");
  const errorCode: any = queryParams.get("errorCode");
  const invoiceId: any = queryParams.get("invoiceId");
  const tenantId: any = queryParams.get("tenantId");
  const synctype: any = queryParams.get("synctype");

  useEffect(() => {
    fetchGetXeroDetailsForCompany();
    fetchGetTrackingCategories();
    fetchXeroAccountsCodes();
    fetchTaxRates();
  }, []);

  function fetchGetTrackingCategories(showToast = false) {
    setDisableSave(true);
    getTrackingCategories(
      {
        companyId: +(localStorage.getItem("companyId") || 0),
      },
      showToast
    ).then((data) => {
      setTrackingCategories(data?.tracking_category_list);
      setDisableSave(false);
    });
  }

  function fetchGetXeroDetailsForCompany() {
    setDisableSave(true);
    getXeroDetailsForCompany().then((data) => {
      setXeroDetails(data);
      console.log(data);
      setSimplifiedRetention(!!data?.simplified_retention_accounting);
      setInitialSimplifiedRetention(!!data?.simplified_retention_accounting);
      setPtToXeroBankAutoCreate(!!data?.pt_to_xero_bank_auto_create);
      setInitialPtToXeroBankAutoCreate(!!data?.pt_to_xero_bank_auto_create);
      setXeroToPtBankAutoCreate(!!data?.xero_to_pt_bank_auto_create);
      setInitialXeroToPtBankAutoCreate(!!data?.xero_to_pt_bank_auto_create);
      setPtToXeroContactAutoCreate(!!data?.pt_to_xero_contact_auto_create);
      setXeroToPtContactAutoCreate(!!data?.xero_to_pt_contact_auto_create);
      setPtToXeroProjectAutoCreate(!!data?.pt_to_xero_project_auto_create);
      setXeroToPtProjectAutoCreate(!!data?.xero_to_pt_project_auto_create);
      setPtToXeroContractAutoCreate(!!data?.pt_to_xero_contract_auto_create);
      setXeroToPtContractAutoCreate(!!data?.xero_to_pt_contract_auto_create);
      setSyncContactFinancialToXero(!!data?.sync_contact_financial_to_xero);
      setSyncContactFinancialToPt(!!data?.sync_contact_financial_to_pt);
      setSmartContractAutoCreate(!!data?.smart_contract_auto_create);
      const formValue = {
        retention_receivable_retained_code:
          data?.retention_receivable_retained_code || "",
        retention_receivable_release_code:
          data?.retention_receivable_release_code || "",
        retention_payable_retained_code:
          data?.retention_payable_retained_code || "",
        retention_payable_release_code:
          data?.retention_payable_release_code || "",
        liability_receivable_code: data?.liability_receivable_code || "",
        liability_payable_code: data?.liability_payable_code || "",
        invoice_code: data?.invoice_code || "",
        bill_code: data?.bill_code || "",
        contract_category_id: data?.contract_category_id || null,
        project_category_id: data?.project_category_id || "",
        pt_to_xero_bill_as_draft: data?.pt_to_xero_bill_as_draft || "",
        pt_to_xero_invoice_as_draft: data?.pt_to_xero_invoice_as_draft || "",
        pt_to_xero_payment_as_draft: data?.pt_to_xero_payment_as_draft || "",
        xero_to_pt_bill_as_draft: data?.xero_to_pt_bill_as_draft || "",
        xero_to_pt_invoice_as_draft: data?.xero_to_pt_invoice_as_draft || "",
        xero_to_pt_payment_as_draft: data?.xero_to_pt_payment_as_draft || "",
        invoice_tax_code: data?.invoice_tax_code || "",
        bill_tax_code: data?.bill_tax_code || "",
        wait_time: data?.wait_time || "",
      };
      settingsFormik.setValues(formValue);
      setInitialFormikValue(formValue);
      setDisableSave(false);
    });
  }

  function fetchXeroAccountsCodes() {
    getXeroAccountCodes({
      getAccountCodesInput: {
        company_id: +(localStorage.getItem("companyId") || 0),
      },
    }).then((data) => {
      const enriched = (data || []).map((acc: any) => ({
        ...acc,
        displayName: acc.code ? `${acc.code} - ${acc.name}` : acc.name,
      }));
      setAccountCodesList(enriched);
    });
  }

  function fetchTaxRates(showLoader = false) {
    if (showLoader) setTaxCheckLoading(true);
    return getTaxRates({
      getTaxTypeInput: {
        company_id: +(localStorage.getItem("companyId") || 0),
      },
    })
      .then((data) => {
        const xeroRates = Array.isArray(data) ? data : [];
        setXeroTaxRates(xeroRates);

        // Merge canonical list with whatever Xero actually has.
        // Canonical entries that aren't in Xero are kept in the dropdown
        // but greyed out so users can't accidentally pick one that will
        // fail downstream when syncing claims/bills.
        const xeroByType = new Map(
          xeroRates.map((r: any) => [r.type, r] as [string, any])
        );
        const merged: any[] = canonicalXeroTaxCodes.map((c) => {
          const inXero = xeroByType.get(c.type);
          return {
            type: c.type,
            name: inXero?.name
              ? inXero.name
              : `${c.name} (not in Xero)`,
            disabled: !inXero,
          };
        });

        // Append any extras that exist in Xero but aren't in our canonical list.
        const canonicalTypes = new Set(
          canonicalXeroTaxCodes.map((c) => c.type)
        );
        xeroRates
          .filter((r: any) => r?.type && !canonicalTypes.has(r.type))
          .forEach((r: any) =>
            merged.push({ type: r.type, name: r.name, disabled: false })
          );

        setTaxCodeOptions(merged);
      })
      .finally(() => {
        if (showLoader) setTaxCheckLoading(false);
      });
  }

  async function createMissingTaxCode(canonical: any) {
    setCreatingTaxType(canonical.type);
    try {
      const payload = {
        createTaxTypeInput: {
          company_id: +(localStorage.getItem("companyId") || 0),
          display_name: canonical.name,
          report_tax_type: canonical.report_tax_type,
          tax_component: [
            {
              component_name: canonical.component_name || "GST",
              is_compound: false,
              rate: canonical.rate,
            },
          ],
        },
      };
      const result = await createTaxTypeApi(payload);
      if (result === true) {
        await fetchTaxRates();
      }
    } finally {
      setCreatingTaxType(null);
    }
  }

  async function disconnect() {
    setDisableSave(true);
    await disconnectFromXero({
      disconnectFromXeroId: xeroDetails.integration_list_id,
      type: "disconnect",
    });
    router.push(AppRoutes.USER_INTEGRATION);
  }

  const [simplifiedRetention, setSimplifiedRetention] = useState(false);
  const [initialSimplifiedRetention, setInitialSimplifiedRetention] = useState(false);
  const [ptToXeroBankAutoCreate, setPtToXeroBankAutoCreate] = useState(false);
  const [initialPtToXeroBankAutoCreate, setInitialPtToXeroBankAutoCreate] = useState(false);
  const [xeroToPtBankAutoCreate, setXeroToPtBankAutoCreate] = useState(false);
  const [initialXeroToPtBankAutoCreate, setInitialXeroToPtBankAutoCreate] = useState(false);
  const [ptToXeroContactAutoCreate, setPtToXeroContactAutoCreate] = useState(false);
  const [xeroToPtContactAutoCreate, setXeroToPtContactAutoCreate] = useState(false);
  const [ptToXeroProjectAutoCreate, setPtToXeroProjectAutoCreate] = useState(false);
  const [xeroToPtProjectAutoCreate, setXeroToPtProjectAutoCreate] = useState(false);
  const [ptToXeroContractAutoCreate, setPtToXeroContractAutoCreate] = useState(false);
  const [xeroToPtContractAutoCreate, setXeroToPtContractAutoCreate] = useState(false);
  const [syncContactFinancialToXero, setSyncContactFinancialToXero] = useState(false);
  const [syncContactFinancialToPt, setSyncContactFinancialToPt] = useState(false);
  const [smartContractAutoCreate, setSmartContractAutoCreate] = useState(false);

  const validationSchemaXeroAccountCode = Yup.object().shape({
    invoice_code: Yup.string().required("Invoice code is required"),
    company_id: Yup.number(),
    bill_code: Yup.string().required("Bill code is required"),
    pt_to_xero_bill_as_draft: Yup.string().required(
      "Sync bill as draft is required"
    ),
    pt_to_xero_invoice_as_draft: Yup.string().required(
      "Sync invoice as draft is required"
    ),
    project_category_id: Yup.string().required("Project is required"),
    invoice_tax_code: Yup.string().required("Invoice tax code is required"),
    bill_tax_code: Yup.string().required("Bill tax code is required"),
    // wait_time: Yup.string().required("Execution wait time is required"),
    retention_payable_retained_code: Yup.string().required(
      "Retention payable retained code is required"
    ),
    retention_payable_release_code: Yup.string().required(
      "Retention payable release code is required"
    ),
    retention_receivable_retained_code: Yup.string().required(
      "Retention Receivable retained code is required"
    ),
    retention_receivable_release_code: Yup.string().required(
      "Retention Receivable release code is required"
    ),
    liability_payable_code: simplifiedRetention
      ? Yup.string().notRequired()
      : Yup.string().required("Liability payable code is required"),
    liability_receivable_code: simplifiedRetention
      ? Yup.string().notRequired()
      : Yup.string().required("Liability Receivable code is required"),
  });
  const settingsFormik = useFormik({
    initialValues: {
      retention_receivable_retained_code: "",
      retention_receivable_release_code: "",
      retention_payable_retained_code: "",
      retention_payable_release_code: "",
      liability_receivable_code: "",
      liability_payable_code: "",
      invoice_code: "",
      bill_code: "",
      contract_category_id: null,
      project_category_id: "",
      pt_to_xero_bill_as_draft: "",
      pt_to_xero_invoice_as_draft: "",
      pt_to_xero_payment_as_draft: "",
      xero_to_pt_bill_as_draft: "",
      xero_to_pt_invoice_as_draft: "",
      xero_to_pt_payment_as_draft: "",
      invoice_tax_code: "",
      bill_tax_code: "",
      wait_time: null,
    },
    validationSchema: validationSchemaXeroAccountCode,
    onSubmit: async (values) => {
      console.log(values);
      if (values.contract_category_id == values.project_category_id) {
        showErrorToast(
          "The Project and Contract tracking categories must not be identical."
        );
        return;
      }
      setDisableSave(true);
      const {
        retention_receivable_retained_code,
        retention_receivable_release_code,
        retention_payable_retained_code,
        retention_payable_release_code,
        liability_receivable_code,
        liability_payable_code,
        invoice_code,
        bill_code,
        contract_category_id,
        project_category_id,
        pt_to_xero_bill_as_draft,
        pt_to_xero_invoice_as_draft,
        pt_to_xero_payment_as_draft,
        xero_to_pt_bill_as_draft,
        xero_to_pt_invoice_as_draft,
        xero_to_pt_payment_as_draft,
        invoice_tax_code,
        bill_tax_code,
        wait_time,
      } = values;
      const payload = {
        retention_receivable_retained_code,
        retention_receivable_release_code,
        retention_payable_retained_code,
        retention_payable_release_code,
        liability_receivable_code: simplifiedRetention ? "" : liability_receivable_code,
        liability_payable_code: simplifiedRetention ? "" : liability_payable_code,
        invoice_code,
        bill_code,
        contract_category_id: contract_category_id || null,
        project_category_id,
        id: localStorage.getItem("xeroIntegrationId"),
        pt_to_xero_bill_as_draft,
        pt_to_xero_invoice_as_draft,
        pt_to_xero_payment_as_draft,
        xero_to_pt_bill_as_draft,
        xero_to_pt_invoice_as_draft,
        xero_to_pt_payment_as_draft,
        invoice_tax_code,
        bill_tax_code,
        wait_time,
        simplified_retention_accounting: simplifiedRetention,
        pt_to_xero_bank_auto_create: ptToXeroBankAutoCreate,
        xero_to_pt_bank_auto_create: xeroToPtBankAutoCreate,
        pt_to_xero_contact_auto_create: ptToXeroContactAutoCreate,
        xero_to_pt_contact_auto_create: xeroToPtContactAutoCreate,
        pt_to_xero_project_auto_create: ptToXeroProjectAutoCreate,
        xero_to_pt_project_auto_create: xeroToPtProjectAutoCreate,
        pt_to_xero_contract_auto_create: ptToXeroContractAutoCreate,
        xero_to_pt_contract_auto_create: xeroToPtContractAutoCreate,
        sync_contact_financial_to_xero: syncContactFinancialToXero,
        sync_contact_financial_to_pt: syncContactFinancialToPt,
        smart_contract_auto_create: smartContractAutoCreate,
      };
      await updateSettings({ updateSettingsInput: payload }, setDisableSave);
      setInitialFormikValue(values);
      fetchGetXeroDetailsForCompany();
      if (syncId) {
        switch (errorCode) {
          case "MISSING_CONTRACT_TRACKING_CATEGORY_ID_TO_PAYTRADE_IN_ADD_INVOICE":
          case "MISMATCH_PROJECT_TRACKING_CATEGORY_ID_TO_PAYTRADE_IN_ADD_INVOICE":
          case "MISMATCH_CONTRACT_TRACKING_CATEGORY_ID_TO_PAYTRADE_IN_ADD_INVOICE":
          case "MISSING_CONTRACT_TRACKING_CATEGORY_ID_TO_PAYTRADE_IN_ADD_BILL":
          case "MISMATCH_CONTRACT_TRACKING_CATEGORY_ID_TO_PAYTRADE_IN_ADD_BILL":
          case "MISMATCH_PROJECT_TRACKING_CATEGORY_ID_TO_PAYTRADE_IN_ADD_BILL":
          case "XP_ADD_BILL_MISMATCH_ACCOUNT_FIELD":
          case "XP_ADD_INVOICE_MISMATCH_ACCOUNT_FIELD": {
            const response = await CreateBillsInPaytrade({
              companyId: +(localStorage.getItem("companyId") || 0),
              invoiceId: invoiceId,
            });
            if (response) {
              router.push(`/user/integrations/xero/syncLogDetails/${syncId}`);
            }
            break;
          }
          case "MISSING_PROJECT_TRACKING_CATEGORY_ID_TO_PAYTRADE_IN_SYNC_BILL":
          case "MISSING_CONTRACT_TRACKING_CATEGORY_ID_TO_PAYTRADE_IN_SYNC_BILL": {
            const response = await SyncAllInvoicesOrBillsByCompanyId({
              companyId: +(localStorage.getItem("companyId") || 0),
              syncId: syncId,
              type: "bill",
            });
            if (response) {
              router.push(`/user/integrations/xero/syncLogDetails/${syncId}`);
            }
            break;
          }
          case "MISSING_PROJECT_TRACKING_CATEGORY_ID_TO_PAYTRADE_IN_SYNC_INVOICE":
          case "MISSING_CONTRACT_TRACKING_CATEGORY_ID_TO_PAYTRADE_IN_SYNC_INVOICE": {
            const response = await SyncAllInvoicesOrBillsByCompanyId({
              companyId: +(localStorage.getItem("companyId") || 0),
              syncId: syncId,
              type: "invoice",
            });
            if (response) {
              router.push(`/user/integrations/xero/syncLogDetails/${syncId}`);
            }
            break;
          }
          case "WH_MISSING_PROJECT_CATEGORY_ID":
          case "SCHEDULER_MISSING_PROJECT_CATEGORY_ID":
          case "WH_MISSING_CONTRACT_CATEGORY_ID":
          case "SCHEDULER_MISSING_CONTRACT_CATEGORY_ID":
          case "WH_PROJECT_CATEGORY_ID_MISMATCH":
          case "SCHEDULER_PROJECT_CATEGORY_ID_MISMATCH":
          case "WH_CONTRACT_CATEGORY_ID_MISMATCH":
          case "SCHEDULER_CONTRACT_CATEGORY_ID_MISMATCH":
          case "WH_MISSING_ACCOUNT_FIELDS":
          case "SCHEDULER_MISSING_ACCOUNT_FIELDS":
          case "WH_ACCOUNT_FIELDS_MISMATCH":
          case "SCHEDULER_ACCOUNT_FIELDS_MISMATCH":
          case "WH_MISSING_TAX_FIELDS":
          case "SCHEDULER_MISSING_TAX_FIELDS":
          case "SCHEDULER_TAX_FIELDS_MISMATCH":
          case "WH_TAX_FIELDS_MISMATCH": {
            const response = await CreateClaimInPaytrade({
              associatedRetentionSubPaymentId: null,
              retentionId: null,
              invoiceId: invoiceId || null,
              tenantId: tenantId || null,
              syncId: syncId,
              syncRunType: synctype || null,
            });
            if (response) {
              router.push(`/user/integrations/xero/syncLogDetails/${syncId}`);
            }
            break;
          }
          case "PD_MISSING_PROJECT_TRACKING_CATEGORY_ID":
          case "PD_MISSING_CONTRACT_TRACKING_CATEGORY_ID":
          case "PD_MISSING_ACCOUNT_FIELD":
          case "PD_MISSING_TAX_FIELD": {
            const response = await CreatePaymentInXero({
              payload: {
                amount: +queryParams.get("amount") || null,
                bank_account_id: +queryParams.get("bank_account_id") || null,
                cash_retention: queryParams.get("cash_retention")
                  ? true
                  : false,
                payment_date: queryParams.get("payment_date") || null,
                payment_id: +queryParams.get("payment_id") || null,
                retention_account:
                  +queryParams.get("retention_account") || null,
                retention_amount: +queryParams.get("retention_amount") || null,
                syncId: syncId,
              },
            });
            if (response) {
              router.push(`/user/integrations/xero/syncLogDetails/${syncId}`);
            }
            break;
          }
          case "PD_SYNC_MISSING_PROJECT_TRACKING_CATEGORY_ID":
          case "PD_SYNC_MISSING_CONTRACT_TRACKING_CATEGORY_ID": {
            const response = await SyncAllPaymentsByCompanyId({
              companyId: +(localStorage.getItem("companyId") || 0),
              syncId: syncId,
            });
            if (response) {
              router.push(`/user/integrations/xero/syncLogDetails/${syncId}`);
            }
            break;
          }
          case "SCHEDULER_CONTACT_FINANCIAL_NOT_SYNCED_TO_PT":
          case "SCHEDULER_CONTACT_FINANCIAL_NOT_SYNCED_TO_XERO": {
            const response = await syncAllContactsByCompanyId({
              companyId: +(localStorage.getItem("companyId") || 0),
            });
            if (response) {
              router.push(`/user/integrations/xero/syncLogDetails/${syncId}`);
            }
            break;
          }
          case "SMART_CONTRACT_INVALID_ROLE":
          case "SMART_CONTRACT_RELATED_ENTITY":
          case "SMART_CONTRACT_TYPE_ERROR":
          case "SMART_CONTRACT_NAME_CONFLICT":
          case "SMART_CONTRACT_GENERAL_ERROR":
          case "SMART_CONTRACT_NO_PTA":
          case "SMART_CONTRACT_NO_RTA":
          case "SMART_CONTRACT_TYPE_MISMATCH":
          case "SMART_CONTRACT_NO_SUPPLIER_FINANCIALS":
          case "SMART_CONTRACT_CONTACT_INCOMPLETE": {
            const response = await CreateClaimInPaytrade({
              associatedRetentionSubPaymentId: null,
              retentionId: null,
              invoiceId: invoiceId || null,
              tenantId: tenantId || null,
              syncId: syncId,
              syncRunType: synctype || null,
            });
            if (response) {
              router.push(`/user/integrations/xero/syncLogDetails/${syncId}`);
            }
            break;
          }
        }
      }
    },
  });
  function handlePageConfirmClose() {
    setDisplayClosePageConfirmation(false);
    onClose();
  }
  function onClose() {
    setDisplayClosePageConfirmation(true);
    router.push("/user/integrations/xero");
  }

  function handlePageConfirmSave() {
    settingsFormik?.handleSubmit();
    setDisplayClosePageConfirmation(false);
    return true;
  }

  const addNewAccountFormik = useFormik({
    initialValues: {
      enable_payments_to_account: false,
      description: null,
      code: null,
      account_type: null,
      account_name: null,
    },
    validationSchema: Yup.object().shape({
      code: Yup.string().required("Code is required"),
      account_type: Yup.string().required("Account type is required"),
      account_name: Yup.string().required("Account name is required"),
    }),
    onSubmit: async (values) => {
      setDisableSave(true);
      const {
        enable_payments_to_account,
        description,
        code,
        account_type,
        account_name,
      } = values;
      const payload = {
        createAccountInput: {
          enable_payments_to_account,
          description: (description as unknown as string)?.trim() || null,
          company_id: +(localStorage.getItem("companyId") || 0),
          code: (code as unknown as string)?.trim() || null,
          account_type,
          account_name: (account_name as unknown as string)?.trim() || null,
        },
      };
      const response = await addNewAccountApi(payload, setDisableSave);
      if (response == true) {
        fetchXeroAccountsCodes();
        setShowAddNewAccount(false);
        addNewAccountFormik.resetForm();
        return true;
      } else {
        if (response == "Please enter a unique Name.") {
          addNewAccountFormik.setErrors({ account_name: response });
        } else if (response == "Please enter a unique Code.") {
          addNewAccountFormik.setErrors({ code: response });
        }
        if (
          response == "Please enter a unique Code., Please enter a unique Name."
        ) {
          addNewAccountFormik.setErrors({
            account_name: "Please enter a unique Name.",
          });
          addNewAccountFormik.setErrors({
            code: "Please enter a unique Code.",
          });
        }
      }
      return false;
    },
  });
  const allSuggestedAccounts = [
    { label: "Invoice Code", account_type: "REVENUE", accountTypeLabel: "Revenue", code: "200", account_name: "Sales Revenue", description: "Revenue from invoices sent via PayTrade" },
    { label: "Bill Code", account_type: "DIRECTCOSTS", accountTypeLabel: "Direct Costs", code: "400", account_name: "Cost of Sales", description: "Expenses from bills received via PayTrade" },
    { label: "Retention Payable Retained", account_type: "CURRLIAB", accountTypeLabel: "Current Liability", code: "500", account_name: "Retention Held", description: "Retention amounts you are holding (payable)" },
    { label: "Retention Payable Release", account_type: "CURRLIAB", accountTypeLabel: "Current Liability", code: "502", account_name: "Retention Released", description: "Retention amounts released to subcontractors" },
    { label: "Retention Receivable Retained", account_type: "CURRENT", accountTypeLabel: "Current Asset", code: "503", account_name: "Retention Receivable Held", description: "Retention amounts held from you by others" },
    { label: "Retention Receivable Release", account_type: "CURRENT", accountTypeLabel: "Current Asset", code: "504", account_name: "Retention Receivable Released", description: "Retention amounts released back to you" },
    { label: "Liability Payable", account_type: "CURRLIAB", accountTypeLabel: "Current Liability", code: "501", account_name: "Current Liability", description: "Payable liabilities during defects period" },
    { label: "Liability Receivable", account_type: "CURRENT", accountTypeLabel: "Current Asset", code: "506", account_name: "Receivable Liability", description: "Receivable liabilities during defects period" },
  ];
  const suggestedAccounts = simplifiedRetention
    ? allSuggestedAccounts.filter((a) => !a.label.startsWith("Liability"))
    : allSuggestedAccounts;

  function prefillAccount(preset: typeof suggestedAccounts[0]) {
    addNewAccountFormik.setFieldValue("account_type", preset.account_type);
    addNewAccountFormik.setFieldValue("code", preset.code);
    addNewAccountFormik.setFieldValue("account_name", preset.account_name);
    addNewAccountFormik.setFieldValue("description", preset.description);
    setAccountType({ value: preset.account_type, label: preset.accountTypeLabel } as any);
  }

  const [reportTaxType, setReportTaxType] = useState("");

  const ValidationSchema = (report_tax_type: string) =>
    Yup.object().shape({
      display_name: Yup.string()
        .trim()
        .required("Tax rate display name is required"),
      report_tax_type: Yup.string().trim().required("Tax type is required"),
      tax_component: Yup.array().of(
        Yup.object().shape({
          rate: Yup.number().test(
            "rate-required-conditionally",
            function (value, formData) {
              const { path, createError } = this;
              if (
                ["INPUT", "OUTPUT"].includes(report_tax_type) &&
                (value === 0 ||
                  value === undefined ||
                  String(value).trim() === "")
              ) {
                return createError({
                  path,
                  message: "Tax percentage is required",
                });
              }
              return true;
            }
          ),
          component_name: Yup.string()
            .trim()
            .required("Tax component name is required"),
          is_compound: Yup.boolean(),
        })
      ),
    });

  const createTaxTypeFormik = useFormik({
    initialValues: {
      display_name: "",
      report_tax_type: "",
      tax_component: [
        {
          rate: "",
          is_compound: false,
          component_name: "",
          keyId: uuidv4(),
        },
      ],
    },
    validationSchema: ValidationSchema(reportTaxType),
    onSubmit: async (values) => {
      const payload = {
        createTaxTypeInput: {
          company_id: +(localStorage.getItem("companyId") || 0),
          display_name: values?.display_name?.trim(),
          report_tax_type: values?.report_tax_type?.trim(),
          tax_component: values?.tax_component.map((val) => {
            return {
              component_name: val.component_name?.trim(),
              is_compound: val.is_compound,
              rate: +val.rate || 0,
            };
          }),
        },
      };
      const response = await createTaxTypeApi(payload);
      if (response == true) {
        fetchTaxRates();
        setShowAddNewTaxRate(false);
        createTaxTypeFormik.resetForm();
        return true;
      } else {
        if (response == "Tax rate name must be unique.") {
          createTaxTypeFormik.setErrors({ display_name: response });
        }
        // else if (response == "Please enter a unique Code.") {
        //   createTaxTypeFormik.setErrors({ code: response });
        // }
      }
      return false;
    },
  });
  useEffect(() => {
    setReportTaxType(createTaxTypeFormik.values.report_tax_type);
  }, [createTaxTypeFormik.values.report_tax_type]);
  const addComponent = async () => {
    const errors = await createTaxTypeFormik.validateForm();
    const taxComponentErrors = errors.tax_component;

    if (Array.isArray(taxComponentErrors) && taxComponentErrors.some(Boolean)) {
      const touchedComponents = createTaxTypeFormik.values.tax_component.map(
        () => ({
          rate: true,
          is_compound: true,
          component_name: true,
        })
      );

      createTaxTypeFormik.setTouched({
        ...createTaxTypeFormik.touched,
        tax_component: touchedComponents,
      });

      return;
    }
    const { tax_component } = createTaxTypeFormik.values;
    let addedFormValues = [
      ...structuredClone(tax_component),
      {
        rate: "",
        is_compound: false,
        component_name: "",
        keyId: uuidv4(),
      },
    ];
    createTaxTypeFormik.setFieldValue("tax_component", addedFormValues);
  };

  const handleDeleteComponent = (indexToDelete: number) => {
    const { tax_component } = createTaxTypeFormik.values;
    const updatedComponents = tax_component.filter(
      (_, idx) => idx !== indexToDelete
    );
    createTaxTypeFormik.setFieldValue("tax_component", updatedComponents);
  };

  const disableAndResetRateValue = (value: string) => {
    if (value !== "INPUT" && value !== "OUTPUT") {
      createTaxTypeFormik.setFieldValue(
        "tax_component",
        createTaxTypeFormik.values.tax_component.map((val) => ({
          ...val,
          rate: "",
        }))
      );
    }
  };
  const removeAllCheckCompoundExceptIndex = (indexToKeep: number) => {
    createTaxTypeFormik.setFieldValue(
      "tax_component",
      createTaxTypeFormik.values.tax_component.map((item, index) => ({
        ...item,
        is_compound: index === indexToKeep,
      }))
    );
  };

  const calculateTotalAndEffectiveTax = () => {
    const taxComponents = createTaxTypeFormik.values.tax_component;
    const hasCompound = taxComponents.some((tax) => tax.is_compound);
    let effectiveTaxRatePercent = 0;
    let totalSimpleTax = 0;
    if (hasCompound) {
      let totalMultiplier = 1;
      taxComponents.forEach((val) => {
        const rate = +val.rate || 0;
        totalMultiplier *= 1 + rate / 100;
      });
      effectiveTaxRatePercent = (totalMultiplier - 1) * 100;
    }
    taxComponents.forEach((val) => {
      totalSimpleTax += +val.rate || 0;
    });

    effectiveTaxRatePercent = +effectiveTaxRatePercent.toFixed(2);
    setTaxData({
      totalSimpleTax,
      effectiveTaxRatePercent,
    });
  };

  useEffect(() => {
    calculateTotalAndEffectiveTax();
  }, [createTaxTypeFormik.values.tax_component]);

  async function deleteXero() {
    setDisableSave(true);
    await disconnectFromXero({
      disconnectFromXeroId: localStorage.getItem("xeroIntegrationId"),
      type: "delete",
    });
    router.push("/user/integrations");
  }

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.USER_DASHBOARD,
              },
              {
                name: "Integrations",
                path: AppRoutes.USER_INTEGRATION,
              },
              {
                name: "Xero",
                path: AppRoutes.USER_XERO,
              },
            ]}
            activeRoute={"Settings"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Settings</h1>
            <p>Manage your xero settings</p>
            <p
              style={{
                color:
                  xeroDetails?.integration_status == "Connected - active"
                    ? "green"
                    : "red",
              }}
            >
              {xeroDetails?.integration_status}
            </p>
          </div>
        </div>
        {disableSave && (
          <div
            className="skeleton"
            style={{ width: "100%", height: "100vh" }}
          ></div>
        )}
        {!disableSave && (
          <div className="pt_fullpage">
            <div className="pt_expandtable">
              <details open>
                <summary>Xero Access</summary>
                <div className="grid pt_infocol">
                  <div>
                    <h5>Status</h5>
                    {xeroDetails?.status}
                  </div>
                  <div>
                    <h5>Xero account</h5>
                    {xeroDetails?.tenant_name}
                  </div>
                  <div>
                    <CustomButton
                      buttonName="Disconnect"
                      iconClassName="fa-light fa-unlink"
                      buttonType={buttonType.CONTRAST_SMALL}
                      actionType="button"
                      disabled={disableSave}
                      onClick={() => {
                        disconnect();
                      }}
                      styles={{ margin: "5px" }}
                    />
                    {xeroDetails?.integration_status == "Disconnected" && (
                      <CustomButton
                        buttonName="Reconnect"
                        iconClassName="fa-light fa-link"
                        buttonType={buttonType.CONTRAST_SMALL}
                        actionType="button"
                        disabled={disableSave}
                        onClick={() => {
                          disconnect();
                        }}
                        styles={{ margin: "5px" }}
                      />
                    )}
                    {!["Connected - paused", "Disconnected"].includes(
                      xeroDetails?.integration_status
                    ) && (
                      <CustomButton
                        buttonName="Pause"
                        iconClassName="fa-light fa-pause"
                        buttonType={buttonType.CONTRAST_SMALL}
                        actionType="button"
                        disabled={disableSave}
                        onClick={async () => {
                          setDisableSave(true);
                          await pauseOrUnpauseXero({
                            pauseOrUnpauseXeroId:
                              localStorage.getItem("xeroIntegrationId"),
                            isPaused: true,
                          });
                          fetchGetXeroDetailsForCompany();
                          setDisableSave(false);
                        }}
                        styles={{ margin: "5px" }}
                      />
                    )}
                    {xeroDetails?.integration_status ===
                      "Connected - paused" && (
                      <CustomButton
                        buttonName="Unpause"
                        iconClassName="fa-light fa-play"
                        buttonType={buttonType.CONTRAST_SMALL}
                        actionType="button"
                        disabled={disableSave}
                        onClick={async () => {
                          setDisableSave(true);
                          await pauseOrUnpauseXero({
                            pauseOrUnpauseXeroId:
                              localStorage.getItem("xeroIntegrationId"),
                            isPaused: false,
                          });
                          fetchGetXeroDetailsForCompany();
                          setDisableSave(false);
                        }}
                        styles={{ margin: "5px" }}
                      />
                    )}
                    {!["Connected - paused", "Disconnected"].includes(
                      xeroDetails?.integration_status
                    ) && (
                      <CustomButton
                        buttonName="Delete"
                        iconClassName="fa-light fa-trash"
                        buttonType={buttonType.CONTRAST_SMALL}
                        actionType="button"
                        disabled={disableSave}
                        onClick={() => {
                          setXeroDeleteModal(true);
                        }}
                        styles={{ margin: "5px" }}
                      />
                    )}
                  </div>
                </div>
              </details>
            </div>
            <div className="pt_expandtable">
              <details open>
                <summary>Paytrade &gt; xero syncing</summary>
                <p style={{ color: "#666", fontSize: "13px", margin: "8px 0 16px", lineHeight: "1.5" }}>
                  Choose how PayTrade data is sent to Xero. Setting an item to "Yes" means it will arrive in Xero as a draft, giving you a chance to review and approve it there. Setting it to "No" means it will be created in Xero as approved and ready to process straight away.
                </p>
                <div className="grid pt_infocol">
                  <div>
                    <h5>
                      Sync invoice as draft? <span className="required">*</span>
                    </h5>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"pt_to_xero_invoice_as_draft"}
                      placeholder=""
                      renderKey={"value"}
                      valueKey={"label"}
                      onChange={(e: any) => {
                        settingsFormik?.setFieldValue(
                          "pt_to_xero_invoice_as_draft",
                          e
                        );
                      }}
                      value={settingsFormik.values.pt_to_xero_invoice_as_draft}
                      options={yesNoOptions}
                      showError={
                        settingsFormik.touched.pt_to_xero_invoice_as_draft &&
                        settingsFormik.errors.pt_to_xero_invoice_as_draft
                      }
                      onBlur={settingsFormik.handleBlur(
                        "pt_to_xero_invoice_as_draft"
                      )}
                      error={
                        settingsFormik?.errors?.pt_to_xero_invoice_as_draft
                      }
                    />
                  </div>
                  <div>
                    <h5>
                      Sync bill as draft?<span className="required">*</span>
                    </h5>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"paymentToAccount"}
                      placeholder=""
                      renderKey={"value"}
                      valueKey={"label"}
                      onChange={(e: any) => {
                        settingsFormik?.setFieldValue(
                          "pt_to_xero_bill_as_draft",
                          e
                        );
                      }}
                      value={settingsFormik.values.pt_to_xero_bill_as_draft}
                      options={yesNoOptions}
                      showError={
                        settingsFormik.touched.pt_to_xero_bill_as_draft &&
                        settingsFormik.errors.pt_to_xero_bill_as_draft
                      }
                      onBlur={settingsFormik.handleBlur(
                        "pt_to_xero_bill_as_draft"
                      )}
                      error={settingsFormik?.errors?.pt_to_xero_bill_as_draft}
                    />
                  </div>
                  <div>
                    <h5>
                      Sync payments as draft?<span className="required">*</span>
                    </h5>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"paymentToAccount"}
                      renderKey={"value"}
                      valueKey={"label"}
                      onChange={(e: any) => {
                        settingsFormik?.setFieldValue(
                          "pt_to_xero_payment_as_draft",
                          e
                        );
                      }}
                      value={settingsFormik.values.pt_to_xero_payment_as_draft}
                      options={yesNoOptions}
                      placeholder=""
                      disabled={true}
                      showError={
                        settingsFormik.touched.pt_to_xero_payment_as_draft &&
                        settingsFormik.errors.pt_to_xero_payment_as_draft
                      }
                      onBlur={settingsFormik.handleBlur(
                        "pt_to_xero_payment_as_draft"
                      )}
                      error={
                        settingsFormik?.errors?.pt_to_xero_payment_as_draft
                      }
                    />
                  </div>
                </div>
              </details>
            </div>
            <div className="pt_expandtable">
              <details open>
                <summary>xero syncing &gt; Paytrade</summary>
                <p style={{ color: "#666", fontSize: "13px", margin: "8px 0 16px", lineHeight: "1.5" }}>
                  Choose how changes made in Xero are received by PayTrade. Setting an item to "Yes" means it will appear in PayTrade as a draft so you can review it first. Setting it to "No" means it will be imported as approved.
                </p>
                <div className="grid pt_infocol">
                  <div>
                    <h5>
                      Sync invoice as draft?<span className="required">*</span>
                    </h5>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"paymentToAccount"}
                      renderKey={"value"}
                      valueKey={"label"}
                      onChange={(e: any) => {
                        settingsFormik?.setFieldValue(
                          "xero_to_pt_invoice_as_draft",
                          e
                        );
                      }}
                      value={settingsFormik.values.xero_to_pt_invoice_as_draft}
                      options={yesNoOptions}
                      placeholder=""
                      disabled={false}
                      // disableAllOptions={true}
                      showError={
                        settingsFormik.touched.xero_to_pt_invoice_as_draft &&
                        settingsFormik.errors.xero_to_pt_invoice_as_draft
                      }
                      onBlur={settingsFormik.handleBlur(
                        "xero_to_pt_invoice_as_draft"
                      )}
                      error={
                        settingsFormik?.errors?.xero_to_pt_invoice_as_draft
                      }
                    />
                  </div>
                  <div>
                    <h5>
                      Sync bill as draft?<span className="required">*</span>
                    </h5>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"paymentToAccount"}
                      renderKey={"value"}
                      valueKey={"label"}
                      onChange={(e: any) => {
                        settingsFormik?.setFieldValue(
                          "xero_to_pt_bill_as_draft",
                          e
                        );
                      }}
                      value={settingsFormik.values.xero_to_pt_bill_as_draft}
                      options={yesNoOptions}
                      placeholder=""
                      disabled={false}
                      // disableAllOptions={true}
                      showError={
                        settingsFormik.touched.xero_to_pt_bill_as_draft &&
                        settingsFormik.errors.xero_to_pt_bill_as_draft
                      }
                      onBlur={settingsFormik.handleBlur(
                        "xero_to_pt_bill_as_draft"
                      )}
                      error={settingsFormik?.errors?.xero_to_pt_bill_as_draft}
                    />
                  </div>
                  <div>
                    <h5>
                      Sync payments as draft?<span className="required">*</span>
                    </h5>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"paymentToAccount"}
                      renderKey={"value"}
                      valueKey={"label"}
                      onChange={(e: any) => {
                        settingsFormik?.setFieldValue(
                          "xero_to_pt_payment_as_draft",
                          e
                        );
                      }}
                      value={settingsFormik.values.xero_to_pt_payment_as_draft}
                      options={yesNoOptions}
                      placeholder=""
                      disabled={false}
                      disableAllOptions={true}
                      showError={
                        settingsFormik.touched.xero_to_pt_payment_as_draft &&
                        settingsFormik.errors.xero_to_pt_payment_as_draft
                      }
                      onBlur={settingsFormik.handleBlur(
                        "xero_to_pt_payment_as_draft"
                      )}
                      error={
                        settingsFormik?.errors?.xero_to_pt_payment_as_draft
                      }
                    />
                  </div>
                </div>
              </details>
            </div>
            <div className="pt_expandtable">
              <details open>
                <summary>Bank account auto-creation</summary>
                <p style={{ color: "#666", fontSize: "13px", margin: "8px 0 16px", lineHeight: "1.5" }}>
                  Control whether new bank accounts are automatically created in the other system when they are added.
                </p>
                <div className="grid pt_infocol">
                  <div>
                    <h5>Auto-create PayTrade accounts in Xero?</h5>
                    <p style={{ color: "#888", fontSize: "12px", margin: "0 0 8px" }}>
                      When a new bank account is added in PayTrade, it will be automatically created in Xero during the next sync.
                    </p>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"pt_to_xero_bank_auto_create"}
                      placeholder=""
                      renderKey={"value"}
                      valueKey={"label"}
                      onChange={(e: any) => {
                        setPtToXeroBankAutoCreate(e === "Yes");
                      }}
                      value={ptToXeroBankAutoCreate ? "Yes" : "No"}
                      options={yesNoOptions}
                    />
                  </div>
                  <div>
                    <h5>Auto-create Xero accounts in PayTrade?</h5>
                    <p style={{ color: "#888", fontSize: "12px", margin: "0 0 8px" }}>
                      When a new bank account is found in Xero, it will be created in PayTrade as a <strong>draft</strong> during the next sync.
                    </p>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"xero_to_pt_bank_auto_create"}
                      placeholder=""
                      renderKey={"value"}
                      valueKey={"label"}
                      onChange={(e: any) => {
                        setXeroToPtBankAutoCreate(e === "Yes");
                      }}
                      value={xeroToPtBankAutoCreate ? "Yes" : "No"}
                      options={yesNoOptions}
                    />
                    {xeroToPtBankAutoCreate && (
                      <p style={{ color: "#c0392b", fontSize: "12px", margin: "8px 0 0", fontStyle: "italic" }}>
                        Warning: Accounts created from Xero will be in draft status. Any syncs involving these accounts will produce errors until the required fields (account type, financial institution, opening date, etc.) are completed.
                      </p>
                    )}
                  </div>
                </div>
              </details>
            </div>
            <div className="pt_expandtable">
              <details open>
                <summary>Contact auto-creation</summary>
                <p style={{ color: "#666", fontSize: "13px", margin: "8px 0 16px", lineHeight: "1.5" }}>
                  Control whether new contacts (clients and suppliers) are automatically created in the other system when they are added.
                </p>
                <div className="grid pt_infocol">
                  <div>
                    <h5>Auto-create PayTrade contacts in Xero?</h5>
                    <p style={{ color: "#888", fontSize: "12px", margin: "0 0 8px" }}>
                      When a new client or supplier is added in PayTrade, they will be automatically created as a contact in Xero during the next sync.
                    </p>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"pt_to_xero_contact_auto_create"}
                      placeholder=""
                      renderKey={"value"}
                      valueKey={"label"}
                      onChange={(e: any) => {
                        setPtToXeroContactAutoCreate(e === "Yes");
                      }}
                      value={ptToXeroContactAutoCreate ? "Yes" : "No"}
                      options={yesNoOptions}
                    />
                  </div>
                  <div>
                    <h5>Auto-create Xero contacts in PayTrade?</h5>
                    <p style={{ color: "#888", fontSize: "12px", margin: "0 0 8px" }}>
                      When a new contact is found in Xero, they will be created in PayTrade during the next sync. Xero&apos;s customer/supplier flags determine the type.
                    </p>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"xero_to_pt_contact_auto_create"}
                      placeholder=""
                      renderKey={"value"}
                      valueKey={"label"}
                      onChange={(e: any) => {
                        setXeroToPtContactAutoCreate(e === "Yes");
                      }}
                      value={xeroToPtContactAutoCreate ? "Yes" : "No"}
                      options={yesNoOptions}
                    />
                    {xeroToPtContactAutoCreate && (
                      <p style={{ color: "#c0392b", fontSize: "12px", margin: "8px 0 0", fontStyle: "italic" }}>
                        Note: Contacts marked as &quot;Customer&quot; in Xero will be created as Clients. All others will be created as Suppliers. You can change the type after import.
                      </p>
                    )}
                  </div>
                </div>
              </details>
            </div>
            <div className="pt_expandtable">
              <details open>
                <summary>Contact financial details sync</summary>
                <p style={{ color: "#666", fontSize: "13px", margin: "8px 0 16px", lineHeight: "1.5" }}>
                  Control whether bank account details (account name, number, BSB) are automatically synced between mapped contacts. Only the first account per contact is synced. Imported accounts default to Cash Account type.
                </p>
                <div className="grid pt_infocol">
                  <div>
                    <h5>Sync PayTrade account details to Xero?</h5>
                    <p style={{ color: "#888", fontSize: "12px", margin: "0 0 8px" }}>
                      When a mapped contact in PayTrade has account details but the Xero contact does not have batch payment details, the first account will be synced to Xero during the next sync.
                    </p>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"sync_contact_financial_to_xero"}
                      placeholder=""
                      renderKey={"value"}
                      valueKey={"label"}
                      onChange={(e: any) => {
                        setSyncContactFinancialToXero(e === "Yes");
                      }}
                      value={syncContactFinancialToXero ? "Yes" : "No"}
                      options={yesNoOptions}
                    />
                  </div>
                  <div>
                    <h5>Sync Xero financial details to PayTrade?</h5>
                    <p style={{ color: "#888", fontSize: "12px", margin: "0 0 8px" }}>
                      When a mapped contact in Xero has batch payment details but the PayTrade contact has no account details, the financial details will be imported as a Cash Account during the next sync.
                    </p>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"sync_contact_financial_to_pt"}
                      placeholder=""
                      renderKey={"value"}
                      valueKey={"label"}
                      onChange={(e: any) => {
                        setSyncContactFinancialToPt(e === "Yes");
                      }}
                      value={syncContactFinancialToPt ? "Yes" : "No"}
                      options={yesNoOptions}
                    />
                    {syncContactFinancialToPt && (
                      <p style={{ color: "#c0392b", fontSize: "12px", margin: "8px 0 0", fontStyle: "italic" }}>
                        Note: Imported accounts will default to Cash Account type. You can change the account type after import — this will not trigger a sync error as account type is a PayTrade-only field.
                      </p>
                    )}
                  </div>
                </div>
              </details>
            </div>
            <div className="pt_expandtable">
              <details open>
                <summary>Project auto-creation</summary>
                <p style={{ color: "#666", fontSize: "13px", margin: "8px 0 16px", lineHeight: "1.5" }}>
                  Control whether new projects are automatically created in the other system when they are added.
                </p>
                <div className="grid pt_infocol">
                  <div>
                    <h5>Auto-create PayTrade projects in Xero?</h5>
                    <p style={{ color: "#888", fontSize: "12px", margin: "0 0 8px" }}>
                      When a new project is added in PayTrade, it will be automatically created in Xero as a tracking category option during the next sync.
                    </p>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"pt_to_xero_project_auto_create"}
                      placeholder=""
                      renderKey={"value"}
                      valueKey={"label"}
                      onChange={(e: any) => {
                        setPtToXeroProjectAutoCreate(e === "Yes");
                      }}
                      value={ptToXeroProjectAutoCreate ? "Yes" : "No"}
                      options={yesNoOptions}
                    />
                  </div>
                  <div>
                    <h5>Auto-create Xero projects in PayTrade?</h5>
                    <p style={{ color: "#888", fontSize: "12px", margin: "0 0 8px" }}>
                      When a new project tracking option is found in Xero, it will be created in PayTrade during the next sync.
                    </p>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"xero_to_pt_project_auto_create"}
                      placeholder=""
                      renderKey={"value"}
                      valueKey={"label"}
                      onChange={(e: any) => {
                        setXeroToPtProjectAutoCreate(e === "Yes");
                      }}
                      value={xeroToPtProjectAutoCreate ? "Yes" : "No"}
                      options={yesNoOptions}
                    />
                  </div>
                </div>
              </details>
            </div>
            <div className="pt_expandtable">
              <details open>
                <summary>Contract auto-creation</summary>
                <p style={{ color: "#666", fontSize: "13px", margin: "8px 0 16px", lineHeight: "1.5" }}>
                  Control whether new contracts are automatically created in the other system when they are added.
                </p>
                <div className="grid pt_infocol">
                  <div>
                    <h5>Auto-create PayTrade contracts in Xero?</h5>
                    <p style={{ color: "#888", fontSize: "12px", margin: "0 0 8px" }}>
                      When a new contract is added in PayTrade, it will be automatically created in Xero as a tracking category option during the next sync.
                    </p>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"pt_to_xero_contract_auto_create"}
                      placeholder=""
                      renderKey={"value"}
                      valueKey={"label"}
                      onChange={(e: any) => {
                        setPtToXeroContractAutoCreate(e === "Yes");
                      }}
                      value={ptToXeroContractAutoCreate ? "Yes" : "No"}
                      options={yesNoOptions}
                    />
                  </div>
                  <div>
                    <h5>Auto-create Xero contracts in PayTrade?</h5>
                    <p style={{ color: "#888", fontSize: "12px", margin: "0 0 8px" }}>
                      When a new contract tracking option is found in Xero, it will be created in PayTrade during the next sync.
                    </p>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"xero_to_pt_contract_auto_create"}
                      placeholder=""
                      renderKey={"value"}
                      valueKey={"label"}
                      onChange={(e: any) => {
                        setXeroToPtContractAutoCreate(e === "Yes");
                      }}
                      value={xeroToPtContractAutoCreate ? "Yes" : "No"}
                      options={yesNoOptions}
                    />
                  </div>
                </div>
              </details>
            </div>
            <div className="pt_expandtable">
              <details open>
                <summary>Smart contract auto-creation</summary>
                <p style={{ color: "#666", fontSize: "13px", margin: "8px 0 16px", lineHeight: "1.5" }}>
                  When enabled, if a Xero claim (invoice or bill) arrives and no matching contract is found, PayTrade will automatically create a contract using smart defaults based on the project role, contact type, and trust account eligibility.
                </p>
                <div className="grid pt_infocol">
                  <div>
                    <h5>Auto-create contracts from Xero claims?</h5>
                    <p style={{ color: "#888", fontSize: "12px", margin: "0 0 8px" }}>
                      A new contract will be created with the name "[Project] - [Contact] - Smart Contract", status set to In Progress, payment terms of 10 days, and appropriate client/supplier roles derived from the project role and claim type.
                    </p>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"smart_contract_auto_create"}
                      placeholder=""
                      renderKey={"value"}
                      valueKey={"label"}
                      onChange={(e: any) => {
                        setSmartContractAutoCreate(e === "Yes");
                      }}
                      value={smartContractAutoCreate ? "Yes" : "No"}
                      options={yesNoOptions}
                    />
                    {smartContractAutoCreate && (
                      <p style={{ color: "#c0392b", fontSize: "12px", margin: "8px 0 0", fontStyle: "italic" }}>
                        Note: Auto-created contracts use a placeholder contract sum of $99,999,999 and should be reviewed. Related Entity contacts and invalid role/claim combinations will not be auto-created.
                      </p>
                    )}
                  </div>
                </div>
              </details>
            </div>
            <div className="pt_expandtable">
              <details open>
                <summary>Xero account code</summary>
                <p style={{ color: "#666", fontSize: "13px", margin: "8px 0 16px", lineHeight: "1.5" }}>
                  Map each PayTrade transaction type to a Xero account code. These must be configured before syncing.
                  If your Xero chart of accounts already has suitable accounts, simply select them from the dropdowns. If not, click &ldquo;Add new account&rdquo; below and use the suggested values in the table as a starting point.
                </p>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", margin: "0 0 12px" }}>
                  <thead>
                    <tr style={{ background: "#f0f4f8" }}>
                      <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "left" }}>PayTrade Field</th>
                      <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "left" }}>Account Type</th>
                      <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "left" }}>Code</th>
                      <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "left" }}>Name</th>
                      <th style={{ padding: "8px", border: "1px solid #ddd", textAlign: "left" }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}><strong>Invoice Code</strong></td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>Revenue</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>200</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>Sales Revenue</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>Revenue from invoices sent via PayTrade</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}><strong>Bill Code</strong></td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>Direct Costs</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>400</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>Cost of Sales</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>Expenses from bills received via PayTrade</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}><strong>Retention Payable Retained</strong></td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>Current Liability</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>500</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>Retention Held</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>Retention amounts you are holding (payable)</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}><strong>Retention Payable Release</strong></td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>Current Liability</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>502</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>Retention Released</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>Retention amounts released to subcontractors</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}><strong>Retention Receivable Retained</strong></td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>Current Asset</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>503</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>Retention Receivable Held</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>Retention amounts held from you by others</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}><strong>Retention Receivable Release</strong></td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>Current Asset</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>504</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>Retention Receivable Released</td>
                      <td style={{ padding: "8px", border: "1px solid #ddd" }}>Retention amounts released back to you</td>
                    </tr>
                    {!simplifiedRetention && (
                      <>
                        <tr>
                          <td style={{ padding: "8px", border: "1px solid #ddd" }}><strong>Liability Payable</strong></td>
                          <td style={{ padding: "8px", border: "1px solid #ddd" }}>Current Liability</td>
                          <td style={{ padding: "8px", border: "1px solid #ddd" }}>501</td>
                          <td style={{ padding: "8px", border: "1px solid #ddd" }}>Current Liability</td>
                          <td style={{ padding: "8px", border: "1px solid #ddd" }}>Payable liabilities during defects period</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "8px", border: "1px solid #ddd" }}><strong>Liability Receivable</strong></td>
                          <td style={{ padding: "8px", border: "1px solid #ddd" }}>Current Asset</td>
                          <td style={{ padding: "8px", border: "1px solid #ddd" }}>506</td>
                          <td style={{ padding: "8px", border: "1px solid #ddd" }}>Receivable Liability</td>
                          <td style={{ padding: "8px", border: "1px solid #ddd" }}>Receivable liabilities during defects period</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
                <p style={{ color: "#666", fontSize: "13px", margin: "0 0 16px", lineHeight: "1.5" }}>
                  <strong>If a code is already taken:</strong> Xero requires unique codes. If you enter a code that already exists (e.g. 200), you&apos;ll see a &ldquo;Please enter a unique Code&rdquo; error. Simply choose a nearby number instead (e.g. 201, 205) and keep the same Account Type and Name.
                  <br /><br />
                  <strong>Tip:</strong> You can check your existing codes in Xero under Accounting &gt; Chart of Accounts to find available numbers.
                </p>
                <div className="grid pt_infocol">
                  <div>
                    <h5>
                      Invoice code<span className="required">*</span>
                    </h5>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"paymentToAccount"}
                      renderKey={"displayName"}
                      valueKey={"code"}
                      placeholder=""
                      onChange={(value: any) => {
                        settingsFormik?.setFieldValue("invoice_code", value);
                      }}
                      value={settingsFormik.values.invoice_code}
                      options={accountCodesList}
                      showError={
                        settingsFormik.touched.invoice_code &&
                        settingsFormik.errors.invoice_code
                      }
                      onBlur={settingsFormik.handleBlur("invoice_code")}
                      error={settingsFormik?.errors?.invoice_code}
                    />
                  </div>
                  <div>
                    <h5>
                      Bill code<span className="required">*</span>
                    </h5>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"paymentToAccount"}
                      renderKey={"displayName"}
                      valueKey={"code"}
                      placeholder=""
                      onChange={(e: any) => {
                        settingsFormik?.setFieldValue("bill_code", e);
                      }}
                      value={settingsFormik.values.bill_code}
                      options={accountCodesList}
                      showError={
                        settingsFormik.touched.bill_code &&
                        settingsFormik.errors.bill_code
                      }
                      onBlur={settingsFormik.handleBlur("bill_code")}
                      error={settingsFormik?.errors?.bill_code}
                    />
                  </div>
                  <div>
                    <h5>
                      Retention payable retained code
                      <span className="required">*</span>
                    </h5>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"paymentToAccount"}
                      renderKey={"displayName"}
                      valueKey={"code"}
                      placeholder=""
                      onChange={(e: any) => {
                        settingsFormik?.setFieldValue(
                          "retention_payable_retained_code",
                          e
                        );
                      }}
                      value={
                        settingsFormik.values.retention_payable_retained_code
                      }
                      options={accountCodesList}
                      showError={
                        settingsFormik.touched
                          .retention_payable_retained_code &&
                        settingsFormik.errors.retention_payable_retained_code
                      }
                      error={
                        settingsFormik?.errors?.retention_payable_retained_code
                      }
                    />
                  </div>
                  <div>
                    <h5>
                      Retention payable release code
                      <span className="required">*</span>
                    </h5>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"paymentToAccount"}
                      renderKey={"displayName"}
                      valueKey={"code"}
                      placeholder=""
                      onChange={(e: any) => {
                        settingsFormik?.setFieldValue(
                          "retention_payable_release_code",
                          e
                        );
                      }}
                      value={
                        settingsFormik.values.retention_payable_release_code
                      }
                      options={accountCodesList}
                      showError={
                        settingsFormik.touched.retention_payable_release_code &&
                        settingsFormik.errors.retention_payable_release_code
                      }
                      error={
                        settingsFormik?.errors?.retention_payable_release_code
                      }
                    />
                  </div>
                </div>
                <div className="grid pt_infocol">
                  <div>
                    <h5>
                      Retention Receivable retained code
                      <span className="required">*</span>
                    </h5>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"paymentToAccount"}
                      renderKey={"displayName"}
                      valueKey={"code"}
                      placeholder=""
                      onChange={(e: any) => {
                        settingsFormik?.setFieldValue(
                          "retention_receivable_retained_code",
                          e
                        );
                      }}
                      value={
                        settingsFormik.values.retention_receivable_retained_code
                      }
                      options={accountCodesList}
                      showError={
                        settingsFormik.touched
                          .retention_receivable_retained_code &&
                        settingsFormik.errors.retention_receivable_retained_code
                      }
                      error={
                        settingsFormik?.errors
                          ?.retention_receivable_retained_code
                      }
                    />
                  </div>
                  <div>
                    <h5>
                      Retention Receivable release code
                      <span className="required">*</span>
                    </h5>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"paymentToAccount"}
                      renderKey={"displayName"}
                      valueKey={"code"}
                      placeholder=""
                      onChange={(e: any) => {
                        settingsFormik?.setFieldValue(
                          "retention_receivable_release_code",
                          e
                        );
                      }}
                      value={
                        settingsFormik.values.retention_receivable_release_code
                      }
                      options={accountCodesList}
                      showError={
                        settingsFormik.touched
                          .retention_receivable_release_code &&
                        settingsFormik.errors.retention_receivable_release_code
                      }
                      error={
                        settingsFormik?.errors
                          ?.retention_receivable_release_code
                      }
                    />
                  </div>
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={simplifiedRetention}
                      onChange={(e) => {
                        setSimplifiedRetention(e.target.checked);
                        if (e.target.checked) {
                          settingsFormik?.setFieldValue("liability_payable_code", "");
                          settingsFormik?.setFieldValue("liability_receivable_code", "");
                        }
                      }}
                    />
                    <span style={{ fontSize: "13px", fontWeight: 500 }}>
                      Use simplified retention accounting (no liability accounts)
                    </span>
                  </label>
                  <p style={{ color: "#666", fontSize: "12px", margin: "4px 0 0 26px", lineHeight: "1.4" }}>
                    When enabled, retention claims sync to Xero with 2 line items instead of 3.
                    The liability for defects accounts are not required and will not be used during sync.
                  </p>
                </div>
                {!simplifiedRetention && (
                  <div className="grid pt_infocol">
                    <div>
                      <h5>
                        Liability payable code<span className="required">*</span>
                      </h5>
                      <FormikControl
                        control={InputType.SELECT}
                        name={"paymentToAccount"}
                        renderKey={"displayName"}
                        valueKey={"code"}
                        placeholder=""
                        onChange={(e: any) => {
                          settingsFormik?.setFieldValue(
                            "liability_payable_code",
                            e
                          );
                        }}
                        value={settingsFormik.values.liability_payable_code}
                        options={accountCodesList}
                        showError={
                          settingsFormik.touched.liability_payable_code &&
                          settingsFormik.errors.liability_payable_code
                        }
                        error={settingsFormik?.errors?.liability_payable_code}
                      />
                    </div>
                    <div>
                      <h5>
                        Liability Receivable code
                        <span className="required">*</span>
                      </h5>
                      <FormikControl
                        control={InputType.SELECT}
                        name={"paymentToAccount"}
                        renderKey={"displayName"}
                        valueKey={"code"}
                        placeholder=""
                        onChange={(e: any) => {
                          settingsFormik?.setFieldValue(
                            "liability_receivable_code",
                            e
                          );
                        }}
                        value={settingsFormik.values.liability_receivable_code}
                        options={accountCodesList}
                        showError={
                          settingsFormik.touched.liability_receivable_code &&
                          settingsFormik.errors.liability_receivable_code
                        }
                        error={settingsFormik?.errors?.liability_receivable_code}
                      />
                    </div>
                  </div>
                )}
                <div className="grid pt_infocol">
                  <div>
                    <h5>
                      Invoice tax code<span className="required">*</span>
                    </h5>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"invoice_tax_code"}
                      renderKey={"name"}
                      valueKey={"type"}
                      placeholder=""
                      onChange={(e: any) => {
                        settingsFormik?.setFieldValue("invoice_tax_code", e);
                      }}
                      value={settingsFormik.values.invoice_tax_code}
                      options={taxCodeOptions}
                      showError={
                        settingsFormik.touched.invoice_tax_code &&
                        settingsFormik.errors.invoice_tax_code
                      }
                      onBlur={settingsFormik.handleBlur("invoice_tax_code")}
                      error={settingsFormik?.errors?.invoice_tax_code}
                    />
                    {settingsFormik.values.invoice_tax_code &&
                      taxCodeOptions.find(
                        (o) =>
                          o.type === settingsFormik.values.invoice_tax_code
                      )?.disabled && (
                        <small
                          style={{
                            color: "#d97706",
                            display: "block",
                            marginTop: "4px",
                          }}
                        >
                          <i className="fa-solid fa-triangle-exclamation" />{" "}
                          This tax code is not active in Xero — sync will fail
                          until you create it (below) or pick another.
                        </small>
                      )}
                  </div>
                  <div>
                    <h5>
                      Bill tax code<span className="required">*</span>
                    </h5>
                    <FormikControl
                      control={InputType.SELECT}
                      name={"bill_tax_code"}
                      renderKey={"name"}
                      valueKey={"type"}
                      placeholder=""
                      onChange={(e: any) => {
                        settingsFormik?.setFieldValue("bill_tax_code", e);
                      }}
                      value={settingsFormik.values.bill_tax_code}
                      options={taxCodeOptions}
                      showError={
                        settingsFormik.touched.bill_tax_code &&
                        settingsFormik.errors.bill_tax_code
                      }
                      onBlur={settingsFormik.handleBlur("bill_tax_code")}
                      error={settingsFormik?.errors?.bill_tax_code}
                    />
                    {settingsFormik.values.bill_tax_code &&
                      taxCodeOptions.find(
                        (o) => o.type === settingsFormik.values.bill_tax_code
                      )?.disabled && (
                        <small
                          style={{
                            color: "#d97706",
                            display: "block",
                            marginTop: "4px",
                          }}
                        >
                          <i className="fa-solid fa-triangle-exclamation" />{" "}
                          This tax code is not active in Xero — sync will fail
                          until you create it (below) or pick another.
                        </small>
                      )}
                  </div>
                  <div></div>
                </div>
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    padding: "14px 16px",
                    margin: "8px 0 16px",
                    background: "#fafafa",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "14px" }}>
                        Tax code status in Xero
                      </strong>
                      <p
                        style={{
                          color: "#666",
                          fontSize: "12px",
                          margin: "4px 0 0",
                          lineHeight: "1.5",
                        }}
                      >
                        Tax codes greyed out in the dropdowns above don't
                        currently exist in your connected Xero organisation —
                        selecting one would cause sync failures. Click "Create
                        in Xero" to add a missing one, or add it directly in
                        Xero (Accounting &gt; Advanced &gt; Tax rates) and then
                        click Recheck.
                      </p>
                    </div>
                    <CustomButton
                      buttonName={taxCheckLoading ? "Checking…" : "Recheck"}
                      iconClassName="fa-light fa-rotate"
                      buttonType={buttonType.SECONDARY_SMALL}
                      actionType="button"
                      onClick={() => fetchTaxRates(true)}
                      disabled={taxCheckLoading || !!creatingTaxType}
                    />
                  </div>
                  <div style={{ display: "grid", gap: "6px" }}>
                    {canonicalXeroTaxCodes.map((c) => {
                      const inXero = xeroTaxRates.find(
                        (r: any) => r.type === c.type
                      );
                      const isCreating = creatingTaxType === c.type;
                      return (
                        <div
                          key={c.type}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "6px 10px",
                            background: "#fff",
                            border: "1px solid #eee",
                            borderRadius: "4px",
                            fontSize: "13px",
                          }}
                        >
                          <span>
                            {inXero ? (
                              <i
                                className="fa-solid fa-circle-check"
                                style={{
                                  color: "#16a34a",
                                  marginRight: "8px",
                                }}
                              />
                            ) : (
                              <i
                                className="fa-solid fa-triangle-exclamation"
                                style={{
                                  color: "#d97706",
                                  marginRight: "8px",
                                }}
                              />
                            )}
                            <strong>{c.name}</strong>
                            <span
                              style={{ color: "#888", marginLeft: "8px" }}
                            >
                              {inXero
                                ? inXero.name !== c.name
                                  ? `Found in Xero as "${inXero.name}"`
                                  : "Found in Xero"
                                : "Not in Xero"}
                            </span>
                          </span>
                          {!inXero && (
                            <CustomButton
                              buttonName={
                                isCreating ? "Creating…" : "Create in Xero"
                              }
                              iconClassName="fa-light fa-hexagon-plus"
                              buttonType={buttonType.SECONDARY_SMALL}
                              actionType="button"
                              onClick={() => createMissingTaxCode(c)}
                              disabled={
                                isCreating ||
                                taxCheckLoading ||
                                !!creatingTaxType
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <CustomButton
                  buttonName="Add new account"
                  iconClassName="fa-light fa-hexagon-plus"
                  buttonType={buttonType.SECONDARY_SMALL}
                  actionType="button"
                  onClick={() => {
                    setShowAddNewAccount(true);
                  }}
                  disabled={disableSave}
                />
                <CustomButton
                  buttonName="Add new tax rate"
                  iconClassName="fa-light fa-hexagon-plus"
                  buttonType={buttonType.SECONDARY_SMALL}
                  actionType="button"
                  onClick={() => {
                    setShowAddNewTaxRate(true);
                  }}
                  disabled={disableSave}
                  styles={{ margin: "0 15px 15px 15px" }}
                />
              </details>
            </div>
            <div className="pt_expandtable">
              <details open>
                <summary>Map xero tracking category </summary>
                <p style={{ color: "#666", fontSize: "13px", margin: "8px 0 16px", lineHeight: "1.5" }}>
                  Tracking categories let you tag synced invoices and bills in Xero by project or contract name, so you can filter reports by project or contract. Select an existing Xero tracking category for each, or type a name above and click "Create" to add a new one. PayTrade will automatically create the individual tracking options (e.g. each project name) when you sync.
                  <br /><br />
                  <strong>Note:</strong> Xero allows a maximum of 2 tracking categories per organisation. If you already have 2 and need to change one, delete or archive an existing category in Xero first (Settings &gt; Tracking Categories).
                </p>
                <div className="grid pt_infocol">
                  <div>
                    <h5>Create category</h5>
                    <FormikControl
                      name="createCategory"
                      value={createCategory}
                      control={InputType.TEXT_FIELD}
                      onChange={(e: any) => {
                        setCreateCategory(
                          e.target.value.trim() ? e.target.value : ""
                        );
                      }}
                    />
                  </div>
                  <div>
                    <CustomButton
                      buttonName="Create"
                      iconClassName="fa-light fa-floppy-disk"
                      buttonType={buttonType.SECONDARY_SMALL}
                      actionType="button"
                      onClick={() => {
                        setDisableSave(true);
                        createTrackingCategory(
                          {
                            categoryName: createCategory,
                            companyId: +(
                              localStorage.getItem("companyId") || 0
                            ),
                          },
                          setDisableSave
                        );
                      }}
                      styles={{ margin: "15px" }}
                      disabled={disableSave || createCategory.length == 0}
                    />
                  </div>
                </div>
                <div className="grid pt_infocol">
                  <div>
                    <h5>
                      Project<span className="required">*</span>
                    </h5>
                    <FormikControl
                      placeholder="Select tracking category from xero"
                      name="projectTracking"
                      options={trackingCategories}
                      control={InputType.SELECT}
                      renderKey="name"
                      valueKey="id"
                      showError={
                        settingsFormik.touched.project_category_id &&
                        settingsFormik.errors.project_category_id
                      }
                      onBlur={settingsFormik.handleBlur("project_category_id")}
                      error={settingsFormik?.errors?.project_category_id}
                      onChange={(e: any) => {
                        settingsFormik?.setFieldValue("project_category_id", e);
                      }}
                      value={settingsFormik?.values?.project_category_id}
                    />
                  </div>
                  <div>
                    <CustomButton
                      buttonName="Refresh"
                      iconClassName="fa-light fa-refresh"
                      buttonType={buttonType.SECONDARY_SMALL}
                      actionType="button"
                      onClick={() => {
                        fetchGetTrackingCategories(true);
                      }}
                      styles={{ margin: "15px 15px 15px 15px" }}
                      disabled={disableSave}
                    />
                  </div>
                </div>
                <div className="grid pt_infocol">
                  <div>
                    <h5>Contract</h5>
                    <div>
                      <FormikControl
                        placeholder="Select tracking category from xero"
                        name="projectTracking"
                        options={trackingCategories}
                        control={InputType.SELECT}
                        renderKey="name"
                        valueKey="id"
                        onChange={(e: any) => {
                          settingsFormik?.setFieldValue(
                            "contract_category_id",
                            e
                          );
                        }}
                        value={settingsFormik.values.contract_category_id}
                      />
                    </div>
                  </div>
                  <div>
                    {settingsFormik.values.contract_category_id && (
                      <CustomButton
                        buttonName="Clear"
                        iconClassName="fa-light fa-close"
                        buttonType={buttonType.CONTRAST_SMALL}
                        actionType="button"
                        onClick={() => {
                          settingsFormik?.setFieldValue(
                            "contract_category_id",
                            ""
                          );
                        }}
                        styles={{ margin: "15px", width: "88px" }}
                        disabled={disableSave}
                      />
                    )}
                    <CustomButton
                      buttonName="Refresh"
                      iconClassName="fa-light fa-refresh"
                      buttonType={buttonType.SECONDARY_SMALL}
                      actionType="button"
                      onClick={() => {
                        fetchGetTrackingCategories(true);
                      }}
                      styles={{ margin: "15px" }}
                      disabled={disableSave}
                    />
                  </div>
                </div>
              </details>
            </div>
            <div className="pt_expandtable">
              <details open>
                <summary>Sync timing</summary>
                <p style={{ color: "#666", fontSize: "13px", margin: "8px 0 16px", lineHeight: "1.5" }}>
                  When a change is made in Xero, PayTrade waits for this delay before processing it. This allows multiple rapid changes (e.g. editing several invoices in quick succession) to be grouped into a single sync, reducing unnecessary processing. A higher value means fewer syncs but a longer wait before changes appear. The default is 30 seconds (minimum 10).
                </p>
                <div className="grid pt_infocol">
                  <div>
                    <h5>Sync delay (seconds)</h5>
                    <FormikControl
                      control={InputType.TEXT_FIELD}
                      name={"Executionwaittime"}
                      onChange={(e: any) => {
                        const val = e.target.value.trim();

                        if (val === "") {
                          settingsFormik.setFieldValue("wait_time", null);
                          return;
                        }

                        const numericVal = Number(val);
                        if (
                          !isNaN(numericVal) &&
                          numericVal >= 0 &&
                          numericVal <= 60 &&
                          /^[0-9]*$/.test(val)
                        ) {
                          settingsFormik.setFieldValue("wait_time", Math.max(10, numericVal));
                        }
                      }}
                      placeholder="Enter delay in seconds (10–60)"
                      value={settingsFormik.values.wait_time}
                      showError={
                        settingsFormik.touched.wait_time &&
                        settingsFormik.errors.wait_time
                      }
                      error={settingsFormik?.errors?.wait_time}
                    />
                  </div>
                  <div></div>
                  <div></div>
                </div>
              </details>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <CustomButton
                styles={{ height: "40px" }}
                buttonName="Close"
                iconClassName="fa-light fa-close"
                buttonType={buttonType.CONTRAST_SMALL}
                actionType="button"
                disabled={disableSave}
                onClick={() => {
                  if (
                    JSON.stringify(initialFormikValue) ==
                    JSON.stringify(settingsFormik.values) &&
                    simplifiedRetention === initialSimplifiedRetention
                  ) {
                    router.push("/user/integrations/xero");
                  } else {
                    setDisplayClosePageConfirmation(true);
                  }
                }}
              />
              <CustomButton
                buttonName="Save"
                iconClassName="fa-light fa-floppy-disk"
                buttonType={buttonType.SECONDARY}
                actionType="button"
                onClick={() => {
                  console.log(settingsFormik.errors);
                  settingsFormik.handleSubmit();
                }}
                disabled={disableSave}
              />
            </div>
          </div>
        )}
      </div>
      {displayClosePageConfirmation && (
        <BaseModal
          modalId={"settings confirmation"}
          displayModal={displayClosePageConfirmation}
          onClose={handlePageConfirmClose}
          onHeaderIconClose={() => setDisplayClosePageConfirmation(false)}
          onConfirm={handlePageConfirmSave}
          firstButtonName="Yes"
          secondButtonName="Save"
          restrictOncloseFunctionInHeader
        >
          <h4 className="text_center">Are you sure to close and not save?</h4>
        </BaseModal>
      )}
      {showAddNewAccount && (
        <BaseModal
          modalId={"Add new account"}
          displayModal={showAddNewAccount}
          onClose={() => {
            addNewAccountFormik.resetForm();
            setShowAddNewAccount(false);
            setAccountType("");
          }}
          onConfirm={async () => {
            const success = await addNewAccountFormik.submitForm();
            console.log(success);
            if (success) return true;
          }}
          firstButtonName="Cancel"
          secondButtonName="Save"
          title={"Add new account"}
          disableSecondButton={disableSave}
          disableFirstButton={disableSave}
        >
          <div className="pt_infocol">
            <div>
              <h5>Quick add</h5>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {suggestedAccounts.map((preset) => (
                  <button
                    key={preset.code}
                    type="button"
                    className="outline smallbutton"
                    onClick={() => prefillAccount(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h5>
                Account Type <span className="required">*</span>
              </h5>
              <SearchableSelect
                placeholder=""
                name="projectTracking"
                options={accountTypeOptions}
                selectedData={accountType}
                onChange={(selectedOption) => {
                  setAccountType(selectedOption);
                  addNewAccountFormik.handleChange("account_type")(
                    selectedOption.value
                  );
                }}
                isRequired={
                  !addNewAccountFormik?.values?.account_type &&
                  addNewAccountFormik.touched.account_type
                    ? true
                    : false
                }
                errorMessage={addNewAccountFormik.errors.account_type as string}
                renderKey="label"
                valueKey="value"
              />
            </div>
            <div>
              <h5>
                Code <span className="required">*</span>
              </h5>
              <FormikControl
                control={InputType.TEXT_FIELD}
                name={"code"}
                onChange={(e: any) => {
                  addNewAccountFormik?.setFieldValue(
                    "code",
                    e.target.value.trim() ? e.target.value : ""
                  );
                }}
                placeholder=""
                value={addNewAccountFormik.values.code}
                maxLength={10}
                showError={
                  addNewAccountFormik.touched.code &&
                  addNewAccountFormik.errors.code
                }
                onBlur={addNewAccountFormik.handleBlur("code")}
                error={addNewAccountFormik?.errors?.code}
              />
            </div>
            <div>
              <h5>
                Name <span className="required">*</span>
              </h5>
              <FormikControl
                control={InputType.TEXT_FIELD}
                name={"account_name"}
                onChange={(e: any) => {
                  addNewAccountFormik?.setFieldValue(
                    "account_name",
                    e.target.value.trim() ? e.target.value : ""
                  );
                }}
                placeholder=""
                value={addNewAccountFormik.values.account_name}
                maxLength={150}
                showError={
                  addNewAccountFormik.touched.account_name &&
                  addNewAccountFormik.errors.account_name
                }
                onBlur={addNewAccountFormik.handleBlur("account_name")}
                error={addNewAccountFormik?.errors?.account_name}
              />
            </div>
            <div>
              <h5>Description</h5>
              <FormikControl
                control={InputType.TEXT_FIELD}
                name={"description"}
                onChange={(e: any) => {
                  addNewAccountFormik?.setFieldValue(
                    "description",
                    e.target.value.trim() ? e.target.value : ""
                  );
                }}
                placeholder=""
                value={addNewAccountFormik.values.description}
              />
            </div>
          </div>
        </BaseModal>
      )}
      {showAddNewTaxRate && (
        <BaseModal
          modalId={"Add new tax rate"}
          displayModal={showAddNewTaxRate}
          onClose={() => {
            createTaxTypeFormik.resetForm();
            setShowAddNewTaxRate(false);
          }}
          onConfirm={async () => {
            const success = await createTaxTypeFormik.submitForm();
            if (success) return true;
          }}
          firstButtonName="Cancel"
          secondButtonName="Save"
          title={"Add new tax rate"}
          disableSecondButton={disableSave}
          disableFirstButton={disableSave}
        >
          <div className="pt_infocol">
            <div>
              <h5>
                Tax rate display name <span className="required">*</span>
              </h5>
              <FormikControl
                control={InputType.TEXT_FIELD}
                name={"display_name"}
                onChange={(e: any) => {
                  createTaxTypeFormik?.setFieldValue(
                    "display_name",
                    e.target.value.trim() ? e.target.value : ""
                  );
                }}
                placeholder=""
                value={createTaxTypeFormik.values.display_name}
                maxLength={50}
                showError={
                  createTaxTypeFormik.touched.display_name &&
                  createTaxTypeFormik.errors.display_name
                }
                onBlur={createTaxTypeFormik.handleBlur("display_name")}
                error={createTaxTypeFormik?.errors?.display_name}
              />
            </div>
            <div>
              <h5>
                Tax Type <span className="required">*</span>
              </h5>
              <FormikControl
                placeholder=""
                name="report_tax_type"
                options={taxRateOptions}
                control={InputType.SELECT}
                renderKey="label"
                valueKey="value"
                onChange={(e: any) => {
                  createTaxTypeFormik?.setFieldValue("report_tax_type", e);
                  disableAndResetRateValue(e);
                }}
                value={createTaxTypeFormik.values.report_tax_type}
                showError={
                  createTaxTypeFormik.touched.report_tax_type &&
                  createTaxTypeFormik.errors.report_tax_type
                }
                onBlur={createTaxTypeFormik.handleBlur("report_tax_type")}
                error={createTaxTypeFormik?.errors?.report_tax_type}
              />
            </div>
            <h5>Tax components</h5>
            {createTaxTypeFormik.values.tax_component.map(
              (data: any, index: number) => (
                <div key={data.keyId} style={{ marginTop: "20px" }}>
                  <div style={{ display: "flex" }}>
                    <div style={{ width: "60%" }}>
                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        name={`component_name[${index}]`}
                        onChange={(e: any) => {
                          createTaxTypeFormik?.setFieldValue(
                            `tax_component[${index}].component_name`,
                            e.target.value.trim() ? e.target.value : ""
                          );
                        }}
                        placeholder="Component name"
                        value={data?.component_name}
                        maxLength={50}
                        showError={
                          createTaxTypeFormik.touched?.tax_component?.[index]
                            ?.component_name &&
                          typeof createTaxTypeFormik?.errors?.tax_component?.[
                            index
                          ] === "object"
                            ? (
                                createTaxTypeFormik?.errors?.tax_component?.[
                                  index
                                ] as any
                              )?.component_name
                            : undefined
                        }
                        onBlur={createTaxTypeFormik.handleBlur(
                          `tax_component[${index}].component_name`
                        )}
                        error={
                          typeof createTaxTypeFormik?.errors?.tax_component?.[
                            index
                          ] === "object"
                            ? (
                                createTaxTypeFormik?.errors?.tax_component?.[
                                  index
                                ] as any
                              )?.component_name
                            : undefined
                        }
                      />
                    </div>
                    <div style={{ width: "30%", marginLeft: "15px" }}>
                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        name={`rate[${index}]`}
                        onChange={(e: any) => {
                          const value = e.target.value;
                          const valid = /^\d+(\.\d{0,4})?$/.test(value);
                          if (value === "" || valid)
                            createTaxTypeFormik?.setFieldValue(
                              `tax_component[${index}].rate`,
                              e?.target?.value
                            );
                        }}
                        placeholder="Rate"
                        value={data?.rate}
                        maxLength={9}
                        disabled={
                          createTaxTypeFormik.values?.report_tax_type !==
                            "INPUT" &&
                          createTaxTypeFormik.values?.report_tax_type !==
                            "OUTPUT"
                        }
                        showError={
                          createTaxTypeFormik.touched?.tax_component?.[index]
                            ?.rate &&
                          typeof createTaxTypeFormik?.errors?.tax_component?.[
                            index
                          ] === "object"
                            ? (
                                createTaxTypeFormik?.errors?.tax_component?.[
                                  index
                                ] as any
                              )?.rate
                            : undefined
                        }
                        onBlur={createTaxTypeFormik.handleBlur(
                          `tax_component[${index}].rate`
                        )}
                        error={
                          typeof createTaxTypeFormik?.errors?.tax_component?.[
                            index
                          ] === "object"
                            ? (
                                createTaxTypeFormik?.errors?.tax_component?.[
                                  index
                                ] as any
                              )?.rate
                            : undefined
                        }
                      />
                    </div>
                    <div style={{ margin: "10px" }}>%</div>
                  </div>
                  <div style={{ display: "flex" }}>
                    {createTaxTypeFormik.values.tax_component.length > 1 && (
                      <div style={{ marginTop: "15px" }}>
                        <FormikControl
                          control={InputType.CHECKBOX}
                          label={"Compound (apply to taxed subtotal)"}
                          name={"enable_payments_to_this_account" + index}
                          onChange={(event: any) => {
                            createTaxTypeFormik?.setFieldValue(
                              `tax_component[${index}].is_compound`,
                              event.target.checked
                            );
                            if (event.target.checked)
                              removeAllCheckCompoundExceptIndex(index);
                          }}
                          value={data?.is_compound}
                        />
                      </div>
                    )}

                    {index > 0 && (
                      <div>
                        <CustomButton
                          buttonName="Delete"
                          iconClassName="fa-light fa-trash"
                          buttonType={buttonType.CONTRAST_SMALL}
                          actionType="button"
                          onClick={() => handleDeleteComponent(index)}
                          styles={{ margin: "15px 15px 15px 15px" }}
                          disabled={disableSave}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
            <CustomButton
              buttonName="Add a component"
              iconClassName="fa-light fa-plus"
              buttonType={buttonType.SECONDARY_SMALL}
              actionType="button"
              onClick={() => {
                addComponent();
              }}
              styles={{ margin: "15px 15px 15px 15px" }}
              disabled={disableSave}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
            }}
          >
            <div>
              Total tax rate
              <span style={{ marginLeft: "40px" }}>
                {taxData?.totalSimpleTax} %
              </span>
            </div>
            {taxData?.effectiveTaxRatePercent > 0 && (
              <div>
                Effective tax rate
                <span style={{ marginLeft: "20px" }}>
                  {taxData?.effectiveTaxRatePercent} %
                </span>
              </div>
            )}
          </div>
        </BaseModal>
      )}
      {xeroDeleteModal && (
        <BaseModal
          modalId={"xerDelete"}
          title={" "}
          displayModal={xeroDeleteModal}
          onHeaderIconClose={() => setXeroDeleteModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setXeroDeleteModal(false)}
          onConfirm={() => {
            deleteXero();
            return true;
          }}
          firstButtonName="No"
          secondButtonName="Yes"
        >
          <h4 className="text_center">
            Are you sure you wish to delete xero integration?
          </h4>
        </BaseModal>
      )}
    </div>
  );
}
