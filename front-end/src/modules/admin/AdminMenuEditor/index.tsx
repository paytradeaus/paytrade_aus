"use client";

import React, { useEffect, useState } from "react";
import BreadCrumbs from "@/components/BreadCrumbs";
import { AppRoutes } from "@/shared/constant/appRoutes";
import BaseModal from "@/components/BaseModal";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import {
  FetchAllAdminMenus,
  AddAdminMenu,
  DeleteAdminMenu,
  BulkUpdateAdminMenus,
} from "./adminMenuEditor.functions";
import styles from "./adminMenuEditor.module.css";

interface SubMenu {
  name: string;
  route: string;
  icon: string;
}

interface MenuRow {
  id?: string;
  menu_name: string;
  route_path: string;
  menu_order: number;
  menu_icon: string;
  menu_status: string;
  sub_menus: SubMenu[];
  isNew?: boolean;
  isModified?: boolean;
}

const BREADCRUMBS = [
  { label: "Dashboard", link: AppRoutes.ADMIN_DASHBOARD },
  { label: "Admin Menus", link: "" },
];

export default function AdminMenuEditor() {
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    index: number;
    name: string;
  }>({ open: false, index: -1, name: "" });

  useEffect(() => {
    loadMenus();
  }, []);

  async function loadMenus() {
    setLoading(true);
    const data = await FetchAllAdminMenus();
    const mapped: MenuRow[] = data.map((m: any) => ({
      id: m.id,
      menu_name: m.menu_name || "",
      route_path: m.route_path || "",
      menu_order: m.menu_order || 0,
      menu_icon: m.menu_icon || "",
      menu_status: m.menu_status || "Active",
      sub_menus: (m.sub_menus || [])
        .filter((s: any) => s.name && s.name.trim() !== "")
        .map((s: any) => ({
          name: s.name || "",
          route: s.route || "",
          icon: s.icon || "",
        })),
    }));
    setMenus(mapped);
    setLoading(false);
  }

  function hasChanges() {
    return menus.some((m) => m.isNew || m.isModified);
  }

  function updateField(index: number, field: keyof MenuRow, value: any) {
    setMenus((prev) => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
      if (!updated[index].isNew) updated[index].isModified = true;
      return updated;
    });
  }

  function moveMenu(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= menus.length) return;

    setMenus((prev) => {
      const updated = [...prev];
      const tempOrder = updated[index].menu_order;
      updated[index].menu_order = updated[newIndex].menu_order;
      updated[newIndex].menu_order = tempOrder;

      if (!updated[index].isNew) updated[index].isModified = true;
      if (!updated[newIndex].isNew) updated[newIndex].isModified = true;

      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
  }

  function addNewMenu() {
    const maxOrder = menus.reduce((max, m) => Math.max(max, m.menu_order), 0);
    setMenus((prev) => [
      ...prev,
      {
        menu_name: "",
        route_path: "/admin/",
        menu_order: maxOrder + 1,
        menu_icon: "fa-light fa-circle",
        menu_status: "Active",
        sub_menus: [],
        isNew: true,
      },
    ]);
  }

  function addSubMenu(menuIndex: number) {
    setMenus((prev) => {
      const updated = [...prev];
      updated[menuIndex].sub_menus = [
        ...updated[menuIndex].sub_menus,
        { name: "", route: "", icon: "" },
      ];
      if (!updated[menuIndex].isNew) updated[menuIndex].isModified = true;
      return updated;
    });
  }

  function updateSubMenu(
    menuIndex: number,
    subIndex: number,
    field: keyof SubMenu,
    value: string
  ) {
    setMenus((prev) => {
      const updated = [...prev];
      updated[menuIndex].sub_menus = [...updated[menuIndex].sub_menus];
      updated[menuIndex].sub_menus[subIndex] = {
        ...updated[menuIndex].sub_menus[subIndex],
        [field]: value,
      };
      if (!updated[menuIndex].isNew) updated[menuIndex].isModified = true;
      return updated;
    });
  }

  function removeSubMenu(menuIndex: number, subIndex: number) {
    setMenus((prev) => {
      const updated = [...prev];
      updated[menuIndex].sub_menus = updated[menuIndex].sub_menus.filter(
        (_, i) => i !== subIndex
      );
      if (!updated[menuIndex].isNew) updated[menuIndex].isModified = true;
      return updated;
    });
  }

  async function handleSaveAll() {
    const invalid = menus.find(
      (m) => (m.isNew || m.isModified) && (!m.menu_name.trim() || !m.route_path.trim())
    );
    if (invalid) {
      showErrorToast("Menu name and route path are required for all menus");
      return;
    }

    setSaving(true);
    try {
      const newMenus = menus.filter((m) => m.isNew);
      for (const m of newMenus) {
        await AddAdminMenu({
          menu_name: m.menu_name,
          route_path: m.route_path,
          menu_order: m.menu_order,
          menu_icon: m.menu_icon,
          menu_status: m.menu_status,
          sub_menus: m.sub_menus.length > 0 ? m.sub_menus : [{ name: "", route: "", icon: "" }],
        });
      }

      const modifiedMenus = menus.filter((m) => m.isModified && !m.isNew && m.id);
      if (modifiedMenus.length > 0) {
        const bulkInput = modifiedMenus.map((m) => ({
          id: m.id!,
          menu_name: m.menu_name,
          route_path: m.route_path,
          menu_order: m.menu_order,
          menu_icon: m.menu_icon,
          menu_status: m.menu_status,
          sub_menus: m.sub_menus.length > 0 ? m.sub_menus : [{ name: "", route: "", icon: "" }],
        }));
        await BulkUpdateAdminMenus(bulkInput);
      }

      if (newMenus.length === 0 && modifiedMenus.length > 0) {
        showSuccessToast("All changes saved successfully");
      }

      await loadMenus();
    } catch (error: any) {
      showErrorToast(error?.message || "Failed to save changes");
    }
    setSaving(false);
  }

  async function handleDelete() {
    const menu = menus[deleteModal.index];
    if (!menu) return;

    if (menu.isNew) {
      setMenus((prev) => prev.filter((_, i) => i !== deleteModal.index));
      setDeleteModal({ open: false, index: -1, name: "" });
      return;
    }

    if (menu.id) {
      const success = await DeleteAdminMenu(menu.id);
      if (success) {
        await loadMenus();
      }
    }
    setDeleteModal({ open: false, index: -1, name: "" });
  }

  if (loading) {
    return (
      <div className="main-content">
        <BreadCrumbs breadCrumbs={BREADCRUMBS} />
        <div className={styles.loadingState}>
          <i className="fa-light fa-spinner fa-spin" />
          <span>Loading admin menus...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <BreadCrumbs breadCrumbs={BREADCRUMBS} />
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">Admin Menu Management</h4>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={addNewMenu}
          >
            <i className="fa-light fa-plus me-1" />
            Add Menu
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSaveAll}
            disabled={!hasChanges() || saving}
          >
            {saving ? (
              <>
                <i className="fa-light fa-spinner fa-spin me-1" />
                Saving...
              </>
            ) : (
              <>
                <i className="fa-light fa-floppy-disk me-1" />
                Save All Changes
              </>
            )}
          </button>
        </div>
      </div>

      {menus.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No admin menus found. Click "Add Menu" to create one.</p>
        </div>
      ) : (
        <div className={styles.editorTable}>
          <div className={styles.tableHeader}>
            <div className={styles.colOrder}>Order</div>
            <div className={styles.colName}>Menu Name</div>
            <div className={styles.colRoute}>Route Path</div>
            <div className={styles.colIcon}>Icon Class</div>
            <div className={styles.colSubMenus}>Sub-Menus</div>
            <div className={styles.colStatus}>Status</div>
            <div className={styles.colActions}></div>
          </div>

          {menus.map((menu, index) => (
            <div
              key={menu.id || `new-${index}`}
              className={`${styles.tableRow} ${
                menu.isNew ? styles.newRow : menu.isModified ? styles.modified : ""
              }`}
            >
              <div className={styles.colOrder}>
                <div className={styles.orderControls}>
                  <button
                    className={styles.orderBtn}
                    onClick={() => moveMenu(index, "up")}
                    disabled={index === 0}
                    title="Move up"
                  >
                    <i className="fa-solid fa-chevron-up" />
                  </button>
                  <span>{menu.menu_order}</span>
                  <button
                    className={styles.orderBtn}
                    onClick={() => moveMenu(index, "down")}
                    disabled={index === menus.length - 1}
                    title="Move down"
                  >
                    <i className="fa-solid fa-chevron-down" />
                  </button>
                </div>
              </div>

              <div className={styles.colName}>
                <input
                  type="text"
                  className={styles.nameInput}
                  value={menu.menu_name}
                  onChange={(e) => updateField(index, "menu_name", e.target.value)}
                  placeholder="Menu name"
                />
              </div>

              <div className={styles.colRoute}>
                <input
                  type="text"
                  className={styles.cellInput}
                  value={menu.route_path}
                  onChange={(e) => updateField(index, "route_path", e.target.value)}
                  placeholder="/admin/..."
                />
              </div>

              <div className={styles.colIcon}>
                <div className={styles.iconPreview}>
                  <i className={menu.menu_icon || "fa-light fa-circle"} />
                  <input
                    type="text"
                    className={styles.cellInput}
                    value={menu.menu_icon}
                    onChange={(e) => updateField(index, "menu_icon", e.target.value)}
                    placeholder="fa-light fa-..."
                  />
                </div>
              </div>

              <div className={styles.colSubMenus}>
                <div className={styles.subMenuList}>
                  {menu.sub_menus.map((sub, subIdx) => (
                    <div key={subIdx} className={styles.subMenuItem}>
                      <input
                        type="text"
                        value={sub.name}
                        onChange={(e) =>
                          updateSubMenu(index, subIdx, "name", e.target.value)
                        }
                        placeholder="Name"
                        title="Sub-menu name"
                      />
                      <input
                        type="text"
                        value={sub.route}
                        onChange={(e) =>
                          updateSubMenu(index, subIdx, "route", e.target.value)
                        }
                        placeholder="Route"
                        title="Sub-menu route"
                      />
                      <button
                        className={styles.subMenuRemoveBtn}
                        onClick={() => removeSubMenu(index, subIdx)}
                        title="Remove sub-menu"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    </div>
                  ))}
                  <button
                    className={styles.subMenuAddBtn}
                    onClick={() => addSubMenu(index)}
                  >
                    <i className="fa-light fa-plus me-1" />
                    Add sub-menu
                  </button>
                </div>
              </div>

              <div className={styles.colStatus}>
                <select
                  className={`${styles.statusSelect} ${
                    menu.menu_status === "Active" ? styles.active : styles.inactive
                  }`}
                  value={menu.menu_status}
                  onChange={(e) => updateField(index, "menu_status", e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className={styles.colActions}>
                <button
                  className={styles.deleteBtn}
                  onClick={() =>
                    setDeleteModal({
                      open: true,
                      index,
                      name: menu.menu_name || "this menu",
                    })
                  }
                  title="Delete menu"
                >
                  <i className="fa-light fa-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasChanges() && (
        <div className="d-flex justify-content-end mt-3">
          <button
            className="btn btn-outline-secondary btn-sm me-2"
            onClick={loadMenus}
            disabled={saving}
          >
            Discard Changes
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSaveAll}
            disabled={saving}
          >
            {saving ? (
              <>
                <i className="fa-light fa-spinner fa-spin me-1" />
                Saving...
              </>
            ) : (
              <>
                <i className="fa-light fa-floppy-disk me-1" />
                Save All Changes
              </>
            )}
          </button>
        </div>
      )}

      <BaseModal
        show={deleteModal.open}
        title="Delete Menu"
        handleClose={() => setDeleteModal({ open: false, index: -1, name: "" })}
        primaryButtonLabel="Delete"
        secondaryButtonLabel="Cancel"
        onPrimaryClick={handleDelete}
        onSecondaryClick={() => setDeleteModal({ open: false, index: -1, name: "" })}
      >
        <p>
          Are you sure you want to delete <strong>{deleteModal.name}</strong>?
          This will also remove all group permissions associated with this menu.
        </p>
      </BaseModal>
    </div>
  );
}
