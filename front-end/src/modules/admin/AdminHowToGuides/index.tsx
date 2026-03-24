"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BreadCrumbs from "@/components/BreadCrumbs";
import FormikControl from "@/components/FormikControl";
import GridExportActions from "@/components/GridExportActions";
import DynamicTable from "@/components/Table";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { EDIT, InputType, NA } from "@/shared/constant/general";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import { useRouter } from "next/navigation";
import {
  connectWebSocket,
  formatDate,
  slugifyString,
  stripHtml,
} from "@/utils";
import { DD_MM_YYYY } from "@/shared/constant/identificationNumbers";
import { setCookie } from "cookies-next";
import BaseModal from "@/components/BaseModal";
import {
  AdminFetchAllMasterTypeDetails,
  AdminListAllBlogResAuthors,
  AdminListAllBlogResources,
  AdminUpdateBlogResource,
} from "../AdminBlog/BlogList/blogList.function";
import { AdminAddBlogResource } from "../AdminBlog/addBlog/addEditBlog.function";
import {
  blogListHeaders,
  blogRenderData,
  excelColumnNames,
  pdfDataHeaders,
  pdfDataRow,
} from "../AdminBlog/BlogList/blogList.constant";
import {
  downloadExcelFileFromAPI,
  GenerateSignedUrl,
  getPDFUrl,
} from "@/utils/export";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";

export default function AdminHowToGuides() {
  const [blogResourceDate, setBlogResourceData] = useState<any[]>([]);
  const [sortValues, setSortValues] = useState<any>("");
  const [categoryValue, setCategoryValue] = useState<any>("");
  const [search, setSearch] = useState("");
  const [statusType, setStatusType] = useState<any>();
  const [totalRows, setTotalRows] = useState(0);
  const [categoryOptions, setCategoryOptions] = useState<any>([]);
  const [tableLoader, setTableLoader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [authorOptions, setAuthorOptions] = useState<any>([]);
  const [authorValue, setAuthorValue] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPublish, setModalPublish] = useState(false);

  const [buttonClickFrom, setButtonClickFrom] = useState<any>({});
  const [disableExcelBtn, setDisableExcelBtn] = useState(false);
  const [disablePDFBtn, setDisablePDFBtn] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAnyFilterActive =
    search || statusType || authorValue || categoryValue;

  const actions = [
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: any) => handleOptionClick({ ...row, option: EDIT }),
      displayByDefault: true,
    },
    {
      label: "Preview",
      icon: "fa-light fa-file-magnifying-glass",
      onClick: ({ id, title, category }: any) => {
        setCookie("blogId", id);
        router.push(
          `${AppRoutes.HOW_TO_GUIDES_VIEWS}/${slugifyString(
            category
          )}/${slugifyString(title)}/${id}`
        );
      },
      displayByDefault: true,
    },
    {
      label: "Publish",
      icon: "fa-light fa-paper-plane-top",
      onClick: (row: any) => {
        setButtonClickFrom({ ...row, from: "Publish" });
        setModalPublish(true);
      },
      conditionalComparisonData: "Draft",
      comparisonRowKey: "blog_status",
    },
    {
      label: "Publish",
      icon: "fa-light fa-paper-plane-top",
      onClick: (row: any) => {
        setButtonClickFrom({ ...row, from: "Publish" });
        setModalPublish(true);
      },
      conditionalComparisonData: "Unpublished",
      comparisonRowKey: "blog_status",
    },
    {
      label: "Unpublish",
      icon: "fa-light fa-eye-slash",
      onClick: (row: any) => {
        setButtonClickFrom({ ...row, from: "Unpublish" });
        setModalPublish(true);
      },
      conditionalComparisonData: "Published",
      comparisonRowKey: "blog_status",
    },
    {
      label: "Delete",
      icon: "fa-light fa-trash",
      onClick: (row: any) => {
        setModalVisible(true);
        setButtonClickFrom({ ...row, from: "Delete" });
      },
      displayByDefault: true,
    },
  ];

  const handleOptionClick = async (data: any) => {
    const { id, option } = data;
    console.log("data: ", data, { option });
    if (option === EDIT) {
      router.push(`${AppRoutes.HOW_TO_GUIDES_EDIT}${id}`);
    }
  };

  // Fetch data when filters, pagination, or entries per page change
  useEffect(() => {
    fetchBlogLists();
  }, [
    search,
    statusType,
    authorValue,
    categoryValue,
    currentPage,
    entriesPerPage,
    sortValues,
  ]);

  // Row click handler
  const handleRowClick = (row: any) => {
    handleOptionClick({ ...row, option: EDIT });
  };

  // Fetch masters list data
  const fetchBlogLists = async () => {
    if (emptySearchField) {
      setEmptySearchField(false);
    }
    try {
      setTableLoader(true);
      const payload = {
        page: currentPage,
        perPage: entriesPerPage,
        keyWord: search,
        status: statusType?.value,
        category:
          categoryValue?.label == "All" ? "" : categoryValue?.label || "",
        author: authorValue?.value,
        contentType: "howToGuide",
        sortingOrder: sortValues?.direction || "",
        sortingField: sortValues?.sortKey || "",
      };

      console.log("Fetching data with payload:", payload);
      const response = await AdminListAllBlogResources(payload);

      if (response?.blogResources?.length > 0) {
        const modifiedGridData = response.blogResources.map((blog: any) => ({
          ...blog,
          authorName: blog?.author?.first_name
            ? `${blog?.author?.first_name} ${blog?.author?.last_name || ""}`
            : blog?.author?.last_name || "",
          title: blog.title,
          content: stripHtml(blog.content), //blog.content,
          urlSlug: blog.urlSlug,
          blog_status: blog.blog_status,
          category: blog.category.value,
          published_on: blog?.published_on
            ? formatDate(blog?.published_on)
            : NA,
          created_on: blog?.created_on ? formatDate(blog?.created_on) : NA,
        }));
        setBlogResourceData(modifiedGridData);
        setTotalRows(response.totalCount || 0);
      } else {
        setBlogResourceData([]);
        setTotalRows(0);
      }
    } catch (error) {
      console.error("Error fetching masters list:", error);
    } finally {
      setTableLoader(false);
    }
  };

  // Filter data by search value
  const filteredData = blogResourceDate.filter((item) => {
    const valueToSearch = item.title.toLowerCase();
    return valueToSearch.includes(search.toLowerCase());
  });

  // Reset filters
  const handleResetFilters = () => {
    setSearch("");
    setStatusType("");
    setCategoryValue("");
    setAuthorValue("");
    setCurrentPage(1);
    setEntriesPerPage(10);
    setEmptySearchField(true);
  };

  useEffect(() => {
    (async () => {
      const [categoryData, authorsResponse] = await Promise.all([
        AdminFetchAllMasterTypeDetails("Blog Category"),
        AdminListAllBlogResAuthors(),
      ]);
      if (categoryData?.length > 0) {
        setCategoryOptions([{ value: "", label: "All" }, ...categoryData]);
      }
      if (authorsResponse?.length > 0) {
        setAuthorOptions([{ value: "", label: "All" }, ...authorsResponse]);
      }
    })();
  }, []);

  const status = [
    { value: "", label: "All" },
    { value: "Draft", label: "Draft" },
    { value: "Published", label: "Published" },
    { value: "Unpublished", label: "Unpublished" },
  ];

  async function handleAccept() {
    if (buttonClickFrom?.from == "Delete") {
      let payload = {
        blog_status: "Deleted",
        id: buttonClickFrom?.id,
      };
      let response = await AdminUpdateBlogResource(
        payload,
        "How to guides has been deleted."
      );
      if (response) {
        fetchBlogLists();
      }
    } else if (
      buttonClickFrom?.from == "Publish" ||
      buttonClickFrom?.from == "Unpublish"
    ) {
      let blog_status =
        buttonClickFrom?.from == "Unpublish"
          ? "Unpublished"
          : buttonClickFrom?.from == "Publish"
          ? "Published"
          : "";
      let payload = {
        blog_status,
        id: buttonClickFrom?.id,
      };
      let response = await AdminUpdateBlogResource(
        payload,
        `How to guides has been ${blog_status}.`
      );
      if (response) {
        await fetchBlogLists();
      }
    }
  }

  const handleDownloadExcelFile = async () => {
    setDisableExcelBtn(true);
    try {
      let responseFileURL = await GenerateSignedUrl({
        screen_name: "howToGuide",
        keyword: search || "",
        status: statusType?.value || "",
        category:
          categoryValue?.label == "All" ? "" : categoryValue?.label || "",
        author: authorValue?.value || null,
        date_filter: null,
        end_date: null,
        start_date: null,
        contentType: "howToGuide",
      });

      if (responseFileURL) {
        await downloadExcelFileFromAPI(responseFileURL);
      } else {
        showErrorToast("Failed to generate Excel file URL");
      }
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisableExcelBtn(false);
    }
  };

  const handleExportJSON = async () => {
    setExporting(true);
    try {
      let allGuides: any[] = [];
      let page = 1;
      const perPage = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await AdminListAllBlogResources({
          page,
          perPage,
          keyWord: "",
          status: "",
          category: "",
          author: null,
          contentType: "howToGuide",
          sortingOrder: "",
          sortingField: "",
        });

        if (response?.blogResources?.length > 0) {
          allGuides = [...allGuides, ...response.blogResources];
          hasMore = allGuides.length < (response.totalCount || 0);
          page++;
        } else {
          hasMore = false;
        }
      }

      if (allGuides.length > 0) {
        const exportData = allGuides.map((guide: any) => ({
          title: guide.title,
          content: guide.content,
          content_type: guide.content_type,
          blog_status: guide.blog_status,
          category_id: guide.category?.id || "",
          category_name: guide.category?.value || "",
          tags: guide.tags || [],
          enable_comments: guide.enable_comments,
          urlSlug: guide.urlSlug,
          banner_file_path: guide.banner?.file_path || null,
          video_link: guide.video_link || null,
        }));

        const blob = new Blob(
          [JSON.stringify({ guides: exportData, exportedAt: new Date().toISOString(), version: 1 }, null, 2)],
          { type: "application/json" }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `how-to-guides-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showSuccessToast(`Exported ${exportData.length} guides successfully`);
      } else {
        showErrorToast("No guides found to export");
      }
    } catch (error) {
      console.error("Export error:", error);
      showErrorToast("Failed to export guides");
    } finally {
      setExporting(false);
    }
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      showErrorToast("Please select a JSON file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed?.guides || !Array.isArray(parsed.guides)) {
          showErrorToast("Invalid file format: missing 'guides' array");
          return;
        }
        setImportData(parsed.guides);
        setImportModalVisible(true);
      } catch {
        showErrorToast("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImportConfirm = async () => {
    setImporting(true);
    setImportModalVisible(false);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    const categoryData = await AdminFetchAllMasterTypeDetails("How To Guide Category");
    const categoryByLabel: Record<string, string> = {};
    const categoryById: Record<string, string> = {};
    categoryData?.forEach((cat: any) => {
      categoryByLabel[cat.label.trim().toLowerCase()] = cat.value;
      categoryById[cat.value] = cat.value;
    });

    for (const guide of importData) {
      try {
        let categoryId = guide.category_id && categoryById[guide.category_id]
          ? guide.category_id
          : null;

        if (!categoryId) {
          const label = (guide.category_name || guide.category || "").trim().toLowerCase();
          categoryId = categoryByLabel[label];
        }

        if (!categoryId) {
          const categoryRef = guide.category_name || guide.category || "unknown";
          errors.push(`"${guide.title}": category "${categoryRef}" not found`);
          failCount++;
          continue;
        }

        const payload = {
          title: guide.title,
          content: guide.content,
          content_type: guide.content_type || "howToGuide",
          blog_status: guide.blog_status || "Draft",
          categoryId,
          tags: guide.tags || [],
          enable_comments: guide.enable_comments ?? false,
          video_link: guide.video_link || null,
        };

        const result = await AdminAddBlogResource(payload);
        if (result?.id) {
          successCount++;
        } else {
          errors.push(`"${guide.title}": creation failed`);
          failCount++;
        }
      } catch (error) {
        console.error(`Failed to import guide: ${guide.title}`, error);
        errors.push(`"${guide.title}": ${error instanceof Error ? error.message : "unknown error"}`);
        failCount++;
      }
    }

    if (successCount > 0) {
      showSuccessToast(`Imported ${successCount} guide(s) successfully${failCount > 0 ? `, ${failCount} failed` : ""}`);
      fetchBlogLists();
    } else {
      showErrorToast(`Import failed: ${failCount} guide(s) could not be imported`);
    }

    if (errors.length > 0) {
      console.error("Import errors:", errors);
    }

    setImporting(false);
    setImportData([]);
  };

  const handleDownloadPdfFile = async () => {
    setDisablePDFBtn(true);
    try {
      const clientId = await connectWebSocket();
      await getPDFUrl(clientId, {
        screen_name: "howToGuide",
        keyWord: search || null,
        status: statusType?.value || null,
        category:
          categoryValue?.label == "All" ? null : categoryValue?.label || null,
        author: authorValue?.value || null,
        date_filter: null,
        end_date: null,
        start_date: null,
        contentType: "howToGuide",
      });
      setDisablePDFBtn(false);
    } catch (error) {
      console.error(error, "outside loop");
    } finally {
      setDisablePDFBtn(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              {
                name: "Dashboard",
                path: AppRoutes.ADMIN_DASHBOARD,
              },
            ]}
            activeRoute={"How to guides"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>How to guides</h1>
          </div>
          <div className="pt_pageactions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              className="secondary"
              onClick={handleExportJSON}
              disabled={exporting}
              title="Export all guides as JSON"
            >
              <i className="fa-light fa-file-export"></i>
              {exporting ? "Exporting..." : "Export JSON"}
            </button>
            <button
              className="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              title="Import guides from JSON file"
            >
              <i className="fa-light fa-file-import"></i>
              {importing ? "Importing..." : "Import JSON"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={handleImportFileSelect}
            />
            <Link href={"/admin/how-to-guides/add"} passHref legacyBehavior>
              <a className="pt_addnewbutton">
                <button className="secondary">
                  <i className="fa-light fa-hexagon-plus"></i>Add how to guides
                </button>
              </a>
            </Link>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="grid pt_topfilters align_view_activity">
          <div className="pt_pageactions">
            <GridExportActions
              excelFile={{
                sheetName: "admin how to guide list",
                tableData: filteredData,
                LabelAndValueKey: excelColumnNames,
              }}
              pdfFile={{
                fileName: "admin how to guide list",
                headerRow: pdfDataHeaders,
                tableData: filteredData,
                dataRow: pdfDataRow,
              }}
              resetFilterFunction={handleResetFilters}
              hideExcelButton={filteredData.length === 0}
              hidePdfButton={filteredData.length === 0}
              hideResetButton={!isAnyFilterActive}
              disabledPDF={disablePDFBtn}
              handleDownloadPrintPDF={() => {
                handleDownloadPdfFile();
              }}
              handleDownloadExcelFile={() => {
                handleDownloadExcelFile();
              }}
              disabledOnExcel={disableExcelBtn}
              exportFromAPI={true}
            />
          </div>
        </div>
        <div className="pt_filteroptions">
          <FormikControl
            placeholder={"Search by title"}
            control={InputType.SEARCH}
            onChange={(value: any) => {
              if (currentPage !== 1) setCurrentPage(1);
              setSearch(value);
            }}
            name={search}
            value={search}
            clearSearch={emptySearchField}
          />
          <SearchableSelect
            placeholder={"Select a category"}
            name="Category"
            options={categoryOptions}
            selectedData={categoryValue}
            renderKey="label"
            valueKey="value"
            onChange={(selectedValue) => {
              setCurrentPage(1);
              setCategoryValue(selectedValue);
            }}
          />{" "}
          <SearchableSelect
            placeholder={"Select a status"}
            name="status"
            options={status}
            selectedData={statusType}
            renderKey="label"
            valueKey="value"
            onChange={(selectedValue) => {
              setCurrentPage(1);
              setStatusType(selectedValue);
            }}
          />{" "}
          <SearchableSelect
            placeholder={"Select an author"}
            name="Author"
            options={authorOptions}
            selectedData={authorValue}
            renderKey="label"
            valueKey="value"
            onChange={(selectedValue) => {
              setCurrentPage(1);
              setAuthorValue(selectedValue);
            }}
          />
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={blogListHeaders}
            gridData={filteredData}
            gridActions={actions}
            onRowClick={handleRowClick}
            hoverOnRowClick
            showLoader={tableLoader}
            loaderColSpan={blogListHeaders.length}
            renderRowList={blogRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
            onSortChange={(sortConfig) => {
              if (filteredData?.length > 0) {
                setSortValues(sortConfig);
              }
            }}
          />
        </div>
        {modalVisible && (
          <BaseModal
            modalId={"admin blog modal"}
            displayModal={modalVisible}
            title="Confirmation"
            onClose={() => setModalVisible(false)}
            onConfirm={() => {
              handleAccept();
              setModalVisible(false);
              return true;
            }}
          >
            <p>Are you sure you wish to delete this how to guides?</p>
          </BaseModal>
        )}
        {modalPublish && (
          <BaseModal
            modalId={"admin blog comments"}
            displayModal={modalPublish}
            title="Confirmation"
            onClose={() => setModalPublish(false)}
            onConfirm={() => {
              handleAccept();
              setModalPublish(false);
              return true;
            }}
          >
            <p>
              Are you sure you wish to {buttonClickFrom?.from} this how to
              guides?
            </p>
          </BaseModal>
        )}
        {importModalVisible && (
          <BaseModal
            modalId={"import guides modal"}
            displayModal={importModalVisible}
            title="Import How-To Guides"
            onClose={() => {
              setImportModalVisible(false);
              setImportData([]);
            }}
            onConfirm={() => {
              handleImportConfirm();
              return true;
            }}
          >
            <div>
              <p>
                Ready to import <strong>{importData.length}</strong> guide(s).
                Guides will be created as new entries.
              </p>
              <div style={{ maxHeight: "200px", overflowY: "auto", marginTop: "10px" }}>
                <ul style={{ paddingLeft: "20px", margin: 0 }}>
                  {importData.map((guide: any, idx: number) => (
                    <li key={idx} style={{ marginBottom: "4px" }}>
                      {guide.title} <span style={{ color: "#888", fontSize: "12px" }}>({guide.category})</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </BaseModal>
        )}
      </div>
    </div>
  );
}
