import { InputType } from "@/shared/constant/general";
import TextField from "./Inputs/TextField";
import Select from "./Inputs/Select";
import ToggleInputGroup from "./Inputs/ToggleInputGroup";
import DatePicker from "./Inputs/DatePicker";
import MultiSelect from "./Inputs/MultiSelect";
import Search from "./Inputs/Search";
import TextArea from "./Inputs/TextArea";

/**
 * Renders a dynamic form input component based on the provided `control` type.
 * Leverages the `InputType` enumeration for type safety and maintainability.
 *
 * @param props {Formik.FormikProps<any> & { control: InputType }} - Formik props extended with a `control` property specifying the input type.
 * @returns  - The rendered form input component (e.g., TextField, Select, DatePicker, etc.).
 */
function FormikControl(props: any) {
  const { control, type, ...rest } = props;
  switch (control) {
    case InputType.TEXT_FIELD:
      return <TextField {...rest} type={type || InputType.TEXT_FIELD} />;
    case InputType.TEXT_AREA:
      return <TextArea {...rest} type={type || InputType.TEXT_AREA} />;
    case InputType.SELECT:
      return <Select {...rest} />;
    case InputType.CHECKBOX:
      return <ToggleInputGroup {...rest} type={InputType.CHECKBOX} />;
    case InputType.RADIO_BUTTON:
      return <ToggleInputGroup {...rest} type={InputType.RADIO_BUTTON} />;
    case InputType.SWITCH:
      return (
        <ToggleInputGroup
          {...rest}
          type={InputType.CHECKBOX}
          role={InputType.SWITCH}
        />
      );
    case InputType.DATE_PICKER:
      return <DatePicker {...rest} type={InputType.DATE_PICKER} />;
    case InputType.TIME_PICKER:
      return <DatePicker {...rest} type={InputType.TIME_PICKER} />;
    case InputType.MONTH_YEAR_PICKER:
      return <DatePicker {...rest} type={InputType.MONTH_YEAR_PICKER} />;
    case InputType.MULTI_SELECT:
      return <MultiSelect {...rest} />;
    case InputType.SEARCH:
      return <Search {...rest} />;

    default:
      return null;
  }
}

export default FormikControl;
