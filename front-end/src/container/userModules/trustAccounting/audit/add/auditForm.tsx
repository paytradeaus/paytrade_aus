//default imports
"use client";
import React, { Fragment, useEffect, useState } from "react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  CaretRightFill,
  ExclamationTriangleFill,
  FilePost,
} from "react-bootstrap-icons";
import { Button, Form } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import FormButton from "@/components/Button/button";
import customStyles from "./auditForm.module.scss";
import { ApplicationURLS } from "@/common/applicationURLS";
import CustomDatePicker from "@/components/customDatePicker/customDatePicker";
import { FetchAllBankAccounts } from "@/container/userModules/bankTrustAccount/backTrustAccount.functions";
import { getCookie } from "cookies-next";
import {
  commonCookies,
  DD_MM_YYYY,
  SubscriptionPlanTypes,
} from "@/common/constants/general";
import { useFormik } from "formik";
import * as Yup from "yup";
import { lastDayOfMonth } from "date-fns";
import { format } from "date-fns";
import { returnOptions } from "../adminConstantData";
import UploadReport from "../upload/uploadPage";
import { AppModal } from "@/components/model/model";
import {
  checkAuditReportExistence,
  checkNilReturnForAudit,
  deleteAttachment,
  editAuditReportDetails,
  insertAuditReportDetails,
  triggerAuditNotices,
  viewAuditReportById,
} from "./auditForm.functions";
import { useTokenDetails } from "@/common/commonHooks";
import { singleUploadApi } from "@/app/api/commonAPIs";
import { useLoaderContext } from "@/context/useLoader";
import { jwtDecode } from "jwt-decode";

import { SUBSCRIPTION_UPGRADE } from "@/common/constants/messages";
import { getSubscriptionType } from "@/common/commonFunctions";
import _ from "lodash";
import { useAppSelector } from "@/redux/store";
import { setAuditDetails } from "@/redux/slices/subscribeRouteBackDetails";
import { useDispatch } from "react-redux";
import moment from "moment";

type VIEW_PAGE_TYPES = "mainPage" | "UploadPage";

const validationSchema = () =>
  Yup.object().shape({
    AccountName: Yup.object().required("Account is required"),
    MonthEnd: Yup.string().test("unique", "monthend", function (value) {
      const isMonthEndEnabled = this.parent.AccountName;
      if (
        Object.keys(isMonthEndEnabled ? isMonthEndEnabled : {}).length > 0 &&
        !value
      ) {
        return this.createError({ message: "Audit Date is required" });
      }
      return true;
    }),
    AuditReport: Yup.mixed().test(
      "AuditReport",
      "Audit Report is required",
      function (value) {
        const isAccountNameSet =
          this.parent.AccountName &&
          Object.keys(this.parent.AccountName).length > 0;
        if (isAccountNameSet && !value) {
          return this.createError({ message: "Audit Report is required" });
        }
        return true;
      }
    ),

    NilReturn: Yup.object().test(
      "NilReturn",
      "Nil Return is required",
      function (value) {
        const isAccountNameSet =
          this.parent.AccountName &&
          Object.keys(this.parent.AccountName).length > 0;
        if (isAccountNameSet && (!value || Object.keys(value).length === 0)) {
          return this.createError({ message: "Nil Return is required" });
        }
        return true;
      }
    ),
  });

export default function AuditForm(props: any) {
  const BankAccId = useSearchParams().get("bank") || getCookie("bankId");
  const AdminCompanyId = getCookie("compId");
  const dispatch = useDispatch();

  const { isEdit = false, isView = false, ...rest } = props;
  //Other Hooks
  const router = useRouter();
  const params = useParams();

  //state contains retained data from subscriptions if any
  const retainedDataFromSubscription: any = useAppSelector(
    (state: any) => state?.retainedDataFromSubscription?.auditDetails
  );

  const routePath = usePathname();
  const [openWarningModal, setOpenWarningModal] = useState(false);
  const [openConfirmModal, setOpenConfirmModal] = useState(false);

  const [viewPages, setViewPages] = useState<VIEW_PAGE_TYPES>("mainPage");
  const [selectedValue, setSelectedValue] = useState("");
  const [auditData, setAuditData] = useState<any>({});
  const selectedCompanyId = Number(getCookie("companyId")) || 0;
  const [uploadData, setUploadData] = useState<any>({});

  const [accountList, setAccountList] = useState([]);
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [hasWarning, setHasWarning] = useState(false);
  const { loader, setLoader }: any = useLoaderContext();
  const [role, setRole] = useState<string | null>(null);

  const [subscriptionPlanName, setSubscriptionPlanName] =
    useState<string>("Basic"); //company or user's current subscription plan

  const [displaySubscriptionModal, setDisplaySubscriptionModal] =
    useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken"); // Adjust according to your token storage
    if (token) {
      const decodedToken: any = jwtDecode(token);
      setRole(decodedToken?.role);
    }

    subscriptionConfiguration();
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
            formik.setFieldValue("AccountName", matchingAccount);
          }
        }
      }
    })();
  }, [AdminCompanyId, selectedCompanyId]);

  useEffect(() => {
    (async () => {
      try {
        if (params?.id) {
          const payload = {
            id: params.id || "",
          };
          const auditData = await viewAuditReportById(payload); // Replace this with the actual service function to view the audit report by ID
          if (auditData?.id) {
            setAuditData(auditData);
            const auditDate: any = auditData?.audit_date
              ? new Date(auditData.audit_date)
              : "";
            const bankAccount: any = {
              label: auditData?.account_name,
              value: auditData?.bank_account_id,
            };

            formik.setValues({
              AccountName: bankAccount,
              MonthEnd: auditDate,
              AuditReport: auditData?.file || "",
              NilReturn: {
                label: auditData?.nil_return,
                value: auditData?.nil_return,
              },
            });
            setSelectedAccount(bankAccount);

            if (auditData?.file_name) {
              setUploadData({
                name: auditData.file_name,
                path: auditData.file_path,
                type: auditData.file_type,
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching audit report ID:", error);
      }
    })();
  }, [params?.id]);

  const auditValue: any = "";
  const formik = useFormik({
    initialValues: {
      AccountName: "",
      MonthEnd: "",
      AuditReport: auditValue,
      NilReturn: {},
    },
    validationSchema,
    onSubmit: () => handleSubmit(),
  });

  async function handleSubmit(skipSubscriptionUpgrade?: boolean) {
    const { values }: any = formik || {};

    setLoader(true);
    if (hasWarning) {
      // If there is a warning, show the modal and stop form submission
      setOpenWarningModal(true);
      setLoader(false);
      return; // Prevent form submission if there is a warning
    }

    //condition to show upgrade subscription modal
    if (
      subscriptionPlanName === SubscriptionPlanTypes.BASIC &&
      !skipSubscriptionUpgrade &&
      values?.NilReturn?.value === "Yes"
    ) {
      setDisplaySubscriptionModal(true);
      setLoader(false);
      return;
    }

    const nilCheckResult = await checkNilReturnIfNeeded();

    if (!nilCheckResult.valid) {
      setLoader(false);
      setOpenConfirmModal(true); // Open the confirmation modal
      setAuditData({ message: nilCheckResult.message }); // Set the message to show in the modal
      return; // Prevent form submission
    }

    const nilPayValue: any = values.NilReturn;

    const payload: any = {
      company_id: AdminCompanyId ? Number(AdminCompanyId) : selectedCompanyId,
      bank_account_id: Number(selectedAccount?.value),
      audit_date: values.MonthEnd
        ? moment(values.MonthEnd).format("YYYY-MM-DD")
        : null,
      nil_return: nilPayValue?.value || "No", // Default to "No" if value is undefined
    };

    try {
      let result;
      if (isEdit && auditData?.id) {
        // Call the update service when isEdit is true
        payload.id = auditData?.id;
        result = await editAuditReportDetails(payload); // Replace with the actual update service
      } else {
        // Call the insert service when isEdit is false
        result = await insertAuditReportDetails(payload);
      }

      if (result) {
        // Check if there's a file to delete
        if (uploadData?.removedFile) {
          const deletePayload = {
            attachmentId: auditData?.attachment_id,
            attachmentType: "Audit",
            id: auditData?.id,
          };

          const deleteResponse = await deleteAttachment(deletePayload);

          if (!deleteResponse) {
            console.error("Failed to delete the file.");
          }
        }
        if (
          uploadData?.selectedFile &&
          typeof uploadData?.selectedFile === "object"
          // !uploadData?.selectedFile?.startsWith("data:")
        ) {
          const uploadPayload = {
            audit_id: result?.audit_id,
            uploaded_by: decodeTokenData?.emailId || "unknown", // Default to "unknown" if emailId is not available
            attachment_type: "Audit",
          };

          // Ensure singleUploadApi is correctly defined and used
          const fileResponse = await singleUploadApi(
            uploadData?.selectedFile ? uploadData?.selectedFile : uploadData, // Ensure this matches the expected parameter in singleUploadApi
            uploadPayload,
            accessTokenId
          );
          // trigger
          if (result?.audit_id && result?.nil_return === "Yes") {
            //triggerAuditNotices
            await triggerAuditNotices({
              audit_id: result?.audit_id,
            });
          }
          // Handle file upload success/failure
          if (fileResponse) {
            const tabParam = new URLSearchParams({
              tab: "Audit",
            }).toString();
            if (role === "PORTAL ADMIN") {
              router.push(
                `/admin/journals/trust-accounting?${tabParam}&bank=${payload?.bank_account_id}`
              );
              resetRetainedAuditData();
            } else {
              router.push(
                `/user/trust-accounting?${tabParam}&bank=${payload?.bank_account_id}`
              );
              resetRetainedAuditData();
            }
          } else {
            console.error("File upload failed.");
          }
        } else {
          // trigger
          if (result?.audit_id && result?.nil_return === "Yes") {
            //triggerAuditNotices
            await triggerAuditNotices({
              audit_id: result?.audit_id,
            });
          }
          const tabParam = new URLSearchParams({
            tab: "Audit",
          }).toString();
          if (role === "PORTAL ADMIN") {
            router.push(
              `/admin/journals/trust-accounting?${tabParam}&bank=${payload?.bank_account_id}`
            );
            resetRetainedAuditData();
          } else {
            router.push(
              `/user/trust-accounting?${tabParam}&bank=${payload?.bank_account_id}`
            );
            resetRetainedAuditData();
          }
        }
        // Handle successful audit report insertion
      } else {
        console.error("Failed to add audit report details.");
      }
    } catch (error) {
      // Handle unexpected errors
      console.error("Error in onSubmit:", error);
    } finally {
      setLoader(false);
    }
  }

  const proceedWithFormSubmission = async (values: any) => {
    const nilPayValue: any = values.NilReturn;
    // Prepare the payload for the service
    const payload: any = {
      company_id: AdminCompanyId ? Number(AdminCompanyId) : selectedCompanyId,
      bank_account_id: Number(selectedAccount?.value),
      audit_date: values.MonthEnd
        ? new Date(values.MonthEnd).toISOString()
        : null,
      nil_return: nilPayValue?.value || "No",
    };

    try {
      let result;
      if (isEdit && auditData?.id) {
        // Call the update service when isEdit is true
        payload.id = auditData?.id;
        result = await editAuditReportDetails(payload);
      } else {
        // Call the insert service when isEdit is false
        result = await insertAuditReportDetails(payload);
      }

      if (result) {
        // Handle file deletion if needed
        if (uploadData?.removedFile) {
          const deletePayload = {
            attachmentId: auditData?.attachment_id,
            attachmentType: "Audit",
            id: auditData?.id,
          };

          const deleteResponse = await deleteAttachment(deletePayload);
          if (!deleteResponse) {
            console.error("Failed to delete the file.");
          }
        }

        // Handle file upload if needed
        if (
          uploadData?.selectedFile &&
          typeof uploadData?.selectedFile === "object"
        ) {
          const uploadPayload = {
            audit_id: result?.audit_id,
            uploaded_by: decodeTokenData?.emailId || "unknown",
            attachment_type: "Audit",
          };

          const fileResponse = await singleUploadApi(
            uploadData?.selectedFile,
            uploadPayload,
            accessTokenId
          );

          if (!fileResponse) {
            console.error("File upload failed.");
          }
        }

        // Trigger audit notices if required
        if (result?.audit_id && result?.nil_return === "Yes") {
          await triggerAuditNotices({
            audit_id: result?.audit_id,
          });
        }

        // Redirect based on the role
        const tabParam = new URLSearchParams({
          tab: "Audit",
        }).toString();

        if (role === "PORTAL ADMIN") {
          router.push(
            `/admin/journals/trust-accounting?${tabParam}&bank=${payload?.bank_account_id}`
          );
          resetRetainedAuditData();
        } else {
          router.push(
            `/user/trust-accounting?${tabParam}&bank=${payload?.bank_account_id}`
          );
          resetRetainedAuditData();
        }
      } else {
        console.error("Failed to add audit report details.");
      }
    } catch (error) {
      console.error("Error in proceedWithFormSubmission:", error);
    } finally {
      setLoader(false);
    }
  };

  async function onStatementChange(value: any) {
    if (!selectedAccount) return;

    const bank_account_id = Number(selectedAccount?.value);
    const account_type = selectedAccount?.type;
    const selectedDate = value ? new Date(value) : null;
    const monthEndDate = selectedDate ? lastDayOfMonth(selectedDate) : null;
    const formattedMonthEndDate = monthEndDate
      ? format(monthEndDate, "yyyy-MM-dd")
      : null;

    formik.setFieldValue("MonthEnd", monthEndDate);

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (!formattedMonthEndDate) return;

    checkNilReturnIfNeeded({ auditDate: value });

    try {
      const auditReportExistenceResponse = await checkAuditReportExistence({
        bank_account_id,
        month_end_date: formattedMonthEndDate,
        timezone,
      });

      if (auditReportExistenceResponse?.warning) {
        setAuditData(auditReportExistenceResponse);
        setOpenWarningModal(true);
        setHasWarning(true);
      } else {
        setHasWarning(false);
        setOpenWarningModal(false);
      }
      // }
    } catch (error) {
      console.error(
        "An error occurred while processing statement change:",
        error
      );
    }
  }

  async function checkNilReturnIfNeeded(obj?: {
    auditDate?: any;
    auditNil?: any;
  }): Promise<{ valid: boolean; message?: string }> {
    if (!selectedAccount) return { valid: false };

    const bank_account_id = Number(selectedAccount?.value);
    const account_type = selectedAccount?.type;
    const selectedDate: any = obj?.auditDate
      ? obj?.auditDate
      : formik.values.MonthEnd;
    const monthEndDate = selectedDate ? lastDayOfMonth(selectedDate) : null;
    const formattedMonthEndDate: any = monthEndDate
      ? format(monthEndDate, "yyyy-MM-dd")
      : null;

    const nilValue: any = obj?.auditNil
      ? obj?.auditNil
      : formik.values.NilReturn;

    if (
      nilValue?.value === "Yes" &&
      account_type === "Retention Trust Account"
    ) {
      try {
        const nilReturnResponse = await checkNilReturnForAudit({
          bank_account_id,
          year_end_date: formattedMonthEndDate,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });

        if (nilReturnResponse?.warning) {
          // Return the warning message
          return { valid: false, message: nilReturnResponse?.message };
        } else {
          return { valid: true };
        }
      } catch (error) {
        console.error("An unexpected error occurred:", error);
        return { valid: true };
      }
    } else {
      return { valid: true };
    }
  }

  const handleSelectChange = (selectedValue: any) => {
    setSelectedValue(selectedValue);
    if (selectedValue) {
      formik.setFieldValue("NilReturn", selectedValue);
      checkNilReturnIfNeeded({ auditNil: selectedValue });
    } else {
      formik.setFieldValue("NilReturn", "");
    }
    // Perform any other actions based on the selected value
  };
  const handleCancel = () => {
    const tabParam = new URLSearchParams({
      tab: "Audit",
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
    resetRetainedAuditData();
  };

  const handleAccountChange = (selected: any) => {
    setSelectedAccount(selected);
    formik.setFieldValue("AccountName", selected);
  };

  /**
   * Patches transaction formData from retained redux state on route back from subscriptions.
   * and sets subscription plan type
   */
  function subscriptionConfiguration() {
    //update current subscription plan type to trigger notices on submit
    setSubscriptionPlanName(
      getSubscriptionType(decodeTokenData, selectedCompanyId)
    ); // Assuming setPlanName exists to store the plan name

    if (!_.isEmpty(retainedDataFromSubscription)) {
      formik?.setValues(retainedDataFromSubscription);
      setSelectedAccount(retainedDataFromSubscription?.AccountName);
      setUploadData(retainedDataFromSubscription?.AuditReport);
    }
  }

  function handleManualNotices() {
    setDisplaySubscriptionModal(false);
    handleSubmit(true);
  }

  function handleUpgradeSubscription() {
    sessionStorage.setItem(commonCookies.NAVIGATED_FROM, routePath);
    dispatch(setAuditDetails(formik?.values));
    router.push(ApplicationURLS.USER_SUBSCRIPTION_UPGRADE);
  }

  /**
   * Resets retained Audit data in the global subscription details state.
   * Checks if there is any retained Audit data from a subscription and clears it if present.
   */
  function resetRetainedAuditData() {
    if (!_.isEmpty(retainedDataFromSubscription)) {
      dispatch(setAuditDetails({}));
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
            label: isView ? "View Audit" : isEdit ? "Edit Audit" : "Add Audit",
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
            href: "/user/trust-accounting",
            label: isView ? "View Audit" : isEdit ? "Edit Audit" : "Add Audit",
            active: routePath.startsWith("/user/trust-accounting/audit/"),
          },
        ];

  switch (viewPages) {
    case "mainPage":
      return (
        <Fragment>
          <div className={customStyles?.breadcrumb}>
            <ReusableBreadcrumb
              items={breadcrumbItems}
              separator={
                <span className={customStyles.separatorStyle}>&gt;</span>
              }
            />
          </div>
          <Form className={customStyles.card} onSubmit={formik.handleSubmit}>
            <FilePost className={customStyles?.profileIcon} />
            <div className="mb-5">
              <h5 className={customStyles.title}>Add Audit</h5>
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
                label="Reference Date *"
                toggleCalendarOnIconClick
                placeholderText="Select Report Month End"
                className={
                  formik.touched.MonthEnd && formik.errors.MonthEnd
                    ? ` ${customStyles.datePickerError}`
                    : ""
                }
                selected={formik.values.MonthEnd}
                onChange={(e: any) => onStatementChange(e)}
                disabled={!selectedAccount || isView || isEdit}
                format={DD_MM_YYYY}
                value={formik?.values?.MonthEnd}
                maxDate={new Date()}
                // showMonthYearPicker={true}
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
                labelText="Audit Report *"
                placeholder={
                  formik.values.AuditReport?.selectedFile ||
                  formik.values.AuditReport
                    ? "Audit Report Added"
                    : "Please Upload Audit Report"
                }
                name="AuditReport"
                id="AuditReport"
                onBodyClick={() => !isView && setViewPages("UploadPage")}
                value={""}
                errorText={formik.errors.AuditReport}
                isInvalid={
                  formik.touched.AuditReport && formik.errors.AuditReport
                    ? true
                    : false
                }
                className={`${customStyles.disabledTextField} ${
                  formik.touched.AuditReport && formik.errors.AuditReport
                    ? `${customStyles.inputFieldControl} ${customStyles.inputError}`
                    : customStyles.inputFieldControl
                }`}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                endingDataStyles={customStyles.endIconStyle}
                endingData={
                  <div>
                    <CaretRightFill className={customStyles.editIcon} />
                  </div>
                }
              />
            </div>
            <div className={customStyles.textFieldStyles}>
              <SearchableSelect
                options={returnOptions}
                selectedData={formik.values.NilReturn}
                label="Nil Return *"
                onChange={handleSelectChange}
                disabled={!selectedAccount || isView}
                // placeholder="Nil Return - Retention Trust Account wasn't Used this Year"
                className={customStyles.textFieldStyles}
              />
              {formik.touched.NilReturn && formik.errors.NilReturn && (
                <div
                  className={`${customStyles.errorText} ${customStyles.icon}`}
                >
                  <ExclamationTriangleFill className={customStyles.icon} />
                  {formik?.errors?.NilReturn as string}
                </div>
              )}
            </div>
            {!isView && (
              <FormButton className={customStyles.submitButton} type="submit">
                {isEdit ? "Update" : "Save"}
              </FormButton>
            )}
            <Button
              className={customStyles.cancelButton}
              type="button"
              onClick={() => handleCancel()}
            >
              Cancel
            </Button>
          </Form>
          <AppModal
            show={openWarningModal}
            onHide={() => setOpenWarningModal(false)}
            firstButtonLabel="Ok"
            modalHeading="Audit Notice"
            modalBodyTitle=""
            modalBodyContent={auditData?.message}
            onConfirm={() => setOpenWarningModal(false)}
          />
          <AppModal
            show={openConfirmModal}
            onHide={() => setOpenConfirmModal(false)}
            firstButtonLabel="Proceed"
            secondButtonLabel="Cancel"
            modalHeading="Confirmation Required"
            modalBodyTitle=""
            modalBodyContent={auditData?.message}
            onConfirm={async () => {
              setOpenConfirmModal(false); // Close the modal
              setLoader(true); // Show loader
              await proceedWithFormSubmission(formik.values); // Proceed with the form submission
            }}
          />
          {displaySubscriptionModal && (
            <AppModal
              show={displaySubscriptionModal}
              cancelfnButtonLabel="Proceed with manual notices"
              firstButtonLabel="Upgrade now"
              modalHeading={"Upgrade Subscription"}
              onConfirm={handleUpgradeSubscription}
              modalBodyContent={SUBSCRIPTION_UPGRADE}
              onCancel={handleManualNotices}
            />
          )}
        </Fragment>
      );
    case "UploadPage":
      return (
        <UploadReport
          setViewPages={setViewPages}
          setUploadData={(data: any) => {
            setUploadData(data);
            formik.setFieldValue("AuditReport", data);
          }}
          isEdit={isEdit}
          fileDetails={auditData}
          initialValue={
            formik.values.AuditReport?.selectedFile
              ? formik.values.AuditReport?.selectedFile
              : formik.values.AuditReport
          }
        />
      );
    default:
      return <></>;
  }
}
