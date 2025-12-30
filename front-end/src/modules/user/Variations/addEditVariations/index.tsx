"use client";

import FormikControl from "@/components/FormikControl";
import { useLoaderContext } from "@/context/useLoader";
import { useTokenDetails } from "@/hooks";
import {
  buttonType,
  findSelectedOptions,
  InputType,
  quickAddRoutes,
  uploadFile,
} from "@/shared/constant/general";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

import * as Yup from "yup";
import { useFormik } from "formik";
import {
  base64ToFile,
  downloadFile,
  fileToBase64,
  formatDate,
  getCompanyIdFromStorage,
} from "@/utils";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  showInfoToast,
  showSuccessToast,
  showWarningToast,
} from "@/components/Toaster";
import _, { isEqual } from "lodash";
import CustomButton from "@/components/CustomButton/CustomButton";

import { ApiResponse, FileErrors } from "@/shared/constant/messages";
import {
  addVariationsFormData,
  fetchContractList,
  fetchProjectList,
  fetchVariationsListById,
  updateVariationsFormData,
} from "../variations.functions";
import { singleUploadApi } from "@/network/apolloClient";
import BaseModal from "@/components/BaseModal";
import { deleteAttachment } from "@/app/api/commonApi";
import { addVariationStatusOptions } from "../variations.constant";
import { projectOverviewTabs } from "../../Projects/ProjectOverview/ProjectOverview.constant";

export default function AddEditVariations(props: any) {
  const { isAdd = false, isView = false, isEdit = false } = props;

  const queryParams: any = useSearchParams();
  const params = useParams();

  const fileInputRef = useRef<any>(null); // Reference to the file input
  const router = useRouter();

  const overviewProject = queryParams.get("project");
  const overViewId = queryParams.get("overview");
  const overviewContract = queryParams.get("contract");
  const IsActivity: any = queryParams.get("from");
  const retrieveAfterAddingQuickRecord: any =
    queryParams.get("retrieve-record");

  const [selectedFileError, setSelectedFileError] = useState<any>("");
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [availableContracts, setAvailableContracts] = useState<any[]>([]);

  const { decodeTokenData, accessTokenId } = useTokenDetails();

  const [patchData, setPatchData] = useState<any>(null);

  const { loader, setLoader }: any = useLoaderContext();
  const [isOriginalFileDeleted, setIsOriginalFileDeleted] = useState(false);
  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const [initialPatchedValues, setInitialPatchedValues] = useState<any>({
    variation_id: "",
    variation_name: "",
    project_name: "",
    contract_name: "",
    variation_status: "Draft",
    variation_amount: "",
    modified_variation_amount: "",
    uploaded_file: "",
  });
  const [routePathStoredData, setRoutePathStoredData] = useState<any>(null);
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);

  let validationSchema = Yup.object().shape({
    variation_name: Yup.string().required("Variation name is required"),
    project_name: Yup.string().required("Project name is required"),
    contract_name: Yup.string().required("Contract name is required"),
    variation_status: Yup.string().required("Status is required"),

    uploaded_file: Yup.mixed().required("Attachment is required"),

    modified_variation_amount: Yup.string().required(
      "Variation amount is required"
    ),
    variation_amount: Yup.string().required("Variation amount is required"),
  });

  const formik: any = useFormik({
    initialValues: {
      variation_id: "",
      variation_name: "",
      project_name: "",
      contract_name: "",
      variation_status: "",
      variation_amount: "",
      modified_variation_amount: "",
      uploaded_file: "",
    },
    validationSchema,
    onSubmit: () => {
      handleSubmit();
    },
  });

  useEffect(() => {
    if (retrieveAfterAddingQuickRecord == quickAddRoutes.RETRIEVE_VARIATION) {
      getStoredFormData();
    }
  }, []);

  useEffect(() => {
    getProjectList();

    if (isAdd && !isEdit) {
      formik.setFieldValue(
        "variation_status",
        addVariationStatusOptions[0]?.value
      );
    }
    (async () => {
      if (!isAdd && params?.id) {
        setLoader(true);
        const payload: any = {
          id: params?.id || "",
        };
        const variationDataByID = await fetchVariationsListById(payload);
        if (variationDataByID?.id) {
          setPatchData(variationDataByID);
        } else {
          showWarningToast("No data in this id");
          router.back();
        }
        setLoader(false);
      }
    })();
  }, [params]);

  useEffect(() => {
    if (formik?.values?.project_name)
      getContractList(formik?.values?.project_name);
  }, [formik?.values?.project_name]);

  useEffect(() => {
    if (
      (!isAdd && patchData?.id) ||
      routePathStoredData?.quickAddFromVariations
    ) {
      const formData = routePathStoredData?.quickAddFromVariations
        ? routePathStoredData
        : patchData;

      const settingData = {
        variation_id: formData?.variation_id,
        contract_name: formData?.contract_id ?? formData?.contract_name,
        project_name: formData?.project_id ?? formData?.project_name,
        variation_name: formData?.variation_name,
        variation_status: formData?.variation_status,
        variation_amount: formData?.variation_amount,
        modified_variation_amount: formData?.modified_variation_amount
          ? formData?.modified_variation_amount
          : formData?.variation_amount
          ? formatDollars(formData?.variation_amount.toFixed(2).toString())
          : "$0.00",
        uploaded_file: formData?.file
          ? [
              {
                file: formData?.file,
                name: formData?.file_name,
                attachment_id: formData?.attachment_id,
                type: formData?.file_type,
              },
            ]
          : formData?.uploaded_file?.file
          ? [
              base64ToFile(
                formData?.uploaded_file?.file,
                formData?.uploaded_file?.name,
                formData?.uploaded_file?.type
              ),
            ]
          : null,
      };
      formik.setValues(settingData);
      setInitialPatchedValues(settingData);
    }
  }, [patchData, routePathStoredData]);

  useEffect(() => {
    if (overviewProject && availableProjects.length > 0) {
      const selectedProject = availableProjects.find(
        (project) => project.value === Number(overviewProject)
      );
      if (selectedProject) {
        formik.setFieldValue("project_name", selectedProject.value);
      }
    }
  }, [overviewProject, availableProjects]);

  async function getProjectList() {
    const postData = {
      companyId: Number(localStorage.getItem("companyId")) || "",
    };

    const response: any = await fetchProjectList(postData);

    if (response?.length > 0) {
      const modifiedData = response.map((data: any) => {
        return { label: data?.project_name, value: data?.project_id };
      });

      if ((overviewProject && overviewContract) || overviewProject) {
        formik.setFieldValue(
          "project_name",
          findSelectedOptions(modifiedData, overviewProject)
        );
      } else {
      }
      setAvailableProjects(modifiedData);
    } else {
      setAvailableProjects([]);
    }
  }

  async function getContractList(
    selectedProject: { label: string; value: string | number } | null
  ) {
    const postData = {
      company_id: Number(localStorage.getItem("companyId")) || "",
      project_id: selectedProject?.value || null,
    };

    try {
      const response: any = await fetchContractList(postData);

      if (response?.length > 0) {
        let modifiedData = response.map((data: any) => ({
          label: data?.contract_name,
          value: data?.contract_id,
        }));

        let selectedContract: any = null;

        // Find the contract matching overviewContract
        if (overviewContract) {
          selectedContract = modifiedData.find(
            (contract: any) =>
              String(contract.value) === String(overviewContract)
          );

          if (selectedContract) {
            // Move selected contract to the top of the list
            modifiedData = [
              selectedContract,
              ...modifiedData.filter(
                (contract: any) => contract.value !== selectedContract.value
              ),
            ];

            formik.setFieldValue("contract_name", selectedContract.value);
          }
        }

        setAvailableContracts(modifiedData);
      } else {
        setAvailableContracts([]);
      }
    } catch (error) {
      console.error("Error fetching contract list:", error);
    }
  }

  const handleFormCancelClick = () => {
    routeBack();
  };

  const formatDollars = (value: string): string => {
    // Split the number by the decimal point
    const parts = value.split(".");
    // Add commas to the integer part
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    // Join the integer and decimal parts (if present)
    return `$${parts.join(".")}`;
  };

  const handleInitialContractSum = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { value } = e.target;
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    if (rawValue === "") {
      formik.setFieldValue("modified_variation_amount", ""); // Clear formatted value
      formik.setFieldValue("variation_amount", ""); // Clear raw value
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

    formik.setFieldValue("modified_variation_amount", formattedValue); // Formatted value with dollar sign
    formik.setFieldValue("variation_amount", finalValue); // Raw numeric value
  };

  async function handleSubmit() {
    try {
      setLoader(true);
      const addEditPostData: any = {
        createVariationInput: {
          company_id: getCompanyIdFromStorage(),
          project_id: Number(formik?.values?.project_name),
          contract_id: Number(formik?.values?.contract_name),
          variation_name: formik?.values?.variation_name,
          variation_status: formik?.values?.variation_status,
          variation_amount: Number(formik?.values?.variation_amount),
        },
      };

      if (isAdd) {
        const response = await addVariationsFormData(addEditPostData);
        if (response?.status) {
          const filePostData = {
            variation_id: response?.data?.variation_id,
            uploaded_by: decodeTokenData?.emailId,
            attachment_type: "Variations",
          };

          const fileResponse: any = await singleUploadApi(
            formik?.values?.uploaded_file[0],
            filePostData,
            accessTokenId
          );

          if (fileResponse?.file) {
            showSuccessToast(response?.message);
            routeBack();
            setLoader(false);
            return;
          }
          routeBack();
          setLoader(false);
          return;
        }
        setLoader(false);
        return;
      }
      if (isEdit) {
        const {
          project_name,
          contract_name,
          variation_name,
          variation_status,
          variation_amount,
        } = formik.values;

        if (
          Number(project_name) === patchData?.project_id &&
          Number(variation_amount) === patchData?.variation_amount &&
          Number(contract_name) === patchData?.contract_id &&
          variation_name === patchData?.variation_name &&
          variation_status === patchData?.variation_status &&
          !isOriginalFileDeleted
        ) {
          showInfoToast("No changes to Update");
          setLoader(false);
          return;
        }

        const updatePostData = {
          updateVariationInput: {
            id: patchData?.id,
            ...addEditPostData.createVariationInput,
            company_id: patchData?.company_id,
          },
        };
        const response = await updateVariationsFormData(updatePostData);
        if (response?.status) {
          if (isOriginalFileDeleted) {
            const postData = {
              id: patchData?.id,
              attachmentId: patchData?.attachment_id,
              attachmentType: "Variations",
            };
            await deleteAttachment(postData);

            const filePostData = {
              variation_id: response?.data?.variation_id,
              uploaded_by: decodeTokenData?.emailId,
              attachment_type: "Variations",
            };

            const fileResponse: any = await singleUploadApi(
              formik?.values?.uploaded_file[0],
              filePostData,
              accessTokenId
            );

            if (fileResponse?.file) {
              showSuccessToast(response?.message);
              routeBack();
              setLoader(false);
              return;
            }
          }
          routeBack();
          setLoader(false);
          return;
        }
        setLoader(false);
        return;
      }
    } catch (err: any) {
      setLoader(false);
    }
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;
    if (files && files.length > 0) {
      const filesToUpload: File[] = Array.from(files);

      // Check for Maximum Size

      const filesExceedSize = filesToUpload.some((file) => {
        // from bytes to kb
        const fileSize = file.size / 1024;
        return fileSize > uploadFile.fiveMB;
      });
      if (filesExceedSize) {
        // TODO: Handle when file size exceeds maximum size
        setSelectedFileError(FileErrors.FILE_LIMIT_EXCEEDS_5MB);
        formik?.setFieldValue("uploaded_file", null);
        fileInputRef.current.value = "";
        return;
      }
      formik?.setFieldValue("uploaded_file", filesToUpload);
      setSelectedFileError("");
    }
  }
  function handleProjectChange(value: any) {
    formik.setFieldValue("project_name", value);
    formik.setFieldValue("contract_name", "");
  }

  const handleDeleteAttachmentPopup = () => {
    setDisplayConfirmationModal(false);
    formik?.setFieldValue("uploaded_file", null);
    setIsOriginalFileDeleted(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    return true;
  };

  function handlePageConfirmSave() {
    formik?.handleSubmit();
    setDisplayClosePageConfirmation(false);
    return true;
  }
  function handleCancel() {
    if (isEqual(initialPatchedValues, formik.values) || isView) {
      handleFormCancelClick();
    } else {
      setDisplayClosePageConfirmation(true);
    }
  }

  async function handleAddQuickRecord(route: string) {
    let base64File: any = "";
    const formFileValue = formik?.values?.uploaded_file?.length
      ? formik?.values?.uploaded_file[0]
      : [];
    if (formFileValue?.name) {
      base64File = await fileToBase64(formFileValue);
    }
    const postData = {
      ...formik?.values,
      uploaded_file: formFileValue?.name
        ? {
            file: base64File,
            name: formFileValue?.name,
            type: formFileValue?.type,
            size: formFileValue?.size,
            lastModifiedDate: formFileValue?.lastModifiedDate,
            lastModified: formFileValue?.lastModified,
          }
        : null,
      quickAddFromVariations: true,
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

  function routeBack() {
    if (overViewId) {
      router.push(
        `${AppRoutes.USER_PROJECTS_OVERVIEW}/${overViewId}?active_tab=${projectOverviewTabs.VARIATIONS}`
      );
    } else if (
      retrieveAfterAddingQuickRecord == quickAddRoutes.RETRIEVE_VARIATION
    ) {
      router.push(AppRoutes.USER_ADD_VARIATIONS);
    } else if (IsActivity === "log") {
      router.push(AppRoutes.USER_ACTIVITY_LOG);
    } else {
      router.back();
    } // Send the user back to the previous page
    if (!isView) {
      showInfoToast(
        `This variation has not been ${isAdd ? "saved" : "updated"}.`
      );
    }
  }

  return (
    <>
      <div className="pt_smallbgimage">
        <div className="pt_centered">
          <div className="pt_centeredinner">
            <div className="pt_box_transparent_cp">
              <div className="grid">
                <div className="pt_login">
                  <h4>
                    {isEdit
                      ? "Edit Variation"
                      : isView
                      ? "View Variation"
                      : "Add Variation"}
                  </h4>
                  <>
                    {!isAdd && (
                      <>
                        <h5>
                          Variation Id - {formik?.values?.variation_id || ""}
                        </h5>
                        <h5>
                          Date -
                          {patchData?.created_on &&
                            formatDate(patchData?.created_on)}
                        </h5>
                      </>
                    )}
                  </>

                  <FormikControl
                    control={InputType.TEXT_FIELD}
                    label={"Variation Name"}
                    maxLength={150}
                    name="VariationName"
                    error={formik.errors.variation_name}
                    placeholder="Add variation name"
                    id="VariationName"
                    disabled={isView}
                    value={formik.values.variation_name}
                    onChange={(e: any) => {
                      let nameTrim = e?.target?.value.trim()
                        ? e?.target?.value
                        : e?.target?.value.trim();
                      formik?.setFieldValue("variation_name", nameTrim);
                    }}
                    onBlur={formik.handleBlur}
                    showError={
                      formik.touched.variation_name &&
                      formik.errors.variation_name
                    }
                    required
                  />

                  <FormikControl
                    label="Project Name"
                    secondLabel={isView || isEdit ? "" : "Add project"}
                    onSecondLabelClick={() =>
                      handleAddQuickRecord(
                        `${AppRoutes.USER_ADD_PROJECTS}?quick-add=${quickAddRoutes.PROJECT}`
                      )
                    }
                    name="Project Name"
                    id="Project Name"
                    options={availableProjects}
                    disabled={isView || overviewProject}
                    selectedData={formik.values.project_name}
                    control={InputType.SELECT}
                    value={formik.values.project_name}
                    error={formik.errors.project_name}
                    showError={
                      formik.touched.project_name && !formik.values.project_name
                    }
                    required
                    renderKey="label"
                    valueKey="value"
                    placeholder="Select project"
                    onBlur={formik.handleBlur}
                    onChange={(selectedOption: any) => {
                      handleProjectChange(selectedOption);
                    }}
                  />

                  <FormikControl
                    label="Contract Name"
                    secondLabel={isView || isEdit ? "" : "Add contract"}
                    onSecondLabelClick={() =>
                      handleAddQuickRecord(
                        `${AppRoutes.USER_ADD_CONTRACTS}?quick-add=${quickAddRoutes.CONTRACT}`
                      )
                    }
                    name="Contract Name"
                    id="Contract Name"
                    placeholder="Select contract"
                    options={availableContracts}
                    required
                    disabled={isView || overviewContract}
                    control={InputType.SELECT}
                    error={formik.errors.contract_name}
                    selectedData={formik.values.contract_name}
                    showError={
                      formik.touched.contract_name &&
                      formik.errors.contract_name
                    }
                    value={formik.values.contract_name}
                    renderKey="label"
                    valueKey="value"
                    onBlur={formik.handleBlur}
                    onChange={(selectedOption: any) => {
                      formik.setFieldValue("contract_name", selectedOption);
                    }}
                  />
                  <FormikControl
                    control={InputType.TEXT_FIELD}
                    label={"Variation Amount (excluding GST)"}
                    error={formik.errors.modified_variation_amount}
                    name="Variation Amount (excluding GST)"
                    placeholder="Input variation amount"
                    id="Variation Amount (excluding GST)"
                    disabled={isView}
                    value={formik.values.modified_variation_amount}
                    onChange={handleInitialContractSum}
                    onBlur={formik.handleBlur}
                    showError={
                      formik.touched.modified_variation_amount &&
                      formik.errors.modified_variation_amount
                    }
                    required
                  />
                  {!formik?.values?.uploaded_file && (
                    <>
                      <label htmlFor="Audit Report">
                        <small>Attachment</small>
                        <span className="required">*</span>
                      </label>
                      <input
                        type="file"
                        onChange={onFileChange}
                        accept={`${uploadFile.pdf}, ${uploadFile.word}`}
                        ref={fileInputRef}
                        disabled={formik?.values?.uploaded_file?.length > 0}
                      />
                    </>
                  )}
                  {formik.touched.uploaded_file &&
                    (selectedFileError || formik.errors.uploaded_file) && (
                      <small className="invalid error_wrap">
                        <i className="fa-light fa-circle-xmark"></i>

                        {selectedFileError || formik.errors.uploaded_file}
                      </small>
                    )}

                  {formik?.values?.uploaded_file?.length > 0 && (
                    <>
                      <label htmlFor="Uploaded Document">
                        <small>Uploaded Document</small>
                        <span className="required">*</span>
                      </label>
                      <div
                        className="pt_itemwithremove"
                        style={{ margin: "5px 0px" }}
                      >
                        <span
                          className="cu-pointer"
                          onClick={() => {
                            console.log(formik?.values?.uploaded_file[0]);
                            downloadFile(
                              formik?.values?.uploaded_file[0]?.file,
                              formik?.values?.uploaded_file[0]?.name
                            );
                          }}
                        >
                          {formik?.values?.uploaded_file[0]?.name}
                        </span>
                        {!isView && (
                          <button
                            className="contrast smallbutton"
                            onClick={() => {
                              if (isEdit) {
                                setDisplayConfirmationModal(true);
                                return;
                              }
                              formik?.setFieldValue("uploaded_file", null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = "";
                              }
                            }}
                          >
                            <i
                              className="fa-light fa-xmark"
                              style={{ margin: 0 }}
                            ></i>
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  <FormikControl
                    control={InputType.SELECT}
                    placeholder="Select Status"
                    options={addVariationStatusOptions}
                    label={"Status"}
                    name="status"
                    id="status"
                    disabled={isView}
                    required
                    error={formik.errors.variation_status}
                    showError={
                      formik.touched.variation_status &&
                      formik.errors.variation_status
                    }
                    value={formik.values.variation_status}
                    renderKey="label"
                    valueKey="value"
                    onBlur={formik.handleBlur("variation_status")}
                    onChange={(selectedOption: any) => {
                      formik.handleChange("variation_status")(
                        selectedOption || ""
                      );
                    }}
                  />

                  <div className="button-container">
                    <CustomButton
                      buttonName={"Cancel"}
                      buttonType={buttonType.OUTLINE_CONTRAST}
                      actionType="button"
                      onClick={handleCancel}
                      inputButton
                      // disabled={formik?.isSubmitting}
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
      {displayConfirmationModal && (
        <BaseModal
          modalId={"Delete attachment"}
          displayModal={displayConfirmationModal}
          onClose={() => setDisplayConfirmationModal(false)}
          onHeaderIconClose={() => setDisplayConfirmationModal(false)}
          onConfirm={handleDeleteAttachmentPopup}
          firstButtonName="No"
          secondButtonName="Yes"
          restrictOncloseFunctionInHeader
        >
          <h4 className="text_center">
            Are you sure you want to delete the attachment?
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
    </>
  );
}
