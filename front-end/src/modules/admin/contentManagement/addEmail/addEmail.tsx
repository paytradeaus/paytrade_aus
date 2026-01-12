"use client";
import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import FormikControl from "@/components/FormikControl";
import { InputType } from "@/shared/constant/general";
import * as Yup from "yup";
import { useLoaderContext } from "@/context/useLoader";
import { useParams, useRouter } from "next/navigation";
import { omit, isEqual, some } from "lodash";
import BaseModal from "@/components/BaseModal";
import { AppRoutes } from "@/shared/constant/appRoutes";
import CustomEditor from "@/components/Editor/Editor";
import { fetchEmailTemplate, updateMailTemplate } from "./addEmail.function";

interface Option {
  value: string;
  label: string;
}

const EmailList = (props: any) => {
  const validationSchema = Yup.object().shape({
    email_subject: Yup.string().required("Email subject is required"),
    email_content: Yup.string().notRequired(),
  });
  const [editorContent, setEditorContent] = useState("");
  const [isFormDirty, setIsFormDirty] = useState(false);

  const { isEdit = false } = props;
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const router: any = useRouter();
  const params: any = useParams();
  const { id: slugData } = params;
  function onClose() {
    router.push(AppRoutes.ADMIN_CONTENT_MANAGEMENT_EMAIL);
  }

  function handleCancel() {
    if (!isFormDirty) {
      onClose(); // No changes, close directly
    } else {
      setDisplayClosePageConfirmation(true); // Show confirmation popup
    }
  }
  function handlePageConfirmClose() {
    setDisplayClosePageConfirmation(false);
    onClose();
  }

  function handlePageConfirmSave() {
    setDisplayClosePageConfirmation(false);
    formik.handleSubmit();
  }

  const formik: any = useFormik({
    initialValues: {
      email_subject: "",
      email_content: "",
    },
    validationSchema,
    onSubmit: handleSubmit,
  });

  useEffect(() => {
    const editorHasChanged = editorContent !== formik?.values?.email_content;

    setIsFormDirty(editorHasChanged);
  }, [formik.values, editorContent]);

  useEffect(() => {
    getEmailTemplate();
  }, []);

  async function handleSubmit() {
    setLoaderInfo("Updating email template...");
    setLoader(true);
    const postData = {
      updateMailtemplateInput: {
        id: slugData[0],
        email_content: editorContent,
        email_subject: formik?.values?.email_subject,
      },
    };

    try {
      await updateMailTemplate(postData);
      router.push(AppRoutes.ADMIN_CONTENT_MANAGEMENT_EMAIL);
    } catch (err) {
      console.error("Error updating page list:", err);
    } finally {
      setLoader(false);
      setLoaderInfo("");
    }
  }

  async function getEmailTemplate() {
    setLoader(true);
    const postData: any = {
      mailTemplateId: slugData[0] ?? "",
    };

    await fetchEmailTemplate(postData)
      .then((response: any) => {
        if (response) {
          formik.setFieldValue("email_content", response?.email_content);
          formik.setFieldValue("email_subject", response?.email_subject);
          setEditorContent(response?.email_content || "");
        }
        setLoader(false);
      })
      .catch((err: any) => setLoader(false));
  }

  return (
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
                    name="email_subject"
                    placeholder="Email Subject"
                    label="Email subject"
                    control={InputType.TEXT_FIELD}
                    valueKey="value"
                    renderKey="label"
                    disabled={false}
                    error={formik.errors.email_subject}
                    showError={
                      formik.touched.email_subject &&
                      !!formik.errors.email_subject
                    }
                    value={formik.values.email_subject} // Ensuring selected value
                    onChange={formik.handleChange}
                  />
                  <CustomEditor
                    label="Email Body"
                    disabled={false}
                    value={editorContent}
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
          <h4 className="text_center"> Are you sure to close and not save?</h4>
        </BaseModal>
      )}
    </div>
  );
};

export default EmailList;
