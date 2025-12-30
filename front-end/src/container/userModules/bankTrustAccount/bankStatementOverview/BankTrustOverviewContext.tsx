//default imports
"use client";
import { createContext, useState, useContext, useEffect } from "react";
//import from reactstrap components
//import from customized components
//import customized styles
//import from external libraries
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTokenDetails } from "@/common/commonHooks";
import { singleUploadApi } from "@/app/api/commonAPIs";
import moment from "moment";
import { useLoaderContext } from "@/context/useLoader";
import { getCookie } from "cookies-next";
import {
  addBankAccount,
  fetchBankStatementFile,
  updateBankStatement,
} from "../backTrustAccount.functions";
import { useRouter, useSearchParams } from "next/navigation";
import { DD_MM_YYYY, EDIT, VIEW, YYYY_MM_DD } from "@/common/constants/general";
import { setScreenDetails } from "@/redux/slices/dashboardSlices";
import { useDispatch } from "react-redux";
import { removeCommas } from "@/common/commonFunctions";

const BankStatementContext: any = createContext(null);

const validationSchema = Yup.object().shape({
  account_name: Yup.object().required("Account name is required"),

  statement_date: Yup.date()
    .required("Statement date is required")
    .test("statement date", function (value, formData: any) {
      const is_statement_exist = formData.parent.is_statement_exist;
      if (!value) return true; // Handle empty email
      if (is_statement_exist) {
        return formData.createError({
          path: formData.path,
          message: "Selected bank statement date already exist",
        });
      }
      return true;
    }),

  bank_statement_balance: Yup.string().required(
    "Bank statement balance is required"
  ),
  statement_file: Yup.array()
    .min(1, "Upload is required")
    .required("Upload is required"),
});

export const BankStatementContextProvider = ({ children }: any) => {
  //other Hooks
  const dispatch = useDispatch();
  const { setLoader }: any = useLoaderContext();
  const { accessTokenId, decodeTokenData } = useTokenDetails();

  const router = useRouter();
  const queryParams = useSearchParams();
  const companyId = queryParams.get("company");
  const bankId = queryParams.get("bank");
  const accountId = queryParams.get("account");
  const screenType = queryParams.get("screen");
  const statementId = queryParams.get("statement");

  //useState and useEffect Management
  const [selectedFile, setSelectedFile] = useState<File | null | any>(null);
  const [displayUploadContract, setDisplayUploadContract] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  const [removedFile, setRemovedFile] = useState<File | null>(null);
  const [isViewMode, setIsViewMode] = useState(screenType === VIEW);

  useEffect(() => {
    if (screenType === EDIT || screenType === VIEW) {
      getStatementFile();
    }
  }, []);

  const bankStatementFormik: any = useFormik({
    initialValues: {
      account_name: "",
      statement_date: "",
      is_statement_exist: false,
      bank_statement_balance: "",
      statement_file: "",
    },
    validationSchema,
    onSubmit: () => handleFormSubmit(),
  });

  //functions

  async function handleFormSubmit() {
    const { values } = bankStatementFormik;

    try {
      setLoader(true);
      let fileResponse = null;
      if (screenType === "add" || !!removedFile) {
        const filePostData: any = {
          uploaded_by: decodeTokenData?.emailId,
          attachment_type: "Bank_statements",
        };

        fileResponse = await singleUploadApi(
          modifiedFileName(),
          filePostData,
          accessTokenId
        );
      }
      const paymentValues = removeCommas(values?.bank_statement_balance);
      const onlyValues = paymentValues.replace(/[^0-9.]/g, "");

      const commonPayload = {
        statement_date: values?.statement_date
          ? moment(values?.statement_date).format(YYYY_MM_DD)
          : "",
        bank_statement_balance: onlyValues ? Number(onlyValues) : 0,
        bank_statement_name: values?.statement_file[0]?.name
          ? `${values.account_name.label}-${
              values?.statement_file[0]?.name
            }-${moment().month()}-${moment().year()}`
          : formData?.bank_statement_name,
      };

      const addPostData: any = {
        payload: {
          company_id: Number(getCookie("companyId")) || null,
          bank_account_id: values?.account_name?.value,
          bank_statement_attachment_id:
            fileResponse?.id || formData?.bank_statement_id,
          financial_institution: "",
          ...commonPayload,
        },
      };
      const updatePostData: any = {
        payload: {
          bank_statement_attachment_id:
            fileResponse?.id || formData?.bank_statement_attachment_id,
          bank_statement_id: statementId ? Number(statementId) : "",
          ...commonPayload,
        },
      };

      const dynamicApi =
        screenType === EDIT
          ? updateBankStatement(updatePostData)
          : addBankAccount(addPostData);
      const bankStatementResponse = await dynamicApi;
      if (bankStatementResponse) {
        dispatch(
          setScreenDetails({
            toScreen: "bankOverView",
            fromScreen: "bank Statement",
            mainActiveTab: "bank-statements",
            selectTab: "",
            subSelectTab: "",
          })
        );
        router.back();
      }
      setLoader(false);
    } catch (err) {
      setLoader(false);
    }
  }

  function modifiedFileName() {
    const { values }: any = bankStatementFormik;

    const fileType = values?.statement_file[0]?.type;
    const fileExtension = fileType.slice(fileType.lastIndexOf("/") + 1);

    const fileName = `${values.account_name.label}-statement-${
      moment().month() + 1
    }-${moment().year()}.${fileExtension}`;

    const renamedFile = new File([values?.statement_file[0]], fileName, {
      type: values?.statement_file[0].type,
    });

    return renamedFile;
  }

  async function getStatementFile() {
    const postData = {
      payload: {
        data: {
          bank_statement_id: statementId ? Number(statementId) : null,
        },
        fileAttachmentOrDocumentType: "Bank statement",
      },
    };

    const response = await fetchBankStatementFile(postData);
    if (response?.length > 0) {
      setSelectedFile(response[0]);
      bankStatementFormik?.setFieldValue("statement_file", response);
    } else {
      selectedFile("");
    }
  }

  //render Template
  return (
    <BankStatementContext.Provider
      value={{
        selectedFile,
        setSelectedFile,
        bankStatementFormik,
        displayUploadContract,
        setDisplayUploadContract,
        companyId,
        bankId,
        accountId,
        statementId,
        screenType,
        formData,
        setFormData,
        removedFile,
        setRemovedFile,
        isViewMode,
        setIsViewMode,
      }}
    >
      {children}
    </BankStatementContext.Provider>
  );
};

// Create a custom hook for using the global context
const useBankStatementContext = () => {
  const context = useContext(BankStatementContext);
  if (!context) {
    throw new Error("Error in clients/suppliers Context");
  }
  return context;
};

export { useBankStatementContext };
