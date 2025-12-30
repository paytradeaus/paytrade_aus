"use client";

import React, { useState } from "react";
import styles from "./uploadPage.module.scss";
import { Button, Col, Container, Form, Row } from "react-bootstrap";
import AttachmentUpload from "@/components/attachmentUpload/attachmentUpload";
import { toast } from "react-toastify";

const UploadReport = (props: any) => {
  const { setViewPages, setUploadData, initialValue, isEdit, fileDetails } =
    props;
  const AllowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const [selectedFile, setSelectedFile] = useState<File | null | any>(
    initialValue ? initialValue : null
  );
  const [removedFile, setRemovedFile] = useState<File | null>(null);

  const handleSave = (values: any) => {
    if (!selectedFile) {
      toast.error("Please upload an attachment");
      return;
    } else {
      setViewPages("mainPage");
      setUploadData({ selectedFile, removedFile });
      toast.success("Uploaded Audit Report has been saved.");
    }
  };

  const handleImageSelect = (file: any) => {
    setUploadData(file);
    setSelectedFile(file);
    toast.success("Audit Report uploaded.");
  };

  const handleImageRemove = () => {
    if (selectedFile) {
      setRemovedFile(
        selectedFile?.removedFile ? selectedFile?.removedFile : selectedFile
      );
      setSelectedFile(null);
      setUploadData(null);

      toast.success("Uploaded audit report act has been removed.");
    }
  };

  const handleViewFile = () => {
    if (
      isEdit &&
      selectedFile &&
      typeof selectedFile === "string" &&
      selectedFile.includes("base64")
    ) {
      fetch(selectedFile)
        .then((res) => res.blob())
        .then((res) => {
          window.open(URL.createObjectURL(res), "_blank");
        });
    } else {
      window.open(URL.createObjectURL(selectedFile), "_blank");
    }
  };

  const handleFormCancelClick = () => {
    setViewPages("mainPage");
    if (!selectedFile) {
      toast.error("Uploaded Report is not saved.");
    } else {
      setUploadData({ selectedFile, removedFile });
    }
  };

  return (
    <div>
      <Container fluid>
        <Row>
          <Col className={styles.signInForm}>
            <Form className={styles.formStyles}>
              <h5 className={styles.title}>Audit</h5>
              <p>Please upload the Audit Report.</p>

              <AttachmentUpload
                onFileSelect={handleImageSelect}
                placeholder="Please select or drag and drop"
                selected_file={selectedFile}
                selected_filename={fileDetails?.file_name || ""}
                disabled={selectedFile !== null}
                allowedTypes={AllowedTypes}
              />
              <Button
                className={styles.SaveButtonStyles}
                type="button"
                onClick={handleSave}
              >
                Save
              </Button>
              {selectedFile && (
                <>
                  <Button
                    className={styles.ViewButtonStyles}
                    type="button"
                    onClick={handleViewFile}
                  >
                    View
                  </Button>

                  <Button
                    className={styles.RemoveButtonStyles}
                    type="button"
                    onClick={handleImageRemove}
                  >
                    Remove
                  </Button>
                </>
              )}
              <Button
                className={styles.CancelButtonStyles}
                type="button"
                onClick={handleFormCancelClick}
              >
                Cancel
              </Button>
            </Form>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default UploadReport;
