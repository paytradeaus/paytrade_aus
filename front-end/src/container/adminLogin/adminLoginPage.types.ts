export interface IAdminLogInData {
  email: string;
  password: string;
  isChecked: boolean;
}
export interface IErrorData {
  email: string;
  password: string;
  isEmailInValid: boolean;
  isPasswordInValid: boolean;
}
