"use client";

import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Row, Col, Form } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import { usePathname, useRouter, useParams } from "next/navigation";
import styles from "./contactSubmissionUpdate.module.scss";
import commonStyles from "./../../common/commonStyles.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { toast } from "@/app/Toaster";
import {
  FetchInformationsOfAContact,
  updateContactDetails,
} from "./contactSubmissionUpdate.function";

import { ApplicationURLS } from "@/common/applicationURLS";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { SUCCESS } from "@/common/constants/messages";
import { contactSubmissionStatus } from "@/common/constants/data";
import { useLoaderContext } from "@/context/useLoader";

interface FormData {
  name: any;
  companyName: string;
  email: string;
  message: string;
  status: any;
}

const validationSchema = Yup.object().shape({
  status: Yup.object().required("Status is required"),
});

function ContactSubmissionUpdate() {
  const [faqData, setFaqData] = useState<any>([]);

  const routePath = usePathname();

  const router: any = useRouter();
  const params: any = useParams();
  const { id: slugData } = params;
  const { setLoader }: any = useLoaderContext();

  useEffect(() => {
    if (slugData[0]) getContactDetails(slugData[0]);
  }, []);

  const formik: any = useFormik({
    initialValues: {
      name: "",
      companyName: "",
      email: "",
      message: "",
      status: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      handleSubmit(values);
    },
  });

  const handleSendAndCloseClick = () => {
    formik.handleSubmit();
  };

  async function handleSubmit(values: any) {
    const postData: any = {
      payload: {
        contactId: slugData[0] ?? null,
        status: values?.status?.value ?? null,
      },
    };

    await updateContactDetails(postData).then((response: any) => {
      if (response?.status === SUCCESS) {
        router.push(ApplicationURLS.ADMIN_CONTACT);
        toast.success(response?.message);
      }
    });
  }

  async function getContactDetails(id: string) {
    try {
      setLoader(true);
      const postData: any = {
        payload: {
          contactId: id,
        },
      };

      await FetchInformationsOfAContact(postData).then((data: any) => {
        const response = data?.data;

        setFaqData(response);

        const findStatus = contactSubmissionStatus.find(
          (x: any) => x?.value == response?.status
        );

        formik.setFieldValue("name", response?.name);
        formik.setFieldValue("companyName", response?.companyName);
        formik.setFieldValue("email", response?.email);
        formik.setFieldValue("message", response?.message);
        formik.setFieldValue("status", findStatus ?? {});
      });
      setLoader(false);
    } catch (err: any) {
      setLoader(false);
    }
  }

  return (
    <div className={styles.mainCon}>
      <ReusableBreadcrumb
        items={[
          {
            href: ApplicationURLS.ADMIN_DASHBOARD,
            label: "Home",
            active: routePath === ApplicationURLS.ADMIN_DASHBOARD,
          },

          {
            href: ApplicationURLS.ADMIN_CONTACT,
            label: "Contacts",
            active: routePath === ApplicationURLS.ADMIN_CONTACT,
          },
          {
            href: "",
            label: "View Contacts",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />

      <div className={styles.formFieldStyle}>
        <div className="row">
          <div>
            <Form
              onSubmit={formik.handleSubmit}
              noValidate
              className={styles.formStyle}
            >
              <Row>
                <span className={styles.headerText}>View Contacts</span>
              </Row>

              <Row className={styles.textFieldStyles}>
                <Col className={styles.eachFieldBottom}>
                  <TextField
                    labelText="Name"
                    name="name"
                    id="name"
                    placeholder="Enter your name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    classNames={styles.inputStyles}
                    disabled
                  />
                </Col>
                <Col className={styles.eachFieldBottom}>
                  <TextField
                    labelText="Company Name"
                    name="companyName"
                    id="companyName"
                    placeholder="Enter company name"
                    value={formik.values.companyName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    classNames={styles.inputStyles}
                    disabled
                  />
                </Col>
              </Row>
              <Row className={styles.textFieldStyles}>
                <Col className={styles.eachFieldBottom}>
                  <TextField
                    labelText="Email"
                    name="email"
                    id="email"
                    placeholder="Enter your email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    disabled
                    classNames={styles.inputStyles}
                  />
                </Col>
                <Col className={styles.eachFieldBottom}>
                  <TextField
                    as="textarea"
                    placeholder=""
                    type="text"
                    labelText="Message"
                    name="message"
                    id="message"
                    required
                    value={formik.values.message}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    disabled
                    classNames={commonStyles.inputFieldControl1}
                  />
                </Col>
                <Row className={styles.textFieldStyles}>
                  <Col className={styles.eachFieldBottom} xs={5}>
                    <SearchableSelect
                      label="Status *"
                      options={contactSubmissionStatus}
                      onChange={(selectedOption: any) =>
                        formik.setFieldValue("status", selectedOption)
                      }
                      disabled={false}
                      placeholder="Select status"
                      singleSelectedData={formik.values.status}
                      isRequired={
                        !!(!formik.values.status && formik.touched.status)
                      }
                      errorMessage={formik.errors.status}
                    />
                  </Col>
                </Row>
              </Row>
            </Form>

            <div className={styles.btnContainer}>
              <Row>
                <Col className={styles.btnTwo}>
                  <FormButton
                    type={"button"}
                    className={styles.printBtnStyle}
                    onClick={() => router.push(ApplicationURLS.ADMIN_CONTACT)}
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
}

export default ContactSubmissionUpdate;
