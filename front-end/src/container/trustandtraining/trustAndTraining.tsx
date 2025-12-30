"use client";
import ReusableDataTable from "@/components/DataTable/dataTable";
import Overlays from "@/components/Overlayes/Overlayes";
import React, { useEffect, useState } from "react";
import {
  PlusCircle,
  ThreeDots,
  TrashFill,
  EyeFill,
} from "react-bootstrap-icons";
import styles from "./trustAndTraining.module.scss";
import { usePathname, useRouter } from "next/navigation";
import { RootState, useAppSelector } from "@/redux/store";
import { toUpper } from "lodash";
import {
  setAddTrustRecord,
  setDefaultFiles,
  setRemovedFiles,
} from "@/redux/slices/companyRegistrationDetails";
import { useDispatch, useSelector } from "react-redux";
import { formatDate } from "@/common/commonFunctions";
import { Button } from "react-bootstrap";

type UserData = {
  name: string;
  date: string;
  attachment: string;
  base64?: string;
};

const TrustAndTraining = (props: any) => {
  const { isEdit, setViewPages } = props;

  const dispatch = useDispatch();
  const router = useRouter();
  const routePath = usePathname();

  // State to control the visibility of the table grid
  const [showTableGrid, setShowTableGrid] = useState(true);
  const [activeTab, setActiveTab] = useState("Records");

  const companyDetails: any = useAppSelector(
    (state: RootState) => state.companyDetails
  );
  const addTrustRecord: any = useSelector(
    (state: RootState) => state?.companyDetails?.addTrustRecord
  );
  const defaultFiles: any = useSelector(
    (state: RootState) => state?.companyDetails?.defaultFiles
  );

  const columns = [
    {
      name: "Name",
      selector: (row: UserData) => row.name,
      maxWidth: "200px",
    },
    {
      name: "Date",
      selector: (row: UserData) => row.date,
      maxWidth: "200px",
      center: true,
    },
    // {
    //   name: "Attachment",
    //   selector: (row: UserData) => row.attachment,
    //   maxWidth: "200px",
    // },
    {
      name:
        defaultFiles?.length > 1 || addTrustRecord?.length > 1
          ? "Actions"
          : "Action",
      center: true,
      cell: (row: UserData, rowIndex: number) => (
        <div className={styles.actioCOntainer}>
          <div
            onClick={() => handleDeleteRecord(rowIndex)}
            className={styles.dotsContainer}
          >
            <TrashFill />
          </div>
          <div
            onClick={() => handleOpenPdf(row, rowIndex)}
            className={styles.dotsContainer}
          >
            <EyeFill />
          </div>
        </div>
      ),
    },
  ];
  const [sampledata, setSampledata] = useState<UserData[]>([]);

  useEffect(() => {
    const localFiles =
      companyDetails?.addTrustRecord?.map((item: any, i: number) => {
        const attachment = item?.files?.[0]?.name || "";
        const formattedDate = item?.date ? formatDate(item?.date) : "";
        return {
          id: item.id,
          name: (item?.Name ?? item?.name) || "",
          date: formattedDate || "",
          attachment: attachment || "",
          base64: item?.file?.includes("base64") ? item?.file : null,
        };
      }) || [];

    const defaultFile = isEdit
      ? defaultFiles
          ?.map((item: any, i: number) => {
            const existsInSampleData = sampledata.some(
              (file: any) => file?.id === item?.file_id
            );
            const attachment = item?.file || "";
            const formattedDate = item?.date ? formatDate(item?.date) : "";

            if (!existsInSampleData) {
              return {
                id: item.file_id,
                name: item?.name || "",
                date: formattedDate || "",
                attachment: attachment || "",
                base64: null,
              };
            } else {
              return null; // Skip adding this file to defaultFiles
            }
          })
          .filter(Boolean) || []
      : [];
    const alreadyExists = isEdit
      ? defaultFiles?.map((item: any, i: number) => {
          const attachment = item?.file || "";
          const formattedDate = item?.date ? formatDate(item?.date) : "";
          return {
            id: item.file_id,
            name: item?.name || "",
            date: formattedDate || "",
            attachment: attachment || "",
            base64: null,
          };
        }) || []
      : [];

    // Merge local files and default files into a single array
    setSampledata([...localFiles, ...alreadyExists]);
  }, [companyDetails?.addTrustRecord, defaultFiles, isEdit]);

  // Function to handle deleting a record
  const handleDeleteRecord = (index: any) => {
    if (index >= 0 && index < sampledata.length) {
      const deletedFile: any = sampledata[index];
      const isDefaultFile =
        deletedFile.id &&
        defaultFiles?.some((file: any) => file.file_id === deletedFile.id);

      if (isDefaultFile) {
        // Add fileId to removeFiles redux state
        dispatch(
          setRemovedFiles([...companyDetails?.removedFiles, deletedFile?.id])
        );

        // Update the defaultFiles state by removing the deleted file
        const updatedDefaultFiles = defaultFiles.filter(
          (file: any) => file.file_id !== deletedFile.id
        );
        dispatch(setDefaultFiles(updatedDefaultFiles));
        setSampledata([]);
      } else {
        const updatedTrustRecord = addTrustRecord.filter(
          (d: any, i: any) => i !== index
        );
        dispatch(setAddTrustRecord(updatedTrustRecord));

        // dispatch(
        //   setAddTrustRecord(updatedTrustRecord)
        // )
      }

      // Remove the file from sampledata
      // setSampledata(prevData => prevData.filter((_, i) => i !== index));
    } else {
      console.error("Invalid index provided for deletion.");
    }
  };

  const handleOpenPdf = (value: UserData, index: number) => {
    if (!value?.attachment?.includes("base64")) {
      const file = companyDetails?.addTrustRecord?.[index]?.file?.[0];
      const baseUrl = value?.base64;
      if (file && !baseUrl) {
        // Create a URL for the file
        const fileUrl = URL.createObjectURL(file);

        // Open the file URL in a new tab
        window.open(fileUrl, "_blank");
      } else {
        window.open(baseUrl, "_blank");
      }
    } else {
      window.open(value?.attachment, "_blank");
    }
  };

  // Log the number of records whenever sampledata changes
  useEffect(() => {
    console.log("Number of records:", sampledata?.length);
  }, [sampledata]);

  const handleAddFileClick = () => {
    if (isEdit) {
      setViewPages("addPage");
      // router.push("/user/edit-business/edit");
    } else {
      router.push("/user/add-business/add");
    }
    // router.push(isEdit ?  "/user/edit-business/edit": "/user/add-business/add");
  };

  // Function to toggle the visibility of the table grid
  const toggleTableGrid = () => {
    setShowTableGrid(!showTableGrid);
  };

  const handleCancelClick = () => {
    const companyId = Number(localStorage.getItem("companyId"));
    // Dispatch the updated sampledata array to the Redux store
    // dispatch(setAddTrustRecord([...companyDetails, sampledata.length]));
    // Navigate back to the previous page
    if (isEdit) {
      setViewPages("mainPage");
    } else {
      router.push(
        isEdit ? `/user/edit-business/${companyId}` : "/user/add-business"
      );
    }
  };

  return (
    <>
      <div className={styles.card}>
        <h4 className={styles.businessHeadingStyles}>
          {toUpper(companyDetails?.name) || ""}
        </h4>
        <h5 className={styles.businessSubHeadingStyles}>
          Trust And Training Records
        </h5>
        <div className={styles.headerAndButtonCon}>
          <span className={styles.spanTextStyles} onClick={handleAddFileClick}>
            <PlusCircle />
            Add
          </span>
        </div>
        {showTableGrid && (
          <div className={styles.tableGrid}>
            <ReusableDataTable
              data={sampledata}
              columns={columns}
            ></ReusableDataTable>
          </div>
        )}

        <Button
          type="button"
          className={styles.SkipButtonStyles}
          onClick={handleCancelClick}
        >
          Save
        </Button>
      </div>
    </>
  );
};

export default TrustAndTraining;
