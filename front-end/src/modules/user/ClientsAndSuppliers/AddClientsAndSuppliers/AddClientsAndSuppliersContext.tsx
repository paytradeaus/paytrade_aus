//default imports
"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  initialValues,
  validationSchema,
} from "./AddClientsAndSuppliers.validations";
import { useFormik } from "formik";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { showSuccessToast } from "@/components/Toaster";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  createContactInPaytradeFromXeroData,
  createContactInPaytradeThroughWebhookFromXeroData,
  CreateOrUpdateContactInPaytrade,
  postAddClientSuppliersFormData,
  updateClientSuppliersById,
} from "./AddClientsAndSuppliers.functions";
import {
  setAccountDetailsData,
  setClientsSuppliersData,
} from "@/redux/slices/clientSuppliersDetails";
import { clientSupplierTypeOptions } from "./AddClientsAndSuppliers.constant";
import { useLoaderContext } from "@/context/useLoader";
import { ADD, EDIT, quickAddRoutes } from "@/shared/constant/general";
import { quickAddOnRoute } from "../../AddUpdateBankAccount/AddUpdateBankAccount.constant";
import { viewXeroSyncLog } from "../../UserIntegrations/integration.functions";
import { CreateClaimInPaytrade } from "../../UserIntegrations/XeroDashboard/XeroSyncLogDetails/syncLog.functions";

const AddClientsAndSuppliersContext: any = createContext(null);

export const AddClientsAndSuppliersContextProvider = ({ children }: any) => {
  const [displayTrainingRecords, setDisplayTrainingRecords] = useState(false);
  const [accountDetailsGridData, setAccountDetailsGridData] = useState<any>([]);
  const [displayAccountRecordsGrid, setDisplayAccountRecordsGrid] =
    useState(false);
  const [selectedType, setSelectedType] = useState<any>();
  const [initialPatchedValues, setInitialPatchedValues] = useState<any>(null);
  const [displayStatusInfo, setDisplayStatusInfo] = useState(false);
  const [routedData, setRoutedData] = useState<any>(null);
  const [syncLogData, setSyncLogData] = useState<any>("");

  const fileInputRef = useRef<any>(null); // Reference to the file input
  const router = useRouter();
  const dispatch = useAppDispatch();

  const deletedAccountDetailsId: any = useAppSelector(
    (state: any) => state?.clientsSuppliers?.deletedAccountDetails
  );

  const queryParams = useSearchParams();
  const params: any = useParams();
  const formik: any = useFormik({
    initialValues,
    validationSchema,
    onSubmit: () => handleFormSubmit(),
  });
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const overviewId = queryParams.get("overview");
  const overviewTab = queryParams.get("from");
  const quickAddClientSupplier: any = queryParams.get("quick-add");
  const syncId = queryParams.get("syncId");

  const { id: slugData } = params;

  useEffect(() => {
    const type = queryParams.get("type");
    if (type) {
      dispatch(setClientsSuppliersData(""));
      dispatch(setAccountDetailsData(""));
      patchClientsSuppliersField(type);
    }
  }, [queryParams.get("type")]);

  useEffect(() => {
    getSyncLogData();
  }, [syncId]);

  async function getSyncLogData() {
    const data = await viewXeroSyncLog({
      viewXeroSyncLogId: syncId,
    });
    setSyncLogData(data);
  }

  async function handleFormSubmit(skipStatusInfo?: boolean) {
    try {
      if (
        formik?.values?.client_supplier_status?.value == "Draft" &&
        !skipStatusInfo
      ) {
        setDisplayStatusInfo(true);
        return true;
      }

      setLoader(true);
      const entity = selectedType === "Client" ? "client" : "supplier";
      const mode =
        slugData?.length && slugData[0] === "add" ? "Saving" : "Updating";
      setLoaderInfo(`${mode} ${entity}...`);
      // Extract necessary values from the formik values
      const {
        isEmailExist,
        isQbccExist,
        isNameExist,
        __typename,
        client_supplier_id,
        ...formValues
      } = formik.values;

      let modifiedAccountDetails = [];

      // Modify account details based on the form submission mode (add or update)
      if (accountDetailsGridData?.length > 0) {
        modifiedAccountDetails = accountDetailsGridData.map((data: any) => {
          if (slugData?.length && slugData[0] === ADD) {
            const { addMode, ...restAccountDetails } = data;
            return {
              ...restAccountDetails,
              bsb_number: Number(data?.bsb_number),
              id: null,
            };
          } else {
            const { __typename, addMode, ...restAccountDetails } = data;
            return {
              ...restAccountDetails,
              client_supplier_id: formik?.values?.client_supplier_id,
              bsb_number: Number(data?.bsb_number),
              id: addMode ? null : restAccountDetails?.id,
            };
          }
        });
      }

      // Prepare data for adding a new client/supplier
      const addPostData = {
        createClientSuppliersDetailInput: {
          business_name: formValues?.business_name,
          client_email_id: formValues?.client_email_id,
          client_phone_no: formValues?.client_phone_no,
          client_supplier_address: formValues?.client_supplier_address,
          client_supplier_name: formValues?.client_supplier_name,
          client_website: formValues?.client_website,
          country: formValues?.country,
          latitude: formValues?.latitude,
          longitude: formValues?.longitude,
          place_id: formValues?.place_id,
          qbcc_number: formValues?.qbcc_number,
          region: formValues?.region,
          company_id: Number(localStorage.getItem("companyId")),
          client_supplier_status: formValues?.client_supplier_status?.value,
          client_supplier_type: formValues?.client_supplier_type?.value,
          entity_type: formValues?.entity_type?.value,
          related_entity: formValues?.related_entity,
          abn_number: formValues?.abn_number?.toString(),
          acn_number: formValues?.acn_number?.toString(),
          tfn_number: formValues?.tfn_number?.toString(),
          account_details: modifiedAccountDetails ?? [],
          // Phase 2 — persist per-contact Xero GST overrides; empty
          // string means "use organisation settings".
          xero_sales_gst_setting:
            formValues?.xero_sales_gst_setting || null,
          xero_purchases_gst_setting:
            formValues?.xero_purchases_gst_setting || null,
        },
      };

      // Prepare data for updating an existing client/supplier
      const updatePostData = {
        updateClientSuppliersDetailInput: {
          ...addPostData?.createClientSuppliersDetailInput,
          id: formValues?.id,
          // client_supplier_id: client_supplier_id,
          removed_account_ids: deletedAccountDetailsId ?? [],
        },
      };

      const createContactInPaytrade = () => {
        if (syncLogData?.error_code == "CONTACT_MISSING_FIELDS") {
          return createContactInPaytradeFromXeroData({
            payload: { ...addPostData?.createClientSuppliersDetailInput },
            syncId,
            companyId: Number(localStorage.getItem("companyId")),
            contactId: syncLogData?.api_payload?.contact_id,
          });
        } else if (syncLogData?.error_code == "WH_CONTACT_MISSING_FIELDS") {
          return createContactInPaytradeThroughWebhookFromXeroData({
            payload: { ...addPostData?.createClientSuppliersDetailInput },
            syncId,
            companyId: Number(localStorage.getItem("companyId")),
            contactId: syncLogData?.api_payload?.contact_id,
            tenantId: syncLogData?.api_payload?.tenant_id,
          });
        } else if (
          syncLogData?.error_code === "SCHEDULER_CONTACT_MISSING_FIELDS"
        ) {
          // 🔹 Scheduler-specific flow
          return CreateOrUpdateContactInPaytrade({
            payload: { ...addPostData?.createClientSuppliersDetailInput },
            syncId,
            companyId: Number(localStorage.getItem("companyId")),
            contactId: syncLogData?.api_payload?.contact_id,
            contactStatus: syncLogData?.api_payload?.contact_status,
            // tenantId: syncLogData?.api_payload?.tenant_id,
          });
        }
        return "";
      };
      // Determine the API function based on the submission mode (add or update)
      const api =
        slugData?.length && slugData[0] === "add"
          ? syncId
            ? createContactInPaytrade()
            : postAddClientSuppliersFormData(addPostData)
          : updateClientSuppliersById(updatePostData);
      // Send request to the backend API

      const clientsResponse: any = await api;

      if (clientsResponse?.status) {
        showSuccessToast(clientsResponse?.message);
        dispatch(setClientsSuppliersData(""));
        dispatch(setAccountDetailsData(""));
        formik.resetForm();

        const smartContractErrorCodes = [
          "SMART_CONTRACT_CONTACT_INCOMPLETE",
          "SMART_CONTRACT_NO_SUPPLIER_FINANCIALS",
          "SMART_CONTRACT_TYPE_MISMATCH",
        ];
        if (
          syncLogData &&
          smartContractErrorCodes.includes(syncLogData?.error_code)
        ) {
          setLoaderInfo("Retrying claim import...");
          await CreateClaimInPaytrade({
            associatedRetentionSubPaymentId: null,
            retentionId: null,
            invoiceId: syncLogData?.api_payload?.invoice_id || null,
            tenantId: syncLogData?.api_payload?.tenant_id || null,
            syncId: syncLogData?.id,
            syncRunType: syncLogData?.api_payload?.sync_run_type || null,
          });
        }

        routeBack();
        setLoader(false);
        setLoaderInfo("");
      } else {
        setLoader(false);
        setLoaderInfo("");
      }
    } catch (err: any) {
      setLoader(false);
      setLoaderInfo("");
    }
  }

  async function patchClientsSuppliersField(clientSupplierType: string) {
    if (clientSupplierType) {
      await formik.setFieldValue(
        "client_supplier_type",
        clientSupplierType === "clients"
          ? clientSupplierTypeOptions[0]
          : clientSupplierTypeOptions[1]
      );
    }
  }

  function routeBack() {
    if (overviewTab && overviewId) {
      if (overviewTab == "overview-clients-and-suppliers") {
        return router.push(`${AppRoutes.USER_PROJECTS_OVERVIEW}/${overviewId}`);
      }
      router.push(
        `${AppRoutes.USER_PROJECTS_OVERVIEW}/${overviewId}?from=${overviewTab}`
      );
    } else if (quickAddClientSupplier) {
      if (routedData?.quickAddFromBankAccount) {
        router.push(
          `${AppRoutes.USER_ADD_BANK_ACCOUNTS}?retrieve-record=${quickAddOnRoute.BANK}`
        );
      } else if (routedData?.quickAddFromContract) {
        if (routedData?.fromDraftContract) {
          // Draft: Return to contract page without retrieve-record
          router.push(
            `${AppRoutes.USER_EDIT_CONTRACTS}/${routedData?.id}?retrieve-record=${quickAddRoutes.RETRIEVE_CONTRACT}`
          );
        } else {
          router.push(
            `${AppRoutes.USER_ADD_CONTRACTS}?retrieve-record=${quickAddRoutes.RETRIEVE_CONTRACT}`
          );
        }
      } else if (routedData?.quickAddFromClaims) {
        router.push(
          `${AppRoutes.USER_ADD_CLAIMS}?retrieve-record=${quickAddRoutes.RETRIEVE_CLAIMS}`
        );
      }
    } else {
      if (syncId) {
        router.push(AppRoutes.USER_SYNC_LOG + syncId);
      } else {
        router.push(AppRoutes.USER_CLIENTS_AND_SUPPLIERS);
      }
    }
  }

  //render Template
  return (
    <AddClientsAndSuppliersContext.Provider
      value={{
        formik,
        displayTrainingRecords,
        setDisplayTrainingRecords,
        accountDetailsGridData,
        setAccountDetailsGridData,
        displayAccountRecordsGrid,
        setDisplayAccountRecordsGrid,
        fileInputRef,
        initialPatchedValues,
        displayStatusInfo,
        setDisplayStatusInfo,
        handleFormSubmit,
        routeBack,
        routedData,
        setRoutedData,
        params,
        quickAddClientSupplier,
        selectedType,
        setSelectedType,
        syncLogData,
      }}
    >
      {children}
    </AddClientsAndSuppliersContext.Provider>
  );
};

// Create a custom hook for using the global context
const useAddClientsAndSuppliersContext = () => {
  const context = useContext(AddClientsAndSuppliersContext);
  if (!context) {
    throw new Error("Error in business profile Context");
  }
  return context;
};

export { useAddClientsAndSuppliersContext };
