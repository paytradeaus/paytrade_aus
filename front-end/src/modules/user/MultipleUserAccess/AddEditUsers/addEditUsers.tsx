"use client";
import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";

import { useParams, usePathname, useRouter } from "next/navigation";
import Image from "next/image";

import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import { useLoaderContext } from "@/context/useLoader";
import { useTokenDetails } from "@/hooks";
import {
  CreateNewUserAccessInputs,
  editUserFromCompany,
  getUserByEmailId,
  insertCompanyNewUserRoles,
  insertCompanyUserRoles,
} from "@/app/api/companyRegistrationService";
import BreadCrumbs from "@/components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { EMAIL_REGEX, InputType } from "@/shared/constant/general";
import FormikControl from "@/components/FormikControl";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
  showWarningToast,
} from "@/components/Toaster";
import {
  standardUserRadioOption,
  standardUserRadioOtherOption,
} from "../multipleUserAccess.constant";
import userImage from "../../../../../public/images/avatar.png";

const validationSchema = Yup.object().shape({
  FirstName: Yup.string().required("First name is required"),
  LastName: Yup.string().required("Last name is required"),
  Email: Yup.string()
    .email("Invalid email address")
    .matches(EMAIL_REGEX, "Invalid email address")
    .required("Email address is required"),
  UserType: Yup.string().required("User type is required"),
});
const AddEditUsers = (props: any) => {
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
  const [isLoading, setIsLoading] = useState(false);
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
  const [emptySearchField, setEmptySearchField] = useState(false);

  const params: any = useParams();
  const { setLoader }: any = useLoaderContext();

  // Get the 'email' parameter value
  const emailParam: any = decodeURIComponent(params?.id); //params2.get("email");

  const [showAddForm, setShowAddForm] = useState(isEdit ? true : false);
  const [searchInProgress, setSearchInProgress] = useState(false);

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
            showErrorToast("Email already exists.");
            return;
          }

          const companyIdString = localStorage.getItem("companyId");
          setIsLoading(true);
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
                showSuccessToast(
                  "This user has been invited and added to the list."
                );
              }
            } else {
              const user = userData[0];

              if (user.status === "Active" || user.status === "Inactive") {
                showSuccessToast("User already exists in this company.");
                setIsLoading(false);
              } else {
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
                  showSuccessToast("User added successfully.");
                  setIsLoading(false);
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
              showSuccessToast("User has been updated.");
              setIsLoading(false);
            }
            //api
          }
          router.push("/user/company/user-access");
        } catch (error) {
          console.error("Error submitting form:", error);
          showErrorToast("Error submitting form. Please try again later.");
          setIsLoading(false);
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
          // { value: "PRIMARY ADMIN", label: "Primary Admin" },
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
          showErrorToast(
            "Error fetching user details. Please try again later."
          );
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
          // const user = userData[0];
          // if (user?.status === "Active") {
          //   setUserData([]);
          //   showSuccessToast("User already exists in this company.");
          // } else if (user?.status === "Inactive") {
          //   setUserData([]);
          //   showSuccessToast("Invitation already sent.");
          // } else if (user?.status === null) {
          //   setUserData(userData);
          //   toast.info("User exists but not assigned to this company.");
          //   setShowOverlay(true);
          // }
          setUserData(
            userData.map((val: any) => {
              let msg;
              if (val?.status === "Active") {
                msg = "user already added to this business";
              } else if (val?.status === "Inactive") {
                msg = "Invitation already sent.";
                setUserData([]);
              } else if (val?.status === null) {
                msg = "User exists but not assigned to this business";
              }
              return {
                ...val,
                msg,
              };
            })
          );
          setSearchInProgress(false);
        } else {
          // showErrorToast("User not found.");
          setSearchInProgress(false);
          setUserData([]);
        }
      } else {
        setUserData([]);
        console.error("Company ID not found in local storage.");
        setSearchInProgress(false);
      }
    } catch (error) {
      setUserData([]);
      // Handle error, you can log or show a notification
      console.error("Error checking username existence:", error);
      setSearchInProgress(false);
    }
  };

  const checkEmailExistence = async (input: string) => {
    try {
      const companyIdString = localStorage.getItem("companyId"); // Retrieve companyId as a string
      if (companyIdString) {
        const companyId = parseInt(companyIdString, 10); // Parse companyId string to integer
        const userData = await getUserByEmailId(companyId, input);

        if (userData && userData.length > 0) {
          // const user = userData[0];
          // if (user?.status === "Active") {
          //   showSuccessToast("User already exists in this company.");
          //   setUserData([]);
          // } else if (user?.status === "Inactive") {
          //   showSuccessToast("Invitation already sent.");
          //   setUserData([]);
          // } else if (user?.status === null) {
          //   toast.info("User exists but not assigned to this company.");
          //   setShowOverlay(true);
          setUserData(
            userData.map((val: any) => {
              let msg;
              if (val?.status === "Active") {
                msg = "user already added to this business";
              } else if (val?.status === "Inactive") {
                msg = "Invitation already sent.";
                setUserData([]);
              } else if (val?.status === null) {
                msg = "User exists but not assigned to this business";
              }
              return {
                ...val,
                msg,
              };
            })
          );
          setSearchInProgress(false);
          // }
        } else {
          // showErrorToast("User not found.");
          setUserData([]);
          setSearchInProgress(false);
        }
      } else {
        console.error("Company ID not found in local storage.");
        setUserData([]);
        setSearchInProgress(false);
      }
    } catch (error) {
      // Handle error, you can log or show a notification
      console.error("Error checking email existence:", error);
      setSearchInProgress(false);
    }
  };
  const onInputClick = () => {
    if (!search.trim() || search.length < 4) {
      setUserData([]);
      return;
    }
    setSearchInProgress(true);
    if (search && isValidEmail(search)) {
      // Check email existence when input is not empty and is a valid email
      checkEmailExistence(search);
    } else {
      // Check username existence when input is not empty and is not a valid email
      checkUsernameExistence(search);
    }
  };

  useEffect(() => {
    onInputClick();
  }, [search]);

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

  const resetRadioOption = () => {
    setManageUser("Yes");
    setManageCompany("Yes");
    setManageProjectTrustPayment("Yes");
    setManageSubscription("Yes");
  };

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs"></div>
        <BreadCrumbs
          routePaths={[
            {
              path: AppRoutes.USER_DASHBOARD,
              name: "Dashboard",
            },
            {
              path: AppRoutes.USER_ACCESS,
              name: "User Access",
            },
          ]}
          activeRoute={isEdit ? "Edit user" : "Add user"}
        />

        {!showAddForm && (
          <div className="pt_smallbgimage">
            <div className="pt_centered">
              <div className="pt_centeredinner">
                <div className="pt_box_transparent_cp">
                  <div className="pt_login">
                    <h3>Add user</h3>
                    <p>
                      Search for using existing users by their name or email
                      address
                    </p>
                    <br />{" "}
                    <div className="pt_filteroptions">
                      <FormikControl
                        placeholder={"Search by name or email"}
                        control={InputType.SEARCH}
                        onChange={(value: any) => {
                          setSearch(value);
                        }}
                        name={search}
                        value={search}
                        clearSearch={emptySearchField}
                      />
                    </div>
                    <div className="pt_profilescroll" id="searchprofiles">
                      {userData?.map((val: any) => (
                        <div
                          key={val?.id}
                          className={`pt_profilename ${
                            val?.status == "Inactive" || val?.status == "Active"
                              ? "cur_not_allowed"
                              : ""
                          } `}
                          style={{ lineHeight: "unset" }}
                          onClick={() => {
                            if (
                              val?.status == "Inactive" ||
                              val?.status == "Active"
                            ) {
                              showWarningToast(
                                "Already received request from this user"
                              );
                            } else {
                              // if (val?.status == null) {
                              userData[0] = val;
                              setFormDetails();
                              setShowAddForm(true);
                              // }
                            }
                          }}
                        >
                          <Image
                            src={val?.file_path || userImage}
                            alt={val?.file_name || "user-icon"}
                            width={300}
                            height={300}
                            className="avatar useravatar"
                          />
                          <div
                            className="searchOption"
                            style={{ height: "35px" }}
                          >
                            <span className="pt_user">
                              {val.first_name} {val.last_name}
                            </span>
                            <span
                              className="pt_email"
                              style={{ height: "16px" }}
                            >
                              {val.email_id}{" "}
                              {val.msg && (
                                <span
                                  className={
                                    val?.status == "Inactive" ||
                                    val?.status == "Active"
                                      ? "successText"
                                      : "infoText"
                                  }
                                >
                                  ({val.msg})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pt_nomatch">
                      {!searchInProgress &&
                        userData?.length == 0 &&
                        search?.length >= 4 && (
                          <p>No matching user found. You can add a new user.</p>
                        )}
                      <button
                        className="secondary"
                        style={{ width: "100%" }}
                        onClick={() => setShowAddForm(true)}
                      >
                        Add new user
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAddForm && (
          <div className="pt_smallbgimage">
            <div className="pt_centered">
              <div className="pt_centeredinner">
                <div className="pt_box_transparent_cp">
                  <div className="grid">
                    <div className="pt_login">
                      <h4>{isEdit ? "Edit user" : "Add user"}</h4>
                      <br />
                      <form onSubmit={formik.handleSubmit}>
                        <FormikControl
                          control={InputType.TEXT_FIELD}
                          label={"First name"}
                          name={"FirstName"}
                          placeholder=""
                          error={formik.errors.FirstName as string}
                          showError={
                            formik.touched.FirstName && formik.errors.FirstName
                          }
                          required
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          value={formik.values.FirstName}
                          disabled={
                            isEdit || userValues?.firstName ? true : false
                          }
                        />
                        <br />
                        <FormikControl
                          control={InputType.TEXT_FIELD}
                          label={"Last name"}
                          name={"LastName"}
                          placeholder=""
                          error={formik.errors.LastName}
                          showError={
                            formik.touched.LastName && formik.errors.LastName
                          }
                          required
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          value={formik.values.LastName}
                          disabled={
                            isEdit || userValues?.lastName ? true : false
                          }
                        />
                        <br />
                        <FormikControl
                          control={InputType.TEXT_FIELD}
                          label={"Email"}
                          name={"Email"}
                          placeholder=""
                          error={formik.errors.Email}
                          showError={
                            formik.touched.Email && formik.errors.Email
                          }
                          required
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          value={formik.values.Email}
                          disabled={isEdit || userValues?.email ? true : false}
                        />
                        <br />
                        <FormikControl
                          placeholder={"User type"}
                          required
                          label={"User type"}
                          name={"UserType"}
                          control={InputType.SELECT}
                          renderKey="label"
                          options={options}
                          valueKey="value"
                          disabled={false}
                          error={formik.errors.UserType}
                          showError={
                            formik.touched.UserType && formik.errors.UserType
                          }
                          value={formik.values?.UserType}
                          onBlur={formik.handleBlur("Status")}
                          onChange={(option: {
                            value: string | React.ChangeEvent<any>;
                          }) => {
                            formik.handleChange("UserType")(option.value);
                            setSingleSelectedData(option);
                            option.value != "STANDARD USER" &&
                              resetRadioOption();
                          }}
                          returnSelectedObject
                        />
                        {formik.values.UserType === "STANDARD USER" && (
                          <>
                            {" "}
                            <br />
                            <FormikControl
                              control={InputType.RADIO_BUTTON}
                              label="Do you want this user to add,edit and remove
                              users?"
                              name={"users"}
                              options={standardUserRadioOption}
                              selectedValue={manageUser}
                              onChange={(e: any) =>
                                setManageUser(e?.target?.value)
                              }
                            />{" "}
                            <br />
                            <FormikControl
                              control={InputType.RADIO_BUTTON}
                              label="Do you want this user to edit business info?"
                              name={"company"}
                              options={standardUserRadioOtherOption}
                              selectedValue={manageCompany}
                              onChange={(e: any) =>
                                setManageCompany(e?.target?.value)
                              }
                            />{" "}
                            <br />
                            <FormikControl
                              control={InputType.RADIO_BUTTON}
                              label="Do you want this user to manage subscriptions?"
                              name={"subscriptions"}
                              options={standardUserRadioOption}
                              selectedValue={manageSubscription}
                              onChange={(e: any) =>
                                setManageSubscription(e?.target?.value)
                              }
                            />{" "}
                            <br />
                            <FormikControl
                              control={InputType.RADIO_BUTTON}
                              label="Do you want this user to manage project, trust and
                              payments?"
                              name={"payments"}
                              options={standardUserRadioOption}
                              selectedValue={manageProjectTrustPayment}
                              onChange={(e: any) =>
                                setManageProjectTrustPayment(e?.target?.value)
                              }
                            />
                          </>
                        )}
                        <br />
                        <div className="grid" style={{ marginTop: "2 rem" }}>
                          <input
                            type="button"
                            value="Cancel"
                            className="outline contrast"
                            onClick={() => {
                              showInfoToast("No changes saved");
                              router.push("/user/company/user-access");
                            }}
                            disabled={isLoading}
                          />
                          <input
                            type="submit"
                            value={isEdit ? "Update" : "Save"}
                            className="secondary"
                            disabled={isLoading}
                          />
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddEditUsers;
