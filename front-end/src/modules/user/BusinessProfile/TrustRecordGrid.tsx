import BaseModal from "@/components/BaseModal";
import { useBusinessProfileContext } from "./BusinessProfileContext";
import DynamicTable from "@/components/Table";
import {
  trustTrainingGridHeaders,
  trustTrainingRenderData,
} from "./BusinessProfile.constant";
import { setAddTrustRecord } from "@/redux/slices/companyRegistrationDetails";
import { useAppDispatch } from "@/redux/store";
import { useEffect, useState } from "react";
import { buttonType } from "@/shared/constant/general";
import { isArray } from "lodash";

export default function TrustRecordGrid() {
  const {
    displayTrainingRecordsGrid,
    setDisplayTrainingRecordsGrid,
    trustTrainingGridData,
    formik,
    setDisplayTrainingRecords,
    setTrustTrainingGridData,
    editMode,
    setRemovedTrustTrainingFiles,
  }: any = useBusinessProfileContext();

  const dispatch = useAppDispatch();

  const [tempGridData, setTempGridData] = useState([]);

  const [tempRemovedFiles, setTempRemovedFiles] = useState<any>([]);

  useEffect(() => {
    setTempGridData(trustTrainingGridData);
  }, []);

  const trustTrainingGridActions: any = [
    {
      label: "View",
      icon: "fa-light fa-eye",
      style: "primary",
      onClick: (row: any, index: number) => openPDF(row, index),
    },
    {
      label: "Delete",
      style: "contrast",
      icon: "fa-light fa-trash",
      onClick: (row: any) => {
        const filteredData = trustTrainingGridData.filter((data: any) => {
          if (editMode && data?.id == row?.id && !data?.isAdded) {
            setTempRemovedFiles((prev: any) => [...prev, row?.id]);
          }
          if (data?.id !== row?.id) {
            return true;
          }
        });
        setTempGridData(filteredData);
      },
    },
  ];

  function addNewTrustRecord() {
    formik?.setFieldValue("isTrainingFieldsRequired", true);
    setDisplayTrainingRecords(true);
    setDisplayTrainingRecordsGrid(false);
  }

  function handleSaveTrainingRecords() {
    setDisplayTrainingRecordsGrid(false);
    formik?.setFieldValue("isTrainingFieldsRequired", false);
    if (editMode) {
      const addedRecords = tempGridData.filter((x: any) => x?.isAdded) || [];
      dispatch(setAddTrustRecord(addedRecords));
    } else {
      dispatch(setAddTrustRecord([...tempGridData]));
    }

    setRemovedTrustTrainingFiles((prev: any) => [...prev, ...tempRemovedFiles]);

    setTrustTrainingGridData(tempGridData);
    return true;
  }

  function openPDF(selectedRow: any, index: number) {
    const file: any = Array.isArray(selectedRow?.trainingRecordFile)
      ? selectedRow?.trainingRecordFile[0]
      : selectedRow?.trainingRecordFile;

    if (
      file?.file &&
      typeof file?.file === "string" &&
      file?.file.includes("base64")
    ) {
      // Create a URL for the file
      fetch(file)
        .then((res) => res.blob())
        .then((res) => {
          window.open(URL.createObjectURL(res), "_blank");
        });
    } else {
      window.open(URL.createObjectURL(file), "_blank");
    }
  }

  return (
    <BaseModal
      modalId={"Trust And Training Records Grid Id"}
      title="Trust and training records"
      displayModal={displayTrainingRecordsGrid}
      onClose={() => {
        setDisplayTrainingRecordsGrid(false);
        formik?.setFieldValue("isTrainingFieldsRequired", false);
      }}
      onConfirm={() => handleSaveTrainingRecords()}
      secondButtonName="Save"
      hideFirstButton
      hideHeaderCloseIcon
    >
      <a className="pt_addnewbutton jus_end">
        <button
          className={`${buttonType.SECONDARY} mb_1`}
          onClick={() => addNewTrustRecord()}
        >
          <i className="fa-light fa-hexagon-plus"></i>Add
        </button>
      </a>
      <DynamicTable
        headers={trustTrainingGridHeaders}
        gridData={tempGridData?.length > 0 ? tempGridData : []}
        gridActions={trustTrainingGridActions}
        renderRowList={trustTrainingRenderData}
        hidePagination
        alignActionsDataCenter
        loaderColSpan={3}
        displayAllStaticActions
        customHallowGrid={"modal_table_loader"}
      />
    </BaseModal>
  );
}
