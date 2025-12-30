"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Row, Col, Form } from "react-bootstrap";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import {
  ExclamationTriangleFill,
  Search,
  XCircle,
} from "react-bootstrap-icons";
import { useParams, usePathname, useRouter } from "next/navigation";
import styles from "./companyAddUserPage.module.scss";
import commonStyles from "./../../common/commonStyles.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { CompanyURLS } from "@/common/companyURLS";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import {
  CreateNewUserAccessInputs,
  editUserFromCompany,
  getUserByEmailId,
  insertCompanyNewUserRoles,
  insertCompanyUserRoles,
} from "@/app/api/CompanyRegistrationServices";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import { useLoaderContext } from "@/context/useLoader";
import Overlays from "@/components/Overlayes/Overlayes";
import Avatar from "react-avatar";
import { useTokenDetails } from "@/common/commonHooks";

const validationSchema = Yup.object().shape({
  FirstName: Yup.string().required("First name is required"),
  LastName: Yup.string().required("Last name is required"),
  Email: Yup.string()
    .matches(
      /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/,
      "Please enter valid email address"
    )
    .required("Email is required"),
  UserType: Yup.string().required("User type is required"),
});

const CompanyAddUserPage = (props: any) => {
  const [singleSelectedData, setSingleSelectedData] = useState<any>();
  const [userValues, setuserValues] = useState<any>({});
  const [userData, setUserData] = useState<any>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const routePath = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [manageUser, setManageUser] = useState("Yes");
  const [manageCompany, setManageCompany] = useState("Yes");
  const [manageProjectTrustPayment, setManageProjectTrustPayment] =
    useState("Yes");
  const [manageSubscription, setManageSubscription] = useState("Yes");
  const [emailExists, setEmailExists] = useState(false);
  const { setActionScreen, isEdit = false, ...rest } = props;
  const [wrongIdCheck, setWrongIdCheck] = useState(false);
  const [timeKey, setTimeKey] = useState(new Date().getTime());
  const [limitedOptions, setLimitedOptions] = useState(false);

  const [editData, setEditData] = useState<any>({
    company_id: "", // Add the desired properties to the initial state
    date_added: "",
    email_id: "",
    id: "",
    is_verified: false, // Default value for boolean properties
    manage_company: false,
    manage_project_trust_payment: false,
    manage_subscription: false,
    manage_user: false,
    status: "",
    user_id: "",
    user_name: "",
    user_status: "",
    user_type: "",
  });
  const [showOverlay, setShowOverlay] = useState(false);
  const { decodeTokenData } = useTokenDetails();
  const [storedCompanyId, setStoredCompanyId] = useState<number | null>(null);
  const roleDetails = decodeTokenData?.companySpecificRoles?.filter(
    (x: { companyId: number }) =>
      String(x.companyId) === String(storedCompanyId)
  );
  const [roleAccess, setRoleAccess] = useState<any>(
    roleDetails?.length > 0 ? roleDetails?.[0] : {}
  );

  const params: any = useParams();
  const { setLoader }: any = useLoaderContext();
  const url = typeof window !== "undefined" ? window.location.href : "";

  // Get the 'email' parameter value
  const emailParam: any = decodeURIComponent(params?.id); //params2.get("email");

  const formik = useFormik({
    initialValues: {
      FirstName: "",
      LastName: "",
      Email: "",
      UserType: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      const currentDate = new Date();
      const utcDate = currentDate.toISOString();
      const accessToken = localStorage.getItem("accessToken");

      if (accessToken) {
        const decodedToken: any = jwtDecode(accessToken);

        try {
          if (emailExists) {
            toast.error("Email already exists.");
            return;
          }

          const companyIdString = localStorage.getItem("companyId");

          if (!isEdit && companyIdString) {
            const companyId = parseInt(companyIdString, 10);
            const userData = await getUserByEmailId(companyId, values.Email);

            if (userData && userData.length === 0) {
              // Insert company new user roles when user not found
              let response: any = await insertCompanyNewUserRoles(
                {
                  user_name: values.FirstName + " " + values.LastName,
                  company_id: companyId,
                  is_user_exists: false,
                  email_id: values.Email,
                  user_first_name: values.FirstName,
                  company_role: values.UserType,
                  manage_user: manageUser,
                  manage_company: manageCompany,
                  manage_project_trust_payment: manageProjectTrustPayment,
                  manage_subscription: manageSubscription,
                },
                accessToken
              );
              if (response) {
                toast.success(
                  "This user has been invited and added to the list."
                );
              }
            } else {
              const user = userData[0];

              if (user.status === "Active" || user.status === "Inactive") {
                toast.success("User already exists in this company.");
              } else if (user.status === null) {
                const createUserAccessInput: CreateNewUserAccessInputs = {
                  user_name: values.FirstName + " " + values.LastName,
                  user_id: Number(user.user_id),
                  company_id: companyId,
                  is_user_exists: true,
                  email_id: values.Email,
                  user_first_name: values.FirstName,
                  company_role: values.UserType,
                  manage_user: manageUser,
                  manage_company: manageCompany,
                  manage_project_trust_payment: manageProjectTrustPayment,
                  manage_subscription: manageSubscription,
                };

                let response: any = await insertCompanyUserRoles(
                  createUserAccessInput,
                  accessToken
                );
                if (response) {
                  toast.success("User added successfully.");
                }
              }
            }
          }
          if (isEdit && companyIdString) {
            const companyId = parseInt(companyIdString, 10);
            const userData = await getUserByEmailId(companyId, values.Email);
            const user = userData[0];
            // Define the updateUserAccessInput object with the updated values
            const updateUserAccessInput = {
              user_name: values.FirstName + " " + values.LastName,
              user_id: Number(user.user_id),
              status: "Active", // Assuming user status is retrieved from the userData object
              company_role: values.UserType,
              company_id: companyId,
              manage_company: manageCompany,
              manage_project_trust_payment: manageProjectTrustPayment,
              manage_user: manageUser,
              manage_subscription: manageSubscription,
              updated_by: decodedToken["userId"],
              updated_on: utcDate,
            };
            // Call the editUserFromCompany service with the updateUserAccessInput
            let responce = await editUserFromCompany(
              updateUserAccessInput,
              accessToken
            );
            if (responce) {
              toast.success("User has been updated.");
            }
            //api
          }
          router.push("/company/user-access");
        } catch (error) {
          console.error("Error submitting form:", error);
          toast.error("Error submitting form. Please try again later.");
        }
      }
    },
  });

  const options =
    roleAccess?.role === "ADMIN" && formik.values.UserType === "STANDARD USER"
      ? [{ value: "STANDARD USER", label: "Standard User" }]
      : roleAccess?.role === "ADMIN"
      ? [
          { value: "ADMIN", label: "Admin" },
          { value: "STANDARD USER", label: "Standard User" },
        ]
      : roleAccess?.role === "STANDARD USER"
      ? [{ value: "STANDARD USER", label: "Standard User" }]
      : [
          { value: "PRIMARY ADMIN", label: "Primary Admin" },
          { value: "ADMIN", label: "Admin" },
          { value: "STANDARD USER", label: "Standard User" },
        ];

  useEffect(() => {
    // Fetch company ID from local storage
    const storedCompanyId = localStorage.getItem("companyId");

    if (storedCompanyId) {
      setStoredCompanyId(parseInt(storedCompanyId, 10)); // Parse string to integer
    }
  }, []);

  useEffect(() => {
    const newData = decodeTokenData?.companySpecificRoles?.filter(
      (x: { companyId: number }) =>
        String(x.companyId) === String(storedCompanyId)
    );
    setRoleAccess(newData?.length > 0 ? newData?.[0] : {});
  }, [storedCompanyId]);

  useEffect(() => {
    if (isEdit && params?.id) {
      const fetchUserData = async () => {
        try {
          setLoader(true);
          const companyIdString = localStorage.getItem("companyId"); // Retrieve companyId as a string
          if (companyIdString) {
            const companyId = parseInt(companyIdString, 10); // Parse companyId string to integer
            const userData = await getUserByEmailId(
              companyId,
              emailParam || ""
            );
            setManageUser(userData[0]?.manage_user || "No");
            setManageCompany(userData[0]?.manage_company || "No");
            setManageProjectTrustPayment(
              userData[0]?.manage_project_trust_payment || "No"
            );
            setManageSubscription(userData[0]?.manage_subscription || "No");

            if (userData) {
              setEditData(userData[0]); // Update the state with fetched user data
            } else {
              setWrongIdCheck(true); // Corrected typo here
            }
          } else {
            console.error("Company ID not found in local storage.");
          }
        } catch (error) {
          console.error("Error fetching user details:", error);
          toast.error("Error fetching user details. Please try again later.");
        } finally {
          setLoader(false);
        }
      };
      fetchUserData();
    }
  }, []);

  useEffect(() => {
    // Set initial values for formik once editData is available
    if (isEdit && editData?.id) {
      formik.setValues({
        FirstName: (editData?.user_name || "").split(" ")[0] || "",
        LastName: editData?.last_name || "",
        Email: editData?.email_id || "",
        UserType: editData?.user_type || "",
      });
      // Find the corresponding option for UserType and set it if it exists
      let selOpt = options.find((opt) => opt.value === editData.user_type);
      if (selOpt) {
        setSingleSelectedData(selOpt);
      } else {
        setSingleSelectedData("");
      }

      setTimeKey(new Date().getTime());
    }
  }, [isEdit, editData]);

  const checkUsernameExistence = async (input: string) => {
    try {
      const companyIdString = localStorage.getItem("companyId"); // Retrieve companyId as a string
      if (companyIdString) {
        const companyId = parseInt(companyIdString, 10); // Parse companyId string to integer
        const userData = await getUserByEmailId(companyId, input);

        if (userData && userData.length > 0) {
          const user = userData[0];
          if (user?.status === "Active") {
            toast.success("User already exists in this company.");
          } else if (user?.status === "Inactive") {
            toast.success("Invitation already sent.");
          } else if (user?.status === null) {
            toast.info("User exists but not assigned to this company.");
            setShowOverlay(true);
            setUserData(userData);
          }
        } else {
          toast.error("User not found.");
        }
      } else {
        console.error("Company ID not found in local storage.");
      }
    } catch (error) {
      // Handle error, you can log or show a notification
      console.error("Error checking username existence:", error);
    }
  };

  const checkEmailExistence = async (input: string) => {
    try {
      const companyIdString = localStorage.getItem("companyId"); // Retrieve companyId as a string
      if (companyIdString) {
        const companyId = parseInt(companyIdString, 10); // Parse companyId string to integer
        const userData = await getUserByEmailId(companyId, input);

        if (userData && userData.length > 0) {
          const user = userData[0];
          if (user?.status === "Active") {
            toast.success("User already exists in this company.");
          } else if (user?.status === "Inactive") {
            toast.success("Invitation already sent.");
          } else if (user?.status === null) {
            toast.info("User exists but not assigned to this company.");
            setShowOverlay(true);
            setUserData(userData);
          }
        } else {
          toast.error("User not found.");
        }
      } else {
        console.error("Company ID not found in local storage.");
      }
    } catch (error) {
      // Handle error, you can log or show a notification
      console.error("Error checking email existence:", error);
    }
  };
  const onInputClick = () => {
    if (!search.trim() || search.length < 4) return;
    if (search && isValidEmail(search)) {
      // Check email existence when input is not empty and is a valid email
      checkEmailExistence(search);
    } else {
      // Check username existence when input is not empty and is not a valid email
      checkUsernameExistence(search);
    }
  };

  // Function to validate email format
  const isValidEmail = (email: string): boolean => {
    return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(email);
  };

  const setFormDetails = () => {
    let data = {
      firstName: userData[0]?.first_name,
      lastName: userData[0]?.last_name,
      email: userData[0]?.email_id,
    };
    formik.setValues({
      FirstName: data?.firstName || "",
      LastName: data?.lastName || "",
      Email: data?.email || "",
      UserType: "",
    });
    if (data?.firstName && data?.lastName && data?.email) {
      // If all required values are present, show limited options
      setLimitedOptions(true);
    } else {
      setLimitedOptions(false);
    }
    setuserValues(data);
    setShowOverlay(false);
  };

  return (
    <div className={styles.mainCon}>
      <ReusableBreadcrumb
        items={[
          {
            href: CompanyURLS.USER_DASHBOARD,
            label: "Home",
            active: routePath === CompanyURLS.USER_DASHBOARD,
          },
          {
            href: CompanyURLS.MULTIPLE_USERS_ACCESS,
            label: "User Access",
            active: routePath === CompanyURLS.MULTIPLE_USERS_ACCESS,
          },
          {
            href: isEdit
              ? CompanyURLS.COMPANY_EDIT_USER
              : CompanyURLS.COMPANY_ADD_USER,
            label: isEdit ? "Edit User" : "Add User",
            active:
              routePath ===
              (isEdit
                ? CompanyURLS.COMPANY_EDIT_USER
                : CompanyURLS.COMPANY_ADD_USER),
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <Form
        onSubmit={formik.handleSubmit}
        noValidate
        className={styles.formStyle}
      >
        <Row className={`${styles.textFieldStyles}`}>
          <span className={styles.headerText}>
            {isEdit ? "Edit User" : "Add User"}
          </span>
          {!isEdit && (
            <label className={styles.addUserLabelStyles}>
              Search for using existing users by their name or email address
            </label>
          )}
          {!isEdit && (
            <Col lg={6} className={styles.eachFieldBottom}>
              <TextField
                placeholder="Filter by name or email"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  // Close the popover when the search input is cleared
                  if (e.target.value === "") {
                    setShowOverlay(false);
                  }
                }}
                onKeyDown={(e) => {
                  // Check if Enter key is pressed
                  if (e.key === "Enter") {
                    e.preventDefault(); // Prevent form submission
                    onInputClick();
                  }
                }}
                type="text"
                autoFocus
                endingData={<Search />}
                endingDataStyles={styles.searchEndIconStyle}
                onEndIconClick={() => {
                  onInputClick();
                }}
                className={styles.textFieldStyles}
              />
              <Overlays
                trigger="click"
                placement={"bottom"}
                popoverProfile={{
                  name: userData && userData[0]?.first_name,
                  email: userData && userData[0]?.email_id,
                  src: userData && userData[0]?.file,
                }}
                overlay={<span></span>}
                popoverTypes="adduser"
                show={showOverlay}
                optionClick={setFormDetails}
                popperConfig={{
                  modifiers: [
                    {
                      name: "offset",
                      options: {
                        offset: [120, 0], // Adjust the offset as needed
                      },
                    },
                  ],
                }}
              >
                {() => <></>}
              </Overlays>
              {emailExists && (
                <div className={`${styles.errorText} ${styles.icon}`}>
                  <ExclamationTriangleFill className={styles.icon} />
                  Email already exists!
                </div>
              )}
            </Col>
          )}
        </Row>
        <Row className={`${styles.textFieldStyles}`}>
          <Col lg={6} className={styles.eachFieldBottom}>
            <TextField
              placeholder=""
              type="text"
              errorText={formik.errors.FirstName as string}
              isInvalid={
                formik.touched.FirstName && formik.errors.FirstName
                  ? true
                  : false
              }
              labelText="First Name *"
              name="FirstName"
              id="FirstName"
              required
              value={formik.values.FirstName}
              onChange={formik.handleChange}
              disabled={isEdit || userValues?.firstName ? true : false}
              onBlur={formik.handleBlur}
              endingDataStyles={styles.endIconStyle}
              classNames={commonStyles.inputFieldControl}
            />
          </Col>
          <Col lg={6}>
            <TextField
              placeholder=""
              type="text"
              errorText={formik.errors.LastName}
              isInvalid={
                formik.touched.LastName && formik.errors.LastName ? true : false
              }
              labelText="Last Name *"
              name="LastName"
              id="LastName"
              required
              value={formik.values.LastName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              endingDataStyles={styles.endIconStyle}
              classNames={commonStyles.inputFieldControl}
              disabled={isEdit || userValues?.lastName ? true : false}
              // Add disabled prop based on isEdit
            />
          </Col>
        </Row>
        <Row className={`${styles.textFieldStyles}`}>
          <Col lg={6} className={styles.eachFieldBottom}>
            <TextField
              placeholder=""
              type="text"
              errorText={formik.errors.Email}
              isInvalid={
                formik.touched.Email && formik.errors.Email ? true : false
              }
              labelText="Email *"
              name="Email"
              id="Email"
              required
              value={formik.values.Email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              endingDataStyles={styles.endIconStyle}
              classNames={commonStyles.inputFieldControl}
              disabled={isEdit || userValues?.email ? true : false}
              // Add disabled prop based on isEdit
            />
          </Col>
          <Col lg={6}>
            <div className={styles.DropdownStyles}>
              <SearchableSelect
                key={timeKey}
                options={options}
                label="User type *"
                singleSelectedData={singleSelectedData}
                onChange={(option) => {
                  formik.handleChange("UserType")(option.value);
                  setSingleSelectedData(option);
                }}
                isRequired={
                  !formik.values.UserType && formik.touched.UserType
                    ? true
                    : false
                }
                errorMessage={formik.errors.UserType}
                disabled={false}
                placeholder=""
              />
            </div>
          </Col>
        </Row>

        {/* Checkbox rows conditionally rendered based on user type */}
        {formik.values.UserType === "STANDARD USER" && (
          <>
            <Row className={`${styles.textFieldStyles}`}>
              <Col lg={6} className={styles.eachFieldBottom}>
                <p>Do you want this user to add,edit and remove users?</p>
                <Form.Check
                  type="radio"
                  label="Yes"
                  name="permission"
                  id="yes-radio"
                  checked={manageUser === "Yes"}
                  onChange={() => setManageUser("Yes")}
                  // Add any necessary event handlers or state to handle the selection
                />
                <Form.Check
                  type="radio"
                  label="No"
                  name="permission"
                  id="no-radio"
                  checked={manageUser === "No"}
                  onChange={() => setManageUser("No")}
                  // Add any necessary event handlers or state to handle the selection
                />
                <Form.Check
                  type="radio"
                  label="View Only"
                  name="permission"
                  id="view-only-radio"
                  checked={manageUser === "View Only"}
                  onChange={() => setManageUser("View Only")}
                  // Add any necessary event handlers or state to handle the selection
                />
              </Col>
              <Col lg={6} className={styles.eachFieldBottom}>
                <p>Do you want this user to edit company info?</p>
                <Form.Check
                  type="radio"
                  label="Yes"
                  name="permit"
                  id="yes-radio"
                  checked={manageCompany === "Yes"}
                  onChange={() => setManageCompany("Yes")}
                  // Add any necessary event handlers or state to handle the selection
                />
                <Form.Check
                  type="radio"
                  label="No"
                  name="permit"
                  id="no-radio"
                  checked={manageCompany === "No"}
                  onChange={() => setManageCompany("No")}
                  // Add any necessary event handlers or state to handle the selection
                />
              </Col>
            </Row>

            <Row className={`${styles.textFieldStyles}`}>
              <Col lg={6} className={styles.eachFieldBottom}>
                <p>Do you want this user to manage subscriptions?</p>
                <Form.Check
                  type="radio"
                  label="Yes"
                  name="manage permit"
                  id="yes-radio"
                  checked={manageSubscription === "Yes"}
                  onChange={() => setManageSubscription("Yes")}
                  // Add any necessary event handlers or state to handle the selection
                />
                <Form.Check
                  type="radio"
                  label="No"
                  name="manage permit"
                  id="no-radio"
                  checked={manageSubscription === "No"}
                  onChange={() => setManageSubscription("No")}
                  // Add any necessary event handlers or state to handle the selection
                />
                <Form.Check
                  type="radio"
                  label="View Only"
                  name="manage permit"
                  id="view-only-radio"
                  checked={manageSubscription === "View Only"}
                  onChange={() => setManageSubscription("View Only")}
                  // Add any necessary event handlers or state to handle the selection
                />
              </Col>
              <Col lg={6} className={styles.eachFieldBottom}>
                <p>
                  Do you want this user to manage project, trust and payments?
                </p>
                <Form.Check
                  type="radio"
                  label="Yes"
                  name="trust permit"
                  id="yes-radio"
                  checked={manageProjectTrustPayment === "Yes"}
                  onChange={() => setManageProjectTrustPayment("Yes")}
                  // Add any necessary event handlers or state to handle the selection
                />
                <Form.Check
                  type="radio"
                  label="No"
                  name="trust permit"
                  id="no-radio"
                  checked={manageProjectTrustPayment === "No"}
                  onChange={() => setManageProjectTrustPayment("No")}
                  // Add any necessary event handlers or state to handle the selection
                />
                <Form.Check
                  type="radio"
                  label="View Only"
                  name="trust permit"
                  id="view-only-radio"
                  checked={manageProjectTrustPayment === "View Only"}
                  onChange={() => setManageProjectTrustPayment("View Only")}
                  // Add any necessary event handlers or state to handle the selection
                />
              </Col>
            </Row>
          </>
        )}

        <div className={styles.btnContianer}>
          <FormButton
            type={"button"}
            className={styles.cancelBtnStyle}
            onClick={() => router.back()}
          >
            Cancel
          </FormButton>
          <FormButton type={"submit"} className={styles.saveBtnStyle}>
            Save
          </FormButton>
        </div>
      </Form>
    </div>
  );
};

export default CompanyAddUserPage;
