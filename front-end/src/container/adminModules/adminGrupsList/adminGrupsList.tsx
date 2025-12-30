"use client";
import React, { useCallback, useEffect, useState } from "react";
import { ThreeDots } from "react-bootstrap-icons";
import FormButton from "@/components/Button/button";
import styles from "./adminGrupsList.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import { IGroupsData, listAllGroups } from "@/app/api/adminAPIs/adminAPIs";
import { RowsPerPageInTable } from "@/common/constants";
import ReusableDataTable from "@/components/DataTable/dataTable";
import { ApplicationURLS } from "@/common/applicationURLS";
import Overlays from "@/components/Overlayes/Overlayes";
import { AppModal } from "@/components/model/model";
import { DD_MM_YYYY } from "@/common/constants/general";
import {
  convertJsonToExcel,
  formatDate,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import { UpdateGroupDetails } from "../addGroups/addGroups.functions";
import debounce from "lodash/debounce";
import CustomSubHeader from "./groupCustomHeader";

const AdminGroups = () => {
  const options = [
    { value: "", label: "All" },
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "In Active" },
  ];
  const routePath = usePathname();
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);

  const [groupData, setGroupData] = useState<IGroupsData[]>([]);
  const [search, setSearch] = useState("");
  const [singleSelectedData, setSingleSelectedData] = useState();
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
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
    getListAllGroups(page, perPage);
  }, [debouncedSearch, selectedValue]);

  const getListAllGroups = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    const adminGroupsList = await listAllGroups(
      {
        page: page || null,
        perPage: rowsPerPage || null,
        keyword: search || null,
        status: selectedValue || null,
      },
      setLoading
    );
    const responseData = JSON.parse(JSON.stringify(adminGroupsList));
    setGroupData(responseData?.groups || []);
    setTotalRows(responseData?.totalCount || 0);
    setPerPage(rowsPerPage);
    let printDataObjCreation = responseData?.groups?.map((group: any) => {
      return {
        group_name: group?.group_name,
        group_description: group?.group_description,
        group_status: group?.group_status,
        created_on: group?.created_on
          ? formatDate(group?.created_on, DD_MM_YYYY)
          : "N/A",
      };
    });

    setPrintDocumentData(printDataObjCreation);
  };

  const handleOptionClick = async (data: { id: string; option: string }) => {
    const { id, option } = data;

    setActionData(data);
    if (option === "Delete") {
      setOpenModal(!openModal);
    }
    if (option === "Edit") {
      router.push(`${ApplicationURLS.GROUPS_EDIT}/${id}`);
    }
  };

  const handleDeleteFunction = async () => {
    setOpenModal(!openModal);
    let payload = {
      group_status: "Deleted",
      id: actionData?.id,
    };
    let response = await UpdateGroupDetails(
      payload,
      "This group has been deleted."
    );
    if (response) {
      await getListAllGroups(page, perPage);
    }
  };

  const handleRowView = (id: any) => {
    router.push(`${ApplicationURLS.GROUPS_EDIT}/${id}`);
  };

  const onInputChange = useCallback((e: { target: { value: string } }) => {
    const inputvalue = e.target.value?.trim()
      ? e.target.value
      : e.target.value?.trim();
    setSearch(inputvalue);
  }, []);

  const handlePageChange = async (page: number) => {
    setPage(page);
    await getListAllGroups(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await getListAllGroups(page, newPerPage);
  };
  const handleSelectChange = (selectedValue: any) => {
    setSingleSelectedData(selectedValue);
    setSelectedValue(selectedValue.value);
    // Perform any other actions based on the selected value
  };
  function downloadExcel() {
    const columnNames = [
      { value: "group_name", label: "Group Name" },
      { value: "group_description", label: "Group Description" },
      { value: "group_status", label: "Group Status" },
      { value: "created_on", label: "Created On" },
    ];
    convertJsonToExcel(printDocumentData, "admin Group list", columnNames);
  }
  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData.map((group: any) => [
      group.group_name,
      group.group_description,
      group.group_status,
      group?.created_on,
    ]);
    let headerNames: string[] = [
      "Group Name",
      "Group Description",
      "Group Status",
      "Created On",
    ];
    generateAndPrintPDF(formatedTableData, headerNames, "admin-groups");
  };

  const columns = [
    {
      name: "Name",
      selector: (row: IGroupsData) => row?.group_name,
      minWidth: "200px",
      fixed: "left",
      grow: true,
      wrap: true,
    },

    {
      name: "Description",
      selector: (row: IGroupsData) => row?.group_description,
      wrap: true,
      minWidth: "200px",
      fixed: "left",
    },
    {
      name: "Status",
      fixed: "right",
      grow: true,
      selector: (row: IGroupsData) => row?.group_status,
    },
    {
      name: "Date Added",
      fixed: "right",
      maxWidth: "110px",
      selector: (row: IGroupsData) =>
        row?.created_on ? formatDate(row?.created_on, DD_MM_YYYY) : "N/A",
    },
    {
      name: "Actions",
      fixed: "right",
      grow: true,
      center: true,
      cell: (row: IGroupsData, index: number) => (
        <Overlays
          trigger="click"
          placement={"auto"}
          // placement={
          //   groupData?.length > 3 && groupData?.length == index + 1
          //     ? "top-end"
          //     : "bottom-end"
          // }
          overlay={<span></span>}
          popoverTypes={"tableActions"}
          popoverActions={[
            { label: "Edit", value: "Edit" },
            { label: "Delete", value: "Delete", isDelete: true },
          ]}
          customPopupstyles={styles.customPopupstyles}
          optionClick={(data) => handleOptionClick(data)}
          cellData={{ id: row.id, name: row?.group_name }}
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
  ];

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
            label: "Groups",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Manage Groups</span>

        <FormButton
          className={styles.buttonStyles}
          onClick={() => router.push(ApplicationURLS.GROUPS_ADD)}
        >
          + Add Group
        </FormButton>
      </div>

      <ReusableDataTable
        columns={columns}
        data={groupData}
        subHeader
        subHeaderComponent={
          <CustomSubHeader
            search={search}
            onInputChange={onInputChange}
            options={options}
            singleSelectedData={singleSelectedData}
            handleSelectChange={handleSelectChange}
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
        secondButtonLabel="Cancel"
        firstButtonLabel="Yes"
        modalHeading=""
        modalBodyTitle=""
        modalBodyContent={`Do you want to Delete ${actionData?.name} Group?`}
        onConfirm={() => handleDeleteFunction()}
      />
    </div>
  );
};

export default AdminGroups;
