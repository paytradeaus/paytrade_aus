export default function AdminLoading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 160px)" }}>
      <div className="loaderwrap">
        <div className="loader"></div>
        <div className="loaderlogo"></div>
      </div>
    </div>
  );
}
