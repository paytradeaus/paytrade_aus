"use client";
import FormikControl from "@/components/FormikControl";
import { useLoaderContext } from "@/context/useLoader";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { DEBOUNCE_TIMER, InputType } from "@/shared/constant/general";
import { useFormik } from "formik";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useCustomDebounce } from "@/hooks";
import {
  AdminAddHolidayDetails,
  AdminGetHolidayById,
  AdminUpdateHolidayDetails,
} from "./addUpdateHolidays.functions";
import { useParams } from "next/navigation";
import {
  initialValues,
  validationSchema,
} from "./addUpdateHolidays.validations";
import BaseModal from "@/components/BaseModal";
import { isEqual } from "lodash";
import BreadCrumbs from "@/components/BreadCrumbs";
import { getDatePickerFormat } from "@/utils";

export default function AddUpdateHolidays({ editMode, viewMode }: any) {
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const router = useRouter();
  const queryParams = useSearchParams();
  const isArchived = queryParams.get("tab");
  const params = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useCustomDebounce(searchTerm, DEBOUNCE_TIMER);
  const [patchData, setPatchData] = useState<any>(null);
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const [initialPatchedValues, setInitialPatchedValues] = useState<any>(null);

  const [wrongIdCheck, setWrongIdCheck] = useState(false);

  const formik = useFormik({
    initialValues: initialValues,
    validationSchema,
    onSubmit: async () => handleSubmit(),
  });

  useEffect(() => {
    if (editMode) {
      if (params?.id) {
        fetchAddedRecord();
      } else {
        setWrongIdCheck(true);
      }
    } else {
      setInitialPatchedValues(formik?.initialValues);
    }
  }, []);

  function handleItemNameChange(e: any) {
    const value = e.target.value;
    setSearchTerm(value);
    formik.setFieldValue("holiday_name", value);
  }

  async function fetchAddedRecord() {
    try {
      setLoader(true);
      const payload = {
        id: params.id || "",
      };
      const response = await AdminGetHolidayById(payload); // Replace this with the actual service function to view the audit report by ID

      if (response?.id) {
        setPatchData(response);
        formik.setFieldValue(
          "holiday_date",
          getDatePickerFormat(response?.holiday_date)
        );
        formik.setFieldValue("holiday_name", response?.holiday_name);
        formik.setFieldValue(
          "recurring_every_year",
          response?.recurring_every_year
        );
        setInitialPatchedValues({
          holiday_date: getDatePickerFormat(response?.holiday_date),
          holiday_name: response?.holiday_name,
          recurring_every_year: response?.recurring_every_year,
        });
      }
      setLoader(false);
    } catch (error) {
      setLoader(false);
    }
  }

  async function handleSubmit() {
    const { values } = formik || {};
    if (setLoader) {
      setLoader(true); // Prevent multiple submissions
      setLoaderInfo(editMode ? "Updating holiday..." : "Adding holiday...");
    }

    try {
      if (editMode) {
        // If `editMode` is true, call the edit service
        const success = await AdminUpdateHolidayDetails({
          updateHolidayDetailsInput: {
            id: patchData?.id, // Assuming you have the `id` in form values
            holiday_date: values?.holiday_date,
            holiday_name: values?.holiday_name,
            holiday_status: values?.holiday_status,
            recurring_every_year: values?.recurring_every_year,
          },
        });

        if (success) {
          router.push(AppRoutes.ADMIN_HOLIDAYS_LIST);
        }
        setLoader(false);
        setLoaderInfo("");
      } else {
        // If `isEdit` is false, check if the item name exists first

        // Call the service to add a subscription item
        const success = await AdminAddHolidayDetails({
          addHolidayDetailsInput: {
            holiday_date: formik?.values?.holiday_date,
            holiday_name: formik?.values?.holiday_name,
            holiday_status: "Active",
            recurring_every_year: formik?.values?.recurring_every_year,
          },
        });

        if (success) {
          router.push(AppRoutes.ADMIN_HOLIDAYS_LIST);
        }
      }
      setLoader(false);
      setLoaderInfo("");
    } catch (error) {
      setLoaderInfo("");

      setLoader(false);
    } finally {
      setLoader(false);
      setLoaderInfo("");
    }
  }

  function handlePageConfirmClose() {
    setDisplayClosePageConfirmation(false);
    onClose();
  }

  function handlePageConfirmSave() {
    formik?.handleSubmit();
    setDisplayClosePageConfirmation(false);
    return true;
  }

  function onClose() {
    router.push(AppRoutes.ADMIN_HOLIDAYS_LIST);
  }

  function handleCancel() {
    const { holiday_status, ...formValues } = formik?.values || {};
    if (isEqual(initialPatchedValues, formValues)) {
      onClose();
    } else {
      setDisplayClosePageConfirmation(true);
    }
  }

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              {
                path: AppRoutes.ADMIN_DASHBOARD,
                name: "Home",
              },
              {
                path: AppRoutes.ADMIN_HOLIDAYS_LIST,
                name: "Holiday",
              },
            ]}
            activeRoute={
              editMode
                ? "Edit holiday"
                : viewMode
                ? "View holiday"
                : "Add holiday"
            }
          />
        </div>
        <br />
        {wrongIdCheck ? (
          <div className="text_center">No data available on this id</div>
        ) : (
          <div className="pt_smallbgimage">
            <div className="pt_centered">
              <div className="pt_centeredinner">
                <div className="pt_box_transparent_cp">
                  <div className="grid">
                    <div className="pt_login">
                      <h4>{`${
                        editMode ? "Edit" : viewMode ? "View" : "Add"
                      } holiday`}</h4>
                      <br />

                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        label={"Holiday name"}
                        name={"holiday_name"}
                        placeholder="Enter holiday name"
                        error={formik.errors?.holiday_name}
                        showError={
                          formik.touched.holiday_name &&
                          formik.errors.holiday_name
                        }
                        required
                        maxLength={150}
                        onChange={handleItemNameChange}
                        onBlur={formik.handleBlur("holiday_name")}
                        value={formik.values?.holiday_name}
                      />

                      <FormikControl
                        label={"Date"}
                        name={"holiday_date"}
                        required
                        value={formik.values?.holiday_date}
                        onChange={(selectedOption: any) =>
                          formik.setFieldValue("holiday_date", selectedOption)
                        }
                        error={formik.errors?.holiday_date}
                        showError={
                          formik.touched.holiday_date &&
                          formik.errors.holiday_date
                        }
                        renderKey={"label"}
                        valueKey={"value"}
                        onBlur={formik.handleBlur("holiday_date")}
                        control={InputType.DATE_PICKER}
                      />

                      <br />
                      <FormikControl
                        control={InputType.CHECKBOX}
                        label={"Repeats annually"}
                        name={"recurring_every_year"}
                        error={formik.errors?.recurring_every_year}
                        showError={
                          formik.touched.recurring_every_year &&
                          formik.errors.recurring_every_year
                        }
                        onChange={formik?.handleChange}
                        onBlur={formik.handleBlur("recurring_every_year")}
                        value={formik.values?.recurring_every_year}
                      />

                      <br />
                      <br />
                      <div className="grid">
                        <input
                          type="button"
                          value={viewMode ? "Close" : "Cancel"}
                          className="outline contrast"
                          onClick={() => handleCancel()}
                        />
                        {viewMode && !isArchived && (
                          <input
                            type="button"
                            value={"Edit"}
                            className="secondary"
                            onClick={() =>
                              router.push(
                                `${AppRoutes.ADMIN_EDIT_SUBSCRIPTION_ITEMS}/${params?.id}`
                              )
                            }
                          />
                        )}
                        {!viewMode && (
                          <input
                            type="submit"
                            value={"Save"}
                            className="secondary"
                            onClick={() => formik?.handleSubmit()}
                          />
                        )}
                      </div>
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
            {displayClosePageConfirmation && (
              <BaseModal
                modalId={"plan items confirmation"}
                displayModal={displayClosePageConfirmation}
                onClose={handlePageConfirmClose}
                onHeaderIconClose={() => setDisplayClosePageConfirmation(false)}
                onConfirm={handlePageConfirmSave}
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
        )}
      </div>
    </div>
  );
}
