import React from "react";
import { useParams } from "react-router-dom";
import ReportDownloadView from "../../ManagerFile/ReportDownloadView";

const ProjectPreview = () => {
  const { id } = useParams();

  return (
    <ReportDownloadView
      projectId={id}
      hideControls={false}
      embedded={false}
      showCloseButton={false}
    />
  );
};

export default ProjectPreview;
