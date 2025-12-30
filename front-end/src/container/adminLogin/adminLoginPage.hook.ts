import { useCallback, useState } from "react";
import { IAdminLogInData, IErrorData } from "./adminLoginPage.types";
import { useRouter } from "next/navigation";

const useAdminLoginDetails = () => {
  const [logInData, setLogInData] = useState<IAdminLogInData>({
    email: "",
    password: "",
    isChecked: false,
  });

  const [errorData, setErrorData] = useState<IErrorData>({
    email: "",
    password: "",
    isEmailInValid: false,
    isPasswordInValid: false,
  });
  const [isPWDShow, setIsPWDShow] = useState<boolean>(false);
  const router = useRouter();

  const onEmailChange = useCallback((e: { target: { value: string } }) => {
    const email = e.target.value?.trim()
      ? e.target.value
      : e.target.value?.trim();
    setLogInData((pre) => ({ ...pre, email }));
    setErrorData((pre) => ({ ...pre, email: "", isEmailInValid: false }));
  }, []);

  const onPasswordChange = useCallback((e: { target: { value: string } }) => {
    const password = e.target.value?.trim()
      ? e.target.value
      : e.target.value?.trim();
    setLogInData((pre) => ({ ...pre, password }));
    setErrorData((pre) => ({
      ...pre,
      password: "",
      isPasswordInValid: false,
    }));
  }, []);

  const onIsChecked = useCallback((e: { target: { checked: boolean } }) => {
    const isChecked = e.target.checked;
    setLogInData((pre) => ({ ...pre, isChecked }));
  }, []);

  const isValidEmail = (emailId: string) => {
    return /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
      emailId
    );
  };
  const onEndIconLick = () => setIsPWDShow(!isPWDShow);

  const validation = () => {
    let isValid = true;
    if (!logInData?.email) {
      let email = "Please enter a valid email address";
      setErrorData((pre) => ({ ...pre, email, isEmailInValid: true }));
      isValid = false;
    }
    if (logInData?.email && !isValidEmail(logInData.email)) {
      let email = "Invalid email address";
      setErrorData((pre) => ({ ...pre, email, isEmailInValid: true }));
      isValid = false;
    }
    if (!logInData?.password) {
      let password = "Please provide a password";
      setErrorData((pre) => ({ ...pre, password, isPasswordInValid: true }));
      isValid = false;
    }
    if (isValid) {
      setErrorData({
        email: "",
        password: "",
        isEmailInValid: false,
        isPasswordInValid: false,
      });
    }
    return isValid;
  };
  const onHandleSubmit = useCallback(
    (e: { preventDefault: () => void }) => {
      e.preventDefault();
      try {
        if (!validation()) return;
        router?.push("/admin/dashboard");
      } catch (error) {}
    },
    [logInData]
  );
  return {
    logInData,
    errorData,
    onIsChecked,
    onEmailChange,
    onPasswordChange,
    onHandleSubmit,
    isPWDShow,
    onEndIconLick,
  };
};
export default useAdminLoginDetails;
