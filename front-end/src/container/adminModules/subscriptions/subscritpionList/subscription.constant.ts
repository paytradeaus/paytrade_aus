import { DELETE, EDIT, VIEW } from "@/common/constants/general";

const freeActionOptions = [
  { label: "View", value: VIEW },
  { label: "Edit", value: EDIT },
];

const AllActionOptions = [
  ...freeActionOptions,
  { label: DELETE, value: DELETE, isDelete: true },
];

const statusOptions = [
  { value: "", label: "All" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "In Active" },
];
const planTypes = [
  { value: "", label: "All" },
  { value: "Free", label: "Free" },
  { value: "Paid", label: "Paid" },
];

export { freeActionOptions, AllActionOptions, statusOptions, planTypes };
