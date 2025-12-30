import React, { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as yup from "yup";
import Table from "react-bootstrap/Table";
import styles from "./permissionTable.module.scss";
import CheckBox from "@/components/CheckBox/checkBox";
import { AdminfetchListOfAllMenus } from "./permissionTable.functions";

// Define the types for menu and permission objects
type Menu = {
  id: string;
  menu_description: string;
  menu_name: string;
};

type PermissionKey =
  | "listPermission"
  | "viewPermission"
  | "insertPermission"
  | "updatePermission"
  | "deletePermission"
  | "printPermission"
  | "exportPermission"
  | "allPermission";

type Permission = {
  menuId: string;
  listPermission: boolean;
  viewPermission: boolean;
  insertPermission: boolean;
  updatePermission: boolean;
  deletePermission: boolean;
  printPermission: boolean;
  exportPermission: boolean;
  allPermission: boolean;
} & Record<PermissionKey, boolean>;

type PermissionsState = Permission[];
type PermissionsFormValues = {
  permissions: PermissionsState;
  headerCheckboxes:
    | {
        [key in PermissionKey]?: boolean;
      }
    | any;
};

function PermissionsTable(props: any) {
  const { setPrivilegesData, privilegesData, isEdit, setModifiedData } = props;
  const [permissions, setPermissions] = useState<PermissionsState>([]);
  const [privilegesTitles, setPrivilegesTitles] = useState<{
    [key: string]: string;
  }>({});
  const [updateData, setUpdateData] = useState<[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMenus = async () => {
      setLoading(true);
      const menusResponse = await AdminfetchListOfAllMenus(setLoading);
      if (menusResponse) {
        let empobj = {},
          payloadFormat: any = [];
        menusResponse?.map((obj: any, index: number) => {
          const findMenuValueArr = privilegesData?.filter(
            (value: any) => value?.menuId === obj?.id
          );

          const value =
            findMenuValueArr?.length > 0
              ? findMenuValueArr?.[0]
              : { allPermission: false };
          empobj = {
            ...empobj,
            [obj?.menu_name]: value?.allPermission,
          };

          const initialPermissions = {
            menuId: obj?.id,
            listPermission: true,
            viewPermission: true,
            insertPermission: true,
            updatePermission: true,
            deletePermission: true,
            printPermission: true,
            exportPermission: true,
            allPermission: value?.allPermission,
          };
          payloadFormat?.push(initialPermissions);
        });

        formik.setFieldValue(`headerCheckboxes`, empobj);
        setUpdateData(payloadFormat);
        setModifiedData(payloadFormat);

        const titles = menusResponse.reduce(
          (acc: { [key: string]: string }, menu: Menu) => {
            acc[menu.id] = menu.menu_name;
            return acc;
          },
          {}
        );
        setPrivilegesTitles(titles);
      }
    };
    fetchMenus();
  }, []);

  const schema = yup.object().shape({
    permissions: yup.array().of(
      yup.object().shape({
        menuId: yup.string().required("Menu ID is required"),
        listPermission: yup.boolean(),
        viewPermission: yup.boolean(),
        insertPermission: yup.boolean(),
        updatePermission: yup.boolean(),
        deletePermission: yup.boolean(),
        printPermission: yup.boolean(),
        exportPermission: yup.boolean(),
        allPermission: yup.boolean(),
      })
    ),
    headerCheckboxes: yup.object().shape({
      listPermission: yup.boolean(),
      viewPermission: yup.boolean(),
      insertPermission: yup.boolean(),
      updatePermission: yup.boolean(),
      deletePermission: yup.boolean(),
      printPermission: yup.boolean(),
      exportPermission: yup.boolean(),
      allPermission: yup.boolean(),
    }),
  });

  const formik = useFormik<PermissionsFormValues>({
    initialValues: {
      permissions: permissions,
      headerCheckboxes: {},
    },
    validationSchema: schema,
    onSubmit: async (values, { setSubmitting }) => {
      setSubmitting(false);

      // Send only selected menu items with at least one permission checked
      const selectedPermissions = values.permissions.filter((permission) =>
        Object.values(permission).some((value) => value === true)
      );

      // Here you can make an API call or handle the selected permissions data
    },
  });

  const handleHeaderCheckboxChange = (
    permissionType: PermissionKey,
    value: boolean
  ) => {
    const updatedPermissions = permissions.map((permission) => ({
      ...permission,
      [permissionType]: value,
    }));

    formik.setFieldValue("permissions", updatedPermissions);
    setPermissions(updatedPermissions);
    formik.setFieldValue(`headerCheckboxes.${permissionType}`, value);
    setPrivilegesData(updatedPermissions);
  };

  const handleUpdateData = (paramsObj: {
    menuId?: any;
    value: boolean;
    isMutliSelct?: boolean;
  }) => {
    const updatedMenuPrivileges: any = updateData?.map((privilege: any) => {
      if (privilege?.menuId === paramsObj?.menuId || paramsObj?.isMutliSelct) {
        return { ...privilege, allPermission: paramsObj?.value };
      }
      return privilege;
    });
    setUpdateData(updatedMenuPrivileges);
    setModifiedData(updatedMenuPrivileges);
  };

  return (
    <form onSubmit={formik.handleSubmit}>
      <Table bordered responsive>
        <thead>
          <tr className="text-center">
            <th rowSpan={2}>
              <div className={styles.tableTitleStyle}>
                <p>Form Title</p>
              </div>
            </th>
            <th colSpan={7}>Form Action</th>
          </tr>
          <tr className="text-center">
            <th>
              <CheckBox
                label=""
                type="checkbox"
                className={styles.checkBoxHeights}
                checked={
                  Object.values(formik.values.headerCheckboxes).every(
                    (value) => value
                  )
                    ? true
                    : false
                }
                onChange={() => {
                  const isChecked = Object.values(
                    formik.values.headerCheckboxes
                  ).every((value) => value)
                    ? true
                    : false;
                  Object.keys(formik.values.headerCheckboxes).forEach((key) =>
                    handleHeaderCheckboxChange(key as PermissionKey, !isChecked)
                  );
                  handleUpdateData({ isMutliSelct: true, value: !isChecked });
                }}
              />
              <p> All</p>
            </th>
          </tr>
        </thead>
        <tbody>
          {Object?.keys(privilegesTitles)?.map((menuId, i) => (
            <tr key={menuId}>
              <td>{privilegesTitles[menuId] || "Unknown Menu"}</td>
              <td className="text-center">
                <CheckBox
                  label=""
                  type="checkbox"
                  className={styles.checkBoxHeights}
                  checked={
                    formik?.values?.headerCheckboxes?.[privilegesTitles[menuId]]
                  }
                  onChange={() =>
                    // handleCheckboxChange(permission.menuId, "allPermission")
                    {
                      const newValue =
                        !formik?.values?.headerCheckboxes?.[
                          privilegesTitles[menuId]
                        ];
                      formik.setFieldValue(
                        `headerCheckboxes.${privilegesTitles[menuId]}`,
                        newValue
                      );
                      handleUpdateData({ menuId: menuId, value: newValue });
                    }
                  }
                  aria-label={`List permission for menu item ${menuId}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </form>
  );
}

export default PermissionsTable;
