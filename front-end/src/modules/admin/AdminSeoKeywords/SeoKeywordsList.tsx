"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import BreadCrumbs from "@/components/BreadCrumbs";
import DynamicTable from "@/components/Table";
import { useRouter } from "next/navigation";
import {
  adminListSeoKeywords,
  adminDeleteSeoKeyword,
  adminUpdateSeoKeyword,
} from "./seo-keywords.functions";
import { formatDate } from "@/utils";
import { DD_MM_YYYY } from "@/shared/constant/identificationNumbers";
import BaseModal from "@/components/BaseModal";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import FormikControl from "@/components/FormikControl";
import { InputType } from "@/shared/constant/general";
import { AppRoutes } from "@/shared/constant/appRoutes";

const seoKeywordsHeaders = [
  { dataKey: "keyword", title: "Keyword" },
  { dataKey: "slug", title: "Slug" },
  { dataKey: "page_title", title: "Page Title" },
  { dataKey: "status", title: "Status" },
  { dataKey: "created_on", title: "Created" },
  { dataKey: "", title: "Actions", restrictSorting: true },
];

const seoKeywordsRenderData = [
  { key: "keyword" },
  { key: "slug" },
  { key: "page_title" },
  { key: "status" },
  { key: "created_on" },
];

export default function SeoKeywordsList() {
  const [keywords, setKeywords] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [emptySearchField, setEmptySearchField] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [tableLoader, setTableLoader] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<any>(null);
  const router = useRouter();

  const fetchKeywords = async () => {
    setTableLoader(true);
    try {
      const result = await adminListSeoKeywords({
        listSeoKeywordsInput: {
          page: currentPage,
          perPage: entriesPerPage,
          search: search || undefined,
          status: statusFilter || undefined,
          sorting_order: "DESC",
        },
      });
      setKeywords(result?.seoKeywords || []);
      setTotalRows(result?.totalCount || 0);
    } catch (error) {
      console.log("Error fetching SEO keywords:", error);
    }
    setTableLoader(false);
  };

  useEffect(() => {
    fetchKeywords();
  }, [currentPage, entriesPerPage, search, statusFilter]);

  const handleDelete = async () => {
    if (!selectedKeyword) return;
    const result = await adminDeleteSeoKeyword(selectedKeyword.id);
    if (result?.status === "SUCCESS") {
      showSuccessToast("SEO keyword deleted successfully.");
      setDeleteModal(false);
      setSelectedKeyword(null);
      fetchKeywords();
    } else {
      showErrorToast(result?.message || "Failed to delete.");
    }
  };

  const handleToggleStatus = async (row: any) => {
    const newStatus = row.status === "Active" ? "Inactive" : "Active";
    const result = await adminUpdateSeoKeyword({
      updateSeoKeywordInput: {
        id: row.id,
        status: newStatus,
      },
    });
    if (result?.status === "SUCCESS") {
      showSuccessToast(
        `Keyword ${newStatus === "Active" ? "activated" : "deactivated"}.`
      );
      fetchKeywords();
    } else {
      showErrorToast(result?.message || "Failed to update status.");
    }
  };

  const actions = [
    {
      label: "Edit",
      icon: "fa-light fa-pen-to-square",
      onClick: (row: any) =>
        router.push(`/admin/seo-keywords/edit/${row.id}`),
      displayByDefault: true,
    },
    {
      label: "Toggle Status",
      icon: "fa-light fa-toggle-on",
      onClick: handleToggleStatus,
      displayByDefault: true,
    },
    {
      label: "Delete",
      icon: "fa-light fa-trash-can",
      onClick: (row: any) => {
        setSelectedKeyword(row);
        setDeleteModal(true);
      },
      displayByDefault: true,
    },
  ];

  const tableData = keywords.map((kw: any) => ({
    id: kw.id,
    keyword: kw.keyword,
    slug: kw.slug,
    page_title:
      kw.page_title?.substring(0, 60) +
      (kw.page_title?.length > 60 ? "..." : ""),
    status: kw.status,
    created_on: formatDate(kw.created_on, DD_MM_YYYY),
  }));

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
            activeRoute="SEO Keywords"
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>SEO Keywords</h1>
          </div>
          <div className="pt_pageactions">
            <Link href="/admin/seo-keywords/add" passHref legacyBehavior>
              <a className="pt_addnewbutton">
                <button className="secondary">
                  <i className="fa-light fa-hexagon-plus"></i>Add Keyword
                </button>
              </a>
            </Link>
          </div>
        </div>
      </div>

      <div className="pt_filtergroup">
        <div className="pt_filteroptions">
          <FormikControl
            placeholder="Search by keyword"
            control={InputType.SEARCH}
            onChange={(value: any) => {
              if (currentPage !== 1) setCurrentPage(1);
              setSearch(value);
            }}
            name={search}
            value={search}
            clearSearch={emptySearchField}
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="form-select"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <DynamicTable
            headers={seoKeywordsHeaders}
            gridData={tableData}
            gridActions={actions}
            showLoader={tableLoader}
            loaderColSpan={seoKeywordsHeaders.length}
            renderRowList={seoKeywordsRenderData}
            currentPage={currentPage}
            entriesPerPage={entriesPerPage}
            onEntriesPerPageChange={setEntriesPerPage}
            onPageChange={setCurrentPage}
            totalEntries={totalRows}
          />
        </div>
      </div>

      {deleteModal && (
        <BaseModal
          show={deleteModal}
          title="Delete SEO Keyword"
          onClose={() => setDeleteModal(false)}
          onConfirm={handleDelete}
          confirmText="Delete"
          cancelText="Cancel"
        >
          <p>
            Are you sure you want to delete the keyword &quot;
            {selectedKeyword?.keyword}&quot;? This will also remove the
            associated landing page.
          </p>
        </BaseModal>
      )}
    </div>
  );
}
