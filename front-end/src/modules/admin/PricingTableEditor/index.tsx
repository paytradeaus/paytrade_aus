"use client";

import React, { useEffect, useState } from "react";
import BreadCrumbs from "@/components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import BaseModal from "@/components/BaseModal";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import {
  FetchPricingTableFeatures,
  AddPricingTableFeature,
  UpdatePricingTableFeature,
  DeletePricingTableFeature,
  BulkUpdatePricingTableFeatures,
} from "./pricingTableEditor.functions";

interface FeatureRow {
  id?: string;
  feature_name: string;
  display_order: number;
  basic_value: string;
  standard_value: string;
  advanced_value: string;
  pro_audit_value: string;
  status: string;
  isNew?: boolean;
  isModified?: boolean;
}

const VALUE_OPTIONS = [
  { label: "✓ (Enabled)", value: "true" },
  { label: "✗ (Disabled)", value: "false" },
  { label: "Unlimited", value: "Unlimited" },
  { label: "Coming soon", value: "Coming soon" },
  { label: "Automated", value: "Automated" },
  { label: "Manual", value: "Manual" },
];

const DEFAULT_FEATURES: Omit<FeatureRow, "id">[] = [
  { feature_name: "Users", display_order: 1, basic_value: "1", standard_value: "5", advanced_value: "Unlimited", pro_audit_value: "Unlimited", status: "Active" },
  { feature_name: "Projects", display_order: 2, basic_value: "1", standard_value: "1", advanced_value: "10", pro_audit_value: "Unlimited", status: "Active" },
  { feature_name: "Trusts", display_order: 3, basic_value: "2", standard_value: "2", advanced_value: "10", pro_audit_value: "Unlimited", status: "Active" },
  { feature_name: "Trust 7 year history", display_order: 4, basic_value: "2", standard_value: "2", advanced_value: "10", pro_audit_value: "Unlimited", status: "Active" },
  { feature_name: "Principals", display_order: 5, basic_value: "true", standard_value: "true", advanced_value: "true", pro_audit_value: "true", status: "Active" },
  { feature_name: "Head Contractors", display_order: 6, basic_value: "true", standard_value: "true", advanced_value: "true", pro_audit_value: "true", status: "Active" },
  { feature_name: "Sub Contracts", display_order: 7, basic_value: "true", standard_value: "true", advanced_value: "true", pro_audit_value: "true", status: "Active" },
  { feature_name: "Notices", display_order: 8, basic_value: "Manual", standard_value: "Automated", advanced_value: "Automated", pro_audit_value: "Automated", status: "Active" },
  { feature_name: "ABA Generation", display_order: 9, basic_value: "false", standard_value: "true", advanced_value: "true", pro_audit_value: "true", status: "Active" },
  { feature_name: "Bank Fees", display_order: 10, basic_value: "false", standard_value: "Coming soon", advanced_value: "Coming soon", pro_audit_value: "Coming soon", status: "Active" },
  { feature_name: "Delegate authority", display_order: 11, basic_value: "false", standard_value: "false", advanced_value: "true", pro_audit_value: "true", status: "Active" },
  { feature_name: "Xero Integration", display_order: 12, basic_value: "false", standard_value: "false", advanced_value: "true", pro_audit_value: "true", status: "Active" },
  { feature_name: "Onboarding support", display_order: 13, basic_value: "false", standard_value: "false", advanced_value: "1 hour", pro_audit_value: "3 hours", status: "Active" },
  { feature_name: "Audit export", display_order: 14, basic_value: "false", standard_value: "false", advanced_value: "false", pro_audit_value: "true", status: "Active" },
  { feature_name: "Trust account records", display_order: 15, basic_value: "true", standard_value: "true", advanced_value: "true", pro_audit_value: "true", status: "Active" },
  { feature_name: "Community", display_order: 16, basic_value: "true", standard_value: "true", advanced_value: "true", pro_audit_value: "true", status: "Active" },
  { feature_name: "Eligibility checks", display_order: 17, basic_value: "true", standard_value: "true", advanced_value: "true", pro_audit_value: "true", status: "Active" },
  { feature_name: "Account opening", display_order: 18, basic_value: "true", standard_value: "true", advanced_value: "true", pro_audit_value: "true", status: "Active" },
  { feature_name: "Progress claim", display_order: 19, basic_value: "true", standard_value: "true", advanced_value: "true", pro_audit_value: "true", status: "Active" },
  { feature_name: "Payment schedule", display_order: 20, basic_value: "true", standard_value: "true", advanced_value: "true", pro_audit_value: "true", status: "Active" },
  { feature_name: "Compliance monitoring", display_order: 21, basic_value: "true", standard_value: "true", advanced_value: "true", pro_audit_value: "true", status: "Active" },
  { feature_name: "Retention record", display_order: 22, basic_value: "true", standard_value: "true", advanced_value: "true", pro_audit_value: "true", status: "Active" },
  { feature_name: "Notice management", display_order: 23, basic_value: "true", standard_value: "true", advanced_value: "true", pro_audit_value: "true", status: "Active" },
  { feature_name: "Contract management", display_order: 24, basic_value: "true", standard_value: "true", advanced_value: "true", pro_audit_value: "true", status: "Active" },
  { feature_name: "Accountant access", display_order: 25, basic_value: "true", standard_value: "true", advanced_value: "true", pro_audit_value: "true", status: "Active" },
];

function ValueCell({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const [isCustom, setIsCustom] = useState(false);
  const isPreset = VALUE_OPTIONS.some((opt) => opt.value === value);

  useEffect(() => {
    setIsCustom(!isPreset && value !== "");
  }, []);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === "__custom__") {
      setIsCustom(true);
      onChange("");
    } else {
      setIsCustom(false);
      onChange(selected);
    }
  };

  if (isCustom) {
    return (
      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Custom value"
          disabled={disabled}
        />
        <button
          className="outline secondary"
          onClick={() => {
            setIsCustom(false);
            onChange("true");
          }}
          title="Back to presets"
          disabled={disabled}
          style={{ padding: "var(--space-3xs) var(--space-2xs)", whiteSpace: "nowrap" }}
        >
          <i className="fa-light fa-list"></i>
        </button>
      </div>
    );
  }

  return (
    <select
      value={isPreset ? value : "__custom__"}
      onChange={handleSelectChange}
      disabled={disabled}
    >
      {VALUE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
      <option value="__custom__">Custom...</option>
    </select>
  );
}

function PreviewCell({ value }: { value: string }) {
  if (!value || value === "false") {
    return <i className="fa-light fa-xmark invalid" style={{ color: "#e23b30" }}></i>;
  }
  if (value === "true") {
    return <i className="fa-light fa-check valid" style={{ color: "#2a7b6f" }}></i>;
  }
  return <span style={{ color: "#2a7b6f" }}>{value}</span>;
}

export default function PricingTableEditor() {
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FeatureRow | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    setLoading(true);
    try {
      const data = await FetchPricingTableFeatures();
      setFeatures(
        data.map((f: any) => ({
          ...f,
          isNew: false,
          isModified: false,
        }))
      );
      setHasChanges(false);
    } catch (error) {
      console.error("Error loading features:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateFeature = (index: number, field: string, value: string) => {
    const updated = [...features];
    (updated[index] as any)[field] = value;
    updated[index].isModified = true;
    setFeatures(updated);
    setHasChanges(true);
  };

  const applyFallback = () => {
    const fallbackRows: FeatureRow[] = DEFAULT_FEATURES.map((f) => ({
      ...f,
      isNew: true,
      isModified: true,
    }));
    setFeatures(fallbackRows);
    setHasChanges(true);
  };

  const addNewRow = () => {
    const maxOrder = features.reduce(
      (max, f) => Math.max(max, f.display_order),
      0
    );
    const newFeature: FeatureRow = {
      feature_name: "",
      display_order: maxOrder + 1,
      basic_value: "true",
      standard_value: "true",
      advanced_value: "true",
      pro_audit_value: "true",
      status: "Active",
      isNew: true,
      isModified: true,
    };
    setFeatures([...features, newFeature]);
    setHasChanges(true);
  };

  const moveRow = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === features.length - 1)
    )
      return;
    const updated = [...features];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    const tempOrder = updated[index].display_order;
    updated[index].display_order = updated[swapIndex].display_order;
    updated[swapIndex].display_order = tempOrder;
    updated[index].isModified = true;
    updated[swapIndex].isModified = true;
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    setFeatures(updated);
    setHasChanges(true);
  };

  const handleDelete = (feature: FeatureRow) => {
    if (feature.isNew) {
      setFeatures(features.filter((f) => f !== feature));
      return;
    }
    setDeleteTarget(feature);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    const success = await DeletePricingTableFeature(deleteTarget.id);
    if (success) {
      setFeatures(features.filter((f) => f.id !== deleteTarget.id));
    }
    setDeleteModalVisible(false);
    setDeleteTarget(null);
  };

  const handleSaveAll = async () => {
    const modifiedFeatures = features.filter((f) => f.isModified);
    if (modifiedFeatures.length === 0) {
      showSuccessToast("No changes to save");
      return;
    }

    for (const f of modifiedFeatures) {
      if (!f.feature_name.trim()) {
        showErrorToast("Feature name cannot be empty");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = modifiedFeatures.map((f) => ({
        id: f.id || undefined,
        feature_name: f.feature_name,
        display_order: f.display_order,
        basic_value: f.basic_value || "false",
        standard_value: f.standard_value || "false",
        advanced_value: f.advanced_value || "false",
        pro_audit_value: f.pro_audit_value || "false",
        status: f.status,
      }));

      const result = await BulkUpdatePricingTableFeatures(payload);
      if (result) {
        await loadFeatures();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="container-fluid">
        <div className="pt_title">
          <BreadCrumbs
            routePaths={[
              { name: "Dashboard", path: AppRoutes.ADMIN_DASHBOARD },
              {
                name: "Subscriptions",
                path: AppRoutes.ADMIN_SUBSCRIPTION_CURRENT_PLAN,
              },
            ]}
            activeRoute={"Pricing Table"}
          />

          <div className="grid pt_topfilters">
            <div className="pt_pagetitle">
              <h1>Pricing Table Features</h1>
            </div>
            <div className="pt_pageactions">
              <button
                className="secondary"
                onClick={() => setShowPreview(!showPreview)}
              >
                <i
                  className={`fa-light ${showPreview ? "fa-table" : "fa-eye"}`}
                ></i>
                {showPreview ? "Edit Mode" : "Preview"}
              </button>
              {features.length === 0 && !showPreview && (
                <button
                  className="secondary"
                  onClick={applyFallback}
                >
                  <i className="fa-light fa-arrow-rotate-left"></i>
                  Apply Fallback
                </button>
              )}
              <button
                className="secondary"
                onClick={addNewRow}
                disabled={showPreview}
              >
                <i className="fa-light fa-hexagon-plus"></i>
                Add Feature
              </button>
              <button
                className="secondary"
                onClick={handleSaveAll}
                disabled={!hasChanges || saving || showPreview}
                style={hasChanges && !saving && !showPreview ? { background: "var(--river)", color: "var(--wind)" } : undefined}
              >
                <i
                  className={`fa-light ${
                    saving ? "fa-spinner-third fa-spin" : "fa-floppy-disk"
                  }`}
                ></i>
                {saving ? "Saving..." : "Save All Changes"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid">
          <div className="pt_box">
            {loading ? (
              <div className="text_center" style={{ padding: "60px 20px" }}>
                <i className="fa-light fa-spinner-third fa-spin" style={{ fontSize: "2rem", marginBottom: "16px", display: "block" }}></i>
                <p>Loading pricing table features...</p>
              </div>
            ) : showPreview ? (
              <div>
                <h3 style={{ fontSize: "1rem", marginBottom: "16px" }}>
                  <i className="fa-light fa-eye" style={{ marginRight: "8px", color: "var(--river)" }}></i>
                  Pricing Table Preview
                </h3>
                <div className="pt_defaulttable_scroll">
                  <table className="pt_defaulttable">
                    <thead>
                      <tr>
                        <th>Feature</th>
                        <th className="centered">Basic</th>
                        <th className="centered">Standard</th>
                        <th className="centered">Advanced</th>
                        <th className="centered">Pro Audit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="largeicon">
                        <td></td>
                        <td className="centered">Free</td>
                        <td className="centered">$10.00/mo</td>
                        <td className="centered">$100.00/mo</td>
                        <td className="centered">$300.00/mo</td>
                      </tr>
                      {features
                        .filter((f) => f.status === "Active")
                        .map((feature, idx) => (
                          <tr className="largeicon" key={feature.id || idx}>
                            <td>{feature.feature_name}</td>
                            <td className="centered">
                              <PreviewCell value={feature.basic_value} />
                            </td>
                            <td className="centered">
                              <PreviewCell value={feature.standard_value} />
                            </td>
                            <td className="centered">
                              <PreviewCell value={feature.advanced_value} />
                            </td>
                            <td className="centered">
                              <PreviewCell value={feature.pro_audit_value} />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="pt_defaulttable_scroll">
                <table className="pt_defaulttable">
                  <thead>
                    <tr>
                      <th className="centered" style={{ width: "70px" }}>#</th>
                      <th style={{ minWidth: "180px" }}>Feature Name</th>
                      <th style={{ minWidth: "130px" }}>Basic</th>
                      <th style={{ minWidth: "130px" }}>Standard</th>
                      <th style={{ minWidth: "130px" }}>Advanced</th>
                      <th style={{ minWidth: "130px" }}>Pro Audit</th>
                      <th style={{ width: "110px" }}>Status</th>
                      <th className="centered" style={{ width: "100px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {features.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text_center" style={{ padding: "40px" }}>
                          No features configured yet. Click &quot;Add Feature&quot; to get started.
                        </td>
                      </tr>
                    ) : (
                      features.map((feature, index) => (
                        <tr
                          key={feature.id || `new-${index}`}
                          style={
                            feature.isNew
                              ? { backgroundColor: "#ecfdf5" }
                              : feature.isModified
                              ? { backgroundColor: "#fefce8" }
                              : undefined
                          }
                        >
                          <td className="centered">
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "center" }}>
                              <button
                                onClick={() => moveRow(index, "up")}
                                disabled={index === 0}
                                className="outline secondary"
                                title="Move up"
                                style={{ padding: "2px 6px", border: "none", background: "none" }}
                              >
                                <i className="fa-light fa-chevron-up"></i>
                              </button>
                              <span style={{ fontWeight: 500, minWidth: "20px", textAlign: "center" }}>{feature.display_order}</span>
                              <button
                                onClick={() => moveRow(index, "down")}
                                disabled={index === features.length - 1}
                                className="outline secondary"
                                title="Move down"
                                style={{ padding: "2px 6px", border: "none", background: "none" }}
                              >
                                <i className="fa-light fa-chevron-down"></i>
                              </button>
                            </div>
                          </td>
                          <td>
                            <input
                              type="text"
                              value={feature.feature_name}
                              onChange={(e) =>
                                updateFeature(index, "feature_name", e.target.value)
                              }
                              placeholder="Feature name"
                            />
                          </td>
                          <td>
                            <ValueCell
                              value={feature.basic_value || "false"}
                              onChange={(val) =>
                                updateFeature(index, "basic_value", val)
                              }
                            />
                          </td>
                          <td>
                            <ValueCell
                              value={feature.standard_value || "false"}
                              onChange={(val) =>
                                updateFeature(index, "standard_value", val)
                              }
                            />
                          </td>
                          <td>
                            <ValueCell
                              value={feature.advanced_value || "false"}
                              onChange={(val) =>
                                updateFeature(index, "advanced_value", val)
                              }
                            />
                          </td>
                          <td>
                            <ValueCell
                              value={feature.pro_audit_value || "false"}
                              onChange={(val) =>
                                updateFeature(index, "pro_audit_value", val)
                              }
                            />
                          </td>
                          <td>
                            <select
                              value={feature.status}
                              onChange={(e) =>
                                updateFeature(index, "status", e.target.value)
                              }
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          </td>
                          <td className="centered">
                            <button
                              onClick={() => handleDelete(feature)}
                              className="contrast"
                              title="Delete feature"
                              style={{ padding: "var(--space-3xs) var(--space-2xs)" }}
                            >
                              <i className="fa-light fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {deleteModalVisible && (
        <BaseModal
          modalId="delete-pricing-feature"
          displayModal={deleteModalVisible}
          title="Confirmation"
          onClose={() => {
            setDeleteModalVisible(false);
            setDeleteTarget(null);
          }}
          onConfirm={() => {
            confirmDelete();
            return true;
          }}
        >
          <h4 className="text_center">
            Are you sure you want to delete the feature &quot;
            {deleteTarget?.feature_name}&quot;?
          </h4>
        </BaseModal>
      )}
    </div>
  );
}
