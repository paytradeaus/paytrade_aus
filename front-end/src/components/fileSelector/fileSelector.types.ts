export interface IProps {
  /** List of accepted file formats Eg: ['.jpg'. 'application/pdf'] */
  acceptedFileFormats: string[];
  /** Maximum size of the file in KB */
  maximumSize?: number;
  multiple?: boolean;
  handleSave?: (files: File[]) => void;
  disabled?: boolean;
  onError?: (error: "MAX_SIZE_EXCEED") => void;
  children?:
    | React.ReactNode
    | ((triggerFilePicker: () => void) => React.ReactNode);
}
