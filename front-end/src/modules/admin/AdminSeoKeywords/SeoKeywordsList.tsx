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

export default function SeoKeywordsList() {
  const [keywords, setKeywords] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [search, setSearch] = useState("");
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
      showSuccessToast(`Keyword ${newStatus === "Active" ? "activated" : "deactivated"}.`);
      fetchKeywords();
    } else {
      showErrorToast(result?.message || "Failed to update status.");
    }
  };

  const tableHeaders = [
    { key: "keyword", label: "Keyword" },
    { key: "slug", label: "Slug" },
    { key: "page_title", label: "Page Title" },
    { key: "status", label: "Status" },
    { key: "created_on", label: "Created" },
  ];

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
    page_title: kw.page_title?.substring(0, 60) + (kw.page_title?.length > 60 ? "..." : ""),
    status: kw.status,
    created_on: formatDate(kw.created_on, DD_MM_YYYY),
  }));

  return (
    <div className="adminDashboard">
      <BreadCrumbs
        data={[{ title: "Dashboard", link: "/admin/dashboard" }]}
        currentPage="SEO Keywords"
      />
      <div className="adminpagelayout">
        <div className="adminheaderSection">
          <h2 className="pageTitle">SEO Keywords</h2>
          <Link href="/admin/seo-keywords/add" className="pt_btn">
            <i className="fa-light fa-plus"></i> Add Keyword
          </Link>
        </div>

        <div className="adminFilterSection">
          <div className="searchBox">
            <FormikControl
              control={InputType.INPUT}
              placeholder="Search keywords..."
              value={search}
              onChange={(e: any) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="filterBox">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="pt_select"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <DynamicTable
          headers={tableHeaders}
          data={tableData}
          actions={actions}
          totalRows={totalRows}
          currentPage={currentPage}
          entriesPerPage={entriesPerPage}
          setCurrentPage={setCurrentPage}
          setEntriesPerPage={setEntriesPerPage}
          loading={tableLoader}
          renderData={(row: any) => ({
            ...row,
            status: (
              <span
                className={`statusBadge ${
                  row.status === "Active" ? "active" : "inactive"
                }`}
              >
                {row.status}
              </span>
            ),
          })}
        />
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
