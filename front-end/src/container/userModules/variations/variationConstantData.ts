import { DELETE, EDIT, VIEW } from "@/common/constants/general";

const variationStatusOptions = [
  {
    value: "Draft",
    label: "Draft",
  },
  {
    value: "In Review",
    label: "In Review",
  },
  {
    value: "Agreed",
    label: "Agreed",
  },
  {
    value: "Refused",
    label: "Refused",
  },
  {
    value: "Deleted",
    label: "Deleted",
  },
];

const gridStatusOptions = [
  { value: null, label: "All" },
  { value: "Agreed", label: "Agreed" },
  { value: "Draft", label: "Draft" },
  { value: "In Review", label: "In Review" },
  { value: "Refused", label: "Refused" },
];

const PROJECT = "project";
const CONTRACT = "contract";
const STATUS = "status";

const currentListActions: any = [
  { label: "View", value: "View" },
  { label: "Edit", value: EDIT },
  { label: DELETE, value: DELETE, isDelete: true },
];

const tabOptions = [
  { id: "Current Projects", label: "Current ", hasError: false },
  { id: "Archived Projects", label: "Archived ", hasError: true },
];

export {
  tabOptions,
  variationStatusOptions,
  PROJECT,
  CONTRACT,
  STATUS,
  currentListActions,
  gridStatusOptions,
};
