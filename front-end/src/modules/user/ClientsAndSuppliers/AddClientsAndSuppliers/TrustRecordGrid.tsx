import BaseModal from "@/components/BaseModal";
import { useAddClientsAndSuppliersContext } from "./AddClientsAndSuppliersContext";
import DynamicTable from "@/components/Table";
import {
  OverallTrustTrainingGridHeaders,
  trustTrainingGridHeaders,
  trustTrainingRenderData,
} from "./AddClientsAndSuppliers.constant";
import { setAddTrustRecord } from "@/redux/slices/companyRegistrationDetails";
import { useAppDispatch } from "@/redux/store";
import { Fragment, useState } from "react";
import { setDeletedAccountDetails } from "@/redux/slices/clientSuppliersDetails";
import { VIEW } from "@/shared/constant/general";

export default function TrustRecordGrid() {
  const {
    displayAccountRecordsGrid,
    setDisplayAccountRecordsGrid,
    accountDetailsGridData,
    formik,
    setDisplayTrainingRecords,
    setAccountDetailsGridData,
    params,
  }: any = useAddClientsAndSuppliersContext();

  const { id: slugData } = params;

  const [deletedAccountIds, setDeletedAccountIds] = useState<any[]>([]);

  const dispatch = useAppDispatch();

  const trustTrainingGridActions: any = [
    {
      label: "Delete",
      style: "contrast",
      icon: "fa-light fa-trash",
      onClick: (row: any) => {
        const filteredData = accountDetailsGridData.filter(
          (data: any) => data?.id !== row?.id
        );
        if (row?.client_supplier_id) {
          setDeletedAccountIds((prev: any) => [...prev, row?.id]);
        }
        setAccountDetailsGridData(filteredData);
      },
    },
  ];

  function addNewTrustRecord() {
    formik.resetForm({
      values: {
        ...formik.values,
        account_name: "",
        bsb_number: "",
        account_type: "",
        account_number: "",
      },
    });
    formik.setTouched({
      account_name: false,
      bsb_number: false,
      account_type: false,
      account_number: false,
    });

    formik.setFieldValue("isPaymentDetailsRequired", true); // isPaymentDetailsRequired
    setDisplayTrainingRecords(true);
    setDisplayAccountRecordsGrid(false);
  }

  function handleSaveTrainingRecords() {
    setDisplayAccountRecordsGrid(false);
    formik?.setFieldValue("isPaymentDetailsRequired", false);
    dispatch(setAddTrustRecord([...accountDetailsGridData]));
    dispatch(setDeletedAccountDetails([...deletedAccountIds]));
    return true;
  }

  return (
    <BaseModal
      modalId={"Trust And Training Records Grid Id"}
      title="Account details"
      displayModal={displayAccountRecordsGrid}
      onClose={() => setDisplayAccountRecordsGrid(false)}
      onConfirm={() => handleSaveTrainingRecords()}
      secondButtonName="Save"
      hideFirstButton
      hideSecondButton={slugData[0] == VIEW}
    >
      {slugData[0] !== VIEW && (
        <small>Please add account and their details.</small>
      )}

      {slugData[0] !== VIEW && (
        <Fragment>
          <br />
          <br />
          <a className="pt_addnewbutton jus_end">
            <button className="secondary" onClick={() => addNewTrustRecord()}>
              <i className="fa-light fa-hexagon-plus"></i>Add
            </button>
          </a>
        </Fragment>
      )}
      <br />
      <DynamicTable
        headers={
          slugData[0] == VIEW
            ? trustTrainingGridHeaders
            : OverallTrustTrainingGridHeaders
        }
        gridData={
          accountDetailsGridData?.length > 0 ? accountDetailsGridData : []
        }
        gridActions={slugData[0] == VIEW ? [] : trustTrainingGridActions}
        displayAllStaticActions
        renderRowList={trustTrainingRenderData(slugData[0] == VIEW)}
        hidePagination
        alignActionsDataCenter
        loaderColSpan={4}
        customHallowGrid={"modal_table_loader"}
      />
    </BaseModal>
  );
}
