"use client";
import BaseModal from "@/components/BaseModal";
import FormikControl from "@/components/FormikControl";
import { checkCompanyExistence } from "@/network/existanceAPIsCheck";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { InputType } from "@/shared/constant/general";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { jwtDecode } from "jwt-decode";
import { showSuccessToast } from "@/components/Toaster";
import { requestToJoinCompany } from "@/app/api/companyRegistrationService";
import Image from "next/image";
import userImage from "../../../../public/images/avatar.png";
import { RootState, useAppDispatch, useAppSelector } from "@/redux/store";
import { setUpdatedCompany } from "@/redux/slices/companyDetails";

export default function AddBusinessProfile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const updatedCompany: any = useAppSelector(
    (state: RootState) => state?.companyStore?.updatedcompany
  );

  const [searchedBusiness, setSearchedBusiness] = useState<any>("");

  const [matchedCompanies, setMatchedCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState<any>("");

  const [loader, setLoader]: any = useState(false);
  const [displayModal, setDisplayModal] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [showJoinBusinessError, setShowJoinBusinessError] = useState("");

  async function handleBusinessSearch(searchedValue: string) {
    setSearchValue(searchedValue);
    if (searchedValue.length) {
      try {
        setLoader(true);
        setSearchedBusiness(searchedValue);
        const companiesData = await checkCompanyExistence(searchedValue);
        if (companiesData?.length > 0) {
          const modifiedData = companiesData.map((x: any) => {
            return {
              ...x,
              label: `${x?.company_name} •${" "} ${x?.entity_type} ${
                x?.legal_company_name && "• " + x?.legal_company_name
              }`,
            };
          });

          setMatchedCompanies(modifiedData);
        } else {
          setMatchedCompanies([]);
          setSelectedCompany("");
        }
        setLoader(false);
      } catch (error) {
        setLoader(false);
      }
    } else {
      setMatchedCompanies([]);
      setSelectedCompany("");
    }
  }

  async function joinBusiness() {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      const decodedToken: any = jwtDecode(accessToken);

      // Check if selectedId exists and has a valid id
      if (!selectedCompany?.company_id) {
        setShowJoinBusinessError("Please select a business to join.");
        return; // Exit function early if company_id is not selected
      } else {
        setShowJoinBusinessError("");
      }
      // setLoader(true);
      try {
        const data = {
          user_name: decodedToken["userName"],
          user_id: decodedToken["userId"],
          company_id: selectedCompany?.company_id,
          is_user_exists: true,
          email_id: decodedToken["emailId"],
          user_first_name: decodedToken["userFirstName"],
          manage_user: "No",
          manage_subscription: "No",
          manage_project_trust_payment: "No",
          manage_company: "No",
          company_role: "STANDARD USER",
        };
        // Call requestToJoinCompany when "Join" is clicked
        let apiResponse = await requestToJoinCompany(data);
        if (apiResponse) {
          // Handle success or show toast notification
          showSuccessToast(
            `Join request sent successfully! (${apiResponse}/3)`
          );
          // Close modal

          // Redirect or handle next steps
          dispatch(setUpdatedCompany({ ...updatedCompany }));
          router.push(AppRoutes.USER_DASHBOARD);
          setDisplayModal(false);
        }
        // setLoader(false);
      } catch (error) {
        // Handle errors
        setShowJoinBusinessError("Error occurred while processing the request");
        // setLoader(false);
      }
    }
  }

  return (
    <div className="pt_smallbgimage">
      <div className="pt_centered">
        <div className="pt_centeredinner">
          <div className="pt_box_transparent_cp">
            <div className="pt_login">
              <h3>Add business profile</h3>
              <p>Search for your existing business or add a new one.</p>
              <br />
              <div className="pt_filteroptions">
                <FormikControl
                  control={InputType.SEARCH}
                  onChange={handleBusinessSearch}
                  name={"businessSearch"}
                  value={searchedBusiness}
                  placeholder="Search"
                />
              </div>
              <div className="pt_profilescroll" id="searchprofiles">
                {matchedCompanies?.map((val: any) => (
                  <div
                    className="pt_profilename"
                    key={val?.id}
                    onClick={() => {
                      setSelectedCompany(val);
                      setDisplayModal(true);
                    }}
                    style={{ lineHeight: "unset" }}
                  >
                    <Image
                      src={val?.file_path || userImage}
                      alt={val?.file_name || "user-icon"}
                      width={300}
                      height={300}
                      className="avatar useravatar"
                    />
                    <div className="searchOption">
                      <span className="pt_user">{val.company_name}</span>
                      <span className="pt_email">
                        {val.entity_type}{" "}
                        {val?.legal_company_name &&
                          "• " + val?.legal_company_name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt_nomatch">
                {!loader &&
                  matchedCompanies?.length == 0 &&
                  searchValue?.length >= 4 && (
                    <p>
                      No matching businesses found, you can add a new business
                      profile.
                    </p>
                  )}
                <button
                  className="secondary"
                  style={{ width: "100%" }}
                  onClick={() =>
                    router.push(
                      searchedBusiness
                        ? `${AppRoutes.USER_ADD_BUSINESS_PROFILE}?business-name=${searchedBusiness}`
                        : AppRoutes.USER_ADD_BUSINESS_PROFILE
                    )
                  }
                >
                  Add new business profile
                </button>
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

      {displayModal && (
        <BaseModal
          displayModal={displayModal}
          onClose={() => setDisplayModal(false)}
          firstButtonName="Cancel"
          secondButtonName="Join"
          title="Business Info"
          onConfirm={() => {
            joinBusiness();
            return true;
          }}
        >
          <div
            className="pt_profilename"
            style={{
              height: "80px",
              pointerEvents: "none",
              lineHeight: "unset",
            }}
            key={selectedCompany?.id}
            onClick={() => {
              setSelectedCompany(selectedCompany);
              setDisplayModal(true);
            }}
          >
            <Image
              src={selectedCompany?.file_path || userImage}
              alt={selectedCompany?.file_name || "user-icon"}
              width={300}
              height={300}
              className="avatar useravatar"
            />
            <div className="searchOption" style={{ height: "75px" }}>
              <span className="pt_user">{selectedCompany.company_name}</span>
              {selectedCompany?.legal_company_name && (
                <span
                  className="pt_email"
                  style={{ fontStyle: "italic", color: "#1583d8" }}
                >
                  {selectedCompany?.legal_company_name}
                </span>
              )}
              <span className="pt_email">{selectedCompany.entity_type} </span>
              <span className="pt_email">
                {selectedCompany.company_address}
              </span>
            </div>
          </div>
        </BaseModal>
      )}
    </div>
  );
}
