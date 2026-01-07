"use client";

import React, { Fragment, useEffect, useState } from "react";
import { Row, Col, Form, Container, Button } from "react-bootstrap";
import styles from "./addEditVariations.module.scss";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import {
  ExclamationTriangleFill,
  Paperclip,
  XCircle,
} from "react-bootstrap-icons";

import { useFormik } from "formik";
import * as Yup from "yup";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { singleUploadApi } from "@/app/api/commonAPIs";
import {
  findSelectedOptions,
  formatDate,
  upperCaseFirstLetter,
} from "@/common/commonFunctions";
import {
  ADD,
  ALPHANUMERIC,
  DECIMAL_WITH_DOLLAR,
  EDIT,
  VIEW,
  onlyDOCandPDF,
} from "@/common/constants/general";
import FileSelector from "@/components/fileSelector/fileSelector";
import { toast } from "@/app/Toaster";
import {
  addVariationsFormData,
  deleteAttachment,
  fetchContractList,
  fetchProjectList,
  fetchVariationsListById,
  updateVariationsFormData,
} from "./variations.function";
import { variationStatusOptions } from "./variationConstantData";
import { useTokenDetails } from "@/common/commonHooks";
import { getCookie } from "cookies-next";
import { ApplicationURLS } from "@/common/applicationURLS";
import { AppModal } from "@/components/model/model";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { IoDocumentText } from "react-icons/io5";
import { useLoaderContext } from "@/context/useLoader";
import { tabId } from "@/container/userProjectOverview/userProjectOverview.constant";
import AttachmentPreview from "@/components/AttachmentPreview/AttachmentPreview";

function AddEditVariations() {
  const [timeKey, setTimeKey] = useState(new Date().getTime());

  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [availableContracts, setAvailableContracts] = useState<any[]>([]);
  const [uploadedAttachment, setUploadedAttachment] = useState<any>([]);
  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);

  const [isViewMode, setIsViewMode] = useState(false);
  const [patchData, setPatchData] = useState<any>(null);
  const [deletedAttachment, setDeletedAttachment] = useState<any>(null);

  const { setLoader }: any = useLoaderContext();
  const { accessTokenId, decodeTokenData } = useTokenDetails();
  const params: any = useParams();
  const { id: slugData } = params;
  const routePath = usePathname();
  const queryParams: any = useSearchParams();

  const overviewProject = queryParams.get("project");
  const overViewId = queryParams.get("overview");
  const overviewContract = queryParams.get("contract");

  const validationSchema = Yup.object().shape({
    variation_name: Yup.string().required("Variation name is required"),
    project_name: Yup.object().required("Project name is required"),
    contract_name: Yup.object().required("Contract name is required"),
    variation_status: Yup.object().required("Status is required"),

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
    onSubmit: () => handleSubmit(),
  });

  useEffect(() => {
    getProjectList();

    if (slugData[0] === ADD) {
      formik.setFieldValue("variation_status", variationStatusOptions[0]);
    }

    // Set view mode to true if slug is view
    if (slugData[0] === VIEW) {
      setIsViewMode(true);
    }
    // Fetch variations if slug is view or edit
    if (slugData[0] === VIEW || slugData[0] === EDIT) {
      getVariations();
    }
  }, []);

  useEffect(() => {
    if (patchData) patchFormData();
  }, [patchData, availableContracts, availableContracts]);

  useEffect(() => {
    if (formik?.values?.project_name)
      getContractList(formik?.values?.project_name);
  }, [formik?.values?.project_name]);

  const router = useRouter();

  async function getVariations() {
    const postData = {
      id: slugData[1],
    };
    if (slugData[0] !== ADD) {
      setLoader(true);
    }
    const response: any = await fetchVariationsListById(postData);
    setLoader(false);
    const variationsFormData = {
      ...response,
    };

    setPatchData(variationsFormData);
  }

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

  async function getContractList(selectedProject: any) {
    const postData = {
      company_id: Number(localStorage.getItem("companyId")) || "",
      project_id: selectedProject?.value || null,
    };

    const response: any = await fetchContractList(postData);

    if (response?.length > 0) {
      const modifiedData = response.map((data: any) => {
        return { label: data?.contract_name, value: data?.contract_id };
      });
      if (overviewProject && overviewContract) {
        formik.setFieldValue(
          "contract_name",
          findSelectedOptions(modifiedData, overviewContract)
        );
      }
      setAvailableContracts(modifiedData);
    } else {
      setAvailableContracts([]);
    }
  }

  async function patchFormData() {
    if (patchData) {
      await formik.setValues({
        ...patchData,
        modified_variation_amount: `$ ${patchData?.variation_amount}`,

        /* If existing contract is deleted or completed, any mapped variation will be automatically moved to archived
           in contract dropdown options it will not be available
           thus set it from the patchData for view */
        contract_name: patchData?.is_archived
          ? [{ value: patchData?.contract_id, label: patchData?.contract_name }]
          : findSelectedOptions(availableContracts, patchData?.contract_id),

        project_name: findSelectedOptions(
          availableProjects,
          patchData?.project_id
        ),
        variation_status: findSelectedOptions(
          variationStatusOptions,
          patchData?.variation_status
        ),
        uploaded_file: {
          name: patchData?.file_name,
          attachment_id: patchData?.attachment_id,
          type: patchData?.file_type,
        },
      });
      setTimeKey(new Date().getTime());
      setLoader(false);
    }
  }

  async function handleFileChange(selectedFile: any) {
    // Update state with new files
    await formik?.setFieldValue("uploaded_file", selectedFile);

    setUploadedAttachment(selectedFile);
  }

  const handleFormCancelClick = () => {
    if (!isViewMode) {
      toast.info(
        `This variation record has not been ${
          slugData[0] === "add" ? "added" : "updated"
        }.`
      );
    }

    if (overViewId) {
      router.push(
        `${ApplicationURLS.USER_PROJECT_OVERVIEW}/${overViewId}?from=${tabId.VARIATIONS}`
      );
    } else {
      router.back();
    }
  };

  async function handleSubmit() {
    try {
      if (
        uploadedAttachment?.length > 0 &&
        (uploadedAttachment[0]?.type == "image/png" ||
          uploadedAttachment[0]?.type == "image/jpeg" ||
          uploadedAttachment[0]?.type == "image/svg+xml")
      ) {
        toast.error("Please upload pdf, doc attachments");
        return;
      }

      setLoader(true);
      const addPostData: any = {
        createVariationInput: {
          company_id: Number(getCookie("companyId")),
          project_id: formik?.values?.project_name?.value,
          contract_id: formik?.values?.contract_name?.value,
          variation_name: formik?.values?.variation_name,
          variation_status: formik?.values?.variation_status?.value,
          variation_amount: Number(formik?.values?.variation_amount),
        },
      };

      const updatePostData = {
        updateVariationInput: {
          id: slugData[1],
          ...addPostData.createVariationInput,
        },
      };

      const api =
        slugData[0] === "add"
          ? addVariationsFormData(addPostData)
          : updateVariationsFormData(updatePostData);

      const response = await api;

      if (uploadedAttachment?.length === 0) {
        toast.success(response?.message);
        setLoader(false);
        router.back();
        return;
      }
      if (response?.status) {
        if (deletedAttachment) {
          const postData = {
            id: patchData?.id,
            attachmentId: deletedAttachment,
            attachmentType: "Variations",
          };
          await deleteAttachment(postData);
        }
        const filePostData = {
          variation_id:
            response?.data?.variation_id || formik?.values?.variation_id,
          uploaded_by: decodeTokenData?.emailId,
          attachment_type: "Variations",
        };

        const fileResponse: any = await singleUploadApi(
          formik?.values?.uploaded_file,
          filePostData,
          accessTokenId
        );

        if (fileResponse?.file) {
          toast.success(response?.message);

          if (overViewId) {
            router.push(
              `${ApplicationURLS.USER_PROJECT_OVERVIEW}/${overViewId}?from=${tabId.VARIATIONS}`
            );
          } else {
            router.back();
          }
        }
        setLoader(false);
      }
    } catch (err: any) {
      setLoader(false);
    }
  }

  function handleAmountChange(value: any) {
    const enteredValue = value.replace("$", "").trim();

    const charIndex = value.indexOf("$");

    if (DECIMAL_WITH_DOLLAR.test(value) || value === "") {
      formik.setFieldValue(
        "modified_variation_amount",
        charIndex == -1 ? `$ ${value}` : value
      ); // Update formik state with the new value
      formik.setFieldValue("variation_amount", enteredValue);
    }
  }

  async function handleDeleteAttachment() {
    setDeletedAttachment(formik?.values?.uploaded_file?.attachment_id);
    setDisplayConfirmationModal(false);
    formik.setFieldValue("uploaded_file", "");
    setUploadedAttachment("");
  }

  function handleVariationNameChange(enteredValue: string) {
    if (
      (ALPHANUMERIC.test(enteredValue) || !enteredValue) &&
      enteredValue?.length <= 150
    ) {
      formik?.setFieldValue("variation_name", enteredValue);
    }
  }

  function handleProjectChange(value: any) {
    formik.setFieldValue("project_name", value);
    formik.setFieldValue("contract_name", "");
  }

  async function onAttachmentDelete() {
    if (formik?.values?.uploaded_file?.attachment_id) {
      setDisplayConfirmationModal(true);
    } else {
      setDisplayConfirmationModal(true);
    }
  }

  return (
    <Container fluid>
      <div className={styles?.breadcrumb}>
        <ReusableBreadcrumb
          items={[
            {
              href: ApplicationURLS.ADMIN_DASHBOARD,
              label: "Home",
              active: routePath === ApplicationURLS.ADMIN_DASHBOARD,
            },
            {
              href: ApplicationURLS.USER_VARIATIONS_CURRENT,
              label: "Variations",
            },
            {
              href: "",
              label: `${upperCaseFirstLetter(slugData[0])} Variation`,
              active: true,
            },
          ]}
          separator={<span className={styles.breadcrumbSeparator}>&gt;</span>}
        />
      </div>
      <Row>
        <Col className={styles.signInForm}>
          <Form className={styles.formStyles} onSubmit={formik.handleSubmit}>
            <IoDocumentText className={styles.contractsIconStyles} />
            <h5 className={styles.title}>{`${upperCaseFirstLetter(
              slugData[0]
            )} Variation`}</h5>
            {slugData[0] !== ADD && (
              <Fragment>
                <div className={styles.headingFlexStyles}>
                  <h5
                    className={styles.SubHeading}
                  >{`Variation Id - ${formik?.values?.variation_id}`}</h5>
                </div>

                <div className={styles.headingFlexStyles}>
                  <div>
                    <h6 className={styles.DateSubHeading}>Date -&nbsp;</h6>
                  </div>
                  <div>
                    <h6 className={styles.DateSubHeading}>
                      {patchData?.created_on
                        ? formatDate(patchData?.created_on)
                        : ""}
                    </h6>
                  </div>
                </div>
              </Fragment>
            )}
            <div className={styles.textFieldStyles}>
              <TextField
                type="text"
                maxLength={150}
                labelText="Variation Name *"
                name="variation_name"
                placeholder="Add variation name"
                id="variation_name"
                value={formik.values.variation_name}
                onChange={(e: any) =>
                  handleVariationNameChange(e?.target?.value)
                }
                onBlur={formik.handleBlur}
                endingDataStyles={styles.endIconStyle}
                disabled={isViewMode}
                className={
                  formik.touched.variation_name && formik.errors.variation_name
                    ? `${styles.inputFieldControl} ${styles.inputError}`
                    : styles.inputFieldControl
                }
              />
              {formik.touched.variation_name && formik.errors.variation_name ? (
                <div className={styles.errorText}>
                  <ExclamationTriangleFill className={styles.icon} />
                  {formik.errors.variation_name}
                </div>
              ) : null}
            </div>

            <div className={styles.DropdownStyles}>
              <SearchableSelect
                key={timeKey}
                options={availableProjects}
                label="Project Name *"
                selectedData={formik.values.project_name}
                placeholder="Select project"
                onChange={(selectedOption) => {
                  handleProjectChange(selectedOption);
                }}
                disabled={isViewMode || overviewProject}
              />
              {formik.touched.project_name && formik.errors.project_name && (
                <div className={`${styles.errorText} ${styles.icon}`}>
                  <ExclamationTriangleFill className={styles.icon} />
                  {formik.errors.project_name}
                </div>
              )}
            </div>

            <div className={styles.DropdownStyles}>
              <SearchableSelect
                key={timeKey}
                options={availableContracts}
                label="Contract Name *"
                placeholder="Select contract"
                selectedData={formik.values.contract_name}
                onChange={(selectedOption) => {
                  formik.setFieldValue("contract_name", selectedOption);
                }}
                disabled={isViewMode || overviewContract}
              />
              {formik.touched.contract_name && formik.errors.contract_name && (
                <div className={`${styles.errorText} ${styles.icon}`}>
                  <ExclamationTriangleFill className={styles.icon} />
                  {formik.errors.contract_name}
                </div>
              )}
            </div>
            <div className={styles.textFieldStyles}>
              <TextField
                type="text"
                labelText="Variation Amount (excluding GST) *"
                name="modified_variation_amount"
                placeholder="Input variation amount"
                id="modified_variation_amount"
                // displayStartAdornment={true}
                value={formik.values.modified_variation_amount}
                // onChange={formik.handleChange}
                onChange={(e) => handleAmountChange(e?.target?.value)}
                onBlur={formik.handleBlur}
                disabled={isViewMode}
                endingDataStyles={styles.endIconStyle}
                className={
                  formik.touched.modified_variation_amount &&
                  formik.errors.modified_variation_amount
                    ? `${styles.inputFieldControl} ${styles.inputError}`
                    : styles.inputFieldControl
                }
              />
              {(formik.touched.modified_variation_amount &&
                formik.errors.modified_variation_amount) ||
              (formik.touched.variation_amount &&
                formik.errors.variation_amount) ? (
                <div className={styles.errorText}>
                  <ExclamationTriangleFill className={styles.icon} />
                  {formik.errors.modified_variation_amount ||
                    formik.errors.variation_amount}
                </div>
              ) : null}
            </div>

            <div className={styles.textFieldStyles}>
              <div>Attachments *</div>
              <Row>
                <Col xs={5}>
                  <FileSelector
                    handleSave={(file) => {
                      if (file.length > 0) {
                        const newFile = new File(file, file[0]?.name, {
                          type: file[0]?.type,
                        });

                        handleFileChange(newFile);
                      }
                    }}
                    acceptedFileFormats={onlyDOCandPDF}
                    multiple={false}
                    maximumSize={5 * 1024}
                    onError={() => toast.error(`Max Allowed file size is 5 Mb`)}
                    disabled={
                      formik?.values?.uploaded_file?.name ||
                      uploadedAttachment?.name
                    }
                  >
                    <span
                      className={
                        formik?.values?.uploaded_file?.name ||
                        uploadedAttachment?.name
                          ? `${styles.fileSelectorContainer} ${styles.selectedFile}`
                          : styles.fileSelectorContainer
                      }
                    >
                      <Paperclip />
                      {formik?.values?.uploaded_file?.name ||
                      uploadedAttachment?.name
                        ? "selected file"
                        : "select file"}
                    </span>
                  </FileSelector>
                </Col>
                <Col xs={7} className="d-flex align-items-end">
                  {formik?.values?.uploaded_file?.name && (
                    <AttachmentPreview
                      uploadedFile={formik?.values?.uploaded_file}
                      onDelete={() => onAttachmentDelete()}
                      hideDeleteButton={slugData[0] === VIEW}
                    />
                  )}
                </Col>
              </Row>
              {formik.touched.uploaded_file && formik.errors.uploaded_file ? (
                <div className={styles.errorText}>
                  <ExclamationTriangleFill className={styles.icon} />
                  {formik.errors.uploaded_file}
                </div>
              ) : null}
            </div>

            <div className={styles.DropdownStyles}>
              <SearchableSelect
                key={timeKey}
                options={variationStatusOptions}
                label="Status *"
                placeholder="Please select the current status"
                selectedData={formik.values.variation_status}
                onChange={(selectedOption) => {
                  formik.setFieldValue("variation_status", selectedOption);
                }}
                disabled={isViewMode || slugData[0] === ADD}
              />
              {formik.touched.variation_status &&
                formik.errors.variation_status && (
                  <div className={`${styles.errorText} ${styles.icon}`}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.variation_status}
                  </div>
                )}
            </div>

            {!isViewMode && (
              <FormButton className={styles.buttonStyles} type="submit">
                Save
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
      <AppModal
        show={displayConfirmationModal}
        onHide={() => setDisplayConfirmationModal(false)}
        firstButtonLabel="Yes"
        secondButtonLabel="No"
        modalBodyContent={`Are you sure you want to ${
          formik?.values?.uploaded_file?.attachment_id ? "delete" : "remove"
        } the attachment?`}
        onConfirm={handleDeleteAttachment}
      />
    </Container>
  );
}

export default AddEditVariations;
