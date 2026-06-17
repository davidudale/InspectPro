import React from "react";
import { ClipboardCheck } from "lucide-react";
import InternalReviewerShell from "./InternalReviewerShell";

const InternalReviewForm = () => (
  <InternalReviewerShell>
    <div className="mx-auto max-w-5xl">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300">
        <ClipboardCheck size={22} />
      </div>
      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.26em] text-orange-400">
        Internal Review Desk
      </p>
      <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-white">
        Reviews
      </h1>
      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <p className="text-sm leading-6 text-slate-300">
          Internal review forms and decision records will live here. This protected page is
          ready for the review workflow fields and Firestore writes.
        </p>
      </div>
    </div>
  </InternalReviewerShell>
);

export default InternalReviewForm;
