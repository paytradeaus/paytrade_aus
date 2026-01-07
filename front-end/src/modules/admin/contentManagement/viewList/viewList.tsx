"use client";
import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import FormikControl from "@/components/FormikControl";
import { InputType } from "@/shared/constant/general";
import * as Yup from "yup";
import { fetchPageList, updatePageList } from "./viewList.function";
import { useLoaderContext } from "@/context/useLoader";
import { useParams, useRouter } from "next/navigation";
import BaseModal from "@/components/BaseModal";
import { AppRoutes } from "@/shared/constant/appRoutes";
import CustomEditor from "@/components/ysEditor";
import BreadCrumbs from "@/components/BreadCrumbs";

interface Option {
  value: string;
  label: string;
}

const ViewList = (props: any) => {
  const { isEdit = false } = props;
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const router: any = useRouter();
  const params: any = useParams();
  const { id: slugData } = params;

  const [editorContent, setEditorContent] = useState("");
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Page Type Options
  const pageTypeOptions: Option[] = [
    { value: "", label: "All" },
    { value: "Cookies Policy", label: "Cookies Policy" },
    { value: "Privacy Policy", label: "Privacy Policy" },
    { value: "Security", label: "Security" },
    { value: "Terms and Conditions", label: "Terms and Conditions" },
  ];

  // Validation Schema
  const validationSchema = Yup.object().shape({
    pageType: Yup.string().required("Page type is required"),
    description: Yup.string().notRequired(),
  });

  const formik = useFormik({
    initialValues: {
      pageType: "",
      description: "",
    },
    validationSchema,
    onSubmit: handleSubmit,
  });

  useEffect(() => {
    getPageList();
  }, []);

  useEffect(() => {
    const editorHasChanged = editorContent !== formik.values.description;

    setIsFormDirty(editorHasChanged);
  }, [formik.values, editorContent]);

  async function getPageList() {
    setLoader(true);
    const postData = { contentId: slugData[0] ?? "" };

    try {
      const response: any = await fetchPageList(postData);
      if (response) {
        const selectedPageType = pageTypeOptions.find(
          (option) => option.value === response?.heading
        );
        formik.setValues({
          pageType: selectedPageType?.value || "",
          description: response?.body || "",
        });
        setEditorContent(response?.body || ""); // Set initial editor content
      }
    } finally {
      setLoader(false);
    }
  }

  async function handleSubmit() {
    try {
      setLoader(true);
      setLoaderInfo("Updating content...");
      const postData = {
        updateContentInput: {
          body: editorContent, // Use editor content instead of formik value
          id: slugData[0],
          heading: formik.values.pageType,
        },
      };

      await updatePageList(postData);
      router.push(AppRoutes.ADMIN_CONTENT_MANAGEMENT);
    } catch (err) {
      console.error("Error updating page list:", err);
    } finally {
      setLoader(false);
      setLoaderInfo("");
    }
  }

  function handleCancel() {
    if (!isFormDirty) {
      onClose(); // No changes, close directly
    } else {
      setDisplayClosePageConfirmation(true); // Show confirmation popup
    }
  }

  function onClose() {
    router.push(AppRoutes.ADMIN_CONTENT_MANAGEMENT);
  }

  function handlePageConfirmClose() {
    setDisplayClosePageConfirmation(false);
    onClose();
  }

  function handlePageConfirmSave() {
    setDisplayClosePageConfirmation(false);
    formik.handleSubmit();
  }

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.ADMIN_DASHBOARD,
              },
              {
                name: "Content management",
                path: AppRoutes.ADMIN_CONTENT_MANAGEMENT,
              },
            ]}
            activeRoute={"Edit email"}
          />
        </div>
        <br />
        <div className="pt_smallbgimage">
          <div className="pt_centered">
            <div className="pt_centeredinner">
              <div className="pt_box_transparent_cp">
                <div className="grid">
                  <div className="pt_login">
                    <h4>Edit email</h4>
                    <br />
                    <form onSubmit={formik.handleSubmit}>
                      <FormikControl
                        name="pageType"
                        control={InputType.SELECT}
                        options={pageTypeOptions}
                        valueKey="value"
                        renderKey="label"
                        disabled={true}
                        error={formik.errors.pageType}
                        showError={
                          formik.touched.pageType && !!formik.errors.pageType
                        }
                        value={formik.values.pageType} // Ensuring selected value
                        onChange={(selectedOption: Option) =>
                          formik.setFieldValue("pageType", selectedOption.value)
                        }
                      />
                      <CustomEditor
                        disabled={false}
                        value={editorContent} // Use state value
                        onChange={(data: any) => {
                          if (!props.isView) {
                            setEditorContent(data); // Sync editor content
                          }
                        }}
                      />
                      <br />
                      <br />
                      <div className="grid">
                        <input
                          type="button"
                          value="Cancel"
                          className="outline contrast"
                          onClick={handleCancel}
                        />
                        <input
                          type="submit"
                          value={isEdit ? "Update" : "Save"}
                          className="secondary"
                        />
                      </div>
                    </form>
                    <br />
                    <br />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Background Effects */}
          <div className="paytradeffectwrap">
            <div className="paytradeffect">
              <div className="themeshade"></div>
              <div className="oceanshade"></div>
              <div className="crabshade"></div>
            </div>
          </div>
          <div className="noise"></div>

          {/* Confirmation Modal */}
          {displayClosePageConfirmation && (
            <BaseModal
              modalId="Payment confirmation"
              displayModal={displayClosePageConfirmation}
              onClose={handlePageConfirmClose}
              onHeaderIconClose={() => setDisplayClosePageConfirmation(false)}
              onConfirm={() => {
                handlePageConfirmSave();
                return true;
              }}
              firstButtonName="Yes"
              secondButtonName="Save"
              restrictOncloseFunctionInHeader
            >
              <h4 className="text_center">
                {" "}
                Are you sure to close and not save?
              </h4>
            </BaseModal>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewList;
