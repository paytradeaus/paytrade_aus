import React from "react";
import { Card, Row } from "react-bootstrap";
import Image from "next/image";
import styles from "./CardBlock.module.scss";
import { colorArray } from "../../common/constants";

interface CustomCardProps {
  heading: string;
  subHeading: string;
  imgSrc: string;
  title: string;
  subtitle: string;
  description: string;
  width: number;
  height: number;
}

const Cards: React.FC<CustomCardProps> = ({
  heading,
  subHeading,
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
      <Image
        src={imgSrc}
        alt="/"
        className={styles.imageStyle}
        width={width}
        height={height}
      />
      <Card.Body className={styles.cardBodyStyle}>
        <h3 className={styles.lowerCaseRightHeadingStyle}>{heading}</h3>
        <Card.Title
          className={`${titleStyleObj?.style} ${styles?.cardTitleStyle}`}
        >
          <h2 className={styles.subHeader}>{subHeading}</h2>
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
