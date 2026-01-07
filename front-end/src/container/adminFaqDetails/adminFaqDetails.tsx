"use client";

import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Row, Col, Form } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import { XCircle } from "react-bootstrap-icons";
import { usePathname, useRouter, useParams } from "next/navigation";
import styles from "./adminFaqDetails.module.scss";
import commonStyles from "./../../common/commonStyles.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { toast } from "@/app/Toaster";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  addFaq,
  fetchCategories,
  fetchFaq,
  updateFaq,
} from "./adminFaqDetails.function";
import { ADD, EDIT } from "@/common/constants/general";
import { ApplicationURLS } from "@/common/applicationURLS";
import { statusOptions } from "@/common/constants/data";

interface FormData {
  category: any;
  question: string;
  answer: string;
  status: any;
}

const validationSchema = Yup.object().shape({
  category: Yup.object(),
  question: Yup.string().required("Please fill the questions"),
  answer: Yup.string().required("Answer is required"),
  status: Yup.object(),
});
const customStyles = {
  control: () => ({
    height: "40px",
    width: "100%",
  }),
};

const FaqDetails = () => {
  const [currentScreen, setCurrentScreen] = useState<string>(ADD);
  const [faqCategories, setFaqCategories] = useState<any[]>([]);
  const [faqData, setFaqData] = useState<any>([]);

  const router: any = useRouter();
  const params: any = useParams();
  const { id: slugData } = params;

  useEffect(() => {
    if (slugData[0] === EDIT) {
      getFaq(slugData[1]);
      setCurrentScreen(EDIT);
    }
    getCategories();
  }, []);

  const formik = useFormik({
    initialValues: {
      category: "",
      question: "",
      answer: "",
      status: { value: "Active", label: "Active" },
    },

    validationSchema,
    onSubmit: (values) => {
      // Handle form submission
      // setShowModal(true); // Show modal after successful form submission
      handleSubmit(values);
    },
  });

  useEffect(() => {
    if (faqCategories?.length && !!faqData?.category) {
      const findFaq = faqCategories?.find(
        (x: any) => x?.label === faqData?.category?.value
      );
      formik?.setFieldValue("category", findFaq);
    }
  }, [faqCategories, faqData]);

  const handleSendAndCloseClick = () => {
    formik.handleSubmit();
  };

  async function handleSubmit(values: FormData) {
    const addPostData: any = {
      addFaQInput: {
        question: values?.question,
        answer: values?.answer,
        categoryId: values?.category?.value ?? "",
        faq_status: values?.status?.value ?? "",
      },
    };

    const updatePostData: any = {
      updateFaqInput: {
        id: slugData[1],
        question: values.question,
        faq_status: values?.status?.value ?? "",
        categoryId: values?.category?.value ?? "",
        answer: values?.answer ?? "",
      },
    };

    const api: any =
      currentScreen === EDIT ? updateFaq(updatePostData) : addFaq(addPostData);

    await api.then((response: any) => {
      if (response) {
        toast.success(
          `FAQ ${currentScreen === EDIT ? "updated" : "added"} successfully`
        );
        router.push(ApplicationURLS.ADMIN_CONTENT);
      } else {
        toast.error(`FAQ ${currentScreen === EDIT ? "update" : "add"} failed`);
      }
    });
  }

  async function getFaq(categoryId: string) {
    const postData: any = {
      faqId: categoryId,
    };

    await fetchFaq(postData).then((response: any) => {
      const findStatus: any = statusOptions.find(
        (data: any) => data?.value === response?.faq_status
      );
      setFaqData(response);
      formik.setFieldValue("status", findStatus);
      formik.setFieldValue("question", response?.question);
      formik.setFieldValue("answer", response?.answer);
    });
  }

  async function getCategories() {
    await fetchCategories().then((data: any) => {
      const response = data?.adminfetchAllMasterTypeDetails?.data;

      if (response?.length > 0) {
        const modifiedFaqCategories = response.map((x: any) => {
          return { ...x, label: x.value, value: x.id };
        });
        setFaqCategories(modifiedFaqCategories);
      }
    });
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
            href: "/admin/content-management/faq",
            label: "FAQ",
            active: false,
          },
          {
            href: "",
            label: "New",
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
                <span className={styles.headerText}>
                  Frequently Asked Questions
                </span>
              </Row>
              <Row className={`${styles.textFieldStyles}`}>
                <Col className={styles.eachFieldBottom}>
                  <SearchableSelect
                    label="Category"
                    options={faqCategories}
                    onChange={(selectedOption: any) =>
                      formik.setFieldValue("category", selectedOption)
                    }
                    disabled={false}
                    placeholder="Select category"
                    selectedData={formik.values.category}
                  />
                </Col>
                <Col className={styles.eachFieldBottom}>
                  <SearchableSelect
                    options={[
                      { value: "Active", label: "Active" },
                      { value: "Inactive", label: "Inactive" },
                    ]}
                    selectedData={formik.values.status}
                    onChange={(selectedOption) => {
                      formik.setFieldValue("status", selectedOption);
                    }}
                    placeholder="Select status"
                    controlStyles={customStyles}
                    label="Status"
                  />
                </Col>
              </Row>
              <Row className={`${styles.textFieldStyles}`}>
                <Col className={styles.eachFieldBottom}>
                  <TextField
                    as="textarea"
                    placeholder=""
                    type="text"
                    errorText={formik.errors.question}
                    isInvalid={
                      formik.touched.question && formik.errors.question
                        ? true
                        : false
                    }
                    labelText="Questions *"
                    name="question"
                    id="question"
                    required
                    value={formik.values.question}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    endingData={
                      formik.touched.question &&
                      formik.errors.question && (
                        <XCircle className={styles.crossiconsSyles} />
                      )
                    }
                    endingDataStyles={styles.endIconStyle}
                    classNames={commonStyles.inputFieldControl1}
                  />
                </Col>
                <Col className={styles.eachFieldBottom}>
                  <TextField
                    as="textarea"
                    placeholder=""
                    type="text"
                    errorText={formik.errors.answer}
                    isInvalid={
                      !!(formik.touched.answer && formik.errors.answer)
                    }
                    labelText="Answers *"
                    name="answer"
                    id="answer"
                    required
                    value={formik.values.answer}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    endingData={
                      formik.touched.answer &&
                      formik.errors.answer && (
                        <XCircle className={styles.crossiconsSyles} />
                      )
                    }
                    endingDataStyles={styles.endIconStyle}
                    classNames={commonStyles.inputFieldControl1}
                  />
                </Col>
              </Row>
            </Form>

            <div className={styles.btnContainer}>
              <Row>
                <Col className={styles.btnTwo}>
                  <FormButton
                    type={"button"}
                    className={styles.printBtnStyle}
                    onClick={() => router.push(ApplicationURLS.ADMIN_CONTENT)}
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

export default FaqDetails;
