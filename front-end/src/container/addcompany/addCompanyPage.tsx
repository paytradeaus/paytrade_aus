"use client";

import React, { useState, useEffect } from "react";
import { Row, Col, Form, Container } from "react-bootstrap";
import styles from "./addCompanyPage.module.scss";
import TextField from "@/components/TextField/textField";
import FormButton from "@/components/Button/button";
import {
  BuildingAdd,
  ExclamationTriangleFill,
  XCircle,
} from "react-bootstrap-icons";
import { useFormik } from "formik";
import * as Yup from "yup";
import Overlays from "@/components/Overlayes/Overlayes";
import { checkCompanyExistence } from "../../app/api/CompanyRegistrationServices"; // Import your service function
import { useRouter } from "next/navigation";
import {
  setAddTrustRecord,
  setBusinessInfo,
  setBusinessProfile,
  setSearchName,
} from "@/redux/slices/companyRegistrationDetails";
import { useDispatch } from "react-redux";

interface Company {
  abn_number: string;
  accounting_system: number;
  acn_number: string;
  cis_rate: null | any; // Replace 'any' with the actual type if needed
  company_address: string;
  company_email_id: string;
  company_id: number;
  company_name: string;
  company_number: string;
  company_phone_no: string;
  country: string;
  entity_type: string;
  id: string;
  is_verified: boolean;
  latitude: string;
  legal_company_name: string;
  longitude: string;
  place_id: string;
  qbcc_number: string;
  region: string;
  tfn_number: string;
  utr_number: string;
  vat_number: string;
  __typename: string;
}

const validationSchema = Yup.object().shape({
  Search: Yup.string().required("Search cannot be empty"),
});

const AddCompanyPage = () => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [timekey, setTimekey] = useState(0);
  const [matchedCompanies, setMatchedCompanies] = useState<Company[]>([]);
  // const [matchedCompanyName, setMatchedCompanyName] = useState<any>();
  const [matchedCompanyName, setMatchedCompanyName] = useState<string>("");

  const router = useRouter();

  // Other code...

  const dispatch = useDispatch();

  const handleOverlayOptionClick = async (data: {
    id: string;
    option: string;
    entityType: string;
    address: string;
    name: string;
    businessName: string;
  }) => {
    const { id, option } = data;
    if (option === "Add New") {
      dispatch(setBusinessProfile({}));
      dispatch(setAddTrustRecord([]));

      router.push("/user/add-business");
    }
    if (option === "companyName") {
      const selectedCompanyId = data.id;
      localStorage.setItem("companyId", selectedCompanyId);
      router.push("/user/view-business");
      const selectedData = {
        type: data?.entityType,
        address: data?.address,
        name: data?.name,
        businessName: data?.businessName,
        companyId: data?.id,
      };
      dispatch(setBusinessInfo(selectedData));
    }
    // Handle what happens when the user clicks on a company in the overlay
    setShowOverlay(false);
  };

  const handleCancelClick = () => {
    router.push("/user/dashboard"); // Send the user back to the previous page
  };

  const navigateToAddBusiness = () => {
    dispatch(setBusinessProfile({}));
    dispatch(setAddTrustRecord([]));
    router.push("/user/add-business");
  };

  const formik = useFormik({
    initialValues: {
      Search: "",
    },
    validationSchema,
    onSubmit: (values) => {
      console.log(values);
    },
  });

  useEffect(() => {
    const fetchMatchedCompanies = async () => {
      if (formik.values.Search.length > 1) {
        try {
          const companiesData = await checkCompanyExistence(
            formik.values.Search
          );
          if (companiesData?.length >= 0) {
            setMatchedCompanies(companiesData);
            setShowOverlay(true);
            setMatchedCompanyName(companiesData[0]?.company_name);
            setTimekey(new Date().getTime());
          } else {
            setShowOverlay(false);
            setMatchedCompanies([]);
            setMatchedCompanyName("");
          }
        } catch (error) {
          console.error("Error fetching matched companies:", error);
          // Handle the error appropriately, e.g., show an error message
        }
      } else {
        setShowOverlay(false);
        setMatchedCompanies([]);
        setMatchedCompanyName("");
      }
      dispatch(setSearchName(formik.values.Search)); // Added line
    };

    fetchMatchedCompanies();
  }, [formik.values.Search, dispatch]);

  return (
    <div>
      <Container fluid>
        <Row>
          <Col className={styles.signInForm}>
            <Form className={styles.formStyles} onSubmit={formik.handleSubmit}>
              <BuildingAdd className={styles.AddCompanyIconStyles} />
              <h5 className={styles.title}>Add Business</h5>

              <div className={styles.textFieldStyles}>
                <TextField
                  type="text"
                  placeholder="Search"
                  name="Search"
                  id="Search"
                  autoComplete="off"
                  value={formik.values.Search}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  endingDataStyles={styles.endIconStyle}
                  className={
                    formik.touched.Search && formik.errors.Search
                      ? `${styles.inputFieldControl} ${styles.inputError}`
                      : styles.inputFieldControl
                  }
                />
                {formik.touched.Search && formik.errors.Search ? (
                  <div className={styles.errorText}>
                    <ExclamationTriangleFill className={styles.icon} />
                    {formik.errors.Search}
                  </div>
                ) : null}
              </div>
              <Overlays
                key={timekey}
                trigger="click"
                placement="bottom"
                popoverTypes="addcompany"
                show={showOverlay}
                optionClick={handleOverlayOptionClick}
                popoverOptions={matchedCompanies}
                // popoverOptions={[
                //   {
                //     heading: "Matched Companies",
                //     elements:
                //       matchedCompanies?.length > 0
                //         ? matchedCompanies.map((company) => (
                //             <div
                //               key={company.id}
                //               onClick={() => handleOverlayOptionClick(company)}
                //             >
                //               {company.company_name}
                //             </div>
                //           ))
                //         : [<span key="no-matches">No matches found</span>],
                //     companyName: matchedCompanyName,
                //   },
                // ]}
                popperConfig={{
                  modifiers: [
                    {
                      name: "offset",
                      options: {
                        offset: [20, 0], // Adjust the offset as needed
                      },
                    },
                  ],
                }}
                overlay={<span></span>}
              >
                {() => null}
              </Overlays>
              <FormButton
                className={styles.PreviousButtonStyles}
                type="button"
                onClick={handleCancelClick}
                textPlainBtn
              >
                Cancel
              </FormButton>
            </Form>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default AddCompanyPage;
