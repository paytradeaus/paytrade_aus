import React, { Fragment } from "react";
import { useAddUpdateClaimsContext } from "./AddUpdateClaimsContext";
import FormikControl from "@/components/FormikControl";
import { buttonType, InputType } from "@/shared/constant/general";
import { v4 as uuidv4 } from "uuid";
import { ApiResponse } from "@/shared/constant/messages";
import { formatDollars, removeCommas } from "@/utils";
import { UserData } from "./AddUpdateClaims.constant";

export default function FormArrayGrid() {
  const {
    togglePaymentBillables,
    isViewMode,
    importClaimIdFromMail,
    formik,
    formatRupees,
  }: any = useAddUpdateClaimsContext();

  function handleDelete(index: any) {
    // Create a copy of the `claimItems` array using the spread operator.
    let updatedList = [...formik.values.claimItems];

    // Remove the element at the specified index from the copied array.
    updatedList.splice(index, 1);

    // Update the `claimItems` field with the updated list of values.
    formik.setFieldValue("claimItems", updatedList);

    const subTotal = calculateSubtotal(updatedList);

    formik.setFieldValue("subTotal", +subTotal);

    const totalGst = calculateTotalGST(
      updatedList,
      formik?.values?.isGstChecked
    );

    formik.setFieldValue("gstAmount", +totalGst);

    const totalClaim = (parseFloat(subTotal) + parseFloat(totalGst)).toFixed(2);

    formik.setFieldValue("totalAmount", +totalClaim);
  }

  function handleAddRows(count: number) {
    const { claimItems } = formik.values;
    // Create a new object with the 'mode' property set to 'EDIT'
    const newObject: any = formik.initialValues.claimItems;
    // Add the new object to the existing array of objects
    let addedFormValues: any = [];
    if (count === 1) {
      addedFormValues = [...claimItems, { ...newObject[0], keyId: uuidv4() }];
    } else if (count == 5) {
      addedFormValues = [
        ...claimItems,
        { ...newObject[0], keyId: uuidv4() },
        { ...newObject[0], keyId: uuidv4() },
        { ...newObject[0], keyId: uuidv4() },
        { ...newObject[0], keyId: uuidv4() },
        { ...newObject[0], keyId: uuidv4() },
      ];
    }
    // Update the 'claimItems' field value in the formik values
    formik.setFieldValue("claimItems", addedFormValues);
  }

  function calculateSubtotal(data: UserData[]) {
    let subtotal = 0;
    data.forEach((row: any) => {
      const quantity = parseFloat(row.quantity);

      const paymentValues = removeCommas(row.unit_price);
      const onlyValues = paymentValues.replace(/[^0-9.]/g, "");
      const price = Number(onlyValues);

      if (!isNaN(quantity) && !isNaN(price)) {
        subtotal += quantity * price;
      }
    });
    return subtotal.toFixed(2);
  }

  function calculateTotalGST(data: UserData[], isGstRegistered: boolean) {
    if (!isGstRegistered) return "0.00"; // No GST calculation if unchecked

    let totalGST = 0;
    data.forEach((row) => {
      const gst = parseFloat(row.gst);
      if (!isNaN(gst)) {
        totalGST += gst;
      }
    });
    return totalGST.toFixed(2);
  }

  function handleNumericInputChange(
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) {
    try {
      let { name, value } = e.target;

      if (value.replace(".", "").length > 13) {
        return; // Prevent more than 13 numeric characters
      }

      // Allow only numeric values or empty string
      if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
        const newData: any = JSON.parse(
          JSON.stringify(formik?.values?.claimItems)
        );

        newData[index][name] = value;

        // Calculate gst based on the formula 10% * (Quantity * Unit price)
        const quantity = parseFloat(newData[index].quantity);
        const paymentValues = removeCommas(newData[index].unit_price);
        const onlyValues = paymentValues.replace(/[^0-9.]/g, "");

        const price = Number(onlyValues);

        if (!isNaN(quantity) && !isNaN(price)) {
          if (formik?.values?.isGstChecked) {
            const gstAmount = (quantity * price * 0.1).toFixed(2);
            // If GST is registered, calculate GST
            newData[index].gst = gstAmount;
            newData[index].total_amount_including_gst = (
              quantity * price +
              parseFloat(gstAmount)
            ).toFixed(2);
          } else {
            // If GST is not registered, set GST to 0
            newData[index].gst = "0.00";
            newData[index].total_amount_including_gst = (
              quantity * price
            ).toFixed(2);
          }
        } else {
          newData[index].gst = "";
          newData[index].total_amount_including_gst = "";
        }
        // Recalculate subtotal and totals using updated data
        const subTotal = calculateSubtotal(newData);
        const totalGst = calculateTotalGST(
          newData,
          formik?.values?.isGstChecked
        );
        const total = (parseFloat(subTotal) + parseFloat(totalGst)).toFixed(2);

        // Update the state with new values
        formik?.setFieldValue("claimItems", newData);
        formik?.setFieldValue("subTotal", +subTotal);
        formik?.setFieldValue("gstAmount", +totalGst);
        formik?.setFieldValue("totalAmount", +total);
      }
    } catch {}
  }

  function handlePriceChange(e: any, index: number) {
    let { name, value } = e.target;
    let rawValue = value.replace(/[^0-9.]/g, ""); // Remove non-numeric characters

    const newData: any = JSON.parse(JSON.stringify(formik?.values?.claimItems));

    // Allow clearing the input value (setting to empty)
    if (rawValue === "" || rawValue === "$") {
      newData[index][name] = "";
      newData[index].gst = "";
      newData[index].total_amount_including_gst = "";
      // Recalculate subtotal and totals using updated data
      const subTotal = calculateSubtotal(newData);
      const totalGst = calculateTotalGST(newData, formik?.values?.isGstChecked);
      const total = (parseFloat(subTotal) + parseFloat(totalGst)).toFixed(2);

      // Update the state with new values
      formik?.setFieldValue("claimItems", newData);
      formik?.setFieldValue("subTotal", +subTotal);
      formik?.setFieldValue("gstAmount", +totalGst);
      formik?.setFieldValue("totalAmount", +total);
      return;
    }

    // Handle leading zeros (ignore for decimal values like "0.1")
    if (
      rawValue.startsWith("0") &&
      rawValue.length > 1 &&
      rawValue[1] !== "."
    ) {
      rawValue = rawValue.slice(1); // Prevent leading zeros
    }

    const decimalParts = rawValue.split(".");

    if (decimalParts.length > 2) {
      return; // Prevent multiple decimal points
    }

    let [integerPart, decimalPart] = decimalParts;

    // Only limit the integer part to 11 digits
    if (integerPart.length > 11) {
      return;
    }

    if (decimalPart) {
      decimalPart = decimalPart.slice(0, 2); // Limit decimal places to two digits
    }

    let finalValue =
      decimalPart !== undefined ? `${integerPart}.${decimalPart}` : integerPart;

    if (finalValue.replace(".", "").length > 13) {
      return; // Prevent more than 13 characters total (ignoring the decimal)
    }

    const formattedValue = formatDollars(finalValue); // Assuming formatDollars is a function you have

    // Update form value
    newData[index][name] = formattedValue;
    const quantity = parseFloat(newData[index].quantity);
    const price = parseFloat(rawValue);
    if (formik?.values?.isGstChecked) {
      const gstAmount = (quantity * price * 0.1).toFixed(2);
      // If GST is registered, calculate GST
      newData[index].gst = gstAmount;
      newData[index].total_amount_including_gst = (
        quantity * price +
        parseFloat(gstAmount)
      ).toFixed(2);
    } else {
      // If GST is not registered, set GST to 0
      newData[index].gst = "0.00";
      newData[index].total_amount_including_gst = (quantity * price).toFixed(2);
    }

    // Recalculate subtotal and totals using updated data
    const subTotal = calculateSubtotal(newData);
    const totalGst = calculateTotalGST(newData, formik?.values?.isGstChecked);
    const total = (parseFloat(subTotal) + parseFloat(totalGst)).toFixed(2);

    // Update the state with new values
    formik?.setFieldValue("claimItems", newData);
    formik?.setFieldValue("subTotal", +subTotal);
    formik?.setFieldValue("gstAmount", +totalGst);
    formik?.setFieldValue("totalAmount", +total);
  }

  function handleGSTChange(event: any) {
    const isChecked = event.target.checked;
    formik?.setFieldValue("isGstChecked", isChecked);

    if (formik.values.claimItems?.length > 0) {
      // Recalculate values instantly based on the new checkbox value
      const newData = [...formik.values.claimItems].map((row) => {
        const quantity = parseFloat(row.quantity);

        const paymentValues = removeCommas(row.unit_price);
        const onlyValues = paymentValues.replace(/[^0-9.]/g, "");
        const price = Number(onlyValues);
        if (!isNaN(quantity) && !isNaN(price)) {
          if (isChecked) {
            // If checked (GST registered), calculate GST
            row.gst = (quantity * price * 0.1).toFixed(2);

            row.total_amount_including_gst = (
              quantity * price +
              quantity * price * 0.1
            ).toFixed(2);
          } else {
            // If unchecked (GST not registered), set GST to 0
            row.gst = "0.00";
            row.total_amount_including_gst = (quantity * price).toFixed(2);
          }
        }
        return row;
      });

      // Recalculate subtotal and total GST based on the updatedData
      const subTotal = calculateSubtotal(newData);
      const totalGst = calculateTotalGST(newData, isChecked);

      const total = (parseFloat(subTotal) + parseFloat(totalGst)).toFixed(2);

      // Update the state with new values
      formik?.setFieldValue("claimItems", newData);
      formik?.setFieldValue("subTotal", +subTotal);
      formik?.setFieldValue("gstAmount", +totalGst);
      formik?.setFieldValue("totalAmount", +total);
    }
  }

  return (
    <Fragment>
      <div className="pt_table pt_formtable paymentClaims">
        <table className="dataTable compact stripe nowrap hover order-column">
          <thead className="dynamic_table_header">
            <tr>
              <th>ID</th>
              <th>
                Description<span className="required">*</span>
              </th>
              <th>
                Quantity<span className="required">*</span>
              </th>
              <th>
                Unit price<span className="required">*</span>
              </th>
              <th
                data-tooltip={
                  formik?.values?.isGstChecked
                    ? "DISABLE THIS OPTION IF THIS BUSINESS IS NOT REGISTERED FOR GST "
                    : "ENABLE THIS OPTION IF THIS BUSINESS IS REGISTERED FOR GST"
                }
                data-placement="left"
              >
                <FormikControl
                  control={InputType.CHECKBOX}
                  name="gst"
                  checked={formik?.values?.isGstChecked}
                  value={formik?.values?.isGstChecked}
                  onChange={handleGSTChange}
                  disabled={isViewMode || importClaimIdFromMail}
                />
                GST <i className="fa-light fa-circle-info thicon"></i>
              </th>
              <th>
                Amount{" "}
                {formik?.values?.isGstChecked
                  ? "(including GST)"
                  : "(excluding GST)"}
              </th>
              {!isViewMode && <th>Delete</th>}
            </tr>
          </thead>
          <tbody>
            {formik?.values?.claimItems?.length > 0 ? (
              formik.values.claimItems.map((data: any, index: number) => (
                <tr key={data?.keyId ?? index} className="form_array_table_row">
                  <td data-label="ID">
                    {index + 1}
                    {!isViewMode && (
                      <a
                        data-tooltip="Add"
                        data-placement="right"
                        className="formArrayAddIcon"
                      >
                        <button
                          className={buttonType.SECONDARY}
                          onClick={() => handleAddRows(1)}
                          disabled={isViewMode || importClaimIdFromMail}
                        >
                          <i className="fa-light fa-add "></i>
                        </button>
                      </a>
                    )}
                  </td>
                  <td data-label="Description">
                    <FormikControl
                      control={InputType.TEXT_FIELD}
                      name={"description"}
                      // placeholder="Enter description"
                      onChange={(e: any) => {
                        formik.setFieldValue(
                          `claimItems[${index}].description`,
                          e?.target?.value
                        );
                      }}
                      customizeErrorFont={"claimsErrorFont"}
                      disabled={isViewMode || importClaimIdFromMail}
                      showError={
                        formik.touched?.claimItems?.[index]?.description &&
                        formik.errors?.claimItems?.[index]?.description
                      }
                      error={formik.errors?.claimItems?.[index]?.description}
                      value={data?.description}
                      onBlur={formik.handleBlur("description")}
                    />
                  </td>
                  <td data-label="Quantity">
                    <FormikControl
                      control={InputType.TEXT_FIELD}
                      name={"quantity"}
                      maxLength={"5"}
                      customizeErrorFont={"claimsErrorFont"}
                      disabled={isViewMode || importClaimIdFromMail}
                      onChange={(e: any) => handleNumericInputChange(e, index)}
                      showError={
                        formik.touched?.claimItems?.[index]?.quantity &&
                        formik.errors?.claimItems?.[index]?.quantity
                      }
                      error={formik.errors?.claimItems?.[index]?.quantity}
                      value={data?.quantity}
                      onBlur={formik.handleBlur("quantity")}
                    />
                  </td>
                  <td data-label="Unit Price">
                    <FormikControl
                      control={InputType.TEXT_FIELD}
                      name={"unit_price"}
                      customizeErrorFont={"claimsErrorFont"}
                      disabled={isViewMode || importClaimIdFromMail}
                      onChange={(e: any) => handlePriceChange(e, index)}
                      showError={
                        formik.touched?.claimItems?.[index]?.unit_price &&
                        formik.errors?.claimItems?.[index]?.unit_price
                      }
                      error={formik.errors?.claimItems?.[index]?.unit_price}
                      value={data?.unit_price}
                      onBlur={formik.handleBlur("unit_price")}
                    />
                  </td>
                  <td data-label="GST">
                    <FormikControl
                      control={InputType.TEXT_FIELD}
                      name={"gst"}
                      // placeholder="Gst"
                      onChange={(e: any) => {}}
                      value={
                        data?.gst ? `${formatRupees(Number(data?.gst))}` : ""
                      }
                      disabled
                      onBlur={formik.handleBlur("gst")}
                    />
                  </td>
                  <td data-label="Amount">
                    <FormikControl
                      control={InputType.TEXT_FIELD}
                      name={"total_amount_including_gst"}
                      // placeholder="total_amount_including_gst"
                      onChange={(e: any) => {}}
                      value={
                        data?.total_amount_including_gst
                          ? `${formatRupees(
                              Number(data?.total_amount_including_gst)
                            )}`
                          : ""
                      }
                      onBlur={formik.handleBlur("total_amount_including_gst")}
                      disabled
                    />
                  </td>
                  {!isViewMode && (
                    <td data-label="Action">
                      <a data-tooltip="Delete" data-placement="left">
                        <button
                          className="contrast"
                          onClick={() => handleDelete(index)}
                        >
                          <i className="fa-light fa-trash"></i>
                        </button>
                      </a>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>
                  <article className="table-loader">
                    {ApiResponse.NO_RECORDS_TO_DISPLAY}
                  </article>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="grid pt_memototal grid-1-2">
        {!isViewMode && (
          <div className="pt_tableactionbuttons">
            <a>
              <button
                className="secondary smallbutton"
                onClick={() => handleAddRows(5)}
              >
                <i className="fa-light fa-hexagon-plus"></i>Add new line
              </button>
            </a>
            <a>
              <button
                className="contrast smallbutton"
                onClick={() =>
                  formik?.setFieldValue("claimItems", [
                    formik?.initialValues?.claimItems[0],
                  ])
                }
              >
                <i className="fa-light fa-trash"></i>Clear all lines
              </button>
            </a>
          </div>
        )}
        <div className="pt_memowrap">
          <div className="pt_memo">
            <FormikControl
              control={InputType.TEXT_AREA}
              name={"memo"}
              maxLength={200}
              placeholder="Memo"
              onChange={(e: any) =>
                formik?.setFieldValue("memo", e?.target?.value)
              }
              value={formik?.values?.memo}
              disabled={isViewMode}
            />
          </div>
        </div>
      </div>
      <div
        className={
          togglePaymentBillables() && isViewMode
            ? "grid pt_data grid-2-1"
            : "grid  grid-2-1"
        }
      >
        <div className={""}>
          {togglePaymentBillables() && isViewMode && (
            <p>
              Please pay the total amount on or before the due date for payment.
              If you are unable to pay the total amount, Please respond with a
              payment schedule within 15 business days after the date you
              received this invoice/payment claim as required under the Building
              Industry Fairness (Security of Payment) ACT 2017.
            </p>
          )}
        </div>

        <div className="pt_totalwrap">
          <div className="pt_infocol">
            <div>
              <h5>Sub Total</h5>

              <h4>{formatRupees(formik?.values?.subTotal)}</h4>
            </div>
            <div>
              <h5>GST</h5>
              <h4>{formatRupees(formik?.values?.gstAmount)}</h4>
            </div>
            <div>
              <h5>Total</h5>
              <h3>{formatRupees(formik?.values?.totalAmount)}</h3>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
