"use client";
import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useFormik } from "formik";
import FormikControl from "@/components/FormikControl";
import {
  ADD,
  ALPHANUMERIC,
  EDIT,
  findSelectedOptions,
  getCurrentUtcTime,
  InputType,
  NUMBER_REGEX,
  VIEW,
} from "@/shared/constant/general";
import * as Yup from "yup";
import moment from "moment";

import PhoneInputField from "@/components/phoneNumberInput";
import GooglePlacesInput from "@/components/GooglePlaces";
import { convertCanvasToFile, handleSelectedImage } from "@/utils";
import { setCompanyDetails } from "@/redux/slices/companyRegistrationDetails";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";

import { debounce, isEqual } from "lodash";
import BaseModal from "@/components/BaseModal";
import { useLoaderContext } from "@/context/useLoader";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "@/components/Toaster";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  addFaq,
  fetchCategories,
  fetchFaq,
  updateFaq,
} from "./AddFaq.function";
import { statusOptions } from "../faq.constant";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import BreadCrumbs from "@/components/BreadCrumbs";

interface FormData {
  category: any;
  question: string;
  answer: string;
  status: any;
}
const AddFaq = (props: any) => {
  const validationSchema = Yup.object().shape({
    category: Yup.object().required("Category is required"),
    question: Yup.string().required("Please fill the questions"),
    answer: Yup.string().required("Answer is required"),
  });
  const [currentScreen, setCurrentScreen] = useState<string>(ADD);
  const [faqCategories, setFaqCategories] = useState<any[]>([]);
  const [categorySelection, setCategorySelection] = useState<any>("");

  const [faqData, setFaqData] = useState<any>([]);
  const [editData, setEditData] = useState<any>({});
  const [statusOptionsData, setStatusOptionsData] = useState("Active");
  const { isEdit = false, ...rest } = props;
  const router: any = useRouter();
  const params: any = useParams();
  const { id: slugData } = params;
  const queryParams = useSearchParams();
  const [wrongStatusCheck, setWrongStatusCheck] = useState("");
  const { setLoader, setLoaderInfo }: any = useLoaderContext();

  const editinquery: any = queryParams.get("mode");
  const options = [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "In Active" },
  ];
  useEffect(() => {
    if (editinquery === EDIT && slugData?.[0]) {
      getFaq(slugData[0]); // Fetch FAQ data when in edit mode
      setCurrentScreen(EDIT);
    }
    getCategories(); // Always fetch categories
  }, [slugData]);

  const formik = useFormik({
    enableReinitialize: true, // ✅ Allow reinitialization when data changes
    initialValues: {
      category: editData?.category || "",
      question: editData?.question || "",
      answer: editData?.answer || "",
      status: editData?.faq_status || "Active",
      isValueExistence: false,
    },
    validationSchema,
    onSubmit: (values) => {
      handleSubmit(values);
    },
  });

  async function handleSubmit(values: FormData) {
    // Set loader info dynamically based on the screen type
    const action = currentScreen === EDIT ? "Updating FAQ..." : "Adding FAQ...";
    setLoaderInfo(action);
    setLoader(true);

    const addPostData: any = {
      addFaQInput: {
        question: values?.question,
        answer: values?.answer,
        categoryId: values?.category?.value ?? "",
        faq_status: values?.status ?? "",
      },
    };

    const updatePostData: any = {
      updateFaqInput: {
        id: slugData?.[0] ?? "", // Fallback to empty string if undefined
        question: values.question,
        faq_status: values?.status ?? "",
        categoryId: values?.category?.value ?? "",
        answer: values?.answer ?? "",
      },
    };
    try {
      const api =
        currentScreen === EDIT
          ? updateFaq(updatePostData)
          : addFaq(addPostData);

      const response = await api;

      if (response) {
        showSuccessToast(
          `FAQ ${currentScreen === EDIT ? "updated" : "added"} successfully`
        );
        router.push(AppRoutes.ADMIN_CONTENT_MANAGEMENT_FAQ);
      } else {
        showErrorToast(
          `FAQ ${currentScreen === EDIT ? "update" : "add"} failed`
        );
      }
    } catch (error) {
      console.error("FAQ submission failed:", error);
      showErrorToast("Something went wrong. Please try again.");
    } finally {
      setLoader(false);
      setLoaderInfo(""); // Clear loader info after completion
    }
  }

  async function getFaq(categoryId: string) {
    const postData = { faqId: categoryId };

    await fetchFaq(postData).then((response) => {
      if (response) {
        console.log("Fetched FAQ Data:", response);

        setEditData(response); // Store the response data first (without setting Formik values yet)
        setWrongStatusCheck(response?.faq_status);
      }
    });
  }

  useEffect(() => {
    if (faqCategories.length > 0 && editData?.category?.id) {
      // const matchedCategory = faqCategories.find(
      //   (cat) => cat.value === editData?.category?.id
      // );
      const matchedCategory =
        faqCategories.find((each) => each.value === editData?.category?.id) ||
        {};
      // setSingleSelectedData(selOpt);

      formik.setValues({
        category: matchedCategory || {
          value: editData?.category?.id,
          label: editData?.category?.value,
          // description: editData?.category?.value,
          // id: editData?.category?.id,
          // master_type: "FAQ Category",
          // status: editData?.faq_status,
        },
        question: editData?.question || "",
        answer: editData?.answer || "",
        status: editData?.faq_status || "Active",
        isValueExistence: false,
      });
      setCategorySelection(matchedCategory);
    }
  }, [faqCategories, editData]); // Runs only when `faqCategories` is populated

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
    <Fragment>
      <div className="container-fluid">
        <div className="pt_title">
          <div className="pt_breadcrumbs">
            <BreadCrumbs
              routePaths={[
                {
                  path: AppRoutes.ADMIN_DASHBOARD,
                  name: "Dashboard",
                },
                {
                  path: AppRoutes.ADMIN_CONTENT_MANAGEMENT_FAQ,
                  name: "FAQs",
                },
              ]}
              activeRoute={isEdit ? "Edit FAQ" : "Add FAQ"}
            />
          </div>
          <br />
          {wrongStatusCheck === "Deleted" ? (
            <div className="text_center">
              Respective details are no longer available
            </div>
          ) : (
            <div className="pt_smallbgimage">
              <div className="pt_centered">
                <div className="pt_centeredinner">
                  <div className="pt_box_transparent_cp">
                    <div className="grid">
                      <div className="pt_login">
                        <h4>Frequently asked question</h4>
                        <br />
                        <form onSubmit={formik.handleSubmit}>
                          {/* Category Field */}
                          {/* <FormikControl
                    placeholder="Select category"
                    label="Category"
                    name="category"
                    control={InputType.SELECT}
                    renderKey="label"
                    options={faqCategories}
                    valueKey="value"
                    disabled={false}
                    error={formik.errors.category}
                    selectedData={categorySelection}
                    showError={
                      formik.touched.category && formik.errors.category
                    }
                    value={formik.values.category} // Ensure correct object is selected
                    onBlur={formik.handleBlur("category")}
                    onChange={handleCategorySelectChange}
                    returnSelectedObject
                  /> */}
                          <SearchableSelect
                            options={faqCategories}
                            selectedData={categorySelection}
                            onChange={(selectedOption) => {
                              formik.handleChange("category")(
                                selectedOption.value
                              );
                              formik.setFieldValue("category", selectedOption);
                            }}
                            isRequired={
                              !formik?.values?.category &&
                              formik.touched.category
                                ? true
                                : false
                            }
                            placeholder="Select category"
                            label="Category"
                            errorMessage={formik.errors.category as string}
                            renderKey="label"
                            valueKey="value"
                          />

                          {/* Status Field */}
                          <FormikControl
                            placeholder="Select Status"
                            label="Status"
                            name="status"
                            control={InputType.SELECT}
                            renderKey="label"
                            options={options}
                            valueKey="value"
                            disabled={false}
                            error={formik.errors.status}
                            showError={
                              formik.touched.status && formik.errors.status
                            }
                            value={formik.values.status} // Ensure correct object is selected
                            onBlur={formik.handleBlur("status")}
                            onChange={(selectedOption: any) => {
                              formik.setFieldValue(
                                "status",
                                selectedOption.value
                              ); // Store only the value
                              setStatusOptionsData(selectedOption.value);
                            }}
                            returnSelectedObject
                          />

                          {/* Question Field */}
                          <FormikControl
                            as="textarea"
                            required
                            label="Question"
                            name="question"
                            id="question"
                            control={InputType.TEXT_AREA}
                            renderKey="label"
                            valueKey="value"
                            disabled={false}
                            error={formik.errors.question}
                            showError={
                              formik.touched.question && formik.errors.question
                            }
                            value={formik.values.question} // Ensure value is displayed
                            onBlur={formik.handleBlur("question")}
                            onChange={(
                              e: React.ChangeEvent<HTMLTextAreaElement>
                            ) => {
                              const trimmedValue = e.target.value.trim()
                                ? e.target.value
                                : "";
                              formik.setFieldValue("question", trimmedValue);
                            }}
                            maxLength={300}
                          />

                          {/* Answer Field */}
                          <FormikControl
                            as="textarea"
                            required
                            label="Answer"
                            name="answer"
                            id="answer"
                            control={InputType.TEXT_AREA}
                            renderKey="label"
                            valueKey="value"
                            disabled={false}
                            error={formik.errors.answer}
                            showError={
                              formik.touched.answer && formik.errors.answer
                            }
                            value={formik.values.answer} // Ensure value is displayed
                            onBlur={formik.handleBlur("answer")}
                            onChange={(
                              e: React.ChangeEvent<HTMLTextAreaElement>
                            ) => {
                              const trimmedValue = e.target.value.trim()
                                ? e.target.value
                                : "";
                              formik.setFieldValue("answer", trimmedValue);
                            }}
                            maxLength={1000}
                          />

                          <br />
                          <br />
                          <div className="grid">
                            <input
                              type="button"
                              value="Cancel"
                              className="outline contrast"
                              onClick={() => {
                                showInfoToast("No changes saved");
                                router.back();
                              }}
                            />
                            <input
                              type="submit"
                              value={isEdit ? "Update" : "Save"} // Dynamic button text
                              className="secondary"
                              // onClick={() => formik?.handleSubmit()}
                            />{" "}
                            {/* {isEdit ? "Update" : "Save"} */}
                          </div>
                        </form>
                        <br />
                        <br />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="paytradeffectwrap">
                <div className="paytradeffect">
                  <div className="themeshade"></div>
                  <div className="oceanshade"></div>
                  <div className="crabshade"></div>
                </div>
              </div>
              <div className="noise"></div>
            </div>
          )}
        </div>
      </div>
    </Fragment>
  );
};
export default AddFaq;
