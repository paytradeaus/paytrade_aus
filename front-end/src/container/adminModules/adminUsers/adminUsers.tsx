"use client";
import React, { useCallback, useEffect, useState } from "react";
import Overlays from "@/components/Overlayes/Overlayes";
import { ThreeDots } from "react-bootstrap-icons";
import FormButton from "@/components/Button/button";
import styles from "./adminUsers.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import { ApplicationURLS } from "@/common/applicationURLS";
import { RowsPerPageInTable } from "@/common/constants";
import { AppModal } from "@/components/model/model";
import { useTokenDetails } from "@/common/commonHooks";
import { SUPER_ADMIN_ROLE } from "@/common/constants/roles";
import {
  clearALLCookies,
  convertJsonToExcel,
  formatDate,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import { ResetAdminPassword, ListAllAdminsUsers } from "./adminUsers.functions";
import { DD_MM_YYYY, stripHtml } from "@/common/constants/general";
import { AdminUserData } from "./adminUsers.types";
import { UpdateAdminDetails } from "../addAdminUser/addAdminUser.functions";
import debounce from "lodash/debounce";
import CustomSubHeader from "./adminUserCustomHeader";

const AdminUsers = () => {
  const options = [
    { value: "", label: "All" },
    { value: "Active", label: "Active" },
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
  const [userData, setUserData] = useState<AdminUserData[]>([]);
  const [search, setSearch] = useState("");
  const [singleSelectedData, setSingleSelectedData] = useState();
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);

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
    const adminUserList = await ListAllAdminsUsers(
      {
        page: page,
        perPage: rowsPerPage,
        keyWord: search,
        status: selectedValue,
      },
      setLoading
    );
    setUserData(adminUserList?.admins || []);
    setTotalRows(adminUserList?.totalCount || 0);
    setPerPage(rowsPerPage);
    let printDataObjCreation = adminUserList?.admins?.map((user: any) => {
      return {
        first_name: user?.first_name,
        last_name: user?.last_name,
        email_id: user?.email_id,
        admin_role: user?.admin_role,
        admin_status: user?.admin_status,
        created_on: user?.created_on
          ? formatDate(user?.created_on, DD_MM_YYYY)
          : "N/A",
      };
    });

    setPrintDocumentData(printDataObjCreation);
  };
  function downloadExcel() {
    const columnNames = [
      { value: "first_name", label: "First Name" },
      { value: "last_name", label: "Last Name" },
      { value: "email_id", label: "Email ID" },
      { value: "admin_role", label: "Admin Role" },
      { value: "admin_status", label: "Admin Status" },
      { value: "created_on", label: "Created On" },
    ];
    convertJsonToExcel(printDocumentData, "admin users list", columnNames);
  }

  const handleSelectChange = (selectedValue: any) => {
    setSingleSelectedData(selectedValue);
    setSelectedValue(selectedValue.value);
    // Perform any other actions based on the selected value
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
      router.push(`${ApplicationURLS.ADMIN_USER_EDIT}/${id}`);
    }
    if (option === "Make Super Admin") {
      setOpenModal(!openModal);
      setPopupMessage((prev) => ({
        headerMsg: "Do you wish to make this user a super admin?",
        subHeaderMsg:
          "While you do this remember your profile permission will be changed to that of an admin user.",
      }));
    }
    if (option === "Reset") {
      setOpenModal(!openModal);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg: "Do you wish to Reset password?",
      }));
      setOpenModal(!openModal);
    }
  };
  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData?.map((user: any) => [
      user.first_name,
      user.last_name,
      user.email_id,
      user.admin_role,
      user.admin_status,
      user?.created_on,
    ]);
    let headerNames: string[] = [
      "First Name",
      "Last Name",
      "Email ID",
      "Admin Role",
      "Admin Status",
      "Created On",
    ];
    generateAndPrintPDF(formatedTableData, headerNames, "admin-users");
  };

  const handleModalPopUpFunction = async () => {
    setOpenModal(!openModal);
    if (actionData.option === "Delete") {
      let payload = {
        admin_status: "Deleted",
        id: actionData?.id,
      };
      let response = await UpdateAdminDetails(
        payload,
        "User has been deleted."
      );
      if (response) {
        await getListAllAdminUsers(page, perPage);
      }
    }
    if (actionData.option === "Make Super Admin") {
      let payload = {
        admin_role: SUPER_ADMIN_ROLE,
        id: actionData?.id,
      };
      let response = await UpdateAdminDetails(
        payload,
        "User Role has been changed to Super Admin."
      );
      if (response) {
        clearALLCookies();
        router.push(ApplicationURLS.ADMIN_LOGIN);
      }
    }
    if (actionData.option === "Reset") {
      let payload = {
        id: actionData?.id,
      };
      let response = await ResetAdminPassword(
        payload,
        "Reset password link has been sent to the user."
      );
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
      grow: true,
      wrap: true,
      minWidth: "200px",
      selector: (row: AdminUserData) =>
        row?.first_name
          ? `${row.first_name} ${row?.last_name || ""}`
          : row?.last_name || "",
    },
    {
      name: "Email",
      minWidth: "200px",
      selector: (row: AdminUserData) => row?.email_id,
      wrap: true,
      fixed: "left",
    },
    {
      name: "User Type",
      selector: (row: AdminUserData) => row?.admin_role,
      wrap: true,
      fixed: "left",
    },
    {
      name: "Status",
      selector: (row: AdminUserData) => row?.admin_status,
      fixed: "right",
      grow: true,
    },
    {
      name: "Date Added",
      fixed: "right",
      maxWidth: "110px",
      selector: (row: AdminUserData) =>
        row?.created_on ? formatDate(row?.created_on, DD_MM_YYYY) : "N/A",
    },

    ...(decodeTokenData?.role === SUPER_ADMIN_ROLE
      ? [
          {
            name: "Actions",
            fixed: "right",
            grow: true,
            center: true,
            cell: (row: AdminUserData, index: number) => (
              <Overlays
                trigger="click"
                placement={"auto"}
                overlay={<span></span>}
                popoverTypes={"tableActions"}
                popoverActions={[
                  ...(row?.admin_role !== "Super Admin"
                    ? [{ label: "Make Super Admin", value: "Make Super Admin" }]
                    : []),
                  { label: "Edit", value: "Edit" },
                  { label: "Reset Password", value: "Reset" },
                  { label: "Delete", value: "Delete", isDelete: true },
                ]}
                optionClick={(data) => handleOptionClick(data)}
                cellData={{
                  id: row.id,
                  name: row?.first_name
                    ? `${row.first_name} ${row?.last_name || ""}`
                    : row?.last_name || "",
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

  const handleRowView = (id: any) => {
    router.push(`${ApplicationURLS.ADMIN_USER_EDIT}/${id}`);
  };

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
            href: "",
            label: "Admin Users",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Manage Admin Users</span>

        <FormButton
          className={styles.buttonStyles}
          onClick={() => router.push(ApplicationURLS.ADMIN_USER_ADD)}
        >
          + Add Admin User
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
            printDocumentData={printDocumentData}
            handlePrintPDF={handlePrintPDF}
            downloadExcel={downloadExcel}
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

export default AdminUsers;
