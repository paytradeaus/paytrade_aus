"use client";
import FormikControl from "@/components/FormikControl";
import { useLoaderContext } from "@/context/useLoader";
import { AppRoutes } from "@/shared/constant/appRoutes";
import {
  buttonType,
  DEBOUNCE_TIMER,
  InputType,
} from "@/shared/constant/general";
import { useFormik } from "formik";
import React, { useEffect, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { useCustomDebounce } from "@/hooks";
import { useParams } from "next/navigation";
import BaseModal from "@/components/BaseModal";
import { isEqual } from "lodash";
import BreadCrumbs from "@/components/BreadCrumbs";
import { durationOptions, statusOptions } from "./AddUpdateCoupons.constants";
import { validationSchema } from "./AddUpdateCoupons.validation";
import {
  AdminAddGiftCoupon,
  AdminGiftCouponById,
  AdminUpdateGiftCoupon,
  CheckGiftCouponExistence,
} from "./AddUpdateCoupons.functions";
import { showInfoToast } from "@/components/Toaster";

export default function AddUpdateCoupons({ editMode, viewMode }: any) {
  const { setLoader, setLoaderInfo }: any = useLoaderContext();
  const router = useRouter();
  const queryParams = useSearchParams();
  const isArchived = queryParams.get("tab");
  const params = useParams();
  const [initialRender, setInitialRender] = useState(true);
  const [patchData, setPatchData] = useState<any>(null);
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const [initialPatchedValues, setInitialPatchedValues] = useState<any>(null);
  const [couponNameError, setCouponNameError] = useState<string | null>(null);

  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [couponSearchTerm, setCouponSearchTerm] = useState("");
  const debouncedCouponName = useCustomDebounce(
    couponSearchTerm,
    DEBOUNCE_TIMER
  );

  const isRepeating = () => {
    const cd = formik.values?.coupon_duration;

    if (!cd) return false;

    if (Array.isArray(cd)) return cd[0] === "repeating";

    if (typeof cd === "object") return cd.value === "repeating";

    return cd === "repeating";
  };

  // 🧠 Debounced API check for duplicate coupon name
  useEffect(() => {
    if (editMode || viewMode) return; // Only for ADD mode
    if (!debouncedCouponName?.trim()) {
      setCouponNameError(null);
      return;
    }

    const checkCoupon = async () => {
      try {
        const res = await CheckGiftCouponExistence(debouncedCouponName.trim());
        const data = res ?? [];

        if (Array.isArray(data) && data.length > 0) {
          setCouponNameError("Coupon name already exists");
        } else {
          setCouponNameError(null);
        }
      } catch (error) {
        console.error("Error checking coupon existence:", error);
        setCouponNameError(null);
      }
    };

    checkCoupon();
  }, [debouncedCouponName]);

  useEffect(() => {
    const fetchCouponDetails = async () => {
      try {
        if (!params?.id || (!editMode && !viewMode)) return;

        setLoader(true);
        // ✅ Handle string | string[]
        const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
        const data = await AdminGiftCouponById(id);

        if (!data) {
          setWrongIdCheck(true);
          return;
        }

        // Set formik values dynamically based on fetched data
        formik.setValues({
          coupon_name: data?.coupon_name || "",
          offer_percentage: data?.percent_off?.toString() || "",
          coupon_duration: data?.duration || null,
          coupon_months: data?.duration_in_months?.toString() || "",
          item_status: data?.coupon_status || null,
        });

        setInitialPatchedValues(data);
      } catch (error) {
        console.error("Error fetching coupon details:", error);
        setWrongIdCheck(true);
      } finally {
        setLoader(false);
      }
    };

    fetchCouponDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id, editMode, viewMode]);

  const formik: any = useFormik({
    initialValues: {
      coupon_name: "",
      offer_percentage: "",
      coupon_months: "", // Visible only when coupon_duration = repeating
      coupon_duration: null, // SELECT (object)
      item_status: null, // SELECT (object)
    },
    validationSchema,
    onSubmit: async (values: any) => {
      if (couponNameError) {
        showInfoToast(
          "Coupon name already exists. Please choose another name."
        );
        return;
      }

      try {
        setLoader(true);

        // Extract the new and old statuses
        const newStatus = values?.item_status?.value || values?.item_status;
        const oldStatus = initialPatchedValues?.coupon_status;

        // 🧠 Only allow status update in edit mode
        if (editMode) {
          if (newStatus === oldStatus) {
            showInfoToast("No changes to save");
            return;
          }

          const payload = {
            payload: {
              id: initialPatchedValues?.id,
              coupon_status: newStatus,
            },
          };

          const success = await AdminUpdateGiftCoupon(payload);
          if (success) {
            router.push(AppRoutes.ADMIN_SUBSCRIPTION_CURRENT_COUPON);
          }

          return; // stop further execution
        }

        // 🆕 Normal add mode logic (when not editing)
        const payload = {
          payload: {
            coupon_name: values.coupon_name,
            percent_off: Number(values.offer_percentage),
            duration: values?.coupon_duration?.value || values?.coupon_duration,
            duration_in_months:
              values?.coupon_duration?.value === "repeating" ||
              values?.coupon_duration === "repeating"
                ? Number(values.coupon_months)
                : null,
            coupon_status: values?.item_status?.value || values?.item_status,
          },
        };

        const success = await AdminAddGiftCoupon(payload);
        if (success) {
          router.push(AppRoutes.ADMIN_SUBSCRIPTION_CURRENT_COUPON);
        }
      } catch (error) {
        console.error("Error submitting form:", error);
      } finally {
        setLoader(false);
      }
    },
  });

  function onClose(appRoute?: string) {
    const route = appRoute ?? AppRoutes.ADMIN_SUBSCRIPTION_CURRENT_COUPON;
    router.push(route);
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
  function handleCancel() {
    // 🟢 If it's view mode, just go back
    if (viewMode) {
      onClose();
      return;
    }

    let formComparisonResult = true;

    if (editMode && initialPatchedValues) {
      // 🟣 Edit mode — compare against fetched data
      const editedData = {
        coupon_name: formik.values?.coupon_name,
        offer_percentage: formik.values?.offer_percentage
          ? Number(formik.values?.offer_percentage)
          : null,
        coupon_duration:
          formik.values?.coupon_duration?.value ||
          formik.values?.coupon_duration,
        coupon_months: formik.values?.coupon_months
          ? Number(formik.values?.coupon_months)
          : null,
        item_status:
          formik.values?.item_status?.value || formik.values?.item_status,
      };

      const initialData = {
        coupon_name: initialPatchedValues?.coupon_name,
        offer_percentage: initialPatchedValues?.percent_off ?? null,
        coupon_duration: initialPatchedValues?.duration ?? null,
        coupon_months: initialPatchedValues?.duration_in_months ?? null,
        item_status: initialPatchedValues?.coupon_status ?? null,
      };

      formComparisonResult = isEqual(initialData, editedData);
    } else {
      // 🟢 Add mode — compare with initial form
      formComparisonResult = isEqual(formik.initialValues, formik.values);
    }

    if (!formComparisonResult) {
      // 🟠 Show confirmation if user has unsaved changes
      setDisplayClosePageConfirmation(true);
    } else {
      // ✅ If no changes, route back directly
      onClose();
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
                path: AppRoutes.ADMIN_SUBSCRIPTION_CURRENT_COUPON,
                name: "Manage coupons",
              },
            ]}
            activeRoute={
              editMode ? "Edit coupon" : viewMode ? "View coupon" : "Add coupon"
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
                      }  coupon`}</h4>
                      <br />

                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        label={"Coupon name"}
                        name={"coupon_name"}
                        placeholder="Enter the name of the coupon"
                        error={couponNameError || formik.errors?.coupon_name}
                        showError={
                          formik.touched.coupon_name &&
                          (formik.errors.coupon_name || couponNameError)
                        }
                        required
                        maxLength={150}
                        disabled={viewMode || editMode}
                        onChange={(e: any) => {
                          let value = e.target.value;
                          formik.setFieldValue("coupon_name", value);
                          setCouponSearchTerm(value);
                        }}
                        onBlur={formik.handleBlur("coupon_name")}
                        value={formik.values?.coupon_name}
                      />

                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        label={"Discount Percentage"}
                        name={"offer_percentage"}
                        placeholder="Enter the discount percentage"
                        error={formik.errors?.offer_percentage}
                        showError={
                          formik.touched.offer_percentage &&
                          formik.errors.offer_percentage
                        }
                        required
                        disabled={viewMode || editMode}
                        onChange={(e: any) => {
                          let value = e.target.value;

                          // Block non-numeric characters
                          value = value.replace(/\D/g, "");

                          // Block leading zero
                          if (value.startsWith("0")) {
                            value = "";
                          }

                          // Prevent typing more than 3 digits
                          if (value.length > 3) {
                            value = value.slice(0, 3);
                          }

                          // Block any number > 100
                          if (value !== "" && Number(value) > 100) {
                            return; // STOP — do not update UI
                          }

                          formik.setFieldValue("offer_percentage", value);
                        }}
                        onBlur={formik.handleBlur("offer_percentage")}
                        value={formik.values?.offer_percentage}
                      />

                      <FormikControl
                        label={"Coupon Type"}
                        name={"coupon_duration"}
                        required
                        options={durationOptions}
                        value={formik.values?.coupon_duration}
                        onChange={(selectedOption: any) =>
                          formik.setFieldValue(
                            "coupon_duration",
                            selectedOption
                          )
                        }
                        placeholder="Select a duration"
                        error={formik.errors?.coupon_duration}
                        showError={
                          formik.touched.coupon_duration &&
                          formik.errors.coupon_duration
                        }
                        renderKey={"label"}
                        valueKey={"value"}
                        disabled={viewMode || editMode}
                        onBlur={formik.handleBlur("coupon_duration")}
                        control={InputType.SELECT}
                      />

                      {isRepeating() && (
                        <FormikControl
                          control={InputType.TEXT_FIELD}
                          label={"Duration (in Months)"}
                          name={"coupon_months"}
                          placeholder="Enter Number of months the coupon remains valid"
                          error={formik.errors?.coupon_months}
                          showError={
                            formik.touched.coupon_months &&
                            formik.errors.coupon_months
                          }
                          required
                          disabled={viewMode || editMode}
                          onChange={(e: any) => {
                            let value = e.target.value;

                            // Allow only digits
                            value = value.replace(/\D/g, "");

                            // Block leading zero
                            if (value.startsWith("0")) {
                              value = "";
                            }

                            // Only allow max 2 digits
                            if (value.length > 2) {
                              value = value.slice(0, 2);
                            }

                            // Block anything > 12
                            if (value !== "" && Number(value) > 12) {
                              return; // do NOT update UI
                            }

                            formik.setFieldValue("coupon_months", value);
                          }}
                          onBlur={formik.handleBlur("coupon_months")}
                          value={formik.values?.coupon_months}
                        />
                      )}

                      <FormikControl
                        label={"Status"}
                        name={"item_status"}
                        required
                        options={statusOptions}
                        value={formik.values?.item_status}
                        onChange={(selectedOption: any) =>
                          formik.setFieldValue("item_status", selectedOption)
                        }
                        placeholder="Status"
                        error={formik.errors?.item_status}
                        showError={
                          formik.touched.item_status &&
                          formik.errors.item_status
                        }
                        renderKey={"label"}
                        valueKey={"value"}
                        disabled={viewMode}
                        onBlur={formik.handleBlur("item_status")}
                        control={InputType.SELECT}
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
                                `${AppRoutes.ADMIN_SUBSCRIPTION_EDIT_COUPON}/${params?.id}`
                              )
                            }
                          />
                        )}
                        {!viewMode && (
                          <input
                            type="submit"
                            value={editMode ? "Update" : "Save"}
                            className="secondary"
                            onClick={() => {
                              formik?.handleSubmit();
                            }}
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
