"use client";
import React, { useEffect, useState } from "react";
import { fetchRetentionsSummary } from "./retentionSummary.functions";
import FormikControl from "@/components/FormikControl";
import { InputType, NA } from "@/shared/constant/general";
import DynamicTable from "@/components/Table";
import {
  retentionSummaryGridListHeaders,
  RetentionSummaryRenderData,
} from "../RetentionList/retentionList.constants";
import BaseModal from "@/components/BaseModal";
import { DD_MM_YYYY } from "@/shared/constant/identificationNumbers";
import { formatDate } from "@/utils";

type UserData = {
  retention_summary_id: string;
  retained_on: string;
  retention_id: number;
  retention_type: string;
  sub_payment_id: number;
  event_id: number;
  amount: string;
  beneficiary_name: string;
  retained_account_name: string;
  payment_amount: string;
};

const RetentionSummary = ({ openModal, onClose, retentionsClaimData }: any) => {
  const [retentionSummaryData, setRetentionSummaryData] = useState([]);
  const [listTotalCount, setListTotalCount] = useState(0);
  const [loader, setLoader] = useState(false);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState(
    retentionsClaimData?.status === "Deleted" ? "Deleted" : "Active"
  );

  const statusOptions = [
    { value: "Deleted", label: "Void" },
    { value: "Active", label: "Active" },
  ];

  useEffect(() => {
    if (
      retentionsClaimData?.retention_list_id ||
      retentionsClaimData?.rowData?.retention_list_id
    )
      initialInvokeData();
  }, [retentionsClaimData, page, perPage, selectedStatus]);

  async function initialInvokeData() {
    const postData = {
      payload: {
        retention_id:
          retentionsClaimData?.retention_list_id ||
          retentionsClaimData?.rowData?.retention_list_id,
        page_number: page,
        items_per_page: perPage,
        status: selectedStatus || "",
      },
    };
    setLoader(true);
    const summaryResponse = await fetchRetentionsSummary(postData);
    const printDataObjCreation = summaryResponse?.retention_summary?.map(
      (item: UserData) => {
        return {
          retention_summary_id: item?.retention_summary_id || "",
          retained_on: item?.retained_on ? formatDate(item?.retained_on) : NA,
          retention_id: item?.retention_id || "",
          retention_type: item?.retention_type || "",
          sub_payment_id: item?.sub_payment_id || "",
          event_id: item?.event_id || "",
          amount: `$ ${
            item?.amount
              ? Number(item.amount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : "0.00"
          }`,
          beneficiary_name: item?.beneficiary_name || "",
          retained_account_name: item?.retained_account_name || "",
          payment_amount: `$ ${
            item?.payment_amount
              ? Number(item.payment_amount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : "0.00"
          }`,
        };
      }
    );

    setRetentionSummaryData(printDataObjCreation || []);
    setListTotalCount(summaryResponse?.total_count);
    setLoader(false);
  }

  async function handlePageChange(page: number) {
    setPage(page);
  }

  async function handlePerRowsChange(newPerPage: number, page: number) {
    setPerPage(newPerPage);
  }

  const handleStatusChange = (selectedValue: any) => {
    setSelectedStatus(selectedValue);
  };
  return (
    <BaseModal
      title={"Retention Summary"}
      displayModal={openModal}
      onClose={onClose}
      hideSecondButton
      halfScreenPopup={true}
      firstButtonName={"Close"}
    >
      <div>
        <div className="container-fluid">
          <div className="pt_title">
            <div className="grid">
              <div className="pt_pagetitle">
                <h4>
                  Retention Id -{" "}
                  {retentionsClaimData?.retention_list_id ||
                    retentionsClaimData?.rowData?.retention_list_id}
                </h4>
              </div>
            </div>
          </div>
          <div className="pt_filtergroup">
            <div className="grid">
              <div style={{ width: "200px" }}>
                <FormikControl
                  placeholder={"Select Status"}
                  name="Select Status"
                  options={statusOptions}
                  onChange={handleStatusChange}
                  control={InputType.SELECT}
                  value={selectedStatus}
                  renderKey="label"
                  valueKey="value"
                />
              </div>
            </div>
          </div>

          <div className="grid">
            <div className="pt_box">
              <div className="grid">
                {/* <h4>{activeTab || "Current"}</h4> */}
              </div>
              <DynamicTable
                headers={retentionSummaryGridListHeaders}
                gridData={
                  retentionSummaryData?.length > 0 ? retentionSummaryData : []
                }
                gridActions={[]}
                onRowClick={(data: any) => {}}
                showLoader={loader}
                loaderColSpan={10}
                renderRowList={RetentionSummaryRenderData}
                currentPage={page}
                entriesPerPage={perPage}
                onEntriesPerPageChange={setPerPage}
                onPageChange={setPage}
                totalEntries={listTotalCount}
                customHallowGrid={"half_screen_modal_no_grid_Data"}
              />
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default RetentionSummary;
