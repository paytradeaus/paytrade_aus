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
import {
  setSupplierXeroAccountCode,
  viewXeroSyncLog,
} from "../../UserIntegrations/integration.functions";
import { CreateClaimInPaytrade } from "../../UserIntegrations/XeroDashboard/XeroSyncLogDetails/syncLog.functions";
import BaseModal from "@/components/BaseModal";

// Task #155 — Shape of the per-item summary surfaced in the polished
// "items waiting for this contact" modal.
type PendingPromptItem = {
  invoice_id: string;
  status: string; // created | skipped | failed
  reason?: string | null;
  contract_id?: number | null;
};

type PendingPromptData = {
  headline: string;
  totalRetried: number;
  created: number;
  backlog: number;
  items: PendingPromptItem[];
};

type PendingPromptChoice = "process" | "review" | "cancel";

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
  // Task #41 — Per-(supplier × project) Xero account code overrides shown
  // in the AddClientsAndSuppliers form when "variable bill code" mode is on.
  // Rows shape: { id?: string, project_id: number, project_name?: string,
  // account_code: string, _dirty?: boolean, _deleted?: boolean }.
  const [projectAccountCodeOverrides, setProjectAccountCodeOverrides] =
    useState<any[]>([]);
  const [initialProjectAccountCodeOverrides, setInitialProjectAccountCodeOverrides] =
    useState<any[]>([]);

  // Task #155 — State + resolver for the polished "items waiting" modal
  // that replaces the old window.confirm dialog. handleFormSubmit awaits
  // the user's choice via showPendingPrompt() before continuing.
  const [pendingPrompt, setPendingPrompt] = useState<PendingPromptData | null>(
    null,
  );
  const pendingPromptResolverRef = useRef<
    ((choice: PendingPromptChoice) => void) | null
  >(null);

  const fileInputRef = useRef<any>(null); // Reference to the file input
  const router = useRouter();
  const dispatch = useAppDispatch();

  function showPendingPrompt(data: PendingPromptData) {
    return new Promise<PendingPromptChoice>((resolve) => {
      pendingPromptResolverRef.current = resolve;
      setPendingPrompt(data);
    });
  }

  function resolvePendingPrompt(choice: PendingPromptChoice) {
    const resolver = pendingPromptResolverRef.current;
    pendingPromptResolverRef.current = null;
    setPendingPrompt(null);
    if (resolver) resolver(choice);
  }

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
              // BSB must travel as a String so leading zeros (e.g. "064000")
              // survive the wire — backend DTO is `bsb_number: string`. Sending
              // it as Number triggers GraphQL "got invalid value" rejection
              // before the resolver runs (silent save failure on any contact
              // with bank accounts).
              bsb_number: String(data?.bsb_number ?? ""),
              id: null,
            };
          } else {
            const { __typename, addMode, ...restAccountDetails } = data;
            return {
              ...restAccountDetails,
              client_supplier_id: formik?.values?.client_supplier_id,
              bsb_number: String(data?.bsb_number ?? ""),
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
        // Task #41 — After the supplier is created/updated, persist the
        // per-supplier default Xero account code AND the per-project
        // overrides via the dedicated mutation. Failures here are logged
        // but do not block the supplier save flow because each value can
        // also be edited later from the Xero Settings drawer.
        try {
          const supplierIdForOverrides =
            clientsResponse?.client_supplier_id ||
            formik?.values?.client_supplier_id;
          if (supplierIdForOverrides) {
            const initialDefault =
              (formik?.initialValues?.xero_default_account_code ?? "") || "";
            const currentDefault =
              (formik?.values?.xero_default_account_code ?? "") || "";
            if (currentDefault !== initialDefault) {
              await setSupplierXeroAccountCode({
                client_supplier_id: Number(supplierIdForOverrides),
                project_id: null,
                account_code: currentDefault || null,
              });
            }

            // Per-project override diffs.
            const initialByProject = new Map<number, string>();
            for (const row of initialProjectAccountCodeOverrides || []) {
              if (row?.project_id != null) {
                initialByProject.set(
                  Number(row.project_id),
                  String(row.account_code ?? ""),
                );
              }
            }
            const currentByProject = new Map<number, string>();
            for (const row of projectAccountCodeOverrides || []) {
              if (row?._deleted) continue;
              if (row?.project_id != null && row?.account_code) {
                currentByProject.set(
                  Number(row.project_id),
                  String(row.account_code ?? ""),
                );
              }
            }
            // Upserts: rows added or changed.
            const currentEntries = Array.from(currentByProject.entries());
            for (const [pid, code] of currentEntries) {
              if (initialByProject.get(pid) !== code) {
                await setSupplierXeroAccountCode({
                  client_supplier_id: Number(supplierIdForOverrides),
                  project_id: pid,
                  account_code: code || null,
                });
              }
            }
            // Deletes: rows present initially but missing now (or marked deleted).
            const initialKeys = Array.from(initialByProject.keys());
            for (const pid of initialKeys) {
              if (!currentByProject.has(pid)) {
                await setSupplierXeroAccountCode({
                  client_supplier_id: Number(supplierIdForOverrides),
                  project_id: pid,
                  account_code: null,
                });
              }
            }
          }
        } catch (overrideErr) {
          // Non-blocking — supplier save already succeeded.
          console.error(
            "Task #41 — failed to persist Xero account code overrides:",
            overrideErr,
          );
        }

        showSuccessToast(clientsResponse?.message);
        dispatch(setClientsSuppliersData(""));
        dispatch(setAccountDetailsData(""));
        formik.resetForm();

        // Task #154 / #155 — Backend may have replayed queued smart-create
        // attempts that were waiting for this contact's email. If so,
        // surface a polished modal (replacing the old window.confirm) that
        // summarises what just happened and offers three actions:
        //   • Process now  — confirm the auto-replay (no-op on the client,
        //                    backend already processed it)
        //   • Review first — jump to the Xero sync log
        //   • Not now      — dismiss
        try {
          const pr = clientsResponse?.pending_resolutions;
          if (pr?.email_just_added) {
            const totalRetried = Number(pr?.smart_creates_attempted || 0);
            const items: PendingPromptItem[] = Array.isArray(pr?.smart_creates)
              ? pr.smart_creates.map((r: any) => ({
                  invoice_id: String(r?.invoice_id ?? ""),
                  status: String(r?.status ?? ""),
                  reason: r?.reason ?? null,
                  contract_id: r?.contract_id ?? null,
                }))
              : [];
            const created = items.filter((r) => r.status === "created").length;
            // Task #154 — Always prompt when an email was just added on a
            // previously-flagged contact, even if there were zero queued
            // smart-create attempts. The blocked_notices_count covers the
            // wider sync-log backlog (templates 610-613) that the user
            // may want to review independently of smart-create replays.
            const backlog = Number(pr?.blocked_notices_count || 0);
            if (
              (backlog > 0 || totalRetried > 0) &&
              typeof window !== "undefined"
            ) {
              const headline =
                backlog > 0
                  ? `${backlog} item${backlog === 1 ? " was" : "s were"} waiting for this contact's email.`
                  : `Items waiting for this contact's email have been processed.`;
              // Drop the loader so the user can interact with the modal.
              setLoader(false);
              setLoaderInfo("");
              const choice = await showPendingPrompt({
                headline,
                totalRetried,
                created,
                backlog,
                items,
              });
              if (choice === "review") {
                router.push("/user/integrations/xero");
                return;
              }
              // For "process" and "cancel" we continue with the normal
              // post-save flow below. Re-arm the loader so any subsequent
              // smart-contract retry / routeBack feels consistent.
              setLoader(true);
              setLoaderInfo(`${mode} ${entity}...`);
            }
          }
        } catch (prErr) {
          // Non-blocking — supplier save already succeeded.
          console.error(
            "Task #155 — failed to surface pending_resolutions prompt:",
            prErr,
          );
        }

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
        // Task #41 — per-supplier Xero account code override editor state.
        projectAccountCodeOverrides,
        setProjectAccountCodeOverrides,
        initialProjectAccountCodeOverrides,
        setInitialProjectAccountCodeOverrides,
      }}
    >
      {children}
      {pendingPrompt && (
        <BaseModal
          modalId="pending-resolutions-prompt"
          displayModal={!!pendingPrompt}
          title="Items waiting for this contact"
          firstButtonName="Not now"
          middleButtonName="Review first"
          secondButtonName="Process now"
          firstBtnClassTypes="secondary"
          middleBtnClassTypes="secondary"
          secondBtnClassTypes="primary"
          onClose={() => resolvePendingPrompt("cancel")}
          closeOnMiddleButtonClick
          onMiddleButtonClick={() => resolvePendingPrompt("review")}
          onConfirm={() => {
            resolvePendingPrompt("process");
            return true;
          }}
        >
          <div style={{ marginBottom: "var(--space-s)" }}>
            <p style={{ marginBottom: "var(--space-xs)" }}>
              {pendingPrompt.headline}
            </p>
            {pendingPrompt.totalRetried > 0 && (
              <p style={{ marginBottom: "var(--space-xs)" }}>
                <strong>{pendingPrompt.created}</strong> of{" "}
                <strong>{pendingPrompt.totalRetried}</strong> smart-create
                retr{pendingPrompt.totalRetried === 1 ? "y" : "ies"} succeeded.
              </p>
            )}
          </div>
          {pendingPrompt.items.length > 0 && (
            <div
              style={{
                maxHeight: "240px",
                overflowY: "auto",
                border: "1px solid var(--pico-muted-border-color, #e5e7eb)",
                borderRadius: "var(--pico-border-radius, 8px)",
                padding: "var(--space-xs) var(--space-s)",
                marginBottom: "var(--space-s)",
              }}
            >
              <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {pendingPrompt.items.map((item, idx) => {
                  const statusColor =
                    item.status === "created"
                      ? "#16a34a"
                      : item.status === "failed"
                        ? "#dc2626"
                        : "#a16207";
                  return (
                    <li
                      key={`${item.invoice_id}-${idx}`}
                      style={{ marginBottom: "0.35rem" }}
                    >
                      <span style={{ fontFamily: "monospace" }}>
                        {item.invoice_id || "(unknown id)"}
                      </span>{" "}
                      —{" "}
                      <strong style={{ color: statusColor }}>
                        {item.status}
                      </strong>
                      {item.reason ? (
                        <span style={{ color: "var(--pico-muted-color)" }}>
                          {" "}
                          — {item.reason}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <p
            style={{
              fontSize: "0.9em",
              color: "var(--pico-muted-color)",
              marginBottom: 0,
            }}
          >
            Choose <strong>Review first</strong> to open the Xero sync log,
            or <strong>Process now</strong> to acknowledge — these items have
            already been re-attempted in the background.
          </p>
        </BaseModal>
      )}
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
