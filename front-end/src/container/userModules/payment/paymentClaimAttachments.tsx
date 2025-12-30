import React, { useEffect, useState } from "react";
import styles from "./payment.module.scss";
import { Button, Col, Row } from "react-bootstrap";
import FileSelector from "@/components/fileSelector/fileSelector";
import { toast } from "react-toastify";
import { Paperclip } from "react-bootstrap-icons";

const PaymentClaimAttachments = (props: any) => {
  const [ofiles, setOFiles] = useState<File[]>([]);
  const [o2files, setO2Files] = useState<File[]>([]);

  const [originalFiles, setOriginalFiles] = useState([]);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const {
    isView,
    isEdit,
    selectedToggle,
    selectedToggled,
    setOptionalMultipleFiles,
    setCompulsoryMultipleFiles,
    optionalmultiplefiles,
    optional2multiplefiles,
    setOptional2MultipleFiles,
    compulsorymultiplefiles,
  } = props;

  const AllowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  useEffect(() => {
    // Reset all file arrays if the selected toggle changes
    if (selectedToggled !== "Receivable" || selectedToggled !== "Billable") {
      setCompulsoryMultipleFiles([]);
      setOptionalMultipleFiles([]);
      setOptional2MultipleFiles([]);
      setSelectedFileNames([]);
    }
  }, [selectedToggled]);

  const handleOptionalFileChange = (newFiles: File[]) => {
    if (isEdit && originalFiles.length + ofiles.length + newFiles.length > 5) {
      toast.error("You can only select up to five files.");
      return;
    }
    if (!isEdit && ofiles.length + newFiles.length > 5) {
      toast.error("You can only select up to five files.");
      return;
    }
    let allFiles = [...newFiles];

    // Filter out files that are already selected
    allFiles = allFiles.filter(
      (file) => !selectedFileNames.includes(file.name)
    );

    // Update state with new files
    setOFiles((x) => [...x, ...allFiles]);
    setOptionalMultipleFiles((x: any) => [...x, ...allFiles]);

    // Update selected file names
    const newFileNames = allFiles.map((file) => file.name);
    setSelectedFileNames((prevNames) => [...prevNames, ...newFileNames]);
  };

  const handleOptional2FileChange = (newFiles: File[]) => {
    if (isEdit && originalFiles.length + o2files.length + newFiles.length > 5) {
      toast.error("You can only select up to five files.");
      return;
    }
    if (!isEdit && o2files.length + newFiles.length > 5) {
      toast.error("You can only select up to five files.");
      return;
    }
    let allFiles = [...newFiles];

    // Filter out files that are already selected
    allFiles = allFiles.filter(
      (file) => !selectedFileNames.includes(file.name)
    );

    // Update state with new files
    setO2Files((x) => [...x, ...allFiles]);
    setOptional2MultipleFiles((x: any) => [...x, ...allFiles]);

    // Update selected file names
    const newFileNames = allFiles.map((file) => file.name);
    setSelectedFileNames((prevNames) => [...prevNames, ...newFileNames]);
  };

  const handleCompulsoryFileChange = (newFiles: File[]) => {
    const newFile = compulsorymultiplefiles;
    if (
      isEdit &&
      originalFiles.length + newFile?.length + newFiles.length > 5
    ) {
      toast.error("You can only select up to five files.");
      return;
    }
    if (!isEdit && newFile?.length + newFiles.length > 5) {
      toast.error("You can only select up to five files.");
      return;
    }
    let allFiles = [...newFiles];

    // Filter out files that are already selected
    allFiles = allFiles.filter(
      (file) => !selectedFileNames.includes(file.name)
    );

    // Update state with new files
    // setCFiles((x) => [...x, ...allFiles]);
    setCompulsoryMultipleFiles((x: any) => [...x, ...allFiles]);

    // Update selected file names
    const newFileNames = allFiles.map((file) => file.name);
    setSelectedFileNames((prevNames) => [...prevNames, ...newFileNames]);
  };

  // Function to delete an attachment file from either optional or compulsory files
  const deleteAttachment = (fileOrder: number, fileType: string) => {
    let updatedFiles: any[];
    if (fileType === "optional") {
      updatedFiles = [...optionalmultiplefiles];
      updatedFiles.splice(fileOrder, 1);
      setOptionalMultipleFiles([...updatedFiles]);
    } else if (fileType === "optional2") {
      updatedFiles = [...optional2multiplefiles];
      updatedFiles.splice(fileOrder, 1);
      setOptional2MultipleFiles([...updatedFiles]);
    } else {
      updatedFiles = [...compulsorymultiplefiles];
      updatedFiles.splice(fileOrder, 1);
      setCompulsoryMultipleFiles([...updatedFiles]);
    }
  };

  // const handleRemoveOFile = (fileName: string) => {
  //   const filteredFiles = optionalmultiplefiles.filter(
  //     (file: any) => file.name !== fileName
  //   );
  //   setOFiles(filteredFiles);

  //   const filteredFileNames = selectedFileNames.filter(
  //     (name) => name !== fileName
  //   );
  //   setSelectedFileNames(filteredFileNames);

  //   // Remove the file from setOptionalMultipleFiles if it exists
  //   const filteredOptionalFiles = optionalmultiplefiles.filter(
  //     (file: File) => file.name !== fileName
  //   );
  //   setOptionalMultipleFiles(filteredOptionalFiles);
  // };

  // const handleRemoveO2File = (fileName: string) => {
  //   const filteredFiles = optional2multiplefiles.filter(
  //     (file: any) => file.name !== fileName
  //   );
  //   setO2Files(filteredFiles);

  //   const filteredFileNames = selectedFileNames.filter(
  //     (name) => name !== fileName
  //   );
  //   setSelectedFileNames(filteredFileNames);

  //   // Remove the file from setOptionalMultipleFiles if it exists
  //   const filteredOptional2Files = optional2multiplefiles.filter(
  //     (file: File) => file.name !== fileName
  //   );
  //   setOptional2MultipleFiles(filteredOptional2Files);
  // };

  // const handleRemoveCFile = (fileName: string) => {
  //   const filteredFiles = compulsorymultiplefiles?.filter(
  //     (file: any) => file.name !== fileName
  //   );
  //   // setCFiles(filteredFiles);
  //   setCompulsoryMultipleFiles(filteredFiles);

  //   const filteredFileNames = selectedFileNames.filter(
  //     (name) => name !== fileName
  //   );
  //   setSelectedFileNames(filteredFileNames);

  //   // Remove the file from setCompulsoryMultipleFiles if it exists
  //   const filteredCompulsoryFiles = compulsorymultiplefiles.filter(
  //     (file: File) => file.name !== fileName
  //   );
  //   setCompulsoryMultipleFiles(filteredCompulsoryFiles);
  // };

  const handleViewFile = (file: any) => {
    if (file?.id) {
      fetch(file?.file)
        .then((res) => res.blob())
        .then((res) => {
          window.open(URL.createObjectURL(res), "_blank");
        });
      return true;
    }
    // Assuming you want to open the file in a new tab
    const fileURL = URL.createObjectURL(file);
    window.open(fileURL, "_blank");
  };

  const truncateFileName = (fileName: string, maxLength: number) => {
    if (fileName.length > maxLength) {
      return fileName.substring(0, maxLength - 3) + "...";
    }
    return fileName;
  };

  return (
    <>
      <div className={styles.attachText}>Attachments</div>
      <Row>
        <Col lg={5}>
          {(selectedToggle === "Claim" ||
            selectedToggle === "Retention claim") &&
          selectedToggled === "Receivable" ? (
            <>
              <div className={styles.reqText}>Compulsory Requirement</div>
              {!isEdit && compulsorymultiplefiles?.length < 6 && (
                <FileSelector
                  handleSave={(files) => {
                    let fileArray = Array.from(files) as File[];
                    // changeFileName
                    let newFileArray = fileArray.map((file) => {
                      // let fileNameUUID = v4();
                      let newFileName = file.name; //`${fileNameUUID}.${file.name.split('.').pop()}`;
                      let newFile = new File([file], newFileName, {
                        type: file.type,
                      });
                      return newFile;
                    });
                    handleCompulsoryFileChange(newFileArray);
                  }}
                  acceptedFileFormats={AllowedTypes}
                  multiple={true}
                  maximumSize={20 * 1024}
                  onError={(error) => {
                    toast.error(`Max Allowed file size is ${20} Mb`);
                  }}
                  disabled={isView}
                >
                  <span
                    className={`${styles.fileSelectorContainer} ${
                      isView ? styles.disabled : ""
                    }`}
                  >
                    <Paperclip /> Supporting Statement Attachment{" "}
                    <span className={styles.sizeStyles}>
                      &nbsp;&thinsp;Maximum Size: 20MB
                    </span>
                  </span>
                </FileSelector>
              )}
              {compulsorymultiplefiles?.map((file: any, index: number) => {
                const fileName = file.name ? file.name : file.file_name;
                const truncatedFileName = truncateFileName(fileName, 40);
                return (
                  <Row key={index} className="mt-1">
                    <Col
                      lg={10}
                      className={`${styles.fileText} ${
                        isView ? styles.disabled : ""
                      }`}
                      onClick={!isView ? () => handleViewFile(file) : undefined}
                    >
                      {`"${truncatedFileName}"`} - View
                    </Col>
                    <Col
                      lg={2}
                      className={styles.removeTxt}
                      onClick={
                        !isView
                          ? () => deleteAttachment(index, "compulsory")
                          : undefined
                      }
                    >
                      Remove
                    </Col>
                  </Row>
                );
              })}
              <div>
                <FileSelector
                  handleSave={(files) => {
                    let fileArray = Array.from(files);

                    let newFileArray = fileArray.map((file) => {
                      let newFileName = file.name;
                      let newFile = new File([file], newFileName, {
                        type: file.type,
                      });
                      return newFile;
                    });
                    handleCompulsoryFileChange(newFileArray);
                  }}
                  acceptedFileFormats={AllowedTypes}
                  multiple={true}
                  maximumSize={20 * 1024}
                  onError={() => {
                    toast.error(`Max Allowed file size is ${20} Mb`);
                  }}
                >
                  {!isView && <Button className={styles.btn1}>+ Add</Button>}
                </FileSelector>
              </div>
            </>
          ) : (
            <>
              <div className={styles.optionPart}>Optional</div>

              {!isEdit && optional2multiplefiles?.length < 6 && (
                <FileSelector
                  handleSave={(files) => {
                    let fileArray = Array.from(files) as File[];
                    // changeFileName
                    let newFileArray = fileArray.map((file) => {
                      // let fileNameUUID = v4();
                      let newFileName = file.name; //`${fileNameUUID}.${file.name.split('.').pop()}`;
                      let newFile = new File([file], newFileName, {
                        type: file.type,
                      });
                      return newFile;
                    });
                    handleOptional2FileChange(newFileArray);
                  }}
                  acceptedFileFormats={AllowedTypes}
                  multiple={true}
                  maximumSize={20 * 1024}
                  onError={(error) => {
                    toast.error(`Max Allowed file size is ${20} Mb`);
                  }}
                  disabled={isView}
                >
                  <span
                    className={`${styles.fileSelectorContainer} ${
                      isView ? styles.disabled : ""
                    }`}
                  >
                    <Paperclip /> Supporting Statement Attachment{" "}
                    <span className={styles.sizeStyles}>
                      &nbsp;&thinsp;Maximum Size: 20MB
                    </span>
                  </span>
                </FileSelector>
              )}
              {optional2multiplefiles.map((file: any, index: number) => {
                const fileName = file.name ? file.name : file.file_name;
                const truncatedFileName = truncateFileName(fileName, 40);
                return (
                  <Row key={index} className="mt-1">
                    <Col
                      lg={10}
                      className={`${styles.fileText} ${
                        isView ? styles.disabled : ""
                      }`}
                      onClick={!isView ? () => handleViewFile(file) : undefined}
                    >
                      {`"${truncatedFileName}"`} - View
                    </Col>
                    <Col
                      lg={2}
                      className={styles.removeTxt}
                      onClick={
                        !isView
                          ? () => deleteAttachment(index, "optional2")
                          : undefined
                      }
                    >
                      Remove
                    </Col>
                  </Row>
                );
              })}
              <div>
                <FileSelector
                  handleSave={(files) => {
                    let fileArray = Array.from(files) as File[];
                    // changeFileName
                    let newFileArray = fileArray.map((file) => {
                      // let fileNameUUID = v4();
                      let newFileName = file.name; //`${fileNameUUID}.${file.name.split('.').pop()}`;
                      let newFile = new File([file], newFileName, {
                        type: file.type,
                      });
                      return newFile;
                    });
                    handleOptional2FileChange(newFileArray);
                  }}
                  acceptedFileFormats={AllowedTypes}
                  multiple={true}
                  maximumSize={20 * 1024}
                  onError={(error) => {
                    toast.error(`Max Allowed file size is ${20} Mb`);
                  }}
                >
                  {!isView && <Button className={styles.btn1}>+ Add</Button>}
                </FileSelector>
              </div>
            </>
          )}
        </Col>
        <Col lg={2}></Col>
        <Col lg={5}>
          <div className={styles.optionPart}>Optional</div>
          {!isEdit && optionalmultiplefiles?.length < 6 && (
            <FileSelector
              handleSave={(files) => {
                let fileArray = Array.from(files) as File[];
                // changeFileName
                let newFileArray = fileArray.map((file) => {
                  // let fileNameUUID = v4();
                  let newFileName = file.name; //`${fileNameUUID}.${file.name.split('.').pop()}`;
                  let newFile = new File([file], newFileName, {
                    type: file.type,
                  });
                  return newFile;
                });
                handleOptionalFileChange(newFileArray);
              }}
              acceptedFileFormats={AllowedTypes}
              multiple={true}
              maximumSize={20 * 1024}
              onError={(error) => {
                toast.error(`Max Allowed file size is ${20} Mb`);
              }}
              disabled={isView}
            >
              <span
                className={`${styles.fileSelectorContainer} ${
                  isView ? styles.disabled : ""
                }`}
              >
                <Paperclip /> Other Attachments{" "}
                <span className={styles.sizeStyles}>
                  &nbsp;&thinsp;Maximum Size: 20MB
                </span>
              </span>
            </FileSelector>
          )}
          {optionalmultiplefiles.map((file: any, index: number) => {
            const fileName = file.name ? file.name : file.file_name;
            const truncatedFileName = truncateFileName(fileName, 40);
            return (
              <Row key={index} className="mt-1">
                <Col
                  lg={10}
                  className={`${styles.fileText} ${
                    isView ? styles.disabled : ""
                  }`}
                  onClick={!isView ? () => handleViewFile(file) : undefined}
                >
                  {`"${truncatedFileName}"`} - View
                </Col>
                <Col
                  lg={2}
                  className={styles.removeTxt}
                  onClick={
                    !isView
                      ? () => deleteAttachment(index, "optional")
                      : undefined
                  }
                >
                  Remove
                </Col>
              </Row>
            );
          })}
          <div>
            {" "}
            <FileSelector
              handleSave={(files) => {
                let fileArray = Array.from(files) as File[];
                // changeFileName
                let newFileArray = fileArray.map((file) => {
                  // let fileNameUUID = v4();
                  let newFileName = file.name; //`${fileNameUUID}.${file.name.split('.').pop()}`;
                  let newFile = new File([file], newFileName, {
                    type: file.type,
                  });
                  return newFile;
                });
                handleOptionalFileChange(newFileArray);
              }}
              acceptedFileFormats={AllowedTypes}
              multiple={true}
              maximumSize={20 * 1024}
              onError={(error) => {
                toast.error(`Max Allowed file size is ${20} Mb`);
              }}
            >
              {!isView && <Button className={styles.btn1}>+ Add</Button>}
            </FileSelector>
          </div>
        </Col>
      </Row>
    </>
  );
};

export default PaymentClaimAttachments;
