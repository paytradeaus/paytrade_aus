import Link from "next/link";
import { Fragment } from "react";

export default function AccountsCard({
  title,
  subTitle,
  viewButtonLink,
  cardData,
}: any) {
  return (
    <Fragment>
      <h6>{title}</h6>
      <h4>{subTitle}</h4>
      {viewButtonLink && (
        <Link href={viewButtonLink} className="pt_dashbutton">
          <button className="contrast">View</button>
        </Link>
      )}
      <div className="pt_dashboxwrap">
        {/* <a href="bankaccount.html" className="pt_dashbox">
          <div className="pt_dashleft">
            <b>General account - Deepa</b>
            <span>last updated on 01/10/2024</span>
          </div>
          <div className="pt_dashright">
            <span>Bank balance</span>
            <b>$450.46</b>
          </div>
        </a> */}
        {cardData?.map((x: any, index: number) => (
          <div className="pt_dashbox" key={index}>
            <div className="pt_dashleft">
              <b>{x?.account_name}</b>
              <span>{`last updated on ${x?.date} `} </span>
            </div>
            <div className="pt_dashright">
              <span>Bank balance</span>
              <b>{x?.pending_Amount}</b>
            </div>
          </div>
        ))}
      </div>
    </Fragment>
  );
}
