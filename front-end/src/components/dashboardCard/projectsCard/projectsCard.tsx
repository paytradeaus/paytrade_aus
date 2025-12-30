import React, { useEffect, useState } from "react";
import { Card } from "react-bootstrap";
import styles from "./projectsCard.module.scss";
import { getProjectListsForCompany } from "@/container/projectList/projectList.functions";
import { getCookie } from "cookies-next";
import { ApplicationURLS } from "@/common/applicationURLS";
import { useRouter } from "next/navigation";
import { NO_RECORDS, YOU_ARE_UPTO_DATE } from "@/common/constants/messages";
import { RootState, useAppSelector } from "@/redux/store";

const ProjectsCard: React.FC = () => {
  const [projectList, setProjectList] = useState<any>([]);
  const [displayNoDataMessage, setDisplayNoDataMessage] = useState(false);
  const router = useRouter();
  const [totalAccountCount, setTotalAccountCount] = useState(0);

  const updatedCompany: any = useAppSelector(
    (state: RootState) => state.companyStore.updatedcompany
  );

  useEffect(() => {
    getProjectsLists();
  }, [updatedCompany?.company_id]);

  async function getProjectsLists() {
    try {
      const response = await getProjectListsForCompany({
        company_id: Number(getCookie("companyId")), // Change companyId as per your requirement
        page_number: null,
        page_size: null,
        project_name_or_id: null,
        project_role: null,
      });

      if (response) {
        setProjectList(response?.project_list || []);
        setTotalAccountCount(response?.total_count);
        setDisplayNoDataMessage(response?.project_list?.length === 0);
      }
    } catch (error) {
      console.log("getProjectsLists ~ error:", error);
    }
  }

  function getNoRecordData() {
    if (displayNoDataMessage) {
      return <div className={styles.noRecordRow}>{NO_RECORDS} </div>;
    } else {
      return "";
    }
  }

  return (
    <Card className={styles.CardStyles}>
      <Card.Body className={styles.CardBodyStyle}>
        <div className="h-100">
          <Card.Title className={styles.CardTitleStyles}>
            PROJECTS{" "}
            {!!totalAccountCount && (
              <span className={`${styles.RoundedBorders} ${"mx-1"}`}>
                {totalAccountCount}
              </span>
            )}
          </Card.Title>

          <div className={`${styles.ScrollableContent} ${styles.CardHeight}`}>
            {projectList?.length > 0 &&
              projectList.map((data: any, index: number) => (
                <div className={styles.layoutStyles} key={index}>
                  <div className={styles.CardSubtitleStyle}>
                    {data?.project_name}
                  </div>
                  <div className={styles.FlexStyles}>
                    <div className={styles.CardSubtitleStyle}>CS:</div>
                    <div className={styles.DarkBlueTitle}>{`$ ${
                      data?.formatted_head_contract_sum
                        ? data?.formatted_head_contract_sum
                        : "0.00"
                    }`}</div>
                  </div>
                  <div className={styles.FlexStyles}>
                    <div className={styles.CardSubtitleStyle}>PTA:</div>
                    <div className={styles.TurquoiseTitle}>{`${
                      data?.pta_eligibility === "Yes"
                        ? "Eligible"
                        : "Not Eligible"
                    }`}</div>
                  </div>
                </div>
              ))}
          </div>
          {getNoRecordData()}
        </div>
        {projectList?.length > 0 && (
          <Card.Link
            className={`${styles.BottomLinkStyles} ${"c-p"}`}
            onClick={() => router.push(ApplicationURLS.USER_PROJECT_CURRENT)}
          >
            View
          </Card.Link>
        )}
      </Card.Body>
    </Card>
  );
};

export default ProjectsCard;
