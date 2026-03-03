import IntegrityCheck, { IntegrityWebView } from "./IntegrityCheck.jsx";

const MutReport = ({
  previewData,
  onBack,
  hideControls = false,
  companyLogo = "",
}) => {
  if (previewData) {
    return (
      <IntegrityWebView
        reportData={previewData}
        companyLogo={companyLogo}
        onBack={onBack}
        hideControls={hideControls}
      />
    );
  }

  return <IntegrityCheck />;
};

export default MutReport;
