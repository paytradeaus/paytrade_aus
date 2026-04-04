import FormikControl from "@/components/FormikControl";
import {
  ADD,
  buttonType,
  InputType,
  quickAddRoutes,
} from "@/shared/constant/general";
import React, { Fragment, useEffect, useState } from "react";
import { useAddUpdateClaimsContext } from "./AddUpdateClaimsContext";
import { setCompanyId } from "@/redux/slices/companyDetails";
import {
  beneficiaryPaymentsModalOptions,
  paymentsModalOptions,
} from "../PayApps/payApps.constant";
import {
  fetchClientSupplierDetailsForPaymentClaim,
  fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier,
  getContractsListByClientSupplierId,
  getProjectsLists,
} from "./AddUpdateClaims.function";
import {
  ClientSupplierBankDetails,
  ClientSupplierToBankDetails,
  paymentTypes,
  retentionRadioOption,
} from "./AddUpdateClaims.constant";
import {
  formatDollars,
  getCompanyIdFromStorage,
  getDatePickerFormat,
} from "@/utils";
import { fetchClientSuppliersList } from "../ClientsAndSuppliers/ClientsAndSuppliersList/clientsAndSuppliers.functions";
import { RootState, useAppSelector } from "@/redux/store";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { ApiResponse } from "@/shared/constant/messages";
import BaseModal, { baseModalConstants } from "@/components/BaseModal";
import CustomButton from "@/components/CustomButton/CustomButton";
import { useSearchParams } from "next/navigation";
import { setPaymentClaims } from "@/redux/slices/subscribeRouteBackDetails";
import _ from "lodash";

export default function DropdownFields() {
  const {
    decodeTokenData,
    importScreen,
    importCompanyId,
    setCompanyExists,
    dispatch,
    ClientSupplierId,
    selectedCompanyId,
    setProjectOpt,
    setAvailablePayments,
    beneficiaryType,
    claimData,
    projectOpt,
    formik,
    togglePaymentReceivables,
    setSelectedProjectId,
    setContractOptions,
    contractOptions,
    selectedProjectID,
    ScreenName,
    RetentionProjectId,
    RetentionContractId,
    mode,
    RPaymentid,
    setPaymentDetails,
    togglePaymentBillables,
    fetchContractsForProject,
    selectedContractID,
    setSelectedContractId,
    isEditable,
    CashRetentionType,
    isThirdPartyRetention,
    setPaymentToOptions,
    selectedSupplierId,
    setSelectedSupplierId,
    isViewMode,
    importClaimIdFromMail,
    overviewProjectId,
    compulsoryAttachments,
    optionalAttachments,
    otherOptionalAttachments,
    router,
    paymentDetails,
    queryParams,
    setRoutePathStoredData,
    setDelegationBankId,
    RetentionId,
    retrieveAfterAddingQuickRecord,
    importClaimsAPIData,
    quickContractId,
    setProjectRole,
    setClientRole,
    retainedDataFromSubscription,
  }: any = useAddUpdateClaimsContext();

  const searchParams = useSearchParams();
  const screen = searchParams.get("screen");
  const importId = searchParams.get("importid");
  const quickProjectId: any = queryParams.get("quickproj_id");
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [showCheckList, setShowCheckList] = useState(false);
  const [retentionTypeFromContract, setRetentionTypeFromContract] =
    useState<string>();
  const [displayCashRetention, setDisplayCashRetention] = useState(false);
  const bothIdsPresent =
    ScreenName === "overview" && RetentionProjectId && RetentionContractId;

  const onlyProjectIdPresent =
    ScreenName === "overview" && RetentionProjectId && !RetentionContractId;

  const onboardingModeData = useAppSelector(
    (state: RootState) => state.userMode.mode
  );

  const localStorageOnboardingMode =
    typeof window !== "undefined" ? localStorage.getItem("userMode") : null;

  const userMode = onboardingModeData || localStorageOnboardingMode;

  useEffect(() => {
    initialInvoke();
    if (screen == "import" && importId && decodeTokenData) {
      setShowCheckList(true);
    }
  }, []);

  useEffect(() => {
    if (
      contractOptions?.length > 0 &&
      ((quickContractId && !formik.values.contractId) ||
        (!quickContractId &&
          formik.values.contractId &&
          !_.isEmpty(retainedDataFromSubscription)))
    ) {
      let ContractValue = formik.values.contractId
        ? formik.values.contractId
        : quickContractId;
      const matchingContract = contractOptions?.find(
        (c: any) => String(c?.contract_id) === String(ContractValue)
      );

      if (matchingContract) {
        onContractChange(matchingContract, true); // 👈 call your existing handler
      }
    }
  }, [quickContractId, contractOptions]);

  useEffect(() => {
    if (quickProjectId && projectOpt?.length > 0 && !formik?.values.projectId) {
      const matchingProject = projectOpt?.find(
        (p: any) => String(p?.project_id) === String(quickProjectId)
      );

      if (matchingProject) {
        onProjectChange(matchingProject); // 👈 call your existing handler
      }
    }
  }, [quickProjectId, projectOpt]);

  function initialInvoke() {
    if (mode === ADD) {
      formik?.setFieldValue("claim_type", paymentTypes[0]?.value);
    }
    if (retrieveAfterAddingQuickRecord == quickAddRoutes.CLAIMS) {
      getStoredBankAccountData();
    }
    if (isThirdPartyRetention) {
      fetchClientSuppliers();
      formik?.setFieldValue("isThirdPartyClaim", true);
    }

    formik?.setFieldValue(
      "cash_retention_type",
      CashRetentionType === "RetentionClaim" ? "Retention claim" : "Claim"
    );
  }

  async function fetchClientSuppliers() {
    try {
      const postData = {
        getClientSupplierListsInput: {
          company_id: getCompanyIdFromStorage(),
          page_number: 1,
          page_size: null,
          client_supplier_status: null,
          client_supplier_type: "Supplier",
        },
      };

      const response = await fetchClientSuppliersList(postData);
      if (response) {
        // Set options for SearchableSelect

        setSupplierOptions(
          response?.client_suppliers_list?.length > 0
            ? response?.client_suppliers_list
            : []
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  const ImportScreen: any = queryParams.get("screen");
  const ImportCompanyId: any = queryParams.get("company_id");

  useEffect(() => {
    fetchDetails();
  }, [
    importCompanyId,
    importScreen,
    selectedCompanyId,
    ClientSupplierId,
    beneficiaryType,
    claimData,
  ]);

  useEffect(() => {
    if (selectedProjectID) {
      if (!ClientSupplierId) {
        fetchContractsForProject(formik?.values?.projectId);
      }
      // Reset all other fields to empty strings
      const { values, initialValues } = formik || {};
      formik.setValues({
        projectId: values.projectId || selectedProjectID, // Keep the ProjectId value
        contractId: "",
        paymentTerms: "",
        supplier: "",
        address: "",
        receivedDate: "",
        sentDate: "",
        dueDate: "",
        claimReference: "",
        memo: "",
        paymentToAccount: "",
        paymentFromAccount: "",
        paymentToAccountName: "",
        paymentToBSB: "",
        paymentToAccountNumber: "",
        paymentFromAccountName: "",
        paymentFromBSB: "",
        paymentFromAccountNumber: "",
        client: "", // Reset the Client field
        cash_retention_type: values.cash_retention_type,
        claim_type: values.claim_type,
        claimItems: importClaimIdFromMail
          ? values.claimItems
          : initialValues.claimItems,
        claimAmount: importClaimIdFromMail ? values.claimAmount : "",
        isGstChecked: importClaimIdFromMail ? values.isGstChecked : false,
        subTotal: importClaimIdFromMail ? values.subTotal : 0,
        gstAmount: importClaimIdFromMail ? values.gstAmount : 0,
        totalAmount:
          !claimData?.projectId && isEditable
            ? values.totalAmount
            : importClaimIdFromMail
            ? values.totalAmount
            : 0,
        isThirdPartyClaim: values?.isThirdPartyClaim,
        thirdPartySupplier: "",
      });
    }
  }, [selectedProjectID, formik?.values?.claim_type]);

  useEffect(() => {
    if (selectedContractID) {
      getClientSupplierDetails(selectedContractID);
    }
  }, [selectedContractID]);

  useEffect(() => {
    (async () => {
      if (!ClientSupplierId) {
        let projectListData: any = [];
        if (RetentionProjectId) {
          projectListData = await getProjectsLists(selectedCompanyId);
        }

        if (
          RetentionProjectId &&
          projectListData &&
          projectListData?.length > 0
        ) {
          const projectOpts =
            projectListData.find(
              (each: any) => each.project_id == RetentionProjectId
            ) || ({} as any);

          if (projectOpts?.project_id) {
            formik.setFieldValue("projectId", projectOpts?.project_id);
            setSelectedProjectId(projectOpts?.project_id?.toString());
          }

          // Find the contract in contractOptions array
          const selectedContract: any = contractOptions.find(
            (contract: any) => contract?.contract_id == RetentionContractId
          );

          // Set ContractId field value if the contract is found
          if (selectedContract) {
            formik.setFieldValue("contractId", selectedContract?.contract_id);
            setSelectedContractId(selectedContract?.contract_id);
            formik.setFieldValue(
              "PaymentTerms",
              selectedContract?.payment_terms
            );
          }
        }
      }
    })();
  }, [RetentionProjectId, RetentionContractId, contractOptions]);

  useEffect(() => {
    fetchDetails();
  }, [ImportCompanyId, ImportScreen]);

  useEffect(() => {
    fetchSupplierDetails();
  }, [selectedSupplierId]);

  async function fetchSupplierDetails() {
    if (selectedSupplierId) {
      const payload = {
        contract_id: Number(selectedContractID),
        client_supplier_id: Number(selectedSupplierId),
        payment_id: RPaymentid ? Number(RPaymentid) : null,
      };

      const clientSupplierDetails =
        await fetchPaymentFromAccountDetailsAndPaymentToAccountListOfSelectedSupplier(
          payload
        );
      if (clientSupplierDetails) {
        const { payment_from_account_details, payment_to_accounts_list } =
          clientSupplierDetails;

        // Setting payment from account details
        if (payment_from_account_details) {
          Object.keys(ClientSupplierBankDetails).forEach((k) => {
            formik.setFieldValue(
              k,
              payment_from_account_details?.[ClientSupplierBankDetails?.[k]] ||
                ""
            );
          });
        } else {
          Object.keys(ClientSupplierBankDetails).forEach((k) => {
            formik.setFieldValue(k, "");
          });
        }

        if (clientSupplierDetails?.client_supplier_address) {
          formik.setFieldValue(
            "address",
            clientSupplierDetails?.client_supplier_address
          );
        }
        // Handling payment to accounts list
        if (payment_to_accounts_list && payment_to_accounts_list.length > 0) {
          setPaymentToOptions(payment_to_accounts_list);
          if (payment_to_accounts_list?.length === 1) {
            const singleData = payment_to_accounts_list[0];
            handlePaymentToDetails(singleData);
          } else {
            formik.setFieldValue("PaymentToAccount", "");
            Object.keys(ClientSupplierToBankDetails).forEach((key) => {
              formik.setFieldValue(key, "");
            });
          }
        } else {
          // Set default values directly in the form
          Object.keys(ClientSupplierToBankDetails).forEach((key) => {
            formik.setFieldValue(key, "");
          });
          formik.setFieldValue("PaymentToAccount", "");
        }

        setPaymentDetails({
          payment_from_account_details,
          payment_to_accounts_list,
        });
      } else {
        Object.keys(ClientSupplierBankDetails).forEach((k) => {
          formik.setFieldValue(k, "");
        });
      }
    }
  }

  function handlePaymentToDetails(singleData: any) {
    formik.setFieldValue(
      "paymentToAccount",
      singleData?.payment_to_account_id?.toString()
    );
    formik.setFieldValue(
      "paymentToAccountName",
      singleData?.payment_to_account_name
    );
    formik.setFieldValue(
      "paymentToBSB",
      singleData?.payment_to_account_bsb_number
    );
    formik.setFieldValue(
      "paymentToAccountNumber",
      singleData?.payment_to_account_number
    );
  }

  async function fetchDetails() {
    try {
      const { companySpecificRoles } = decodeTokenData || {};

      if (importScreen === "import") {
        // Check if importCompanyId exists in the companySpecificRoles array from the token
        const companyFound = companySpecificRoles?.some(
          (role: any) => role.companyId === Number(importCompanyId)
        );

        if (!companyFound) {
          setCompanyExists(false);
          // If importCompanyId is not found, route to another page
          // router.push(AppRoutes.USER_LOGIN);

          return;
        }

        // Check if isSystemAdded is true and set the ProfileType accordingly
        const userPrivilage = companySpecificRoles?.find(
          (role: any) => role.companyId === Number(importCompanyId)
        );

        if (userPrivilage?.isSystemAdded === true) {
          // If isSystemAdded is true, set profile type to "User"
          localStorage.setItem("ProfileType", "User");
        } else {
          // Otherwise, set profile type to "Business"
          localStorage.setItem("ProfileType", "Business");
        }

        // If company is found, set necessary data in storage and cookies
        setCompanyExists(true);
        localStorage.setItem("companyId", importCompanyId);
        dispatch(setCompanyId(importCompanyId));
      }

      if (!ClientSupplierId) {
        const projectListData: any = await getProjectsLists(
          importScreen === "import"
            ? Number(importCompanyId)
            : selectedCompanyId
        );

        if (overviewProjectId && projectListData?.length > 0) {
          const selectedObj = projectListData.find(
            (x: any) => x?.id == overviewProjectId
          );
          formik?.setFieldValue("projectId", selectedObj?.project_id);
          if (mode === ADD) {
            setSelectedProjectId(selectedObj?.project_id);
          }
        }

        if (projectListData && projectListData?.length > 0) {
          setProjectRole(projectListData[0].project_role);
          setProjectOpt(projectListData);
        }
      }

      // Set available payment options
      setAvailablePayments(
        beneficiaryType === "Self" || claimData?.beneficiary_type === "Self"
          ? beneficiaryPaymentsModalOptions
          : paymentsModalOptions
      );
    } catch (error) {
      console.log("error:", error);
    }
  }

  function onProjectChange(selectedOption: any) {
    formik.setFieldValue("projectId", selectedOption?.project_id);

    // Reset the contract field value to initial
    formik.setFieldValue("contractId", ""); // Set it to an empty string or initial value
    formik.setFieldValue("paymentTerms", "");
    setClientRole(null);

    const selectedProject = projectOpt.find(
      (project: any) => project.project_id == selectedOption?.project_id
    );
    if (selectedProject) {
      setProjectRole(selectedProject?.project_role);
      setSelectedProjectId(selectedProject?.project_id);
      setSelectedContractId(null);
      // Fetch contracts based on the selected project ID
      if (ClientSupplierId) fetchContractsOfClient(selectedProject?.project_id);
    }
    // ✅ Finally clear retainedDataFromSubscription
    if (!_.isEmpty(retainedDataFromSubscription)) {
      dispatch(setPaymentClaims({}));
    }
  }

  async function fetchContractsOfClient(projectId: number) {
    const contracts = await getContractsListByClientSupplierId({
      client_supplier_id: Number(ClientSupplierId),
      project_id: projectId,
    });
    if (contracts) {
      setContractOptions(contracts);
    }
  }

  async function onContractChange(selectedOption: any, isInitialCall = false) {
    let isReduxCleared = false;
    // ✅ Finally clear retainedDataFromSubscription
    if (!_.isEmpty(retainedDataFromSubscription) && !isInitialCall) {
      isReduxCleared = true;
      await dispatch(setPaymentClaims({}));
    }
    formik.setFieldValue("contractId", selectedOption?.contract_id);
    const ClientRole = selectedOption?.client_supplier_role;
    setClientRole(ClientRole);

    setSelectedContractId(selectedOption?.contract_id);
    formik.setFieldValue("paymentTerms", selectedOption?.payment_terms);
    // Only do this section if retainedDataFromSubscription.claimsData is empty
    if (_.isEmpty(retainedDataFromSubscription) || isReduxCleared) {
      if (!importClaimIdFromMail) {
        if (selectedOption?.retention_type?.toLowerCase() === "cash") {
          formik.setFieldValue("cashRetention", "Retention");
        } else {
          formik.setFieldValue("cashRetention", "No Retention");
        }
      }
      setRetentionTypeFromContract(selectedOption?.retention_type);
    }
  }

  function checkImportCondition() {
    if (importClaimIdFromMail) {
      formik.setFieldValue(
        "cashRetention",
        importClaimsAPIData?.cash_retention ? "Retention" : "No Retention"
      );
      if (importClaimsAPIData?.cash_retention) {
        formik.setFieldValue(
          "retentionPercentage",
          importClaimsAPIData?.retention_percentage
        );

        formik.setFieldValue(
          "retentionAmount",
          importClaimsAPIData?.retention_amount
        );
      }
    }
  }

  useEffect(() => {
    if (
      formik?.values?.cashRetention == "Retention" &&
      formik?.values?.subTotal > 0 &&
      formik?.values?.retentionPercentage > 0
    ) {
      let retentionAmount =
        (+formik?.values?.retentionPercentage / 100) * formik?.values?.subTotal;
      formik.setFieldValue(
        "retentionAmount",
        formatDollars(retentionAmount.toFixed(2))
      );
    }
  }, [
    formik?.values?.subTotal,
    formik?.values?.cashRetention,
    formik?.values?.retentionPercentage,
  ]);

  async function getClientSupplierDetails(contractIdOverride?: any) {
    const { contractId, cash_retention_type } = formik.values || {};
    const effectiveContractId = contractIdOverride ?? contractId;
    const effectiveCashRetentionType = cash_retention_type || "Claim";

    if (effectiveContractId) {
      const payload = {
        contract_id: effectiveContractId,
        cash_retention_type: effectiveCashRetentionType,
        payment_id: RPaymentid ? Number(RPaymentid) : null,
      };

      console.log("[PT_DEBUG] getClientSupplierDetails payload:", JSON.stringify(payload));

      const clientSupplierDetails =
        await fetchClientSupplierDetailsForPaymentClaim(payload);

      console.log("[PT_DEBUG] getClientSupplierDetails response:", clientSupplierDetails ? "received data" : "null/empty", clientSupplierDetails ? { name: clientSupplierDetails?.client_supplier_name, address: clientSupplierDetails?.client_supplier_address } : null);

      if (clientSupplierDetails) {
        setPaymentDetails(clientSupplierDetails);
        setDelegationBankId(clientSupplierDetails?.payment_to_account);
        Object.keys(ClientSupplierBankDetails).forEach((k: any) => {
          formik.setFieldValue(
            k,
            // Special handling for sentDate & dueDate
            k === "sentDate" || k === "dueDate" || k === "receivedDate"
              ? retainedDataFromSubscription?.formikValues?.[k]
                ? retainedDataFromSubscription?.formikValues?.[k]
                : clientSupplierDetails?.[ClientSupplierBankDetails?.[k]]
                ? clientSupplierDetails?.[ClientSupplierBankDetails?.[k]]
                : ""
              : clientSupplierDetails?.[ClientSupplierBankDetails?.[k]]
              ? clientSupplierDetails?.[ClientSupplierBankDetails?.[k]]
              : ""
          );
        });
      } else {
        // Object.keys(ClientSupplierBankDetails).forEach((k: any) => {
        //   formik.setFieldValue(k, "");
        // });
        Object.keys(ClientSupplierBankDetails).forEach((k: any) => {
          formik.setFieldValue(
            k,
            k === "sentDate" || k === "dueDate" || k === "receivedDate"
              ? retainedDataFromSubscription?.formikValues?.[k] || ""
              : ""
          );
        });
      }
    }
  }

  function handleDateChange(selectedDate: string, fieldName: string) {
    // if (formik?.values?.dueDate && formik?.values?.dueDate <= selectedDate) {
    //   formik.setFieldValue(fieldName, selectedDate);
    //   formik.setFieldValue("dueDate", selectedDate);
    // } else {
    formik.setFieldValue(fieldName, selectedDate);
    // }
  }

  function handleDueDateChange(selectedDate: string) {
    // if (
    //   formik?.values?.sentDate &&
    //   togglePaymentReceivables() &&
    //   formik?.values?.sentDate >= selectedDate
    // ) {
    //   formik.setFieldValue("dueDate", formik?.values?.sentDate);
    // } else if (
    //   formik?.values?.ReceivedDate &&
    //   togglePaymentBillables() &&
    //   formik?.values?.ReceivedDate >= selectedDate
    // ) {
    //   formik.setFieldValue("dueDate", formik?.values?.ReceivedDate);
    // } else {
    formik.setFieldValue("dueDate", selectedDate);
    // }
  }

  async function handleAddQuickRecord(
    route: string,
    internalQuickAdd?: boolean
  ) {
    const postData = {
      formikValues: formik.values,
      compulsoryAttachments: compulsoryAttachments,
      optionalAttachments: optionalAttachments,
      otherOptionalAttachments: otherOptionalAttachments,
      paymentDetails: paymentDetails,
      quickAddFromClaims: true,
    };
    try {
      const res = await fetch("/api/route-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });
      const data = await res.json();

      if (data?.status == ApiResponse.SUCCESS) {
        closeModal();
        router.push(route);
      }
    } catch {}
  }

  async function getStoredBankAccountData() {
    try {
      const response = await fetch("/api/route-data");

      const result = await response.json();

      if (result.status == ApiResponse.SUCCESS) {
        setRoutePathStoredData(result?.data);
      }
    } catch {}
  }

  function closeModal() {
    setTimeout(() => {
      const { documentElement: html } = document;
      html.classList.add(baseModalConstants.closingClass);
      html.classList.remove(
        baseModalConstants.closingClass,
        baseModalConstants.isOpenClass
      );
      html.style.removeProperty(baseModalConstants.scrollbarWidthCssVar);
    }, baseModalConstants.animationDuration);
  }

  return (
    <Fragment>
      <div className="grid pt_infocol">
        <div>
          <h5 className="d_flex_justify_sb">
            <div>
              Project<span className="required">*</span>
            </div>
            {!isViewMode && !isEditable && !RetentionId && (
              <span
                onClick={() => {
                  handleAddQuickRecord(
                    `${AppRoutes.USER_ADD_PROJECTS}?quick-add=${quickAddRoutes.PROJECT}`
                  );
                }}
                className="cu-pointer linkStyles"
              >
                {"Add project"}
              </span>
            )}
          </h5>
          <FormikControl
            control={InputType.SELECT}
            name={"projectId"}
            renderKey="project_name"
            valueKey="project_id"
            placeholder="Select project"
            disabled={
              overviewProjectId ||
              importClaimIdFromMail ||
              bothIdsPresent ||
              onlyProjectIdPresent ||
              isViewMode ||
              (claimData?.status === "Draft" ? false : isEditable) ||
              formik?.values?.cash_retention_type === "Retention claim"
            }
            options={projectOpt}
            returnSelectedObject
            onChange={onProjectChange}
            value={formik?.values?.projectId}
            showError={formik?.touched?.projectId && formik?.errors?.projectId}
            error={formik?.errors?.projectId}
          />
        </div>
        <div>
          <h5 className="d_flex_justify_sb">
            <div>
              {isThirdPartyRetention ? "Original Contract" : "Contract"}
              <span className="required">*</span>
            </div>
            {!isViewMode && !isEditable && !RetentionId && (
              <span
                onClick={() => {
                  handleAddQuickRecord(
                    `${AppRoutes.USER_ADD_CONTRACTS}?quick-add=${quickAddRoutes.CONTRACT}&proj_id=${selectedProjectID}`
                  );
                }}
                className="cu-pointer linkStyles"
              >
                {"Add contract"}
              </span>
            )}
          </h5>
          <FormikControl
            control={InputType.SELECT}
            name={"contractId"}
            placeholder="Select contract"
            renderKey="contract_name"
            valueKey="contract_id"
            returnSelectedObject
            options={contractOptions}
            onChange={onContractChange}
            value={formik?.values?.contractId}
            showError={
              formik?.touched?.contractId && formik?.errors?.contractId
            }
            disabled={
              !claimData?.projectId && isEditable
                ? false
                : !formik?.values?.projectId ||
                  isEditable ||
                  isViewMode ||
                  formik?.values?.cash_retention_type === "Retention claim"
            }
            error={formik?.errors?.contractId}
          />
        </div>

        {!!isThirdPartyRetention && (
          <Fragment>
            {togglePaymentReceivables() && (
              <div>
                <h5>
                  {"Client"}
                  <span className="required">*</span>
                </h5>
                <FormikControl
                  control={InputType.SELECT}
                  name={"thirdPartyClient"}
                  placeholder="Select contract"
                  renderKey="contract_name"
                  valueKey="contract_id"
                  returnSelectedObject
                  options={contractOptions}
                  onChange={onContractChange}
                  value={formik?.values?.thirdPartyClient}
                  showError={
                    formik?.touched?.thirdPartyClient &&
                    formik?.errors?.thirdPartyClient
                  }
                  disabled
                  error={formik?.errors?.thirdPartyClient}
                />
              </div>
            )}
            {togglePaymentBillables() && (
              <div>
                <h5 className="d_flex_justify_sb">
                  <div>
                    {"Supplier (3rd Party)"}
                    <span className="required">*</span>
                  </div>
                  {!isViewMode && !isEditable && (
                    <span
                      onClick={() => {
                        handleAddQuickRecord(
                          `${AppRoutes.USER_ADD_CLIENTS_AND_SUPPLIERS}?quick-add=${quickAddRoutes.SUPPLIER}`
                        );
                      }}
                      className="cu-pointer linkStyles"
                    >
                      {"Add supplier"}
                    </span>
                  )}
                </h5>
                <FormikControl
                  control={InputType.SELECT}
                  name={"thirdPartySupplier"}
                  placeholder="Select supplier"
                  value={formik?.values?.thirdPartySupplier}
                  renderKey="client_supplier_name"
                  valueKey="client_supplier_id"
                  options={supplierOptions}
                  onChange={(selectedOption: any) => {
                    formik.setFieldValue("thirdPartySupplier", selectedOption);
                    if (selectedOption) {
                      setSelectedSupplierId(selectedOption);
                    }
                  }}
                  showError={
                    formik?.touched?.thirdPartySupplier &&
                    formik?.errors?.thirdPartySupplier
                  }
                  error={formik?.errors?.thirdPartySupplier}
                />
              </div>
            )}
          </Fragment>
        )}

        {!isThirdPartyRetention && (
          <div>
            <h5>Client/Supplier</h5>
            <FormikControl
              control={InputType.TEXT_FIELD}
              name={togglePaymentReceivables() ? "client" : "supplier"}
              placeholder="Client/Supplier"
              disabled
              onChange={(e: any) => {}}
              value={
                formik?.values?.[
                  togglePaymentReceivables() ? "client" : "supplier"
                ]
              }
            />
          </div>
        )}
        <div>
          <h5>Address</h5>
          <FormikControl
            control={InputType.TEXT_FIELD}
            name={"address"}
            disabled
            placeholder="Address"
            onChange={(e: any) => {}}
            value={formik?.values?.address}
          />
        </div>
      </div>
      <div className="grid pt_infocol">
        <div>
          <h5>
            Payment terms{" "}
            {isThirdPartyRetention && <span className="required">*</span>}
          </h5>
          <FormikControl
            control={InputType.TEXT_FIELD}
            name={"paymentTerms"}
            placeholder="Payment Terms"
            onChange={(e: any) =>
              formik?.setFieldValue("paymentTerms", e?.target?.value)
            }
            showError={
              formik?.touched?.paymentTerms && formik?.errors?.paymentTerms
            }
            error={formik?.errors?.paymentTerms}
            maxLength={2}
            disabled={!isThirdPartyRetention}
            value={formik?.values?.paymentTerms}
            hint={"days"}
          />
        </div>
        {togglePaymentReceivables() && (
          <div>
            <h5>
              Sent date<span className="required">*</span>
            </h5>
            <FormikControl
              control={InputType.DATE_PICKER}
              name={"sentDate"}
              placeholder="Sent Date"
              maxDate={getDatePickerFormat()}
              onChange={(selectedDate: any) =>
                handleDateChange(selectedDate, "sentDate")
              }
              disabled={isViewMode}
              value={formik?.values?.sentDate}
              showError={formik?.touched?.sentDate && formik?.errors?.sentDate}
              error={formik?.errors?.sentDate}
            />
          </div>
        )}
        {togglePaymentBillables() && (
          <div>
            <h5>
              Received date<span className="required">*</span>
            </h5>
            <FormikControl
              control={InputType.DATE_PICKER}
              name={"receivedDate"}
              placeholder="Received Date"
              maxDate={getDatePickerFormat()}
              required
              onChange={(selectedDate: any) =>
                handleDateChange(selectedDate, "receivedDate")
              }
              value={formik?.values?.receivedDate}
              showError={
                formik?.touched?.receivedDate && formik?.errors?.receivedDate
              }
              error={formik?.errors?.receivedDate}
              disabled={isViewMode}
            />
          </div>
        )}
        <div>
          <h5>
            Due date<span className="required">*</span>
          </h5>
          <FormikControl
            control={InputType.DATE_PICKER}
            name={"dueDate"}
            placeholder="Due Date"
            required
            minDate={userMode === "Onboarding" ? "" : getDatePickerFormat()}
            onChange={(selectedDate: any) => handleDueDateChange(selectedDate)}
            value={formik?.values?.dueDate}
            showError={formik?.touched?.dueDate && formik?.errors?.dueDate}
            error={formik?.errors?.dueDate}
            disabled={isViewMode}
          />
        </div>
        <div>
          <h5>Claim reference</h5>
          <FormikControl
            control={InputType.TEXT_FIELD}
            name={"claimReference"}
            placeholder="Claim Reference"
            required
            value={formik?.values?.claimReference}
            onChange={(e: any) => formik.handleChange(e)}
            disabled={isViewMode}
          />
        </div>
      </div>
      <div className="grid pt_infocol">
        {CashRetentionType != "RetentionClaim" && (
          <div>
            <h5>RETENTION</h5>
            <FormikControl
              control={InputType.RADIO_BUTTON}
              label=""
              name={"retentionRadioOptions"}
              options={retentionRadioOption}
              selectedValue={formik.values.cashRetention}
              onChange={(e: any) => {
                formik?.setFieldValue("cashRetention", e?.target?.value);
                if (
                  e?.target?.value == "No Retention" &&
                  retentionTypeFromContract == "Cash"
                ) {
                  setDisplayCashRetention(true);
                }
              }}
              disabled={isViewMode || importClaimIdFromMail}
            />
          </div>
        )}
        {formik.values.cashRetention == "Retention" && (
          <>
            <div>
              <h5>
                RETENTION PERCENTAGE
                {formik.values.cashRetention == "Retention" && (
                  <span className="required">*</span>
                )}
              </h5>
              <FormikControl
                control={InputType.TEXT_FIELD}
                name={"retentionPercentage"}
                onChange={(e: any) => {
                  const val = e.target.value;
                  if (val?.trim() === "") {
                    formik?.setFieldValue("retentionPercentage", val);
                    return;
                  }
                  const regex = /^(?!\.)(\d{1,3})(\.\d{0,2})?$/;
                  if (regex.test(val)) {
                    const numericVal = parseFloat(val);
                    if (numericVal <= 100) {
                      formik?.setFieldValue("retentionPercentage", val);
                    }
                  }
                }}
                value={formik?.values?.retentionPercentage}
                onBlur={formik.handleBlur("retentionPercentage")}
                showError={
                  formik?.touched?.retentionPercentage &&
                  formik?.errors?.retentionPercentage
                }
                error={formik?.errors?.retentionPercentage}
                disabled={isViewMode || importClaimIdFromMail}
              />
            </div>
            <div>
              <h5>
                RETENTION AMOUNT
                {formik.values.cashRetention == "Retention" && (
                  <span className="required">*</span>
                )}
              </h5>
              <FormikControl
                control={InputType.TEXT_FIELD}
                name={"retentionAmount"}
                onChange={(e: any) => {
                  let rawValue = e.target.value;
                  if (rawValue === "" || rawValue === "$") {
                    rawValue = "";
                  } else {
                    rawValue = formatDollars(rawValue);
                  }
                  formik?.setFieldValue("retentionAmount", rawValue);
                }}
                value={formik?.values?.retentionAmount}
                onBlur={formik.handleBlur("retentionAmount")}
                showError={
                  formik?.touched?.retentionAmount &&
                  formik?.errors?.retentionAmount
                }
                error={formik?.errors?.retentionAmount}
                disabled={true}
              />
            </div>
          </>
        )}
        <div></div>
      </div>
      {showCheckList && (
        <BaseModal
          modalId="product_guide"
          displayModal={showCheckList}
          onClose={() => setShowCheckList(false)}
          title="Claim checklist"
          hideFooter={true}
          hideHeaderCloseIcon={true}
          halfScreenPopup={true}
        >
          <div className="claims-container">
            <table className="claims-table">
              <thead>
                <tr className="claims-header-row">
                  <td colSpan={5}>
                    <h5>Claim Import Sync Check</h5>
                  </td>
                </tr>
              </thead>
              <tbody>
                {/* Status Row */}
                <tr>
                  <td>Status</td>
                  <td colSpan={3}>
                    <span
                      className={
                        formik?.values?.projectId && formik?.values?.contractId
                          ? "claims-status-success"
                          : "claims-warning-text"
                      }
                    >
                      {formik?.values?.projectId && formik?.values?.contractId
                        ? "Success"
                        : "Pending"}
                    </span>
                  </td>
                </tr>

                {/* Table Headers */}
                <tr>
                  <td></td>
                  <td>Paytrade</td>
                  <td>Claim</td>
                  <td>Check</td>
                </tr>

                {/* Project Row */}
                <tr>
                  <td>Project Name</td>
                  <td>
                    <FormikControl
                      control={InputType.SELECT}
                      name="projectId"
                      renderKey="project_name"
                      valueKey="project_id"
                      placeholder="Select project"
                      options={projectOpt}
                      returnSelectedObject
                      onChange={onProjectChange}
                      value={formik?.values?.projectId}
                      disabled={
                        overviewProjectId ||
                        importClaimIdFromMail ||
                        bothIdsPresent ||
                        onlyProjectIdPresent ||
                        isViewMode ||
                        (claimData?.status === "Draft" ? false : isEditable) ||
                        formik?.values?.cash_retention_type ===
                          "Retention claim"
                      }
                    />
                  </td>
                  <td>
                    {
                      projectOpt.find(
                        (val: { project_id: any }) =>
                          val.project_id === formik?.values?.projectId
                      )?.project_name
                    }
                  </td>
                  <td>
                    {projectOpt.find(
                      (val: { project_id: any }) =>
                        val.project_id === formik?.values?.projectId
                    )?.project_name ? (
                      <span className="claims-status-success">Ok</span>
                    ) : (
                      <span className="claims-warning-text">Pending</span>
                    )}
                  </td>
                </tr>

                {/* Contract Row */}
                <tr>
                  <td>Contract</td>
                  <td>
                    <div>
                      <h5 className="d_flex_justify_sb">
                        <div></div>
                        {!isViewMode && !isEditable && !RetentionId && (
                          <span
                            onClick={() => {
                              handleAddQuickRecord(
                                `${AppRoutes.USER_ADD_CONTRACTS}?quick-add=${quickAddRoutes.CONTRACT}`
                              );
                            }}
                            className="cu-pointer linkStyles"
                          >
                            {"Add contract"}
                          </span>
                        )}
                      </h5>
                      <FormikControl
                        control={InputType.SELECT}
                        name={"contractId"}
                        placeholder="Select contract"
                        renderKey="contract_name"
                        valueKey="contract_id"
                        returnSelectedObject
                        options={contractOptions}
                        onChange={onContractChange}
                        value={formik?.values?.contractId}
                        showError={
                          formik?.touched?.contractId &&
                          formik?.errors?.contractId
                        }
                        disabled={
                          !claimData?.projectId && isEditable
                            ? false
                            : !formik?.values?.projectId ||
                              isEditable ||
                              isViewMode ||
                              formik?.values?.cash_retention_type ===
                                "Retention claim"
                        }
                        error={formik?.errors?.contractId}
                      />
                    </div>
                  </td>
                  <td>
                    {
                      contractOptions.find(
                        (val: { contract_id: any }) =>
                          val.contract_id === formik?.values?.contractId
                      )?.contract_name
                    }
                  </td>
                  <td>
                    {
                      // 1) If a project is chosen but there are no contracts -> prompt to add/select bank
                      formik?.values?.projectId &&
                      contractOptions.length === 0 ? (
                        <span className="claims-status-failed">
                          Contract not available. Please add a contract
                        </span>
                      ) : // 2) Else if the selected contract exists -> show OK
                      contractOptions.find(
                          (val: { contract_id: any }) =>
                            val.contract_id === formik?.values?.contractId
                        )?.contract_name ? (
                        <span className="claims-status-success">Ok</span>
                      ) : (
                        // 3) Otherwise -> Pending
                        <span className="claims-warning-text">Pending</span>
                      )
                    }
                  </td>
                </tr>

                {/* Client/Supplier Row */}
                <tr>
                  <td>Client/Supplier</td>
                  <td>
                    {
                      formik?.values?.[
                        togglePaymentReceivables() ? "client" : "supplier"
                      ]
                    }
                  </td>
                  <td>
                    {
                      formik?.values?.[
                        togglePaymentReceivables() ? "client" : "supplier"
                      ]
                    }
                  </td>
                  <td>
                    {formik?.values?.[
                      togglePaymentReceivables() ? "client" : "supplier"
                    ] ? (
                      <span className="claims-status-success">Ok</span>
                    ) : (
                      <span className="claims-warning-text">Pending</span>
                    )}
                  </td>
                </tr>

                {/* Bank Account Row */}
                <tr>
                  <td>Bank Account</td>
                  <td>
                    {togglePaymentBillables()
                      ? formik.values.paymentFromAccountName
                      : formik.values.paymentToAccountName}
                  </td>
                  <td>
                    {togglePaymentBillables()
                      ? formik.values.paymentFromAccountName
                      : formik.values.paymentToAccountName}
                  </td>
                  <td>
                    {(
                      togglePaymentBillables()
                        ? formik.values.paymentFromAccountName
                        : formik.values.paymentToAccountName
                    ) ? (
                      <span className="claims-status-success">Ok</span>
                    ) : (
                      <span className="claims-warning-text">Pending</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Import Button */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "15px",
            }}
          >
            <CustomButton
              buttonName="Import"
              buttonType={buttonType.SECONDARY_SMALL}
              actionType="button"
              onClick={() => {
                setShowCheckList(false);
                closeModal();
                checkImportCondition();
              }}
              styles={{ marginTop: "15px" }}
              disabled={
                !formik?.values?.contractId || !formik?.values?.projectId
              }
            />
          </div>
        </BaseModal>
      )}
      {displayCashRetention && (
        <BaseModal
          title=""
          modalId={"Cash_retention"}
          displayModal={displayCashRetention}
          onClose={(triggered: any) => {
            if (triggered) {
              setDisplayCashRetention(false);
              formik.setFieldValue("cashRetention", "Retention");
            }
          }}
          onConfirm={() => {
            setDisplayCashRetention(false);
            formik.setFieldValue("cashRetention", "No Retention");
            return true;
          }}
          secondButtonName="Yes"
          firstButtonName="No"
          restrictOncloseFunctionInHeader
          hideHeaderCloseIcon={true}
        >
          <h4 className="text_center">
            This contract is subject to 'cash retention'. Do you still want to
            continue without retention?
          </h4>
        </BaseModal>
      )}
    </Fragment>
  );
}
