"use client";

import React from "react";
import styles from "./uploadAttachment.module.scss";
import { Button, Col, Container, Form, Row } from "react-bootstrap";
import FormButton from "@/components/Button/button";

import AttachmentUpload from "@/components/attachmentUpload/attachmentUpload";
import { toast } from "react-toastify";
import { useBankStatementContext } from "../BankTrustOverviewContext";
import { ADD, EDIT } from "@/common/constants/general";

const UploadAttachment = () => {
  const {
    selectedFile,
    setSelectedFile,
    bankStatementFormik: formik,
    setDisplayUploadContract,
    setRemovedFile,
    isViewMode,
    screenType,
  }: any = useBankStatementContext();

  const AllowedTypes = [".pdf"];

  function handleUploadedFile(file: File) {
    setSelectedFile(file);
    // toast.success("Statement has been uploaded.");
  }

  async function handleImageRemove() {
    if (selectedFile) {
      setRemovedFile(selectedFile); // Store the selectedFile in removedFile
      setSelectedFile(null); // Reset selectedFile

      await formik.setFieldValue("statement_file", []);
      toast.info("Uploaded statement has been removed.");
    }
  }

  const handleViewFile = () => {
    if (selectedFile?.file) {
      fetch(selectedFile?.file)
        .then((res) => res.blob())
        .then((res) => {
          window.open(URL.createObjectURL(res), "_blank");
        });
    } else {
      window.open(URL.createObjectURL(selectedFile), "_blank");
    }
  };

  function handleCancel() {
    if (screenType === ADD) {
      setSelectedFile(null);
    }
    setDisplayUploadContract(false);
  }

  function handleSave() {
    if (selectedFile) {
      formik.setFieldValue("statement_file", [selectedFile]);
      setDisplayUploadContract(false);
      toast.success("Statement has been uploaded.");
    } else {
      toast.error("Please upload an attachment");
    }
  }

  return (
    <div>
      <Container fluid>
        <Row>
          <Col className={styles.signInForm}>
            <Form className={styles.formStyles}>
              <h5 className={styles.title}>Bank Statement Upload</h5>
              <p>Please upload the pdf bank statement.</p>

              <AttachmentUpload
                onFileSelect={handleUploadedFile}
                placeholder="Please select or drag and drop"
                selected_file={selectedFile}
                selected_filename={selectedFile?.file_name || ""}
                disabled={selectedFile !== null || isViewMode}
                allowedTypes={AllowedTypes}
              />

              {!isViewMode && (
                <FormButton
                  className={styles.buttonStyles}
                  type="button"
                  onClick={() => handleSave()}
                >
                  Upload
                </FormButton>
              )}
              {selectedFile && (
                <>
                  <Button
                    className={styles.ViewButtonStyles}
                    type="button"
                    onClick={handleViewFile}
                  >
                    View
                  </Button>

                  {!isViewMode && (
                    <Button
                      className={styles.RemoveButtonStyles}
                      type="button"
                      onClick={handleImageRemove}
                    >
                      Remove
                    </Button>
                  )}
                </>
              )}
              <Button
                className={styles.CancelButtonStyles}
                type="button"
                onClick={() => handleCancel()}
              >
                {isViewMode ? "Close" : "Cancel"}
              </Button>
            </Form>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default UploadAttachment;
