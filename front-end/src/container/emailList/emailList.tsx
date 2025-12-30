"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Row, Col, Form } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import { useRouter, useParams } from "next/navigation";
import styles from "./emailList.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { fetchEmailTemplate, updateMailTemplate } from "./emailList.function";
import { ApplicationURLS } from "@/common/applicationURLS";
import { XCircle } from "react-bootstrap-icons";
import commonStyles from "./../../common/commonStyles.module.scss";
import CustomEditor from "@/components/editor/editor";
import { useLoaderContext } from "@/context/useLoader";

const validationSchema = Yup.object().shape({
  email_subject: Yup.string().required("Email subject is required"),
  email_content: Yup.string().notRequired(),
});

const EmailList = () => {
  const { setLoader }: any = useLoaderContext();

  const router: any = useRouter();
  const params: any = useParams();
  const { id: slugData } = params;

  useEffect(() => {
    getEmailTemplate();
  }, []);

  const formik: any = useFormik({
    initialValues: {
      email_subject: "",
      email_content: "",
    },

    validationSchema,
    onSubmit: () => {
      // Handle form submission
      handleSubmit();
    },
  });

  const handleSendAndCloseClick = () => {
    formik.handleSubmit();
  };

  async function handleSubmit() {
    setLoader(true);
    const postData: any = {
      updateMailtemplateInput: {
        id: slugData[0],
        email_content: formik?.values?.email_content,
        email_subject: formik?.values?.email_subject,
      },
    };

    updateMailTemplate(postData)
      .then((res: any) => {
        console.log("🚀 ~ .then ~ res:", res);
        if (res) {
          router.push(ApplicationURLS.ADMIN_CONTENT_MANAGEMENT_EMAIL_TEMPLATE);
        }
        setLoader(false);
      })
      .catch((err: any) => setLoader(false));
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
        }
        setLoader(false);
      })
      .catch((err: any) => setLoader(false));
  }

  return (
    <div className={styles.mainCon}>
      <ReusableBreadcrumb
        items={[
          {
            href: "/admin/dashboard",
            label: "Home",
            active: false,
          },
          {
            href: "/admin/content-management",
            label: "Content Management",
            active: false,
          },
          {
            href: "/admin/content-management/email",
            label: "Email",
            active: false,
          },
          {
            href: "",
            label: "Edit",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      {/* <Row>
        <span className={styles.headerText}>Edit Page</span>
        <SearchableSelect
          label="Email Type"
          options={pageType}
          onChange={(selectedOption: any) =>
            formik.setFieldValue("category", selectedOption)
          }
          disabled={false}
          placeholder="Email Type"
          className={styles.categoryField}
          singleSelectedData={formik.values.category}
        />
      </Row> */}
      <Row>
        <label className={styles.desc}>Email Subject</label>
        <div className={styles.textContainer}>
          <TextField
            placeholder="Email Subject"
            value={formik?.values?.email_subject}
            name="email_subject"
            onChange={formik.handleChange}
            type="text"
            errorText={formik.errors.email_subject}
            isInvalid={
              !!(formik.touched.email_subject && formik.errors.email_subject)
            }
            endingData={
              formik.touched.email_subject &&
              formik.errors.email_subject && (
                <XCircle className={styles.warningIconStyle} />
              )
            }
            endingDataStyles={styles.endIconStyle}
            classNames={commonStyles.inputFieldControl}
          />
        </div>
      </Row>
      <div className={styles.formFieldStyle}>
        <div className="row">
          <div>
            <Form
              onSubmit={formik.handleSubmit}
              noValidate
              className={styles.formStyle}
            >
              <Row className={`${styles.textFieldStyles}`}>
                <Col className={styles.eachFieldBottom}></Col>
              </Row>
              <Row className={`${styles.textFieldStyles}`}>
                <Col className={styles.eachFieldBottom}>
                  <div>
                    <label className={styles.desc}>Email Body</label>
                    <CustomEditor
                      onChange={(value: any) =>
                        formik.setFieldValue("email_content", value)
                      }
                      value={formik?.values?.email_content}
                    />
                  </div>
                </Col>
              </Row>
            </Form>

            <div className={styles.btnContainer}>
              <Row>
                <Col className={styles.btnTwo}>
                  <FormButton
                    type={"button"}
                    className={styles.printBtnStyle}
                    onClick={() =>
                      router.push("/admin/content-management/email")
                    }
                  >
                    Cancel
                  </FormButton>
                  <FormButton
                    type={"submit"}
                    className={styles.saveBtnStyle}
                    onClick={handleSendAndCloseClick} // Update onClick handler
                  >
                    Save
                  </FormButton>
                </Col>
              </Row>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailList;
