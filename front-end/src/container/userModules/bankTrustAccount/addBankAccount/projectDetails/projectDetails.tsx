"use client";

import React, { useCallback, useEffect, useState } from "react";
import styles from "./projectDetails.module.scss";
import { Button, Table } from "react-bootstrap";
import FormButton from "@/components/Button/button";
import TextField from "@/components/TextField/textField";
import CheckBox from "@/components/CheckBox/checkBox";
import { toast } from "@/app/Toaster";

const ProjectDetails = (props: any) => {
  const { setViewPages, selectedProjects, projectOpt, setSelectedProjects } =
    props;
  const [search, setSearch] = useState("");
  const [projectsData, setProjectsData] = useState<any[]>([]);

  const [projects, setProjects] = useState<any[]>([]);

  const [selectAll, setSelectAll] = useState(false);
  const [selectedItems, setSelectedItems] = useState<any[]>(selectedProjects);

  useEffect(() => {
    if (projectOpt?.length > 0) {
      let modifiedObj = projectOpt?.map((each: any) => {
        return {
          ...each,
          checked: selectedItems.includes(each?.value),
        };
      });
      setProjects(modifiedObj || []);
      setProjectsData(modifiedObj || []);
      if (modifiedObj?.length === selectedItems?.length) {
        setSelectAll(true);
      }
    }
  }, [projectOpt]);

  useEffect(() => {
    if (projectsData.length) {
      let filteredObj = projectsData?.filter((each: any) =>
        each.label.toLowerCase().includes(search.toLowerCase())
      );
      setProjects(filteredObj || []);
    }
  }, [search]);

  const handleFormCancelClick = () => {
    setViewPages("mainPage");
  };

  const handleSaveClick = () => {
    if (selectedItems?.length === 0) {
      toast.warn("Select one or more projects ");
      return;
    }

    toast.success(
      `Project details ${selectedProjects?.length > 0 ? "updated" : "added"}`
    );
    setSelectedProjects(selectedItems);
    setViewPages("mainPage");
  };

  const onInputChange = useCallback((e: { target: { value: string } }) => {
    const inputValue = e?.target?.value?.trim()
      ? e?.target?.value
      : e?.target?.value?.trim();
    setSearch(inputValue);
  }, []);

  const handleCheckboxChange = (index: number) => {
    const updatedItemsData: any = [...projects];
    updatedItemsData[index].checked = !updatedItemsData[index].checked;
    setProjects(updatedItemsData);
    // Update selectedItems based on checkbox status
    const selectedItemValue = updatedItemsData[index].value;
    if (updatedItemsData[index].checked) {
      setSelectedItems((prevSelectedItems) => [
        ...prevSelectedItems,
        selectedItemValue,
      ]);
    } else {
      setSelectedItems((prevSelectedItems) =>
        prevSelectedItems.filter((item) => item !== selectedItemValue)
      );
    }
    // Check if all items are selected or not
    const allSelected = updatedItemsData.every((item: any) => item.checked);
    setSelectAll(allSelected);
  };

  // Function to handle select all checkbox change
  const handleSelectAllChange = () => {
    const updatedItemsData: any = projects?.map((item: any) => ({
      ...item,
      checked: !selectAll,
    }));
    setProjects(updatedItemsData);

    // Update selectedItems based on the new selection status
    const selectedItemsValues = updatedItemsData
      .filter((item: any) => item.checked)
      .map((item: any) => item.value);
    setSelectedItems(selectAll ? [] : selectedItemsValues);

    // Toggle the selectAll state
    setSelectAll(!selectAll);
  };

  return (
    <div className={styles.mainCon}>
      <div className={styles.signInForm}>
        <h5 className={styles.title}>
          Link Projects to Retention Trust Account
        </h5>
        <div className={styles.formContent}>
          <TextField
            placeholder="Search by Name"
            value={search}
            onChange={onInputChange}
            type="text"
            // autoFocus
            className={styles.textFieldStyles}
          />
        </div>
        <div className={styles.tableWidthStyle}>
          <Table bordered responsive>
            <thead>
              <tr className="text-center">
                <th>
                  <CheckBox
                    label=""
                    type="checkbox"
                    className={styles.checkBoxHeights}
                    checked={selectAll}
                    onChange={handleSelectAllChange}
                  />
                </th>
                <th> Name</th>
                <th> ID</th>
              </tr>
            </thead>
            <tbody>
              {projects?.map((eachItem: any, index) => (
                <tr key={eachItem?.id}>
                  <td className="text-center" width={"40px"}>
                    <CheckBox
                      label=""
                      type="checkbox"
                      className={styles.checkBoxHeights}
                      checked={eachItem?.checked}
                      onChange={() => handleCheckboxChange(index)}
                    />
                  </td>
                  <td>{eachItem?.label}</td>
                  <td align="center" width={"60px"}>
                    {eachItem?.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {projects?.length === 0 && (
            <div className={styles.noRecordStyle}>
              There are no records to display
            </div>
          )}
        </div>

        <FormButton className={styles.buttonStyles} onClick={handleSaveClick}>
          {selectedProjects?.length > 0 ? "Update" : "Save"}
        </FormButton>

        <Button
          className={styles.CancelButtonStyles}
          type="button"
          onClick={handleFormCancelClick}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default ProjectDetails;
