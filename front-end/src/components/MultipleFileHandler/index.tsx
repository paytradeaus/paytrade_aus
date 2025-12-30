import { buttonType, uploadFile } from "@/shared/constant/general";
import React, { Fragment, useRef, useState, useEffect } from "react";
import { showErrorToast } from "../Toaster";
import { FileErrors } from "@/shared/constant/messages";
import BaseModal from "../BaseModal";
import CustomButton from "../CustomButton/CustomButton";

export default function MultipleFileHandler({
  titleName = "Attachments",
  required,
  filesToAccept,
  afterFileChange,
  disableChooseFileBtn = false,
  existingFiles,
  maxFileSize = uploadFile.fiveMB,
  hideViewButton,
  hideDeleteButton,
  fileNameTruncateSize = 40,
  deleteAfterConfirmation,
  confirmationDeleteMessage = "Are you sure you wish to delete?",
  customDeleteFunction,
  confirmationButtonName = "Yes",
  closeButtonName = "No",
  buttonName,
  hideInputButton,
  hideButton,
  displayInfoIcon = false,
  infoText = "",
  onError,
}: any) {
  const [displayConfirmationModal, setDisplayConfirmationModal] =
    useState(false);
  const [rowObjId, setRowObjId] = useState(null);
  const [isInModal, setIsInModal] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState('');
  const fileInputRef = useRef<HTMLInputElement | any>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Modal detection and positioning logic
  useEffect(() => {
    // Check if component is inside a modal
    const checkModalContext = () => {
      const element = tooltipRef.current;
      if (element) {
        const dialogParent = element.closest('dialog');
        const modalParent = element.closest('.modal, [role="dialog"]');
        setIsInModal(!!(dialogParent || modalParent));
      }
    };

    checkModalContext();
    
    // Handle window resize for responsive positioning
    const handleResize = () => {
      if (tooltipRef.current) {
        setTooltipPosition(calculateTooltipPosition());
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Dynamic tooltip positioning based on viewport and modal context
  const calculateTooltipPosition = () => {
    if (!tooltipRef.current) return '';

    const rect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const modalElement = tooltipRef.current.closest('dialog');
    const isMobile = viewportWidth <= 768;
    
    let classes = [];
    
    // Add modal-safe class if in modal context
    if (isInModal) {
      classes.push('modal-safe');
    }
    
    // Mobile-first positioning
    if (isMobile) {
      classes.push('tooltip-bottom');
      return classes.join(' ');
    }
    
    // Horizontal positioning for desktop
    if (rect.left < 200) {
      classes.push('tooltip-left');
    } else if (rect.right > viewportWidth - 200) {
      classes.push('tooltip-right');
    }
    
    // Vertical positioning - check if tooltip would extend beyond modal or viewport
    if (modalElement) {
      const modalRect = modalElement.getBoundingClientRect();
      if (rect.top - 150 < modalRect.top) {
        classes.push('tooltip-bottom');
      }
    } else if (rect.top < 150) {
      classes.push('tooltip-bottom');
    }
    
    // Fixed positioning for complex modal scenarios
    if (isInModal && classes.length > 1) {
      classes.push('tooltip-fixed');
    }
    
    return classes.join(' ');
  };

  function truncateName(file: any) {
    return file?.name?.length > fileNameTruncateSize
      ? file?.name.slice(0, fileNameTruncateSize).concat("...")
      : file?.name || file?.file_name;
  }

  function handleViewFile(file: any) {
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
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { files }: any = event.target;

    if (files && files.length > 0) {
      const filesToUpload: File[] = [...files];

      // Check for Maximum Size
      const filesExceedSize = filesToUpload.some((file) => {
        // from bytes to kb
        const fileSize = file.size / 1024;
        return fileSize > maxFileSize;
      });

      if (filesExceedSize && filesToUpload?.length <= 5) {
        //Handle when file size exceeds maximum size
        if (onError) {
          onError(FileErrors.MAX_ALLOWED_FILE_SIZE_5MB);
        } else {
          showErrorToast(FileErrors.MAX_ALLOWED_FILE_SIZE_5MB);
        }
        return;
      } else if (filesToUpload?.length + existingFiles?.length > 5) {
        if (onError) {
          onError(FileErrors.MAX_FILE_COUNT);
        } else {
          showErrorToast(FileErrors.MAX_FILE_COUNT);
        }
        return;
      } else {
        // Clear any previous errors when files are valid
        if (onError) {
          onError("");
        }
        const updateFiles = existingFiles?.length ? existingFiles : [];

        afterFileChange([...updateFiles, ...filesToUpload]);
      }
    }

    event.target.files = null;
  }

  function handleDeleteFiles(fileOrder: number, fileObj: any) {
    if (deleteAfterConfirmation) {
      setDisplayConfirmationModal(true);
      setRowObjId(fileObj);
    } else {
      let updatedFiles = [...existingFiles];
      updatedFiles.splice(fileOrder, 1);
      afterFileChange([...updatedFiles]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset the file input value
    }
  }

  function handleButtonClick() {
    if (fileInputRef.current) {
      fileInputRef.current.click(); // Programmatically click the file input
    }
  }

  return (
    <div className={isInModal ? 'modal-context' : ''}>
      {titleName && (
        <div className="d_flex align_center">
          <h5 style={{ margin: 0, marginRight: "0.5rem" }}>
            {titleName}
            {required && <span className="required">*</span>}
          </h5>

          {displayInfoIcon && (
            <div 
              className="tooltip" 
              ref={tooltipRef}
              onMouseEnter={() => setTooltipPosition(calculateTooltipPosition())}
            >
              <i className="fa-light fa-circle-info attachment_info"></i>
              <span className={`tooltiptext ${tooltipPosition}`}>{infoText}</span>
            </div>
          )}
        </div>
      )}
      <input
        type="file"
        multiple={true}
        onChange={onFileChange}
        accept={filesToAccept}
        className="disable_default_file_name"
        disabled={disableChooseFileBtn}
        style={{ display: hideInputButton ? "none" : "" }}
        ref={fileInputRef}
      />
      {buttonName && !hideButton && (
        <CustomButton
          buttonName={buttonName}
          actionType={"button"}
          buttonType={buttonType.SECONDARY}
          iconClassName="fa-light fa-floppy-disk"
          onClick={() => handleButtonClick()}
        />
      )}
      {existingFiles?.length > 0 &&
        existingFiles.map((fileObj: any, index: number) => (
          <Fragment key={fileObj?.id}>
            <div className="pt_itemwithremove mb_1">
              <span>{truncateName(fileObj)}</span>

              <div>
                <div>
                  {!hideViewButton && (
                    <a
                      className="downloadfile mr_zero_point_five"
                      onClick={() => handleViewFile(fileObj)}
                    >
                      <button className="secondary smallbutton" type="button">
                        <i className="fa-light fa-eye"></i>View
                      </button>
                    </a>
                  )}

                  {/* {!hideDeleteButton && ( */}
                  {!(
                    hideDeleteButton &&
                    fileObj?.file_name?.includes("S75-support-statement")
                  ) && (
                    <a className="downloadfile">
                      <button
                        className="contrast smallbutton"
                        onClick={() => handleDeleteFiles(index, fileObj)}
                        type="button"
                      >
                        <i className="fa-light fa-trash"></i>Delete
                      </button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </Fragment>
        ))}
      {displayConfirmationModal && (
        <BaseModal
          modalId={"multiple file handler modal"}
          displayModal={displayConfirmationModal}
          onHeaderIconClose={() => setDisplayConfirmationModal(false)}
          restrictOncloseFunctionInHeader
          onClose={() => setDisplayConfirmationModal(false)}
          onConfirm={() => {
            customDeleteFunction(rowObjId);
            return true;
          }}
          firstButtonName={closeButtonName}
          secondButtonName={confirmationButtonName}
        >
          <h4>{confirmationDeleteMessage}</h4>
        </BaseModal>
      )}
    </div>
  );
}
