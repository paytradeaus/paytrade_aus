const statusOptions = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

function tabOptions(disablePrivileges = false) {
  return [
    { label: "Group Definition", value: "groupDefinition" },
    {
      label: "Group Privileges",
      value: "groupPrivileges",
      disable: disablePrivileges,
    },
  ];
}

const groupGridHeaders = [{ title: "Form title", restrictSorting: true }];

const groupRenderData = [{ key: "menu_name" }];

export { tabOptions, statusOptions, groupGridHeaders, groupRenderData };
