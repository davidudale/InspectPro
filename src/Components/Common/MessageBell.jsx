import React, { useEffect, useMemo, useState } from "react";
import { Bell, MessageSquare } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../Auth/firebase";

const SEEN_KEY_PREFIX = "inspectpro-chat-seen";

const getSeenStorageKey = (uid) => `${SEEN_KEY_PREFIX}:${uid}`;

const getMillis = (value) => {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value === "number") return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatTimeAgo = (value) => {
  const millis = getMillis(value);
  if (!millis) return "just now";
  const diffMinutes = Math.floor((Date.now() - millis) / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const MessageBell = ({ user }) => {
  const [threads, setThreads] = useState([]);
  const [open, setOpen] = useState(false);
  const [seenMap, setSeenMap] = useState({});

  useEffect(() => {
    if (!user?.uid) {
      setThreads([]);
      setSeenMap({});
      return undefined;
    }

    try {
      const stored = window.localStorage.getItem(getSeenStorageKey(user.uid));
      setSeenMap(stored ? JSON.parse(stored) : {});
    } catch {
      setSeenMap({});
    }

    const threadsRef =
      user?.role === "Admin"
        ? collection(db, "project_chats")
        : query(
            collection(db, "project_chats"),
            where("participantIds", "array-contains", user.uid),
          );

    const unsubscribe = onSnapshot(threadsRef, (snapshot) => {
      const nextThreads = snapshot.docs
        .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
        .sort((left, right) => getMillis(right.lastMessageAt) - getMillis(left.lastMessageAt));
      setThreads(nextThreads);
    });

    return () => unsubscribe();
  }, [user?.role, user?.uid]);

  useEffect(() => {
    if (!open || !user?.uid || threads.length === 0) return;

    const nextSeenMap = threads.reduce((accumulator, thread) => {
      const currentMillis = getMillis(thread.lastMessageAt);
      if (currentMillis) {
        accumulator[thread.id] = currentMillis;
      }
      return accumulator;
    }, { ...seenMap });

    setSeenMap(nextSeenMap);
    try {
      window.localStorage.setItem(getSeenStorageKey(user.uid), JSON.stringify(nextSeenMap));
    } catch {
      // Ignore storage write failures.
    }
  }, [open, threads, user?.uid]);

  const unreadThreads = useMemo(
    () =>
      threads.filter((thread) => {
        const lastMessageMillis = getMillis(thread.lastMessageAt);
        const seenMillis = Number(seenMap[thread.id] || 0);
        return (
          thread.lastMessageSenderId &&
          thread.lastMessageSenderId !== user?.uid &&
          lastMessageMillis > seenMillis
        );
      }),
    [seenMap, threads, user?.uid],
  );

  const recentThreads = useMemo(() => threads.slice(0, 5), [threads]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-xl border border-slate-800 bg-slate-950/80 p-2 text-slate-300 transition hover:border-orange-500/40 hover:text-white"
        aria-label="Open chat notifications"
        title="Chat notifications"
      >
        <Bell size={18} />
        {unreadThreads.length > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white">
            {unreadThreads.length > 9 ? "9+" : unreadThreads.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-80 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
                Messages
              </p>
              <h3 className="mt-1 text-sm font-bold text-white">
                {unreadThreads.length > 0
                  ? `${unreadThreads.length} unread conversation${unreadThreads.length > 1 ? "s" : ""}`
                  : "No unread chat messages"}
              </h3>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {recentThreads.length > 0 ? (
              recentThreads.map((thread) => {
                const isUnread = unreadThreads.some((item) => item.id === thread.id);
                return (
                  <div
                    key={thread.id}
                    className={`rounded-2xl border px-4 py-3 ${
                      isUnread
                        ? "border-orange-500/30 bg-orange-500/5"
                        : "border-slate-800 bg-slate-950/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-slate-900 p-2 text-orange-400">
                          <MessageSquare size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {thread.projectName || thread.projectId || thread.id}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {thread.lastMessageSenderName || "Team"}:{" "}
                            {thread.lastMessageText || "New message"}
                          </p>
                        </div>
                      </div>
                      <span className="whitespace-nowrap text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        {formatTimeAgo(thread.lastMessageAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-6 text-center text-sm text-slate-500">
                No chat activity yet.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MessageBell;
