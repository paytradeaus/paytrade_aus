"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import BreadCrumbs from "@/components/BreadCrumbs";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import {
  adminAddSeoKeyword,
  adminUpdateSeoKeyword,
  adminGetSeoKeyword,
  adminGenerateSeoKeywordDraft,
} from "./seo-keywords.functions";
import { AppRoutes } from "@/shared/constant/appRoutes";
import slugify from "slugify";
import { uploadMarketingImage } from "@/modules/admin/AdminMarketingImages/marketingImages.function";

const HOME_HERO_FALLBACK_IMAGE = "/images/mockupshots.png?v=3";

export default function AddEditSeoKeyword() {
  const router = useRouter();
  const params = useParams();
  const editId = params?.id as string | undefined;
  const isEdit = !!editId;

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [formData, setFormData] = useState({
    keyword: "",
    slug: "",
    page_title: "",
    meta_description: "",
    page_content: "",
    hero_image_url: "",
    redirect_url: "",
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
        hero_image_url: data.hero_image_url || "",
        redirect_url: data.redirect_url || "",
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

  const handleGenerateDraft = async () => {
    if (!formData.keyword.trim()) {
      showErrorToast("Enter a keyword first to generate a draft.");
      return;
    }
    setGenerating(true);
    try {
      const tagsArray = formData.tags
        ? formData.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
      const result = await adminGenerateSeoKeywordDraft({
        id: isEdit ? editId : undefined,
        save: false,
        keyword: formData.keyword,
        page_title: formData.page_title || undefined,
        meta_description: formData.meta_description || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      });
      if (result?.status === "SUCCESS" && result?.draft) {
        setFormData((prev) => ({ ...prev, page_content: result.draft }));
        showSuccessToast("Draft generated. Review and save when ready.");
      } else {
        showErrorToast(result?.message || "Failed to generate draft.");
      }
    } catch (error: any) {
      showErrorToast(error.message || "Failed to generate draft.");
    }
    setGenerating(false);
  };

  const handleHeroImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showErrorToast("Please select an image file.");
      return;
    }
    setUploadingHero(true);
    try {
      const result = await uploadMarketingImage(file);
      if (result?.status === "SUCCESS" && result?.url) {
        setFormData((prev) => ({ ...prev, hero_image_url: result.url! }));
        showSuccessToast("Hero image uploaded.");
      } else {
        showErrorToast(result?.message || "Could not upload image.");
      }
    } catch (error: any) {
      showErrorToast(error?.message || "Could not upload image.");
    }
    setUploadingHero(false);
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
            hero_image_url: formData.hero_image_url || null,
            redirect_url: formData.redirect_url.trim(),
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
            hero_image_url: formData.hero_image_url || undefined,
            redirect_url: formData.redirect_url.trim() || undefined,
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
      <div className="container-fluid">
        <div className="pt_box">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              { name: "Dashboard", path: AppRoutes.ADMIN_DASHBOARD },
              { name: "SEO Keywords", path: "/admin/seo-keywords" },
            ]}
            activeRoute={isEdit ? "Edit Keyword" : "Add Keyword"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>{isEdit ? "Edit SEO Keyword" : "Add SEO Keyword"}</h1>
          </div>
          <div className="pt_pageactions">
            <a className="pt_addnewbutton">
              <button
                type="button"
                className="secondary"
                onClick={handleGenerateDraft}
                disabled={generating || loading}
                title="Generate draft copy with AI from the keyword"
              >
                <i
                  className={
                    generating
                      ? "fa-light fa-spinner fa-spin"
                      : "fa-light fa-wand-magic-sparkles"
                  }
                ></i>
                {generating ? "Generating..." : "Generate draft"}
              </button>
            </a>
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          <form onSubmit={handleSubmit}>
            <div className="grid">
              <div className="col-6">
                <label htmlFor="keyword">Keyword *</label>
                <input
                  type="text"
                  id="keyword"
                  name="keyword"
                  value={formData.keyword}
                  onChange={handleChange}
                  placeholder="e.g., QBCC project trust"
                />
              </div>

              <div className="col-6">
                <label htmlFor="slug">URL Slug *</label>
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="e.g., qbcc-project-trust"
                />
                <small>
                  Landing page URL: /topics/{formData.slug || "your-slug"}
                </small>
              </div>

              <div className="col-12">
                <label htmlFor="page_title">Page Title (SEO) *</label>
                <input
                  type="text"
                  id="page_title"
                  name="page_title"
                  value={formData.page_title}
                  onChange={handleChange}
                  placeholder="e.g., QBCC Project Trust Accounting | Paytrade"
                />
                <small>
                  {formData.page_title.length}/70 characters recommended
                </small>
              </div>

              <div className="col-12">
                <label htmlFor="meta_description">Meta Description *</label>
                <textarea
                  id="meta_description"
                  name="meta_description"
                  value={formData.meta_description}
                  onChange={handleChange}
                  placeholder="A brief description for search engines..."
                  rows={3}
                />
                <small>
                  {formData.meta_description.length}/160 characters recommended
                </small>
              </div>

              <div className="col-12">
                <label htmlFor="redirect_url">Redirect URL (optional)</label>
                <input
                  type="text"
                  id="redirect_url"
                  name="redirect_url"
                  value={formData.redirect_url}
                  onChange={handleChange}
                  placeholder="e.g., /topics/project-trust-account-software or https://..."
                />
                <small>
                  {formData.redirect_url.trim()
                    ? `Visitors to /topics/${formData.slug || "your-slug"} will be redirected to ${formData.redirect_url.trim()} instead of seeing this page.`
                    : "Leave empty to show this page normally. If set, visitors are redirected to the specified URL (relative path or full URL)."}
                </small>
              </div>

              <div className="col-12">
                <label htmlFor="tags">Tags (comma-separated)</label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="e.g., QBCC, project trust, construction"
                />
              </div>

              <div className="col-12">
                <label htmlFor="hero_image">Hero Image</label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ width: "240px", maxWidth: "100%" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt="Hero preview"
                      src={formData.hero_image_url || HOME_HERO_FALLBACK_IMAGE}
                      style={{
                        width: "100%",
                        borderRadius: "8px",
                        border: "1px solid var(--shade, #e0e0e0)",
                        display: "block",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <input
                      type="file"
                      id="hero_image"
                      accept="image/*"
                      onChange={handleHeroImageUpload}
                      disabled={uploadingHero}
                    />
                    {uploadingHero && <small>Uploading...</small>}
                    {formData.hero_image_url ? (
                      <button
                        type="button"
                        className="secondary"
                        style={{ width: "auto" }}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, hero_image_url: "" }))
                        }
                      >
                        Remove (use home image)
                      </button>
                    ) : (
                      <small>
                        No image set — the home page hero image will be used.
                      </small>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-12">
                <label htmlFor="page_content">Page Content (HTML)</label>
                <textarea
                  id="page_content"
                  name="page_content"
                  value={formData.page_content}
                  onChange={handleChange}
                  placeholder="<h2>About QBCC Project Trust</h2><p>Content here...</p>"
                  rows={12}
                />
              </div>
            </div>

            <div className="pt_pageactions" style={{ marginTop: "20px", gap: "10px", display: "flex" }}>
              <button
                type="button"
                className="secondary"
                onClick={() => router.push("/admin/seo-keywords")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary"
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
    </div>
  );
}
