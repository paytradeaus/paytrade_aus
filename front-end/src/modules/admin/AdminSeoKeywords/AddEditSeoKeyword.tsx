"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import BreadCrumbs from "@/components/BreadCrumbs";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import {
  adminAddSeoKeyword,
  adminUpdateSeoKeyword,
  adminGetSeoKeyword,
} from "./seo-keywords.functions";
import slugify from "slugify";

export default function AddEditSeoKeyword() {
  const router = useRouter();
  const params = useParams();
  const editId = params?.id as string | undefined;
  const isEdit = !!editId;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    keyword: "",
    slug: "",
    page_title: "",
    meta_description: "",
    page_content: "",
    tags: "",
  });

  useEffect(() => {
    if (isEdit && editId) {
      loadKeyword(editId);
    }
  }, [editId]);

  const loadKeyword = async (id: string) => {
    setLoading(true);
    const data = await adminGetSeoKeyword(id);
    if (data) {
      setFormData({
        keyword: data.keyword || "",
        slug: data.slug || "",
        page_title: data.page_title || "",
        meta_description: data.meta_description || "",
        page_content: data.page_content || "",
        tags: data.tags?.join(", ") || "",
      });
    }
    setLoading(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "keyword" && !isEdit) {
        updated.slug = slugify(value, { lower: true, strict: true });
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.keyword.trim()) {
      showErrorToast("Keyword is required.");
      return;
    }
    if (!formData.page_title.trim()) {
      showErrorToast("Page title is required.");
      return;
    }
    if (!formData.meta_description.trim()) {
      showErrorToast("Meta description is required.");
      return;
    }

    setLoading(true);

    const tagsArray = formData.tags
      ? formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    try {
      let result;
      if (isEdit) {
        result = await adminUpdateSeoKeyword({
          updateSeoKeywordInput: {
            id: editId,
            keyword: formData.keyword,
            slug: formData.slug,
            page_title: formData.page_title,
            meta_description: formData.meta_description,
            page_content: formData.page_content || undefined,
            tags: tagsArray.length > 0 ? tagsArray : undefined,
          },
        });
      } else {
        result = await adminAddSeoKeyword({
          addSeoKeywordInput: {
            keyword: formData.keyword,
            slug: formData.slug,
            page_title: formData.page_title,
            meta_description: formData.meta_description,
            page_content: formData.page_content || undefined,
            tags: tagsArray.length > 0 ? tagsArray : undefined,
          },
        });
      }

      if (result?.status === "SUCCESS") {
        showSuccessToast(
          isEdit
            ? "SEO keyword updated successfully."
            : "SEO keyword added successfully."
        );
        router.push("/admin/seo-keywords");
      } else {
        showErrorToast(result?.message || "Something went wrong.");
      }
    } catch (error: any) {
      showErrorToast(error.message || "Something went wrong.");
    }

    setLoading(false);
  };

  if (loading && isEdit && !formData.keyword) {
    return (
      <div className="adminDashboard">
        <div className="adminpagelayout">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="adminDashboard">
      <BreadCrumbs
        data={[
          { title: "Dashboard", link: "/admin/dashboard" },
          { title: "SEO Keywords", link: "/admin/seo-keywords" },
        ]}
        currentPage={isEdit ? "Edit Keyword" : "Add Keyword"}
      />
      <div className="adminpagelayout">
        <h2 className="pageTitle">
          {isEdit ? "Edit SEO Keyword" : "Add SEO Keyword"}
        </h2>

        <form onSubmit={handleSubmit} className="pt_form">
          <div className="formGrid">
            <div className="formGroup">
              <label htmlFor="keyword">Keyword *</label>
              <input
                type="text"
                id="keyword"
                name="keyword"
                value={formData.keyword}
                onChange={handleChange}
                placeholder="e.g., QBCC project trust"
                className="pt_input"
              />
            </div>

            <div className="formGroup">
              <label htmlFor="slug">URL Slug *</label>
              <input
                type="text"
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="e.g., qbcc-project-trust"
                className="pt_input"
              />
              <small className="formHint">
                Landing page URL: /topics/{formData.slug || "your-slug"}
              </small>
            </div>

            <div className="formGroup full">
              <label htmlFor="page_title">Page Title (SEO) *</label>
              <input
                type="text"
                id="page_title"
                name="page_title"
                value={formData.page_title}
                onChange={handleChange}
                placeholder="e.g., QBCC Project Trust Accounting | Paytrade"
                className="pt_input"
              />
              <small className="formHint">
                {formData.page_title.length}/70 characters recommended
              </small>
            </div>

            <div className="formGroup full">
              <label htmlFor="meta_description">Meta Description *</label>
              <textarea
                id="meta_description"
                name="meta_description"
                value={formData.meta_description}
                onChange={handleChange}
                placeholder="A brief description for search engines..."
                className="pt_input"
                rows={3}
              />
              <small className="formHint">
                {formData.meta_description.length}/160 characters recommended
              </small>
            </div>

            <div className="formGroup full">
              <label htmlFor="tags">Tags (comma-separated)</label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="e.g., QBCC, project trust, construction"
                className="pt_input"
              />
            </div>

            <div className="formGroup full">
              <label htmlFor="page_content">Page Content (HTML)</label>
              <textarea
                id="page_content"
                name="page_content"
                value={formData.page_content}
                onChange={handleChange}
                placeholder="<h2>About QBCC Project Trust</h2><p>Content here...</p>"
                className="pt_input"
                rows={12}
              />
            </div>
          </div>

          <div className="formActions">
            <button
              type="button"
              className="pt_btn pt_btn_secondary"
              onClick={() => router.push("/admin/seo-keywords")}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="pt_btn"
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : isEdit
                ? "Update Keyword"
                : "Add Keyword"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
