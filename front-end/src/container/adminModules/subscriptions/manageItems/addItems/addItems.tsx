"use client";
import React, { useEffect, useState } from "react";
import { Button, Col, Form, Row } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import { useFormik } from "formik";
import * as Yup from "yup";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { useParams, usePathname, useRouter } from "next/navigation";
import commonStyles from "../../../../../common/commonStyles.module.scss";
import { ApplicationURLS } from "@/common/applicationURLS";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import styles from "./addItems.module.scss";
import { toast } from "@/app/Toaster";
import { useLoaderContext } from "@/context/useLoader";
import {
  AdminAddSubsciptionItem,
  AdminGetSubsciptionItemById,
  checkSubscriptionItemNameExistence,
  editSubscriptionDetails,
} from "./addItems.functions";
import { useCustomDebounce } from "@/common/commonHooks";
import { DEBOUNCE_TIMER } from "@/common/constants/general";

const AddItems = (props: any) => {
  const { isEdit = false, isView = false } = props;
  const routePath = usePathname();
  const router = useRouter();
  const params = useParams();

  const { setLoader, loader }: any = useLoaderContext();

  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useCustomDebounce(searchTerm, DEBOUNCE_TIMER);
  const [initialRender, setInitialRender] = useState(true);
  const [selectedItemStatus, setSelectedItemStatus] = useState<any>();
  const [itemData, setItemData] = useState<any>({});

  // Debounced search effect for checking item name existence
  useEffect(() => {
    const checkItemNameExistence = async () => {
      if (debouncedSearchTerm) {
        const response = await checkSubscriptionItemNameExistence(
          debouncedSearchTerm.trim()
        );
        if (response) {
          formik.setFieldValue("isItemNameExist", true);
        } else {
          formik.setFieldValue("isItemNameExist", false);
        }
      }
    };
    if (!initialRender) {
      checkItemNameExistence();
    } else {
      setInitialRender(false);
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    (async () => {
      try {
        if (params?.id) {
          const payload = {
            id: params.id || "",
          };
          const Responce = await AdminGetSubsciptionItemById(payload); // Replace this with the actual service function to view the audit report by ID
          if (Responce?.id) {
            setItemData(Responce);
            formik.setFieldValue("Item_Name", Responce?.item_name);
            formik.setFieldValue("description", Responce?.description);
            formik.setFieldValue("Item_Status", Responce?.item_status);
            setSelectedItemStatus({
              value: Responce?.item_status,
              label: Responce?.item_status,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching audit report ID:", error);
      }
    })();
  }, [params?.id]);

  const validationSchema = Yup.object().shape({
    Item_Name: Yup.string()
      .required("Item name is required")
      .test("unique-item-name", function (value, formData: any) {
        const isItemNameExist = formData.parent.isItemNameExist;
        if (!value) return true;
        if (isItemNameExist) {
          return formData.createError({
            path: formData.path,
            message: "Item name already exist",
          });
        }
        return true;
      }),
    Item_Status: Yup.string().required("Status is required"),
    description: Yup.string().max(
      200,
      "Description must be at most 200 characters"
    ),
  });

  const customStyles = {
    control: (provided: any) => ({
      height: "40px",
      width: "100%",
    }),
  };

  const formik = useFormik({
    initialValues: {
      Item_Name: "",
      description: "",
      Item_Status: "",
      isItemNameExist: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      if (setLoader) {
        setLoader(true); // Prevent multiple submissions
      }

      try {
        if (isEdit) {
          // If `isEdit` is true, call the edit service
          const success = await editSubscriptionDetails({
            updateSubscriptionItemInput: {
              id: itemData?.id, // Assuming you have the `id` in form values
              item_name: values?.Item_Name,
              description: values?.description,
              item_status: values?.Item_Status,
            },
          });

          if (success) {
            toast.success("Subscription item updated successfully");
            router.push(
              ApplicationURLS.ADMIN_SUBSCRIPTION_MANAGE_ITEMS_CURRENT
            );
          }
        } else {
          // If `isEdit` is false, check if the item name exists first
          if (formik?.values?.isItemNameExist) {
            toast.error("Item name already exists.");
            return;
          }

          // Call the service to add a subscription item
          const success = await AdminAddSubsciptionItem({
            addSubscriptionItemInput: {
              item_name: values?.Item_Name,
              description: values?.description,
              item_status: values?.Item_Status,
            },
          });

          if (success) {
            router.push(
              ApplicationURLS.ADMIN_SUBSCRIPTION_MANAGE_ITEMS_CURRENT
            );
          }
        }
      } catch (error) {
        console.error("Submission Error:", error);
      } finally {
        if (setLoader) {
          setLoader(false); // Ensure loading state is turned off after submission
        }
      }
    },
  });

  const handleItemNameChange = (e: any) => {
    const value = e.target.value;
    setSearchTerm(value);
    formik.setFieldValue("Item_Name", value);
  };

  const statusOptions = [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
  ];

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
            href: ApplicationURLS.ADMIN_SUBSCRIPTION_MANAGE_ITEMS_CURRENT,
            label: "Manage Items",
            active:
              routePath ===
              ApplicationURLS.ADMIN_SUBSCRIPTION_MANAGE_ITEMS_CURRENT,
          },
          {
            href: "",
            label: isEdit ? "Edit Subscription Item" : "Add Subscription Item",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <Row>
        <span className={styles.headerText}>
          {isEdit ? "Edit" : isView ? "View" : "Add"} Subscription Item
        </span>
      </Row>

      <Form
        onSubmit={formik.handleSubmit}
        noValidate
        className={styles.formStyle}
      >
        <Row className={styles.textFieldStyles}>
          <Col lg={6} className={styles.eachFieldBottom}>
            <TextField
              placeholder="Enter Item Name"
              type="text"
              errorText={formik.errors.Item_Name}
              isInvalid={
                !!(formik.touched.Item_Name && formik.errors.Item_Name)
              }
              labelText="Item Name *"
              name="Item_Name"
              id="Item_Name"
              required
              value={formik.values.Item_Name}
              onChange={handleItemNameChange}
              onBlur={formik.handleBlur}
              disabled={isView || isEdit}
              maxLength={150}
              classNames={commonStyles.inputFieldControl}
            />
          </Col>
          <Col lg={6} className={styles.eachFieldBottom}>
            <SearchableSelect
              key={timeKey}
              options={statusOptions}
              singleSelectedData={selectedItemStatus}
              onChange={(selectedOption) => {
                formik.handleChange("Item_Status")(selectedOption?.value || "");
                setSelectedItemStatus({
                  value: selectedOption?.value,
                  label: selectedOption?.label,
                });
              }}
              disabled={isView}
              placeholder="Status"
              controlStyles={customStyles}
              label="Status *"
              isRequired={
                !!(!formik.values.Item_Status && formik.touched.Item_Status)
              }
              errorMessage={formik.errors.Item_Status}
            />
          </Col>
        </Row>
        <Row className={styles.textareaStyles}>
          <Form.Group>
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={formik.values.description}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              name="description"
              className={
                formik.touched.description && formik.errors.description
                  ? styles.errorBorder
                  : ""
              }
              disabled={isView}
              placeholder="Enter Description"
            />
            {formik.touched.description && formik.errors.description && (
              <div className={styles.errorContainer}>
                <ExclamationTriangleFill className={styles.crossiconsSyles} />
                <span className={styles.errorTextStyles}>
                  {formik.errors.description}
                </span>
              </div>
            )}
          </Form.Group>
        </Row>

        <div className={styles.btnContianer}>
          <Button
            type={"button"}
            className={styles.cancelBtnStyle}
            onClick={() => {
              toast.info("No changes saved");
              router.push(
                ApplicationURLS.ADMIN_SUBSCRIPTION_MANAGE_ITEMS_CURRENT
              );
            }}
          >
            {isView ? "Close" : "Cancel"}
          </Button>
          {!isView && (
            <Button
              type={"submit"}
              className={styles.saveBtnStyle}
              disabled={loader} // Disable submit button if loading
            >
              Save
            </Button>
          )}
        </div>
      </Form>
    </div>
  );
};

export default AddItems;
