"use client";
import React, { useCallback, useEffect, useState } from "react";
import Overlays from "@/components/Overlayes/Overlayes";
import { ThreeDots } from "react-bootstrap-icons";
import FormButton from "@/components/Button/button";
import styles from "./financialInstitutionList.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import { ApplicationURLS } from "@/common/applicationURLS";
import { RowsPerPageInTable } from "@/common/constants";
import { AppModal } from "@/components/model/model";
import { useTokenDetails } from "@/common/commonHooks";
import { SUPER_ADMIN_ROLE } from "@/common/constants/roles";
import { formatDate } from "@/common/commonFunctions";
import { AdminlistAllFinancialInstituion } from "./financialInstitutionList.functions";
import { DD_MM_YYYY, stripHtml } from "@/common/constants/general";
import { BankAccount } from "./financialInstitutionList.types";
import { AdminUpdateFinancialInstitutionDetails } from "../addFinancialInstitution/addFinancialInstitution.functions";
import debounce from "lodash/debounce";
import CustomSubHeader from "./customSubHeader";

const FinancialInstitutionList = () => {
  const options = [
    { value: "", label: "All" },
    { value: "Active", label: "Active" },
    { value: "Archived", label: "Archived" },
    { value: "Blocked", label: "Blocked" },
    { value: "Inactive", label: "In Active" },
  ];
  const routePath = usePathname();
  const { decodeTokenData } = useTokenDetails();
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [userData, setUserData] = useState<BankAccount[]>([]);
  const [search, setSearch] = useState("");
  const [selectedData, setSingleSelectedData] = useState<any>();
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const resetFilters = () => {
    setSearch(""); // Reset search input
    setSelectedValue(""); // Reset selected filter value
    // setCategorySelectedData(null); // Reset selected category data
    // setCategoryValue(""); // Reset category filter
    setPage(1); // Optionally reset to first page
  };

  const isAnyFilterActive = search !== "" || selectedValue !== "";
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const delayedSearch = debounce(() => {
      setDebouncedSearch(search);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel; // Cleanup
  }, [search]);

  useEffect(() => {
    getListAllAdminUsers(page, perPage);
  }, [debouncedSearch, selectedValue]);

  const getListAllAdminUsers = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    const financialInstituionList = await AdminlistAllFinancialInstituion(
      {
        page: page,
        perPage: rowsPerPage,
        keyword: search,
        status: selectedValue,
      },
      setLoading
    );
    setUserData(financialInstituionList?.institutions || []);
    setTotalRows(financialInstituionList?.totalCount || 0);
    setPerPage(rowsPerPage);
  };

  const handleSelectChange = (selectedValue: any) => {
    setSingleSelectedData(selectedValue);
    setSelectedValue(selectedValue.value);
  };
  const handleOptionClick = async (data: { id: string; option: string }) => {
    const { id, option } = data;
    setActionData(data);
    if (option === "Delete") {
      setOpenModal(!openModal);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg: "Are you sure you wish to delete access for this user?",
      }));
    }
    if (option === "Edit") {
      router.push(`${ApplicationURLS.ADMIN_FINANCIAL_INSTITUTE_EDIT}/${id}`);
    }
  };

  const handleRowView = (id: any) => {
    router.push(`${ApplicationURLS.ADMIN_FINANCIAL_INSTITUTE_EDIT}/${id}`);
  };

  const handleModalPopUpFunction = async () => {
    setOpenModal(!openModal);
    if (actionData.option === "Delete") {
      let payload = {
        admin_status: "Deleted",
        id: actionData?.id,
      };
      let response = await AdminUpdateFinancialInstitutionDetails(
        payload,
        "User has been deleted."
      );
      if (response) {
        await getListAllAdminUsers(page, perPage);
      }
    }
  };
  const handlePageChange = async (page: number) => {
    setPage(page);
    await getListAllAdminUsers(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await getListAllAdminUsers(page, newPerPage);
  };
  const columns = [
    {
      name: "Name",
      // grow: true,
      wrap: true,
      minWidth: "200px",
      selector: (row: BankAccount) => row?.institution_name || "",
    },

    {
      name: "Status",
      selector: (row: BankAccount) => row?.institution_status,
      fixed: "right",
      grow: true,
    },
    {
      name: "Date Added",
      fixed: "right",
      maxWidth: "110px",
      selector: (row: BankAccount) =>
        row?.created_on ? formatDate(row?.created_on, DD_MM_YYYY) : "N/A",
    },

    ...(decodeTokenData?.role === SUPER_ADMIN_ROLE
      ? [
          {
            name: "Action",
            fixed: "right",
            grow: true,
            center: true,
            cell: (row: BankAccount, index: number) => (
              <Overlays
                trigger="click"
                placement={"bottom"}
                overlay={<span></span>}
                popoverTypes={"tableActions"}
                popoverActions={[{ label: "Edit", value: "Edit" }]}
                optionClick={(data) => handleOptionClick(data)}
                cellData={{
                  id: row.id,
                }}
                popperConfig={{
                  modifiers: [
                    {
                      name: "offset",
                      options: {
                        offset: [20, 10], // Adjust the offset as needed
                      },
                    },
                  ],
                }}
              >
                <div style={{ cursor: "pointer" }}>
                  <ThreeDots />
                </div>
              </Overlays>
            ),
          },
        ]
      : []),
  ];

  const onInputChange = useCallback((e: { target: { value: string } }) => {
    const inputvalue = e?.target?.value?.trim()
      ? e?.target?.value
      : e?.target?.value?.trim();
    setSearch(inputvalue);
  }, []);

  return (
    <div className={styles.dataContainer}>
      <ReusableBreadcrumb
        items={[
          {
            href: ApplicationURLS.ADMIN_DASHBOARD,
            label: "Home",
            active: false,
          },
          {
            href: ApplicationURLS.ADMIN_MASTER_CATEGORIES_LIST,
            label: "Masters",
            active: false,
          },
          {
            href: "",
            label: "Financial Institution",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Financial Institution</span>

        <FormButton
          className={styles.buttonStyles}
          onClick={() =>
            router.push(ApplicationURLS.ADMIN_FINANCIAL_INSTITUTE_ADD)
          }
        >
          + Add
        </FormButton>
      </div>
      <ReusableDataTable
        columns={columns}
        data={userData}
        subHeader
        subHeaderComponent={
          <CustomSubHeader
            search={search}
            onInputChange={onInputChange}
            options={options}
            handleSelectChange={handleSelectChange}
            selectedData={singleSelectedData}
            resetFilters={resetFilters} // Pass reset function to child
            isAnyFilterActive={isAnyFilterActive} // Pass filter active state to child
          />
        }
        pagination
        progressPending={loading}
        paginationServer
        paginationTotalRows={totalRows}
        onChangeRowsPerPage={handlePerRowsChange}
        onChangePage={handlePageChange}
        onRowClicked={(data: any) => handleRowView(data?.id)}
      />
      <AppModal
        show={openModal}
        onHide={() => setOpenModal(false)}
        secondButtonLabel="No"
        firstButtonLabel="Yes"
        modalHeading={popupMessage?.headerMsg || ""}
        modalBodyContent={popupMessage?.subHeaderMsg || ""}
        onConfirm={() => {
          handleModalPopUpFunction();
        }}
      />
    </div>
  );
};

export default FinancialInstitutionList;
