import React from "react";
import { Col, Row } from "react-bootstrap";
import Image from "next/image";
import styles from "./infoDesk.module.scss";
import { colorArray } from "../../common/constants";

interface InfoDeskProps {
  heading: string;
  spantext: string;
  content: string;
  anchortext: string;
  imgSrc: string;
  index: number;
  width: number;
  height: number;
}

const InfoDesk: React.FC<InfoDeskProps> = ({
  heading,
  spantext,
  content,
  anchortext,
  imgSrc,
  index,
  width,
  height,
}) => {
  const spanStyleObj: any = colorArray.find(
    (item) => item.spantext === spantext
  );

  return (
    <Row className={index % 2 === 0 ? "" : styles.reverseRow}>
      <Col lg={7}>
        <h3 className={styles.lowerCaseHeading}>{heading}</h3>
        <span className={`${styles.spanStyle} ${spanStyleObj.style}`}>
          {spantext}
        </span>
        <p className={`${"mb-0"} ${styles.contentStyle}`}>{content}</p>
        <a className={styles.anchorStyle}>{anchortext}</a>
        <br />
      </Col>
      <Col className={index % 2 !== 0 ? "" : styles.oddImgStyle} lg={5}>
        <Image
          src={imgSrc}
          alt="offer details"
          className={styles.imageSecure}
          width={425}
          height={190}
        />
      </Col>
    </Row>
  );
};

export default InfoDesk;
