import fs from "node:fs";
import admin from "firebase-admin";

const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.FIREBASE_SERVICE_ACCOUNT ||
  "";

if (!serviceAccountPath) {
  console.error(
    "Missing service account. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT to the JSON file path.",
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

const getReportTimestamp = (report) => {
  if (!report) return 0;
  const updatedAt = report.updatedAt;
  const createdAt = report.timestamp || report.createdAt;
  if (updatedAt?.toMillis) return updatedAt.toMillis();
  if (createdAt?.toMillis) return createdAt.toMillis();
  return 0;
};

const migrate = async () => {
  const reportsSnap = await db.collection("inspection_reports").get();
  let migrated = 0;
  let skipped = 0;

  for (const reportDoc of reportsSnap.docs) {
    const reportData = reportDoc.data() || {};
    const general = reportData.general || {};
    const projectDocId = general.projectDocId || "";
    const projectBusinessId = general.projectId || "";

    let projectRef = null;

    if (projectDocId) {
      projectRef = db.collection("projects").doc(projectDocId);
    } else if (projectBusinessId) {
      const projectQuery = await db
        .collection("projects")
        .where("projectId", "==", projectBusinessId)
        .limit(1)
        .get();
      if (!projectQuery.empty) {
        projectRef = projectQuery.docs[0].ref;
      }
    }

    if (!projectRef) {
      skipped += 1;
      console.warn(
        `Skipping report ${reportDoc.id} (no matching project for ${projectBusinessId || projectDocId}).`,
      );
      continue;
    }

    const projectSnap = await projectRef.get();
    const projectData = projectSnap.exists ? projectSnap.data() : {};

    const existingReport = projectData?.report || null;
    const existingTimestamp = getReportTimestamp(existingReport);
    const incomingTimestamp = getReportTimestamp(reportData);

    if (existingReport && existingTimestamp > incomingTimestamp) {
      skipped += 1;
      continue;
    }

    const nextStatus = projectData?.status || reportData?.status || "Draft";

    await projectRef.set(
      {
        report: {
          ...reportData,
          migratedFrom: reportDoc.id,
          migratedAt: serverTimestamp(),
        },
        status: nextStatus,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    migrated += 1;
  }

  console.log(
    `Migration complete. Migrated: ${migrated}. Skipped: ${skipped}.`,
  );
};

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
