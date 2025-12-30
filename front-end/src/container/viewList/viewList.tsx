"use client";

import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Row, Col, Form } from "react-bootstrap";
import FormButton from "@/components/Button/button";
import { usePathname, useRouter, useParams } from "next/navigation";
import styles from "./viewList.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { fetchPageList, updatePageList } from "./viewList.function";
import CustomEditor from "@/components/editor/editor";
import { ApplicationURLS } from "@/common/applicationURLS";
import { pageType } from "@/common/constants/data";
import { useLoaderContext } from "@/context/useLoader";

const validationSchema = Yup.object().shape({
  pageType: Yup.string().required("Page type is required"),
  description: Yup.string().notRequired(),
});

function ViewList() {
  const router: any = useRouter();
  const params: any = useParams();
  const { setLoader }: any = useLoaderContext();
  const { id: slugData } = params;

  useEffect(() => {
    getPageList();
  }, []);

  const formik: any = useFormik({
    initialValues: {
      pageType: "",
      description: "",
    },

    validationSchema,
    onSubmit: async () => {
      handleSubmit();
    },
  });
  async function getPageList() {
    setLoader(true);
    const postData: any = {
      contentId: slugData[0] ?? "",
    };

    await fetchPageList(postData)
      .then((response: any) => {
        // const findPageType = pageType?.find(
        //   (x: any) => x?.value === response?.heading
        // );

        formik.setFieldValue("description", response?.body);
        formik.setFieldValue("pageType", response?.heading);
        setLoader(false);
      })
      .catch((err: any) => setLoader(false));
  }

  async function handleSubmit() {
    setLoader(true);
    const postData: any = {
      updateContentInput: {
        body: formik?.values?.description,
        id: slugData[0],
        heading: formik?.values?.pageType,
      },
    };
    updatePageList(postData)
      .then((res: any) => {
        if (res) {
          router.push(ApplicationURLS.ADMIN_CONTENT_MANAGEMENT);
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
            href: "",
            label: "Edit",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <Row>
        <span className={styles.headerText}>Edit Page</span>
        <SearchableSelect
          options={pageType}
          onChange={(selectedOption: any) =>
            formik.setFieldValue("pageType", selectedOption?.value)
          }
          disabled={true}
          placeholder="Page Type"
          className={styles.categoryField}
          singleSelectedData={{
            label: formik?.values?.pageType,
            value: formik?.values?.pageType,
          }}
          isRequired={
            !!(!formik?.values?.pageType?.length && formik.touched.Group)
          }
          errorMessage={formik?.errors?.pageType as string}
        />
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
                    <label className={styles.desc}>Description</label>
                    <CustomEditor
                      value={formik?.values?.description}
                      onChange={(value: any) =>
                        formik.setFieldValue("description", value)
                      }
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
                      router.push(ApplicationURLS.ADMIN_CONTENT_MANAGEMENT)
                    }
                  >
                    Cancel
                  </FormButton>
                  <FormButton
                    type={"button"}
                    className={styles.saveBtnStyle}
                    onClick={() => formik.handleSubmit()} // Update onClick handler
                  >
                    Update
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

export default ViewList;
