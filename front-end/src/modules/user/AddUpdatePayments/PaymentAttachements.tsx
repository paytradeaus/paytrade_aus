import React, { useEffect } from "react";
import { usePaymentsContext } from "./PaymentContextProvider";
import FileAttachmentHandler from "@/components/PaymentMultiFile/PaymentMultiFile";
import { uploadFile } from "@/shared/constant/general";

export default function PaymentAttachmentsSection({
  displayCompulsoryOptionalAttachment,
}: any) {
  const {
    formik,
    isViewMode,
    optionalFiles,
    compulsoryFiles,
    setOptionalFiles,
    setCompulsoryFiles,
    setIsCompulsoryAttachmentRequired,
  }: any = usePaymentsContext();

  useEffect(() => {
    setIsCompulsoryAttachmentRequired(displayCompulsoryOptionalAttachment);
  }, [displayCompulsoryOptionalAttachment]);

  return (
    <div className="grid grid-2-1">
      <div className="pt_attachments">
        <div className="grid">
          {/* Show Compulsory Attachments only when the condition is met */}
          {displayCompulsoryOptionalAttachment ? (
            <>
              <FileAttachmentHandler
                attachmentSize={"(Maximum size 20MB)"}
                titleName="Supporting statement attachments"
                required={true} // Indicate compulsory requirement
                filesToAccept={`${uploadFile.pdf}, ${uploadFile.word}`}
                afterFileChange={(modifiedFiles: any) =>
                  setCompulsoryFiles(modifiedFiles)
                } // Update compulsory files
                disableChooseFileBtn={isViewMode} // Disable file input in view mode
                existingFiles={compulsoryFiles} // Existing compulsory files
                handleDeleteFile={(modifiedFiles: any) => {}}
                hideDeleteButton={isViewMode}
                fileNameTruncateSize={8}
              />
              {/* {optionalFiles?.length > 0 && ( */}
              <FileAttachmentHandler
                titleName="Optional Attachments"
                attachmentSize={"(Maximum size 20MB)"}
                filesToAccept={`${uploadFile.pdf}, ${uploadFile.word}`}
                afterFileChange={(modifiedFiles: any) =>
                  setOptionalFiles(modifiedFiles)
                } // Update optional files
                disableChooseFileBtn={isViewMode} // Disable file input in view mode
                existingFiles={optionalFiles} // Existing optional files
                handleDeleteFile={(modifiedFiles: any) => {}}
                fileNameTruncateSize={8}
              />
              {/* )} */}
            </>
          ) : (
            <>
              {/* Optional Attachments */}
              <FileAttachmentHandler
                titleName="Optional Attachments"
                attachmentSize={"(Maximum size 20MB)"}
                filesToAccept={`${uploadFile.pdf}, ${uploadFile.word}`}
                afterFileChange={(modifiedFiles: any) =>
                  setOptionalFiles(modifiedFiles)
                } // Update optional files
                disableChooseFileBtn={isViewMode} // Disable file input in view mode
                existingFiles={optionalFiles} // Existing optional files
                handleDeleteFile={(modifiedFiles: any) => {}}
                fileNameTruncateSize={40}
              />
            </>
          )}
        </div>
      </div>

      <div className="pt_totalwrap">
        <div className="pt_infocol">
          <div>
            <h5>Total</h5>
            <h3>
              {`$ ${
                formik?.values?.total_amount
                  ? Number(formik?.values?.total_amount)
                      ?.toFixed(2)
                      .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  : "0.00"
              }
            `}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}
