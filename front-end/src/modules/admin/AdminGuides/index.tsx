"use client";

import React, { useEffect, useState } from "react";
import BreadCrumbs from "@/components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { AdminFetchAdminGuides } from "./adminGuides.functions";
import { stripHtml } from "@/utils";
import styles from "./adminGuides.module.scss";

export default function AdminGuides() {
  const [guides, setGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    setLoading(true);
    try {
      const response = await AdminFetchAdminGuides({
        page: 1,
        perPage: 50,
        category: "Admin Panel",
      });
      if (response?.blogResources?.length > 0) {
        setGuides(response.blogResources);
      }
    } catch (error) {
      console.error("Error fetching admin guides:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
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
            activeRoute={"Admin Guides"}
          />
        </div>
        <div className="grid pt_topfilters">
          <div className="pt_pagetitle">
            <h1>Admin Guides</h1>
          </div>
          <div className="pt_pageactions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <a
              href="/admin-guide-recurring-tasks.html"
              target="_blank"
              rel="noopener noreferrer"
              className="pt_addnewbutton"
            >
              <button className="secondary">
                <i className="fa-light fa-clipboard-list"></i>
                Recurring Tasks Guide
              </button>
            </a>
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="pt_box">
          {loading ? (
            <div className={styles.loadingState}>
              <i className="fa-light fa-spinner-third fa-spin"></i>
              <p>Loading admin guides...</p>
            </div>
          ) : guides.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="fa-light fa-book-open"></i>
              <p>No admin guides found.</p>
              <p className={styles.emptyHint}>
                Admin guides can be created from the How To Guides page with the
                &quot;Admin Panel&quot; category.
              </p>
            </div>
          ) : (
            <div className={styles.guidesList}>
              {guides.map((guide: any) => (
                <div
                  key={guide.id}
                  className={`${styles.guideCard} ${
                    expandedId === guide.id ? styles.expanded : ""
                  }`}
                >
                  <div
                    className={styles.guideHeader}
                    onClick={() => toggleExpand(guide.id)}
                  >
                    <div className={styles.guideInfo}>
                      <h3 className={styles.guideTitle}>
                        <i className="fa-light fa-file-lines"></i>
                        {guide.title}
                      </h3>
                      <div className={styles.guideMeta}>
                        <span
                          className={`${styles.statusBadge} ${
                            guide.blog_status === "Published"
                              ? styles.published
                              : styles.unpublished
                          }`}
                        >
                          {guide.blog_status}
                        </span>
                        {guide.tags?.length > 0 && (
                          <span className={styles.tags}>
                            {guide.tags.slice(0, 3).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <i
                      className={`fa-light ${
                        expandedId === guide.id
                          ? "fa-chevron-up"
                          : "fa-chevron-down"
                      } ${styles.expandIcon}`}
                    ></i>
                  </div>
                  {expandedId === guide.id && (
                    <div className={styles.guideContent}>
                      <div
                        dangerouslySetInnerHTML={{ __html: guide.content }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
