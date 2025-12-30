"use client";
import React, { useCallback, useEffect, useState } from "react";
import Overlays from "@/components/Overlayes/Overlayes";
import { ThreeDots } from "react-bootstrap-icons";
import styles from "./adminBlog.module.scss";
import ReusableBreadcrumb from "@/components/BreadCrumb/breadCrumb";
import { usePathname, useRouter } from "next/navigation";
import ReusableDataTable from "@/components/DataTable/dataTable";
import {
  convertJsonToExcel,
  formatDate,
  generateAndPrintPDF,
} from "@/common/commonFunctions";
import FormButton from "@/components/Button/button";
import { ApplicationURLS } from "@/common/applicationURLS";
import { RowsPerPageInTable } from "@/common/constants";
import { DD_MM_YYYY, stripHtml } from "@/common/constants/general";
import { AppModal } from "@/components/model/model";
import { BlogResource } from "../blogResource.types";
import {
  AdminfetchAllMasterTypeDetails,
  AdminListAllBlogResAuthors,
  AdminListAllBlogResources,
  AdminUpdateBlogResource,
} from "../blogResource.functions";
import { setCookie } from "cookies-next";
import debounce from "lodash/debounce";
import CustomSubHeader from "./customSubHeader";

const BlogsList = () => {
  const category = [
    { value: "", label: "All" },
    { value: "Uncategorized", label: "Uncategorized" },
    { value: "Business", label: "Business" },
  ];
  const status = [
    { value: "", label: "All" },
    { value: "Draft", label: "Draft" },
    { value: "Published", label: "Published" },
    { value: "Unpublished", label: "Unpublished" },
    // { value: "Deleted", label: "Deleted" },
  ];

  const routePath = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(RowsPerPageInTable);
  const [page, setPage] = useState(1);
  const [blogResourceData, setBlogResourceData] = useState<BlogResource[]>([]);
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [actionData, setActionData] = useState<any>();
  const [popupMessage, setPopupMessage] = useState({
    headerMsg: "",
    subHeaderMsg: "",
  });
  const [statusValue, setStatusValue] = useState<any>(null);
  const [statusSelectedData, setStatusSelectedData] = useState<any>(null);
  const [categoryValue, setCategoryValue] = useState<any>(null);
  const [categorySelectedData, setCategorySelectedData] = useState<any>(null);
  const [printDocumentData, setPrintDocumentData] = useState<any>([]);
  const [categoryOptions, setCategoryOptions] = useState<any>([]);
  const [authorValue, setAuthorValue] = useState<any>(null);
  const [authorSelectedData, setAuthorSelectedData] = useState<any>(null);
  const [authorOptions, setAuthorOptions] = useState<any>([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Reset Filters Function
  const resetFilters = () => {
    setSearch(""); // Reset search input
    setAuthorSelectedData(null);
    setStatusValue(null); // Reset category filter
    setStatusSelectedData(null);
    setCategorySelectedData(null);
    setCategoryValue(null);
    setAuthorValue(null);
    // setPage(1); // Optionally reset to first page
  };

  // Check if any filter is active
  const isAnyFilterActive =
    search !== "" ||
    // authorSelectedData !== null ||
    statusSelectedData !== null ||
    authorValue !== null ||
    categorySelectedData !== null;

  useEffect(() => {
    (async () => {
      const [categoryData, authorsResponse] = await Promise.all([
        AdminfetchAllMasterTypeDetails("Blog Category"),
        AdminListAllBlogResAuthors(),
      ]);
      if (categoryData?.length > 0) {
        setCategoryOptions([{ value: "", label: "All" }, ...categoryData]);
      }
      if (authorsResponse?.length > 0) {
        setAuthorOptions([{ value: "", label: "All" }, ...authorsResponse]);
      }
      // getListAllAdminArticles(1, perPage);
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
    getListAllAdminArticles(page, perPage);
  }, [debouncedSearch, statusValue, categoryValue, authorValue]);

  const getListAllAdminArticles = async (page: number, rowsPerPage: number) => {
    setLoading(true);
    const adminBlogResources = await AdminListAllBlogResources(
      {
        page: page,
        perPage: rowsPerPage,
        keyWord: search,
        status: statusValue,
        category: categoryValue,
        contentType: "Blog",
        author: authorValue,
      },
      setLoading
    );
    setBlogResourceData(adminBlogResources?.blogResources || []);
    setTotalRows(adminBlogResources?.totalCount || 0);
    setPerPage(rowsPerPage);
    let printDataObjCreation = adminBlogResources?.blogResources?.map(
      (user: any) => {
        return {
          authorName: user?.author?.first_name
            ? `${user?.author?.first_name} ${user?.author?.last_name || ""}`
            : user?.author?.last_name || "",
          title: user.title,
          content: stripHtml(user.content), //user.content,
          urlSlug: user.urlSlug,
          blog_status: user.blog_status,
          category: user.category.value,
          published_on: user?.published_on
            ? formatDate(user?.published_on, DD_MM_YYYY)
            : "N/A",
        };
      }
    );

    setPrintDocumentData(printDataObjCreation);
  };

  const handleStatusChange = (selectedValue: any) => {
    setStatusSelectedData(selectedValue);
    setStatusValue(selectedValue.value);
  };
  const handleAuthorChange = (selectedValue: any) => {
    setAuthorSelectedData(selectedValue);
    setAuthorValue(selectedValue.value);
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
  const onInputChange = useCallback((e: { target: { value: string } }) => {
    const inputvalue = e.target.value?.trim()
      ? e.target.value
      : e.target.value?.trim();
    setSearch(inputvalue);
  }, []);

  const handlePageChange = async (page: number) => {
    setPage(page);
    await getListAllAdminArticles(page, perPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    await getListAllAdminArticles(page, newPerPage);
  };

  const handleOptionClick = async (data: {
    id: string;
    option: string;
    status: string;
    name: string;
  }) => {
    const { id, option, status, name } = data;
    setActionData(data);
    if (option === "Delete") {
      setOpenModal(!openModal);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg: "Are you sure you wish to delete this blog post?",
      }));
    }
    if (option === "status") {
      let statusName = status.slice(0, -2);
      setOpenModal(!openModal);
      setPopupMessage((prev) => ({
        headerMsg: "",
        subHeaderMsg: `Are you sure you wish to ${statusName} this blog post?`,
      }));
    }
    if (option === "Edit") {
      router.push(`${ApplicationURLS.ADMIN_BLOG_EDIT}/${id}`);
    }
    if (option === "Preview") {
      setCookie("blogId", id);
      router.push(`${ApplicationURLS.USER_BLOG_RECOMMENDED}${id}`);
    }
  };
  const handleRowView = (id: any) => {
    router.push(`${ApplicationURLS.ADMIN_BLOG_EDIT}/${id}`);
  };
  const handleModalPopUpFunction = async () => {
    setOpenModal(!openModal);
    if (actionData.option === "Delete") {
      let payload = {
        blog_status: "Deleted",
        id: actionData?.id,
      };
      let response = await AdminUpdateBlogResource(
        payload,
        "Blog post has been deleted."
      );
      if (response) {
        await getListAllAdminArticles(page, perPage);
      }
    }
    if (actionData.option === "status") {
      let payload = {
        blog_status: actionData?.status,
        id: actionData?.id,
      };
      let response = await AdminUpdateBlogResource(
        payload,
        `Blog post has been ${actionData?.status}.`
      );
      if (response) {
        await getListAllAdminArticles(page, perPage);
      }
    }
  };
  function downloadExcel() {
    const columnNames = [
      { value: "authorName", label: "Author" },
      { value: "title", label: "Title" },
      { value: "content", label: "content" },
      { value: "urlSlug", label: "URL" },
      { value: "blog_status", label: "Status" },
      { value: "category", label: "category" },
      { value: "published_on", label: "Published Date" },
    ];
    convertJsonToExcel(printDocumentData, "Blogs list", columnNames);
  }
  const handlePrintPDF = () => {
    let formatedTableData: any[] = printDocumentData.map((user: any) => [
      user?.authorName,
      user?.title,
      user?.content, //user.content,
      user?.urlSlug,
      user?.blog_status,
      user?.category,
      user?.published_on,
    ]);
    let headerNames: string[] = [
      "Author",
      "Title",
      "content",
      "URL",
      "Status",
      "category",
      "Published Date",
    ];
    generateAndPrintPDF(formatedTableData, headerNames, "Blogs", true);
  };
  const columns = [
    {
      name: "Category",
      grow: true,
      minWidth: "150px",
      selector: (row: BlogResource) => row?.category?.value,
    },
    {
      name: "Title",
      fixed: "left",
      wrap: true,
      minWidth: "200px",
      selector: (row: BlogResource) => row?.title,
    },
    {
      name: "Author",
      // fixed: "right",
      grow: true,
      wrap: true,
      // center: true,
      minWidth: "200px",
      selector: (row: BlogResource) =>
        row?.author?.first_name
          ? `${row.author?.first_name} ${row?.author?.last_name || ""}`
          : row?.author?.last_name || "",
    },
    {
      name: "Date Posted",
      grow: true,
      minWidth: "150px",
      selector: (row: BlogResource) =>
        row?.created_on ? formatDate(row?.created_on, DD_MM_YYYY) : "N/A",
    },
    {
      name: "Date Published",
      grow: true,
      minWidth: "150px",
      selector: (row: BlogResource) =>
        row?.published_on ? formatDate(row?.published_on, DD_MM_YYYY) : "N/A",
    },
    {
      name: "Status",
      fixed: "right",
      grow: true,
      selector: (row: BlogResource) => row?.blog_status,
    },

    {
      name: "Actions",
      fixed: "right",
      grow: true,
      center: true,
      cell: (row: BlogResource, index: number) => (
        <Overlays
          trigger="click"
          placement={index === 0 ? "bottom-end" : "auto"}
          overlay={<span></span>}
          popoverTypes={"tableActions"}
          popoverActions={[
            { label: "Edit", value: "Edit" },
            { label: "Preview", value: "Preview" },
            {
              label:
                row?.blog_status === "Draft"
                  ? "Publish"
                  : row?.blog_status === "Published"
                  ? "Unpublish"
                  : "Publish",
              value: "status",
            },
            { label: "Delete", value: "Delete", isDelete: true },
          ]}
          customPopupstyles={styles.customPopupstyles}
          optionClick={(data) => handleOptionClick(data)}
          cellData={{
            id: row?.id,
            name: row?.title,
            status:
              row?.blog_status === "Draft"
                ? "Published"
                : row?.blog_status === "Published"
                ? "Unpublished"
                : "Published",
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
  ];

  return (
    <div className={styles.dataContainer}>
      <ReusableBreadcrumb
        items={[
          {
            href: ApplicationURLS.ADMIN_DASHBOARD,
            label: "Home",
            active: routePath === ApplicationURLS.ADMIN_DASHBOARD,
          },
          {
            href: "",
            label: "Blog",
            active: true,
          },
        ]}
        separator={<span className={styles.separatorStyle}>&gt;</span>}
      />
      <div className={styles.headerAndButtonCon}>
        <span className={styles.headerText}>Blog</span>
        <FormButton
          className={styles.buttonStyles}
          onClick={() => router.push(ApplicationURLS.ADMIN_BLOG_ADD)}
        >
          + Add
        </FormButton>
      </div>

      <ReusableDataTable
        columns={columns}
        data={blogResourceData}
        subHeader
        subHeaderComponent={
          <CustomSubHeader
            search={search}
            onInputChange={onInputChange}
            categoryOptions={categoryOptions}
            handleCategoryChange={handleCategoryChange}
            categorySelectedData={categorySelectedData}
            statusOptions={status}
            handleStatusChange={handleStatusChange}
            statusSelectedData={statusSelectedData}
            authorOptions={authorOptions}
            handleAuthorChange={handleAuthorChange}
            authorSelectedData={authorSelectedData}
            printDocumentData={printDocumentData}
            handlePrintPDF={handlePrintPDF}
            downloadExcel={downloadExcel}
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

export default BlogsList;
