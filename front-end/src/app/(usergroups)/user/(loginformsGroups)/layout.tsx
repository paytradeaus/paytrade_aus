import "bootstrap/dist/css/bootstrap.css";
import Navbar from "@/components/header/navbar";
import styles from "./UserDashboarsLayout.module.scss";

export default function DashBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.containerWraper}>
      <Navbar navlinkClass={""} />
        <div className={styles.bodyContainer}>
          <div className={styles.mainConatianer}>
            <div className={styles.contentDataCon}>{children}</div>
          </div>
        </div>
    </div>
  );
}
