"use client";
import { useLoaderContext } from "@/context/useLoader";
import { useFormik } from "formik";
import { useParams, usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import * as Yup from "yup";
import {
  FetchInformationsOfAContact,
  updateContactDetails,
} from "./AdminContactSubmission.functions";
import { SUCCESS } from "@/app/message";
import { AppRoutes } from "@/shared/constant/appRoutes";
import { showInfoToast, showSuccessToast } from "@/components/Toaster";
import { contactSubmissionStatus } from "../AdminContact/contactList.constant";
import BreadCrumbs from "@/components/BreadCrumbs";
import CustomButton from "@/components/CustomButton/CustomButton";
import { buttonType, InputType } from "@/shared/constant/general";
import FormikControl from "@/components/FormikControl";
import SearchableSelect from "@/components/SearchableSelect/SearchableSelect";
import BaseModal from "@/components/BaseModal";

const validationSchema = Yup.object().shape({
  status: Yup.object().required("Status is required"),
});

const AdminContactSupport = (props: any) => {
  const [faqData, setFaqData] = useState<any>([]);
  const [displayClosePageConfirmation, setDisplayClosePageConfirmation] =
    useState(false);
  const [initialStatus, setInitialStatus] = useState<any>(null);
  const [ticketDetails, setTicketDetails] = useState<any[]>([]);
  const [userMessage, setUserMessage] = useState("");
  const [editMode, setEditMode] = useState(false); // edit last sent message

  const routePath = usePathname();

  const router: any = useRouter();
  const params: any = useParams();
  const { id: slugData } = params;
  const { setLoader, setLoaderInfo }: any = useLoaderContext();

  useEffect(() => {
    if (slugData[0]) getContactDetails(slugData[0]);
  }, []);

  const formik: any = useFormik({
    initialValues: {
      name: "",
      companyName: "",
      email: "",
      // message: "",
      status: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      handleSubmit(values);
    },
  });

  function formatTimeTo12Hour(dateString: string) {
    const date = new Date(dateString);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  }

  const handleSendMessage = () => {
    if (!userMessage.trim()) return;

    if (editMode) {
      // Update last unsaved message
      const updatedTickets = [...ticketDetails];
      const lastIndex = updatedTickets.findIndex(
        (msg) => msg.id.startsWith("user_msg_") && !msg.is_saved
      );

      if (lastIndex !== -1) {
        updatedTickets[lastIndex].body = userMessage;
        updatedTickets[lastIndex].created_on = new Date().toISOString();
        setTicketDetails(updatedTickets);
      }
      // keep input value for further editing until final save
    } else {
      // Add new unsaved message
      const tempMsg = {
        body: userMessage,
        created_on: new Date().toISOString(),
        is_user: false, // user message
        is_saved: false, // mark as unsaved
        id: "user_msg_" + Math.random().toString(36).substr(2, 9),
      };
      setTicketDetails([...ticketDetails, tempMsg]);
      setEditMode(true); // allow editing this new message
    }
    // ✅ Always show toast after send/update
    showInfoToast(
      "Click save to apply changes and complete the sending process"
    );
  };

  // When user clicks "Save"
  const handleSubmit = async (values: any) => {
    // Only include newly typed/unsaved messages
    const newMessages = ticketDetails.filter(
      (msg) => !msg.is_saved && msg.body?.trim() !== ""
    );

    const finalMessage = newMessages.length
      ? newMessages[newMessages.length - 1].body
      : "";

    // ✅ Detect if there are any changes
    const hasStatusChanged = values?.status?.value !== initialStatus?.value;
    const hasNewMessage = !!finalMessage?.trim();

    if (!hasStatusChanged && !hasNewMessage) {
      showInfoToast("No changes to save.");
      return; // stop here — don’t make API call
    }

    const postData: any = {
      payload: {
        ticketId: slugData[0] ?? null,
        status: values?.status?.value ?? null,
        message: finalMessage ?? "",
      },
    };

    try {
      setLoaderInfo("Updating contact details...");
      setLoader(true);
      const response = await updateContactDetails(postData);
      if (response?.status === SUCCESS) {
        showSuccessToast(response?.message);

        // mark all messages as saved
        const savedTickets = ticketDetails.map((msg) => ({
          ...msg,
          is_saved: true,
        }));
        setTicketDetails(savedTickets);

        router.push(AppRoutes.ADMIN_CONTACT);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoader(false);
      setLoaderInfo("");
    }
  };

  async function getContactDetails(id: string) {
    try {
      setLoader(true);
      const postData: any = { getTicketByIdId: id };
      const data: any = await FetchInformationsOfAContact(postData);
      const response = data?.data;
      if (response) {
        setFaqData(response);
        formik.setFieldValue("name", response?.name);
        formik.setFieldValue("companyName", response?.companyName);
        formik.setFieldValue("email", response?.email);

        const findStatus = contactSubmissionStatus.find(
          (x: any) => x?.value == response?.status
        );
        formik.setFieldValue("status", findStatus ?? {});
        setInitialStatus(findStatus ?? {});
        // setTicketDetails(response?.ticket_details ?? []);
        // ✅ Mark all existing ticket messages as saved
        const ticketsWithSavedFlag = (response?.ticket_details ?? []).map(
          (msg: any) => ({
            ...msg,
            is_saved: true, // all existing messages are saved
          })
        );
        setTicketDetails(ticketsWithSavedFlag);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoader(false);
    }
  }

  const handleCancelClick = () => {
    if (formik.values.status?.value !== initialStatus?.value) {
      setDisplayClosePageConfirmation(true);
    } else {
      router.push(AppRoutes.ADMIN_CONTACT);
    }
  };

  function handlePageConfirmClose() {
    setDisplayClosePageConfirmation(false);
    router.push(AppRoutes.ADMIN_CONTACT);
  }

  function handlePageConfirmSave(values: any) {
    handleSubmit(values);
    setDisplayClosePageConfirmation(false);
  }

  return (
    <div className="container-fluid admin-contact-support">
      <div className="pt_title">
        <div className="pt_breadcrumbs">
          <BreadCrumbs
            routePaths={[
              {
                path: AppRoutes.ADMIN_DASHBOARD,
                name: "Dashboard",
              },
              {
                path: AppRoutes.ADMIN_CONTACT,
                name: "Contacts",
              },
            ]}
            activeRoute={"Edit Contact"}
          />
        </div>

        <br />
        <div className="pt_smallbgimage">
          <div className="pt_centered">
            <div className="pt_centeredinner">
              <div className="pt_box_transparent_cp">
                <div className="grid">
                  <div className="pt_login">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <h4>Edit contact </h4>
                      <h4>Ticket Id {`- ${faqData?.ticket_id || ""}`}</h4>
                    </div>
                    <br />
                    <form onSubmit={formik.handleSubmit}>
                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        label="Name"
                        name="name"
                        id="name"
                        placeholder="Enter your name"
                        value={formik.values.name}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        disabled
                      />
                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        label="Company Name"
                        name="companyName"
                        id="companyName"
                        placeholder="Enter business name"
                        value={formik.values.companyName}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        disabled
                      />
                      <FormikControl
                        control={InputType.TEXT_FIELD}
                        label="Email"
                        name="email"
                        id="email"
                        placeholder="Enter your email"
                        value={formik.values.email}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        disabled
                      />
                      <SearchableSelect
                        options={contactSubmissionStatus}
                        onChange={(selectedOption: any) =>
                          formik.setFieldValue("status", selectedOption)
                        }
                        placeholder="Select status"
                        selectedData={formik.values.status}
                        label="Status"
                        valueKey="value"
                        renderKey="label"
                      />

                      {/* Chat Box */}
                      <div className="chat-box">
                        <div className="chat-header">Messages</div>
                        <div className="chat-messages">
                          {/* {ticketDetails.map((msg) => (
                            <div
                              key={msg.id}
                              className={`chat-message ${
                                msg.is_user ? "user" : "self"
                              }`}
                            >
                              <div className="message-body">{msg.body}</div>
                              <div className="message-time">
                                {formatTimeTo12Hour(msg.created_on)}
                              </div>
                            </div>
                          ))} */}
                          {ticketDetails.map((msg, index) => {
                            const currentDate = new Date(
                              msg.created_on
                            ).toDateString();
                            const prevDate =
                              index > 0
                                ? new Date(
                                    ticketDetails[index - 1].created_on
                                  ).toDateString()
                                : null;

                            const showDateDivider = currentDate !== prevDate;

                            return (
                              <React.Fragment key={msg.id}>
                                {showDateDivider && (
                                  <div className="date-divider">
                                    <span>{formatDate(msg.created_on)}</span>
                                  </div>
                                )}
                                <div
                                  className={`chat-message ${
                                    msg.is_user ? "user" : "self"
                                  }`}
                                >
                                  <div className="message-body">{msg.body}</div>
                                  <div className="message-time">
                                    {formatTimeTo12Hour(msg.created_on)}
                                  </div>
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>

                        <div className="chat-input-container">
                          <input
                            type="text"
                            placeholder="Type a message..."
                            value={userMessage}
                            onChange={(e) => setUserMessage(e.target.value)}
                          />
                          <button
                            type="button"
                            disabled={!userMessage.trim()} // enables only if input has text
                            onClick={handleSendMessage}
                            className={editMode ? "edit-btn" : "send-btn"}
                          >
                            {editMode ? "Update" : "Send"}
                          </button>
                        </div>
                      </div>

                      <div className="form-buttons">
                        <CustomButton
                          buttonName="Cancel"
                          buttonType={buttonType.OUTLINE_CONTRAST}
                          actionType="button"
                          onClick={handleCancelClick}
                          inputButton
                        />
                        <CustomButton
                          buttonName="Save"
                          buttonType={buttonType.SECONDARY}
                          actionType="submit"
                          inputButton
                        />
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {displayClosePageConfirmation && (
          <BaseModal
            modalId={"updatePlan confirmation"}
            displayModal={displayClosePageConfirmation}
            onClose={handlePageConfirmClose}
            onHeaderIconClose={() => setDisplayClosePageConfirmation(false)}
            onConfirm={() => {
              handlePageConfirmSave(formik.values);
              return true;
            }}
            firstButtonName="Yes"
            secondButtonName="Save"
            restrictOncloseFunctionInHeader
          >
            <h4 className="text_center">Are you sure to close and not save?</h4>
          </BaseModal>
        )}
      </div>
    </div>
  );
};

export default AdminContactSupport;
