import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

export const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (value?.seconds) return value.seconds * 1000;
  return 0;
};

export const getExternalReviewCycleStart = (project) =>
  project?.approvedAt || project?.confirmedAt || project?.updatedAt || null;

export const isFeedbackEntryInCurrentCycle = (project, entry) =>
  toMillis(entry?.createdAt) >= toMillis(getExternalReviewCycleStart(project));

export const resetVerificationReviewState = async ({
  db,
  projectDocId,
  projectId,
}) => {
  if (!projectDocId) {
    return;
  }

  const reviewerCollectionRef = collection(db, "project_verification_reviews", projectDocId, "reviewers");
  const reviewerSnapshot = await getDocs(reviewerCollectionRef);

  await Promise.all(
    reviewerSnapshot.docs.map((reviewerDoc) =>
      setDoc(
        doc(db, "project_verification_reviews", projectDocId, "reviewers", reviewerDoc.id),
        {
          summary: {
            status: "Yet to start",
            observation: "",
          },
          sections: {},
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    ),
  );

  const legacyQueries = [
    query(collection(db, "report_review_checklists"), where("projectDocId", "==", projectDocId)),
  ];

  if (projectId) {
    legacyQueries.push(
      query(collection(db, "report_review_checklists"), where("projectId", "==", projectId)),
    );
  }

  const legacySnapshots = await Promise.all(legacyQueries.map((entryQuery) => getDocs(entryQuery)));
  const seenLegacyIds = new Set();

  await Promise.all(
    legacySnapshots.flatMap((snapshot) =>
      snapshot.docs
        .filter((legacyDoc) => {
          if (seenLegacyIds.has(legacyDoc.id)) return false;
          seenLegacyIds.add(legacyDoc.id);
          return true;
        })
        .map((legacyDoc) =>
          updateDoc(doc(db, "report_review_checklists", legacyDoc.id), {
            summary: {
              status: "Yet to start",
              observation: "",
            },
            sections: {},
            updatedAt: serverTimestamp(),
          }),
        ),
    ),
  );
};
