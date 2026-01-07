"use client";
import React, { useCallback, useEffect, useState } from "react";
import Overlays from "@/components/Overlayes/Overlayes";
import { ThreeDots } from "react-bootstrap-icons";
import FormButton from "@/components/Button/button";
import styles from "./categoriesList.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import { ApplicationURLS } from "@/common/applicationURLS";
import { RowsPerPageInTable } from "@/common/constants";
import { AppModal } from "@/components/model/model";
import { useTokenDetails } from "@/common/commonHooks";
import { SUPER_ADMIN_ROLE } from "@/common/constants/roles";
import {
  AdminListAllMasterTypeDetails,
  AdminfetchAllMasterTypeDetails,
} from "./categoriesList.functions";
import { ICategories } from "./categoriesList.types";
import { AdminUpdateMasterTypeDetails } from "../addCategories/addCategories.functions";
import debounce from "lodash/debounce";
import CustomSubHeader from "./customSubHeader";

const CategoriesList = () => {
  const routePath = usePathname();
  const { decodeTokenData } = useTokenDetails();
  const router = useRouter();
  const [selectedValue, setSelectedValue] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [userData, setUserData] = useState<ICategories[]>([]);
  const [search, setSearch] = useState("");
  const [selectedData, setSingleSelectedData] = useState();
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<any>([]);
  const [categorySelectedData, setCategorySelectedData] = useState<any>();
  const [categoryValue, setCategoryValue] = useState("");
  const resetFilters = () => {
    setSearch(""); // Reset search input
    setSelectedValue(""); // Reset the selected filter value
    setCategorySelectedData(null); // Reset category selection
    setCategoryValue(""); // Reset category filter
  };

  // Check if either the search input or the selected filter has been changed
  const isAnyFilterActive =
    search !== "" || selectedValue !== "" || categoryValue !== "";

  useEffect(() => {
    (async () => {
      const categoryData = await AdminfetchAllMasterTypeDetails();
      if (categoryData?.length > 0) {
        setCategoryOptions([{ value: "", label: "All" }, ...categoryData]);
      }
    })();
  }, []);

  useEffect(() => {
    const delayedSearch = debounce(() => {
      setDebouncedSearch(search);
    }, 500);

    delayedSearch();
    return delayedSearch.cancel; // Cleanup
  }, [search]);

  useEffect(() => {
    getListAllAdminUsers(page, perPage);
  }, [debouncedSearch, selectedValue, categoryValue]);

  const getListAllAdminUsers = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    const financialInstituionList = await AdminListAllMasterTypeDetails(
      {
        page: page,
        perPage: rowsPerPage,
        keyWord: search,
        status: selectedValue,
        masterType: categoryValue || null,
      },
      setLoading
    );
    setUserData(financialInstituionList?.MasterTypeDetails || []);
    setTotalRows(financialInstituionList?.totalCount || 0);
    setPerPage(rowsPerPage);
  };

  const handleSelectChange = (selectedValue: any) => {
    setSingleSelectedData(selectedValue);
    setSelectedValue(selectedValue.value);
  };
  const handleOptionClick = async (data: { id: string; option: string }) => {
    const { id, option } = data;
    if (option === "Edit") {
      router.push(`${ApplicationURLS.ADMIN_MASTER_CATEGORIES_EDIT}/${id}`);
    }
  };
  const handleRowView = (id: any) => {
    router.push(`${ApplicationURLS.ADMIN_MASTER_CATEGORIES_EDIT}/${id}`);
  };

  const handleCategoryChange = (selectedValue: any) => {
    setCategorySelectedData(selectedValue);
    if (selectedValue.label === "All") {
      setCategoryValue(selectedValue.value);
    } else {
      setCategoryValue(selectedValue.label);
    }
    // Perform any other actions based on the selected value
  };
  const handleModalPopUpFunction = async () => {
    setOpenModal(!openModal);
    if (actionData.option === "Delete") {
      let payload = {
        admin_status: "Deleted",
        id: actionData?.id,
      };
      let response = await AdminUpdateMasterTypeDetails(
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
      name: "Master Type",
      wrap: true,
      minWidth: "200px",
      selector: (row: ICategories) => row?.master_type || "",
    },
    {
      name: "Value",
      selector: (row: ICategories) => row?.value,
      grow: 1,
      wrap: true,
    },

    {
      name: "Description",
      selector: (row: ICategories) => row?.description,
      wrap: true,
      minWidth: "500px",
      fixed: "left",
    },

    ...(decodeTokenData?.role === SUPER_ADMIN_ROLE
      ? [
          {
            name: "Action",
            fixed: "right",
            grow: true,
            center: true,
            cell: (row: ICategories, index: number) => (
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
            href: "",
            label: "Masters",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Masters</span>

        <FormButton
          className={styles.buttonStyles}
          onClick={() =>
            router.push(ApplicationURLS.ADMIN_MASTER_CATEGORIES_ADD)
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
            categoryOptions={categoryOptions}
            handleCategoryChange={handleCategoryChange}
            categorySelectedData={categorySelectedData}
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

export default CategoriesList;
