import FileAttachmentHandler from "@/components/PaymentMultiFile/PaymentMultiFile";
import { uploadFile } from "@/shared/constant/general";
import { useAddUpdateClaimsContext } from "./AddUpdateClaimsContext";
import { useEffect, useState } from "react";
import { tabTypes } from "../AddUpdatePayments/Payments.constants";
import { ReadFileAttachmentsOrDocuments } from "@/app/api/commonApi";

export default function PaymentAttachmentsSection({
  displayCompulsoryOptionalAttachment,
}: any) {
  const { paymentsPatchData, paymentId }: any = useAddUpdateClaimsContext();

  const [optionalFiles, setOptionalFiles] = useState(null);
  const [compulsoryFiles, setCompulsoryFiles] = useState(null);

  useEffect(() => {
    findAttachmentType();
  }, []);

  function findAttachmentType() {
    getAttachments("Other optional payment attachment", false);

    if (
      (paymentsPatchData?.claim_type === tabTypes.BILLABLES &&
        paymentsPatchData?.payment_type !== tabTypes.FULL) ||
      paymentsPatchData?.payment_to === tabTypes.THIRD_PARTY
    ) {
      getAttachments(getPaymentType(), true);
    }
  }

  function getPaymentType() {
    switch (paymentsPatchData?.payment_type) {
      case `${tabTypes.PART}`:
        return "Part payment advice attachment";
      case `${tabTypes.PAY_LESS_FULL}`:
        return "Payless full payment advice attachment";
      case `${tabTypes.PAY_LESS_PART}`:
        return "Payless part payment advice attachment";
      case `${tabTypes.PAY_LESS_ZERO}`:
        return "Pay zero payment advice attachment";
      case `${tabTypes.THIRD_PARTY}`:
        return "3rd party payment attachment";
      default:
        return "";
    }
  }

  async function getAttachments(
    attachmentType: string,
    isCompulsoryAttachment: boolean
  ) {
    const postData = {
      data: {
        payment_claim_id: paymentsPatchData?.payment_claim_id || 0,
        payment_id: +paymentId,
      },
      fileAttachmentOrDocumentType: attachmentType,
    };

    const response = await ReadFileAttachmentsOrDocuments(postData);
    if (response?.length > 0 && isCompulsoryAttachment) {
      setCompulsoryFiles(response);
    } else {
      setOptionalFiles(response);
    }
  }

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
                afterFileChange={(modifiedFiles: any) => {}} // Update compulsory files
                disableChooseFileBtn={true} // Disable file input in view mode
                existingFiles={compulsoryFiles} // Existing compulsory files
                handleDeleteFile={(modifiedFiles: any) => {}}
                hideDeleteButton={true}
                fileNameTruncateSize={8}
              />
              {/* {optionalFiles?.length > 0 && ( */}
              <FileAttachmentHandler
                titleName="Optional Attachments"
                attachmentSize={"(Maximum size 20MB)"}
                filesToAccept={`${uploadFile.pdf}, ${uploadFile.word}`}
                afterFileChange={(modifiedFiles: any) => {}} // Update optional files
                disableChooseFileBtn={true} // Disable file input in view mode
                existingFiles={optionalFiles} // Existing optional files
                handleDeleteFile={(modifiedFiles: any) => {}}
                hideDeleteButton={true}
                fileNameTruncateSize={8}
              />
            </>
          ) : (
            <>
              {/* Optional Attachments */}
              <FileAttachmentHandler
                titleName="Optional Attachments"
                attachmentSize={"(Maximum size 20MB)"}
                filesToAccept={`${uploadFile.pdf}, ${uploadFile.word}`}
                afterFileChange={(modifiedFiles: any) => {}} // Update optional files
                disableChooseFileBtn={true} // Disable file input in view mode
                existingFiles={optionalFiles} // Existing optional files
                handleDeleteFile={(modifiedFiles: any) => {}}
                hideDeleteButton={true}
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
                paymentsPatchData?.total_amount
                  ? Number(paymentsPatchData?.total_amount)
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
