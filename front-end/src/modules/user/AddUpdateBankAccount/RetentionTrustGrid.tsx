import BaseModal from "@/components/BaseModal";

import DynamicTable from "@/components/Table";

import { useEffect, useState } from "react";
import {
  RTAGridHeaders,
  RTARenderData,
} from "../BankAccounts/bankAccount.constant";
import Search from "@/components/Inputs/Search";
import { showSuccessToast, showWarningToast } from "@/components/Toaster";

export default function RetentionTrustGrid({
  isDisplay,
  onClose,
  gridData,
  onSubmit,
  selectedProjects,
  disable,
}: any) {
  const [tempGridData, setTempGridData] = useState([]);
  const [isInitialRender, setIsInitialRender] = useState(false);

  const [selectedRow, setSelectedRow] = useState<any>([]);
  const [selectedCheckboxRows, setSelectedCheckboxRows] = useState([]);
  useEffect(() => {
    setSelectedRow(selectedProjects);
  }, [selectedProjects]);

  useEffect(() => {
    if (gridData?.length > 0 || selectedProjects?.length > 0) {
      let modifiedObj = [];
      modifiedObj = gridData?.map((obj: any) => {
        return {
          ...obj,
          checked: selectedProjects?.includes(obj?.value),
        };
      });

      setTempGridData(modifiedObj || gridData);
      setSelectedCheckboxRows(modifiedObj);
    }
  }, [gridData, selectedProjects]);

  function handleSearch(searchedText: string) {
    setIsInitialRender(false);
    if (tempGridData?.length && searchedText) {
      let filteredObj = tempGridData?.filter((each: any) =>
        each?.label?.toLowerCase()?.includes(searchedText?.toLowerCase())
      );

      setTempGridData(filteredObj || gridData);
    } else if (!searchedText && selectedCheckboxRows?.length) {
      setTempGridData(selectedCheckboxRows);
    } else if (isInitialRender) {
      setTempGridData(gridData);
    }
  }

  function handleSave() {
    if (selectedRow?.length === 0 && selectedProjects?.length === 0) {
      showWarningToast("Select one or more projects ");
      return;
    }

    showSuccessToast(
      `Project details ${selectedRow?.length > 0 ? "updated" : "added"}`
    );
    onSubmit(selectedRow);
    return true;
  }

  function handleSelectedData(selectedData: any) {
    if (gridData?.length > 0) {
      const selectedCheckBoxValues = gridData
        .filter((x: any) =>
          selectedData.some((y: any) => x?.value === y?.value)
        )
        .map((x: any) => x?.value);

      setSelectedRow([...selectedCheckBoxValues]);

      let updateExistingData: any = [];

      updateExistingData = tempGridData.map((x: any) => {
        const matchedItem = selectedData.find(
          (y: any) => x?.value === y?.value
        ); // Find matching item

        if (matchedItem) {
          return {
            ...x,
            checked: matchedItem?.checked, // Update the `checked` property
          };
        }
        return {
          ...x,
          checked: false, // Update the `checked` property
        }; // Return unchanged item if no match
      });

      setSelectedCheckboxRows(
        selectedData?.length > 0 ? updateExistingData : []
      );
      setTempGridData(selectedData?.length > 0 ? updateExistingData : gridData);
    }
  }

  return (
    <BaseModal
      modalId={"Link Projects to Retention Trust Account"}
      title="Link projects to retention trust account"
      displayModal={isDisplay}
      onClose={onClose}
      onHeaderIconClose={onClose}
      onConfirm={() => handleSave()}
      secondButtonName={"Save"}
      disableSecondButton={selectedRow?.length === 0 || disable}
    >
      <div className="d_flex_justify_end">
        <div className="width_35">
          <Search
            onChange={(searchedText) => handleSearch(searchedText)}
            placeholder="Search by name"
          />
        </div>
      </div>
      <DynamicTable
        headers={RTAGridHeaders}
        gridData={tempGridData?.length ? tempGridData : []}
        renderRowList={RTARenderData}
        hidePagination
        loaderColSpan={3}
        enableCheckbox
        checkBoxId={"value"}
        customHallowGrid={"modal_table_loader"}
        onGridCheckboxChange={(selectedData: any) => {
          handleSelectedData(selectedData);
        }}
        selectedCheckboxRows={selectedCheckboxRows}
        disableCheckBox={disable}
      />
    </BaseModal>
  );
}
