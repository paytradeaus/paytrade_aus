import React from "react";
import { Card, Row } from "react-bootstrap";
import Image from "next/image";
import styles from "./card.module.scss";
import { colorArray } from "../../common/constants";

interface CustomCardProps {
  heading: string;
  imgSrc: string;
  title: string;
  subtitle: string;
  description: string;
  width: number;
  height: number;
}

const Cards: React.FC<CustomCardProps> = ({
  heading,
  imgSrc,
  title,
  subtitle,
  description,
  width,
  height,
}) => {
  const titleStyleObj: any = colorArray.find((item) => item.title === title);

  return (
    <Card className={styles.cardStyle}>
     {imgSrc && <Image
        src={imgSrc}
        alt="/"
        className="d-inline-block align-top"
        width={width}
        height={height}
      />}
      <Card.Body className={styles.cardBodyStyle}>
        <h3 className={styles.lowerCaseRightHeadingStyle}>{heading}</h3>
        <Card.Title
          className={`${titleStyleObj.style} ${styles.cardTitleStyle}`}
        >
          {title}
        </Card.Title>
        <Card.Subtitle className={styles.cardSubtitleStyle}>
          {subtitle}
        </Card.Subtitle>
        <Card.Text className={styles.cardTextStyle}>{description}</Card.Text>
      </Card.Body>
    </Card>
  );
};

export default Cards;
