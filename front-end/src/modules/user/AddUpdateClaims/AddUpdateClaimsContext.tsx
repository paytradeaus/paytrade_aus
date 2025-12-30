import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { initialValues, validationSchema } from "./AddUpdateClaimsValidation";
import { useFormik } from "formik";
import { useLoaderContext } from "@/context/useLoader";
import { useTokenDetails } from "@/hooks";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import {
  getCompanyIdFromStorage,
  getSubscriptionType,
  removeCommas,
  dateStringToUtcConversion,
} from "@/utils";
import {
  ContractOption,
  SubscriptionPlanTypes,
} from "./AddUpdateClaims.constant";
import { multipleFileUploadApi } from "@/app/api/commonApi";
import { showErrorToast } from "@/components/Toaster";
import {
  addPaymentClaim,
  editDetailsOfAPaymentClaim,
  GenerateS75DocumentService,
  getContractListsForCompany,
  TriggerPaymentClaimNotices,
} from "./AddUpdateClaims.function";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { ADD, OVERVIEW_TABS } from "@/shared/constant/general";
import { setPaymentClaims } from "@/redux/slices/subscribeRouteBackDetails";
import _ from "lodash";
import { projectOverviewTabs } from "../Projects/ProjectOverview/ProjectOverview.constant";
import { getBankAccountLists } from "../Contracts/contracts.functions";

const AddUpdateClaimsContext: any = createContext(null);

interface ProjectOption {
  value: string;
  label: string;
  project_id: number;
}

const AUTO_CLOSE_TIME = 30;

export const AddUpdateClaimsContextProvider = ({ children }: any) => {
  const queryParams = useSearchParams();
  const mode: any = queryParams.get("mode");
  const retrieveAfterAddingQuickRecord: any =
    queryParams.get("retrieve-record");

  //state contains retained data from subscriptions if any
  const retainedDataFromSubscription: any = useAppSelector(
    (state: any) => state?.retainedDataFromSubscription?.claimsData
  );
  const [paymentsPatchData, setPaymentsPatchData] = useState<any>(null);
  const [retentionBankAccounts, setRetentionBankAccounts] = useState<any[]>([]);
  const [clientRole, setClientRole] = useState<string | null>(null);
  const [projectRole, setProjectRole] = useState<string | null>(null);
  const [generateClaimData, setGenerateClaimData] = useState<any[]>([]);
  const [openGenereatedClaimModel, setOpenGenereatedClaimModel] =
    useState<any>(false);
  const [delegateAuthorityAllowed, setDelegateAuthorityAllowed] = useState<
    boolean | null
  >(null);
  const [isReasonDataLoaded, setIsReasonDataLoaded] = useState(false);
  const [generateClaimCount, setGenerateClaimCount] = useState<number>(0);
  const [showNoticePopup, setShowNoticePopup] = useState(false);
  const [noticeFiles, setNoticeFiles] = useState<any[]>([]);
  const [noticeMailUuids, setNoticeMailUuids] = useState<string[]>([]);
  const [qbccNoticeFiles, setQbccNoticeFiles] = useState<any[]>([]);
  const [qbccNoticeUuids, setQbccNoticeUuids] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(AUTO_CLOSE_TIME);
  const [noticesAutomated, setNoticesAutomated] = useState(false);

  const ScreenName = queryParams.get("screenname");
  const overviewType = queryParams.get("overviewType");
  const overviewProjectId = queryParams.get("overviewProjectId");
  const overviewContractId = queryParams.get("overviewContractId");

  //query params for retention claim
  const CashRetentionType = queryParams.get("cash-retention-type");
  const ClaimType: any = queryParams.get("claim-type");
  const RetentionProjectId: any = queryParams.get("pid");
  const RetentionContractId: any = queryParams.get("cid");
  const retentionAmount = queryParams.get("ra") || 0;
  const Type: any = queryParams.get("type");
  const SubPaymentId = queryParams.get("sid");
  const RetentionId: any = queryParams.get("rid");
  const isThirdPartyRetention: string | null = queryParams.get("third_party");
  //
  const ClientSupplierType = queryParams.get("client-supplier-type");
  const quickContractType: any = queryParams.get("client-supplier-type");

  const ClientSupplierId = queryParams.get("id");
  const paymentType = queryParams.get("payment-type");
  const beneficiaryType: any = queryParams.get("beneficiary");
  const paymentId: any = queryParams.get("payment");
  const RPaymentid: any = queryParams.get("rpaymentid");
  const importScreen = queryParams.get("screen");
  const importCompanyId: any = queryParams.get("company_id");
  const importClaimIdFromMail: any = queryParams.get("importid");
  const IsActivity: any = queryParams.get("from");

  const syncId = queryParams.get("syncId");
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);

  const routeParams = useParams();

  const { setLoader, loader, setLoaderInfo }: any = useLoaderContext();
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const selectedCompanyId = getCompanyIdFromStorage() || 0;

  const [companyExists, setCompanyExists] = useState(false);
  const [projectOpt, setProjectOpt] = useState<ProjectOption[]>([]);
  const [availablePayments, setAvailablePayments] = useState<any[]>([]);
  const [claimData, setClaimData] = useState<any>({});
  const [selectedContractID, setSelectedContractId] = useState<number>();
  const [selectedProjectID, setSelectedProjectId] = useState<string>();
  const [quickContractId, setQuickContractId] = useState<any>(
    queryParams.get("quickcont_id")
  );

  const [contractOptions, setContractOptions] = useState<ContractOption[]>([]);
  const [routePathStoredData, setRoutePathStoredData] = useState<any>(null);

  const [paymentDetails, setPaymentDetails] = useState<any>([]);
  const [delegationBankId, setDelegationBankId] = useState<any>(null);
  const [compulsoryAttachments, setCompulsoryAttachments] = useState([]);
  const [optionalAttachments, setOptionalAttachments] = useState([]);
  const [otherOptionalAttachments, setOtherOptionalAttachments] = useState([]);
  const [isEditable, setIsEditable] = useState(false);
  const [proceedWithExceedingAmount, setProceedWithExceedingAmount] =
    useState(false);
  const [displayContractValueExceedModal, setDisplayContractValueExceedModal] =
    useState(false);
  const [displayRetentionWarning, setDisplayRetentionWarning] = useState(false);
  const [subscriptionPlanName, setSubscriptionPlanName] =
    useState<string>("Basic"); //company or user's current subscription plan

  const [displaySubscriptionModal, setDisplaySubscriptionModal] =
    useState(false);
  const [noticesListData, setNoticesListData] = useState([]);
  const [reasonsData, setReasonsData] = useState([]);
  const [initialPatchedValues, setInitialPatchedValues] = useState<any>(null);
  const [isInitialRender, setIsInitialRender] = useState(false);
  const [paymentToOptions, setPaymentToOptions] = useState([]);
  const [disableDraftButton, setDisableDraftButton] = useState(false);
  const [importClaimsAPIData, setImportClaimAPIData] = useState("");
  const isBasic = subscriptionPlanName === SubscriptionPlanTypes.BASIC;
  const isPaid = generateClaimData?.length === 0;
  const isNotPaid = generateClaimData?.length > 0;

  // Get userMode from Redux
  const reduxUserMode = useAppSelector(
    (state: RootState) => state.userMode.mode
  );

  // Fallback to localStorage if Redux state is empty (e.g., after a page refresh)
  const localStorageUserMode =
    typeof window !== "undefined" ? localStorage.getItem("userMode") : null;

  const userMode = reduxUserMode || localStorageUserMode;

  const formik: any = useFormik({
    initialValues: initialValues,
    validationSchema,
    onSubmit: () => handleSubmit(),
  });

  // Reset timer when popup opens
  useEffect(() => {
    if (
      showNoticePopup &&
      (noticeFiles?.length > 0 || qbccNoticeFiles?.length > 0)
    ) {
      setTimeLeft(AUTO_CLOSE_TIME);
    }
  }, [showNoticePopup]);

  useEffect(() => {
    if (
      (noticeFiles.length > 0 || qbccNoticeFiles.length > 0) &&
      showNoticePopup === false
    ) {
      setLoader(false);
      setShowNoticePopup(true);
    }
  }, [noticeFiles, qbccNoticeFiles]);

  // Countdown effect
  useEffect(() => {
    if (!showNoticePopup) return;

    // 👉 Simulate confirm (same as clicking "Send Mail")
    if (timeLeft === 0) {
      const modal = document.getElementById(
        "Generated Notices"
      ) as HTMLDialogElement;

      if (modal) {
        const confirmBtn = modal.querySelector(
          "footer button:last-child"
        ) as HTMLButtonElement; // last button = confirm
        confirmBtn?.click();
      }
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, showNoticePopup]);

  useEffect(() => {
    //update current subscription plan type to trigger notices on submit
    setSubscriptionPlanName(
      getSubscriptionType(decodeTokenData, selectedCompanyId)
    ); // Assuming setPlanName exists to store the plan name
  }, []);

  useEffect(() => {
    if (paymentsPatchData?.project_id) {
      getRetentionBankAccounts();
    }
  }, [paymentsPatchData]);

  useEffect(() => {
    if (
      Object.keys(retainedDataFromSubscription ?? {}).length > 0 ||
      routePathStoredData?.quickAddFromClaims
    ) {
      const formData = routePathStoredData?.quickAddFromClaims
        ? routePathStoredData
        : retainedDataFromSubscription;
      subscriptionConfiguration(formData);
    }
  }, [retainedDataFromSubscription, routePathStoredData]);

  useEffect(() => {
    if (formik?.values?.claim_type && !isInitialRender && mode == ADD) {
      setInitialPatchedValues(formik?.values);
      setIsInitialRender(true);
    }
  }, [formik?.values]);

  function togglePaymentReceivables() {
    const { claim_type, cash_retention_type } = formik?.values || {};

    if (claim_type && cash_retention_type) {
      return (
        (cash_retention_type === "Claim" && claim_type === "Receivable") ||
        (cash_retention_type === "Retention claim" &&
          claim_type === "Receivable")
      );
    } else if (
      retainedDataFromSubscription?.formikValues?.claim_type === "Receivable"
    ) {
      return true;
    }
  }

  async function getRetentionBankAccounts() {
    try {
      const companyId: any = getCompanyIdFromStorage();

      const postData = {
        company_id: +companyId,
        type: paymentsPatchData?.client_supplier_type,
        project_id: paymentsPatchData?.project_id,
        client_supplier_id: paymentsPatchData?.client_supplier_id,
        retention_type: "Cash",
        client_supplier_role: paymentsPatchData?.client_supplier_role,
      };

      const response: any = await getBankAccountLists(postData);

      if (response) {
        // const modifiedOptions = mapDropdownOptions(
        //   response?.retention_from_account,
        //   "account_name",
        //   "bank_account_id"
        // );
        setRetentionBankAccounts(response?.retention_from_account);

        if (isViewMode) {
          formik?.setFieldValue(
            "retention_account",
            paymentsPatchData?.retention_account
          );
        }
      } else {
        setRetentionBankAccounts([]);
      }
    } catch {}
  }

  function togglePaymentBillables() {
    const { claim_type, cash_retention_type } = formik?.values || {};
    return (
      (cash_retention_type === "Claim" && claim_type === "Billable") ||
      (cash_retention_type === "Retention claim" && claim_type === "Billable")
    );
  }

  function handleNoticesTrigger(proceedWithoutSubscription?: boolean) {
    if (proceedWithoutSubscription) {
      setDisplaySubscriptionModal(false);
      handleSubmit(true);
    } else if (formik?.values?.claim_type === "Receivable") {
      // const isSubscribed: boolean =
      //   subscriptionPlanName === SubscriptionPlanTypes.BASIC;
      const isSubscribed: boolean = !delegateAuthorityAllowed;
      setDisplaySubscriptionModal(isSubscribed);

      return isSubscribed;
    } else {
      return false;
    }
  }

  function isSupportingDocRequired() {
    const values = formik?.values;

    // Check if user is premium
    const isPremiumUser = noticesAutomated === true;

    // Condition 1 (existing)
    const condition1 =
      !isBasic &&
      isNotPaid &&
      values?.claim_type === "Receivable" &&
      projectRole === "Head Contractor" &&
      clientRole === "Principal" &&
      generateClaimData?.length > 0 &&
      userMode !== "Onboarding";

    // Condition 2 (existing)
    const condition2 =
      !isBasic &&
      isPaid &&
      values?.claim_type === "Receivable" &&
      projectRole === "Head Contractor" &&
      clientRole === "Principal" &&
      userMode !== "Onboarding";

    if (isPremiumUser && values?.claim_type === "Receivable") {
      return false; // Premium user does NOT need supporting doc for Receivable
    }

    if (!isPremiumUser && (condition1 || condition2)) {
      return false; // Non-premium user meets condition 1 or 2 → not required
    }

    // Default: required
    return values?.claim_type === "Receivable";
  }

  async function handleSubmit(
    skipSubscriptionTrigger?: boolean,
    skipNoticesTrigger?: boolean
  ) {
    try {
      const { values } = formik;

      // CASE: Paid plan, Not Paid
      if (
        !isEditable &&
        !skipSubscriptionTrigger &&
        !isBasic &&
        isNotPaid &&
        userMode !== "Onboarding" &&
        formik?.values?.claim_type === "Receivable" &&
        projectRole === "Head Contractor" &&
        clientRole === "Principal"
      ) {
        const hasEmptyReasons = generateClaimData?.some(
          (item: any) => (item.user_input || "").trim() === ""
        );

        if (!generateClaimData?.length || hasEmptyReasons) {
          showErrorToast("Please fill in all reasons for unpaid suppliers.");
          return;
        }
      }

      // CASE: Paid plan, All Paid
      if (
        !isEditable &&
        !skipSubscriptionTrigger &&
        !isBasic &&
        isPaid &&
        userMode !== "Onboarding" &&
        formik?.values?.claim_type === "Receivable" &&
        projectRole === "Head Contractor" &&
        clientRole === "Principal"
      ) {
        if (!formik?.values?.paidDeclaration) {
          showErrorToast(
            "Please confirm the declaration before complete and send."
          );
          return;
        }
      }

      if (
        values?.cash_retention_type !== "Retention claim" &&
        values?.subTotal > values?.contractTotal &&
        !proceedWithExceedingAmount
      ) {
        setDisplayContractValueExceedModal(true);
        setDisableDraftButton(false);
        return; // Exit the function to prevent submission until the modal is confirmed
      }

      //show warning message if claim amount exceeds retention amount while adding a claim
      if (
        values?.cash_retention_type === "Retention claim" &&
        ((isEditable && values?.totalAmount > claimData?.retained_amount) ||
          (!isEditable && values?.totalAmount > +retentionAmount))
      ) {
        setDisplayRetentionWarning(true);
        setDisableDraftButton(false);
        return;
      }

      let compulsoryAttachmentIds: Array<string> = [];
      const newDoc = compulsoryAttachments?.filter((item: any) => !item?.id);
      const alreadyDoc = compulsoryAttachments?.filter((item: any) => item?.id);
      if (alreadyDoc?.length > 0) {
        alreadyDoc.forEach((each: any) =>
          compulsoryAttachmentIds.push(each?.id)
        );
      }
      if (newDoc.length > 0) {
        const userData = {
          uploaded_by: decodeTokenData?.emailId || "",
          attachment_type: "Compulsory_attachments",
        };
        const multiUserData: any[] = newDoc.map(() => userData);
        const fileResponse: any[] = await multipleFileUploadApi(
          newDoc,
          multiUserData,
          accessTokenId
        );

        if (fileResponse?.length > 0) {
          fileResponse.forEach((each: any) =>
            compulsoryAttachmentIds.push(each?.id)
          );
        }
      } else if (
        // values?.claim_type === "Receivable" &&
        // alreadyDoc.length === 0 &&
        // !skipNoticesTrigger

        isSupportingDocRequired() &&
        alreadyDoc.length === 0 &&
        !skipNoticesTrigger
      ) {
        showErrorToast("Please add a supporting statement attachment");
        setDisableDraftButton(false);
        return;
      }

      if (!skipSubscriptionTrigger && handleNoticesTrigger()) {
        setDisableDraftButton(false);
        return true;
      }

      setLoader(true);

      let optionalAttachmentIds: Array<string> = [];
      const newOptionalDoc = optionalAttachments?.filter(
        (item: any) => !item?.id
      );
      const alreadyOptionalDoc = optionalAttachments?.filter(
        (item: any) => item?.id
      );

      if (optionalAttachments?.length > 0) {
        const userData = {
          uploaded_by: decodeTokenData?.emailId || "",
          attachment_type: "Optional_attachments",
        };
        const multiUserData: any[] = newOptionalDoc.map(() => userData);
        const fileResponse: any[] = await multipleFileUploadApi(
          newOptionalDoc,
          multiUserData,
          accessTokenId
        );

        if (alreadyOptionalDoc?.length > 0) {
          alreadyOptionalDoc.forEach((each: any) =>
            optionalAttachmentIds.push(each?.id)
          );
        }

        if (fileResponse?.length > 0) {
          fileResponse.forEach((each: any) =>
            optionalAttachmentIds.push(each?.id)
          );
        }
      }

      let otherOptionalAttachmentIds: Array<string> = [];
      const newOtherOptionalDoc = otherOptionalAttachments?.filter(
        (item: any) => !item?.id
      );
      const alreadyOtherOptionalDoc = otherOptionalAttachments?.filter(
        (item: any) => item?.id
      );

      if (otherOptionalAttachments?.length > 0) {
        const userData = {
          uploaded_by: decodeTokenData?.emailId || "",
          attachment_type: "Optional_supporting_statement_attachments",
        };
        const multiUserData: any[] = newOtherOptionalDoc.map(() => userData);
        const fileResponse: any[] = await multipleFileUploadApi(
          newOtherOptionalDoc,
          multiUserData,
          accessTokenId
        );

        if (alreadyOtherOptionalDoc?.length > 0) {
          alreadyOtherOptionalDoc.forEach((each: any) =>
            otherOptionalAttachmentIds.push(each?.id)
          );
        }

        if (fileResponse?.length > 0) {
          fileResponse.forEach((each: any) =>
            otherOptionalAttachmentIds.push(each?.id)
          );
        }
      }

      let payload: any = {
        all_subcontracts_paid: formik?.values?.paidDeclaration,
        claim_reference: values.claimReference || null,
        client_supplier_id: isThirdPartyRetention
          ? values?.claim_type == "Receivable"
            ? Number(selectedClientId)
            : Number(selectedSupplierId)
          : paymentDetails?.client_supplier_id,
        client_supplier_type: isThirdPartyRetention
          ? values?.claim_type == "Billable"
            ? "Supplier"
            : "Client"
          : paymentDetails?.client_supplier_type,
        company_id: selectedCompanyId,
        contract_id: selectedContractID
          ? Number(selectedContractID)
          : Number(formik.values.contractId) || null,
        due_date: dateStringToUtcConversion(values.dueDate),
        cash_retention: values?.cashRetention == "Retention" ? true : false,
        retention_amount:
          values?.cashRetention == "Retention"
            ? +values?.retentionAmount?.replace(/[^0-9.]/g, "")
            : null,
        retention_percentage:
          values?.cashRetention == "Retention"
            ? +values?.retentionPercentage
            : null,
        memo: values.memo,
        project_id: Number(values?.projectId),
        status: skipNoticesTrigger ? "Draft" : "Confirmed",
        claim_amount: values?.totalAmount,
        claim_type: values?.claim_type,
        cash_retention_type: values?.cash_retention_type,
        is_gst_optional: values?.isGstChecked,
        invoices: values?.claimItems.map((item: any) => {
          const paymentValues = removeCommas(item?.unit_price)?.replace(
            /[^0-9.]/g,
            ""
          );

          return {
            description: item.description,
            gst: Number(item.gst),
            quantity: Number(item.quantity),
            total_amount_including_gst: Number(item.total_amount_including_gst),
            unit_price: Number(paymentValues) || 0,
          };
        }),
      };

      if (CashRetentionType === "RetentionClaim") {
        payload = {
          ...payload,
          retention_id: Number(RetentionId),
          associated_retention_sub_payment_id: Number(SubPaymentId), // Replace existingValue with your actual value
        };
      }

      if (togglePaymentReceivables()) {
        payload = {
          ...payload,
          sent_date: dateStringToUtcConversion(values.sentDate) || null,
          compulsory_attachment_ids: compulsoryAttachmentIds || [],
          optional_attachment_ids: optionalAttachmentIds || [],
        };
      } else {
        payload = {
          ...payload,
          received_date: dateStringToUtcConversion(values.receivedDate) || null,
          optional_attachment_ids: optionalAttachmentIds || [],
          optional_supporting_statement_attachment_ids:
            otherOptionalAttachmentIds || [],
        };
      }

      if (isEditable) {
        const modifiedPayload: any = {
          claim_amount: values?.totalAmount,
          claim_reference: values.claimReference,
          client_supplier_id: paymentDetails?.client_supplier_id,
          company_id: selectedCompanyId,
          contract_id: selectedContractID
            ? Number(selectedContractID)
            : Number(values.contractId) || null,
          project_id: Number(values.projectId) || null,
          memo: values.memo,
          due_date: dateStringToUtcConversion(values.dueDate) || null,
          payment_claim_id: claimData?.payment_claim_id || null,
          status: skipNoticesTrigger ? "Draft" : "Confirmed",
          is_gst_optional: values?.isGstChecked,
          cash_retention: values?.cashRetention == "Retention" ? true : false,
          retention_amount:
            values?.cashRetention == "Retention"
              ? +values?.retentionAmount?.replace(/[^0-9.]/g, "")
              : null,
          retention_percentage:
            values?.cashRetention == "Retention"
              ? +values?.retentionPercentage
              : null,
          invoices: values?.claimItems.map((item: any) => {
            const paymentValues = removeCommas(item.unit_price).replace(
              /[^0-9.]/g,
              ""
            );

            return {
              description: item.description,
              gst: Number(item.gst),
              quantity: Number(item.quantity),
              total_amount_including_gst: Number(
                item.total_amount_including_gst
              ),
              payment_claim_id: claimData?.payment_claim_id || null,
              unit_price: Number(paymentValues) || 0,
            };
          }),
        };
        if (togglePaymentReceivables()) {
          modifiedPayload.sent_date =
            dateStringToUtcConversion(formik.values.sentDate) || null;
          modifiedPayload.compulsory_attachment_ids =
            compulsoryAttachmentIds || [];
          modifiedPayload.optional_attachment_ids = optionalAttachmentIds || [];
        } else {
          modifiedPayload.received_date =
            dateStringToUtcConversion(formik.values.receivedDate) || null;
          modifiedPayload.optional_attachment_ids = optionalAttachmentIds || [];
          modifiedPayload.optional_supporting_statement_attachment_ids =
            otherOptionalAttachmentIds || [];
        }
        if (syncId) modifiedPayload.sync_id = syncId;
        setLoaderInfo("Updating payment claim...");
        const editResponse = await editDetailsOfAPaymentClaim(modifiedPayload);
        setLoaderInfo("");
        if (editResponse) {
          if (!skipNoticesTrigger && !togglePaymentBillables()) {
            const { notice_previews = [], qbcc_notice_previews = [] } =
              editResponse?.notices || {};

            // Prepare arrays
            const noticeFiles = notice_previews.map((n: any) => n.file_details);
            const noticeMailUuids = notice_previews.map(
              (n: any) => n.mail_uuid
            );
            const qbccFiles = (qbcc_notice_previews || []).map(
              (n: any) => n.qbcc_file_details
            );
            const qbccUuids = (qbcc_notice_previews || []).map(
              (n: any) => n.notice_uuid
            );

            // Update state
            setNoticeFiles(noticeFiles);
            setNoticeMailUuids(noticeMailUuids);
            setQbccNoticeFiles(qbccFiles);
            setQbccNoticeUuids(qbccUuids);

            // setShowNoticePopup(true);

            // show popup if any notices exist
            if (notice_previews.length > 0 || qbcc_notice_previews.length > 0) {
              setShowNoticePopup(true);
              setLoader(false);
              return; // stop further navigation, popup will decide route
            }
          }
          if (syncId) {
            handleRoute("/user/integrations/xero/syncLogDetails/" + syncId);
          } else {
            handleRoute(
              `${AppRoutes.USER_PAY_APPS}?claim-type=${values?.claim_type}`
            ); // Redirect to the success page
          }
        }
      } else {
        setLoaderInfo("Submitting payment claim...");
        const response = await addPaymentClaim(payload);
        setLoaderInfo("");
        if (response) {
          const newClaimId = response?.payment_claim_id;

          if (
            !skipSubscriptionTrigger &&
            !isBasic &&
            isPaid &&
            values?.claim_type === "Receivable" &&
            projectRole === "Head Contractor" &&
            clientRole === "Principal" &&
            userMode !== "Onboarding"
          ) {
            const reasonPayload = {
              claims_with_reason: [],
              new_claim_id: newClaimId || null,
              project_id: Number(values?.projectId) || null,
            };

            try {
              setLoaderInfo("Generating S75 Document...");
              const result = await GenerateS75DocumentService(reasonPayload);
              setLoaderInfo("");

              if (!result) {
                setDisableDraftButton(false);
                return; // stop if S75 doc fails
              }
            } catch (error) {
              setLoaderInfo("");
              setDisableDraftButton(false);
              return;
            }
          }

          // ⚠️ Check if reason submission is required
          if (
            !skipSubscriptionTrigger &&
            !isBasic &&
            isNotPaid &&
            values?.claim_type === "Receivable" &&
            projectRole === "Head Contractor" &&
            clientRole === "Principal" &&
            generateClaimData?.length > 0 &&
            userMode !== "Onboarding"
          ) {
            const formattedReasons = generateClaimData.map((item: any) => ({
              payment_claim_id: item?.payment_claim_id || null,
              reason: item?.user_input || null,
            }));

            const reasonPayload = {
              claims_with_reason: formattedReasons || [],
              new_claim_id: newClaimId || null,
              project_id: Number(values?.projectId) || null,
            };

            try {
              setLoaderInfo("Generating S75 Document...");
              const result = await GenerateS75DocumentService(reasonPayload);
              setLoaderInfo("");

              if (!result) {
                setDisableDraftButton(false);
                return; // stop if S75 doc fails
              }
            } catch (error) {
              setLoaderInfo("");
              setDisableDraftButton(false);
              return;
            }
          }
          if (!skipNoticesTrigger && !togglePaymentBillables()) {
            // Use notices from response directly
            const { notice_previews = [], qbcc_notice_previews = [] } =
              response?.notices || {};

            // Prepare arrays
            const noticeFiles = notice_previews.map((n: any) => n.file_details);
            const noticeMailUuids = notice_previews.map(
              (n: any) => n.mail_uuid
            );
            const qbccFiles = (qbcc_notice_previews || []).map(
              (n: any) => n.qbcc_file_details
            );
            const qbccUuids = (qbcc_notice_previews || []).map(
              (n: any) => n.notice_uuid
            );

            // Update state
            setNoticeFiles(noticeFiles);
            setNoticeMailUuids(noticeMailUuids);
            setQbccNoticeFiles(qbccFiles);
            setQbccNoticeUuids(qbccUuids);

            // show popup if any notices exist
            if (notice_previews.length > 0 || qbcc_notice_previews.length > 0) {
              setLoader(false);
              setShowNoticePopup(true);
              return; // stop further navigation, popup will decide route
            }
            // }
          }

          handleRoute(
            `${AppRoutes.USER_PAY_APPS}?claim-type=${values?.claim_type}&retention-type=${values?.cash_retention_type}`
          ); // Redirect to the success page
        }
      }

      setLoader(false);
      setDisableDraftButton(false);
    } catch {
      setLoader(false);
      setLoaderInfo("");
    }
  }

  async function fetchContractsForProject(
    projectId?: any,
    clientSupplierType?: boolean,
    isBillable?: boolean
  ) {
    try {
      // Check if ClientSupplierId is present, if so, exit early
      if (ClientSupplierId) {
        return true;
      }

      const data = {
        company_id: selectedCompanyId,
        project_id: selectedProjectID ? Number(selectedProjectID) : projectId,
        page_number: null,
        page_size: null,
        search: "",
        contract_status: "In Progress",
        isAlphabeticalOrder: true,
        client_supplier_type:
          (togglePaymentReceivables() || clientSupplierType) && !isBillable
            ? "Client"
            : "Supplier", // Determine client or supplier type
      };

      // Fetch contract list
      const contractListData = await getContractListsForCompany(data);

      if (contractListData && contractListData?.contract_list?.length > 0) {
        setContractOptions(contractListData?.contract_list);
      } else {
        setContractOptions([]); // If no contracts are found, clear the options
      }
    } catch {}
  }

  /**
   * Patches claimData from retained claims redux state on route back from subscriptions.
   * This function updates the form, project options, GST registration status, and other related states
   * using retained data from the subscription claims.
   */
  function subscriptionConfiguration(formData: any) {
    //update current subscription plan type to trigger notices on submit

    if (!_.isEmpty(formData)) {
      formik.setValues({
        ...formData?.formikValues,
        ...(quickContractType
          ? {
              claim_type:
                quickContractType === "Client" ? "Receivable" : "Billable",
            }
          : { claim_type: formData?.formikValues?.claim_type ?? "" }),
      });
      fetchContractsForProject(
        formData?.formikValues?.projectId,
        false,
        // (routePathStoredData?.formikValues?.claim_type &&
        //   routePathStoredData?.formikValues?.claim_type !== "Receivable") ||
        formData?.formikValues?.claim_type !== "Receivable"
        // false
      );
      setCompulsoryAttachments(formData?.compulsoryAttachments);
      setOptionalAttachments(formData?.optionalAttachments);
      setOtherOptionalAttachments(formData?.otherOptionalAttachments);
      setPaymentDetails(formData?.paymentDetails);
      setClientRole(formData?.clientRole);
      setProjectRole(formData?.projectrole);
    }
    // setSubscriptionPlanName(
    //   getSubscriptionType(decodeTokenData, selectedCompanyId)
    // ); // Assuming setPlanName exists to store the plan name
  }

  /**
   * Resets retained claims data in the global state.
   * Checks if there is any retained claims data from a subscription and clears it if present.
   */
  function resetRetainedClaimsData() {
    if (!_.isEmpty(retainedDataFromSubscription)) {
      dispatch(setPaymentClaims({}));
    }
  }

  function handleRoute(dynamicRoute?: string) {
    resetRetainedClaimsData();

    if (overviewType == OVERVIEW_TABS.project) {
      router.push(
        `${AppRoutes.USER_PROJECTS_OVERVIEW}/${overviewProjectId}?active_tab=${projectOverviewTabs.CLAIMS}`
      );
    } else if (overviewType === OVERVIEW_TABS.contract) {
      router.push(`${AppRoutes.USER_CONTRACTS_OVERVIEW}/${overviewContractId}`);
    } else if (dynamicRoute) {
      router.push(dynamicRoute);
    } else if (IsActivity === "log") {
      router.push(AppRoutes.USER_ACTIVITY_LOG);
    } else {
      router.back();
    }
    setLoader(false);
  }

  function formatRupees(amount: any) {
    return amount
      ? `$${amount?.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
      : "$0.00";
  }

  return (
    <AddUpdateClaimsContext.Provider
      value={{
        router,
        mode,
        formik,
        setLoader,
        decodeTokenData,
        importScreen,
        importCompanyId,
        companyExists,
        setCompanyExists,
        dispatch,
        ClientSupplierId,
        selectedCompanyId,
        projectOpt,
        setProjectOpt,
        availablePayments,
        setAvailablePayments,
        beneficiaryType,
        claimData,
        setClaimData,
        ClientSupplierType,
        ClaimType,
        selectedContractID,
        setSelectedContractId,
        selectedProjectID,
        setSelectedProjectId,
        contractOptions,
        setContractOptions,
        ScreenName,
        RetentionProjectId,
        RetentionContractId,
        RPaymentid,
        paymentDetails,
        setPaymentDetails,
        togglePaymentReceivables,
        togglePaymentBillables,
        compulsoryAttachments,
        setCompulsoryAttachments,
        optionalAttachments,
        setOptionalAttachments,
        otherOptionalAttachments,
        setOtherOptionalAttachments,
        isEditable,
        setIsEditable,
        setDisplayContractValueExceedModal,
        displayContractValueExceedModal,
        displayRetentionWarning,
        setDisplayRetentionWarning,
        displaySubscriptionModal,
        setDisplaySubscriptionModal,
        handleSubmit,
        handleNoticesTrigger,
        routeParams,
        fetchContractsForProject,
        noticesListData,
        setNoticesListData,
        initialPatchedValues,
        setInitialPatchedValues,
        setProceedWithExceedingAmount,
        loader,
        CashRetentionType,
        RetentionId,
        isThirdPartyRetention,
        setPaymentToOptions,
        paymentToOptions,
        selectedClientId,
        setSelectedClientId,
        selectedSupplierId,
        setSelectedSupplierId,
        isViewMode,
        setIsViewMode,
        disableDraftButton,
        setDisableDraftButton,
        Type,
        paymentType,
        paymentId,
        handleRoute,
        importClaimIdFromMail,
        overviewProjectId,
        IsActivity,
        formatRupees,
        queryParams,
        setRoutePathStoredData,
        paymentsPatchData,
        setPaymentsPatchData,
        delegationBankId,
        setDelegationBankId,
        retrieveAfterAddingQuickRecord,
        setRetentionBankAccounts,
        retentionAmount,
        retentionBankAccounts,
        importClaimsAPIData,
        setImportClaimAPIData,
        quickContractId,
        setQuickContractId,
        setClientRole,
        setProjectRole,
        clientRole,
        projectRole,
        generateClaimData,
        setGenerateClaimData,
        generateClaimCount,
        setGenerateClaimCount,
        openGenereatedClaimModel,
        setOpenGenereatedClaimModel,
        isReasonDataLoaded,
        setIsReasonDataLoaded,
        isBasic,
        isPaid,
        isNotPaid,
        reasonsData,
        setReasonsData,
        retainedDataFromSubscription,
        showNoticePopup,
        setShowNoticePopup,
        noticeFiles,
        setNoticeFiles,
        noticeMailUuids,
        setNoticeMailUuids,
        timeLeft,
        setTimeLeft,
        setLoaderInfo,
        qbccNoticeFiles,
        setQbccNoticeFiles,
        qbccNoticeUuids,
        setQbccNoticeUuids,
        delegateAuthorityAllowed,
        setDelegateAuthorityAllowed,
        noticesAutomated,
        setNoticesAutomated,
      }}
    >
      {children}
    </AddUpdateClaimsContext.Provider>
  );
};

// Create a custom hook for using the global context
const useAddUpdateClaimsContext = () => {
  const context = useContext(AddUpdateClaimsContext);
  if (!context) {
    throw new Error("Error in Add Update Claims Context");
  }
  return context;
};

export { useAddUpdateClaimsContext };
