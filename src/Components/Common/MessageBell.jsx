import React, { useEffect, useMemo, useState } from "react";
import { Bell, LifeBuoy, MessageSquare } from "lucide-react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../Auth/firebase";

const SEEN_KEY_PREFIX = "inspectpro-chat-seen";
const CLEARED_KEY_PREFIX = "inspectpro-chat-cleared";

const getSeenStorageKey = (uid) => `${SEEN_KEY_PREFIX}:${uid}`;
const getClearedStorageKey = (uid) => `${CLEARED_KEY_PREFIX}:${uid}`;

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
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [issueNotifications, setIssueNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [seenMap, setSeenMap] = useState({});
  const [clearedMap, setClearedMap] = useState({});

  useEffect(() => {
    if (!user?.uid) {
      setThreads([]);
      setIssueNotifications([]);
      setSeenMap({});
      setClearedMap({});
      return undefined;
    }

    try {
      const stored = window.localStorage.getItem(getSeenStorageKey(user.uid));
      setSeenMap(stored ? JSON.parse(stored) : {});
    } catch {
      setSeenMap({});
    }

    try {
      const storedCleared = window.localStorage.getItem(
        getClearedStorageKey(user.uid),
      );
      setClearedMap(storedCleared ? JSON.parse(storedCleared) : {});
    } catch {
      setClearedMap({});
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

    const issueNotificationsRef = query(
      collection(db, "notification_logs"),
      where("recipientId", "==", user.uid),
      where("channel", "==", "issue_support"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribeIssueNotifications = onSnapshot(issueNotificationsRef, (snapshot) => {
      const nextNotifications = snapshot.docs
        .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
        .sort((left, right) => getMillis(right.createdAt) - getMillis(left.createdAt));
      setIssueNotifications(nextNotifications);
    });

    return () => {
      unsubscribe();
      unsubscribeIssueNotifications();
    };
  }, [user?.role, user?.uid]);

  useEffect(() => {
    if (!open || !user?.uid) return;

    const nextSeenMap = threads.reduce((accumulator, thread) => {
      const currentMillis = getMillis(thread.lastMessageAt);
      if (currentMillis) {
        accumulator[`chat:${thread.id}`] = currentMillis;
      }
      return accumulator;
    }, { ...seenMap });

    issueNotifications.forEach((notification) => {
      const currentMillis = getMillis(notification.createdAt);
      if (currentMillis) {
        nextSeenMap[`issue:${notification.id}`] = currentMillis;
      }
    });

    setSeenMap(nextSeenMap);
    try {
      window.localStorage.setItem(getSeenStorageKey(user.uid), JSON.stringify(nextSeenMap));
    } catch {
      // Ignore storage write failures.
    }
  }, [issueNotifications, open, threads, user?.uid]);

  const visibleThreads = useMemo(
    () =>
      threads.filter((thread) => {
        const lastMessageMillis = getMillis(thread.lastMessageAt);
        const clearedMillis = Number(clearedMap[`chat:${thread.id}`] || 0);
        return lastMessageMillis > clearedMillis;
      }),
    [clearedMap, threads],
  );

  const visibleIssueNotifications = useMemo(
    () =>
      issueNotifications.filter((notification) => {
        const createdMillis = getMillis(notification.createdAt);
        const clearedMillis = Number(clearedMap[`issue:${notification.id}`] || 0);
        return createdMillis > clearedMillis;
      }),
    [clearedMap, issueNotifications],
  );

  const unreadThreads = useMemo(
    () =>
      visibleThreads.filter((thread) => {
        const lastMessageMillis = getMillis(thread.lastMessageAt);
        const seenMillis = Number(seenMap[`chat:${thread.id}`] || 0);
        return (
          thread.lastMessageSenderId &&
          thread.lastMessageSenderId !== user?.uid &&
          lastMessageMillis > seenMillis
        );
      }),
    [seenMap, user?.uid, visibleThreads],
  );

  const unreadIssueNotifications = useMemo(
    () =>
      visibleIssueNotifications.filter((notification) => {
        const createdMillis = getMillis(notification.createdAt);
        const seenMillis = Number(seenMap[`issue:${notification.id}`] || 0);
        return createdMillis > seenMillis;
      }),
    [seenMap, visibleIssueNotifications],
  );

  const recentNotifications = useMemo(() => {
    const chatItems = visibleThreads.map((thread) => ({
      key: `chat:${thread.id}`,
      kind: "chat",
      createdAt: thread.lastMessageAt,
      thread,
    }));
    const issueItems = visibleIssueNotifications.map((notification) => ({
      key: `issue:${notification.id}`,
      kind: "issue",
      createdAt: notification.createdAt,
      notification,
    }));

    return [...chatItems, ...issueItems]
      .sort((left, right) => getMillis(right.createdAt) - getMillis(left.createdAt))
      .slice(0, 5);
  }, [visibleIssueNotifications, visibleThreads]);

  const persistSeenMap = (nextSeenMap) => {
    setSeenMap(nextSeenMap);
    try {
      window.localStorage.setItem(
        getSeenStorageKey(user.uid),
        JSON.stringify(nextSeenMap),
      );
    } catch {
      // Ignore storage write failures.
    }
  };

  const persistClearedMap = (nextClearedMap) => {
    setClearedMap(nextClearedMap);
    try {
      window.localStorage.setItem(
        getClearedStorageKey(user.uid),
        JSON.stringify(nextClearedMap),
      );
    } catch {
      // Ignore storage write failures.
    }
  };

  const resolveNotificationRoute = (thread) => {
    const projectRef = thread.projectDocId || thread.projectId || thread.id;
    const role = String(user?.role || "");

    if (!projectRef) return "";
    if (role === "Admin" || role === "Manager" || role === "External_Reviewer") {
      return `/admin/project/${projectRef}`;
    }
    if (role === "Lead Inspector") {
      return `/review/${projectRef}`;
    }
    return `/review/${projectRef}`;
  };

  const handleNotificationClick = (thread) => {
    if (!user?.uid) return;

    const lastMessageMillis = getMillis(thread.lastMessageAt);
    const nextSeenMap = {
      ...seenMap,
      [`chat:${thread.id}`]: lastMessageMillis,
    };
    persistSeenMap(nextSeenMap);

    const route = resolveNotificationRoute(thread);
    setOpen(false);
    if (route) navigate(route);
  };

  const handleIssueNotificationClick = (notification) => {
    if (!user?.uid) return;

    const createdMillis = getMillis(notification.createdAt);
    const nextSeenMap = {
      ...seenMap,
      [`issue:${notification.id}`]: createdMillis,
    };
    persistSeenMap(nextSeenMap);
    setOpen(false);
    navigate("/support/issues");
  };

  const handleClearNotifications = () => {
    if (!user?.uid || recentNotifications.length === 0) return;

    const nextClearedMap = visibleThreads.reduce(
      (accumulator, thread) => {
        accumulator[`chat:${thread.id}`] = getMillis(thread.lastMessageAt);
        return accumulator;
      },
      { ...clearedMap },
    );

    visibleIssueNotifications.forEach((notification) => {
      nextClearedMap[`issue:${notification.id}`] = getMillis(notification.createdAt);
    });

    const nextSeenMap = visibleThreads.reduce(
      (accumulator, thread) => {
        accumulator[`chat:${thread.id}`] = getMillis(thread.lastMessageAt);
        return accumulator;
      },
      { ...seenMap },
    );

    visibleIssueNotifications.forEach((notification) => {
      nextSeenMap[`issue:${notification.id}`] = getMillis(notification.createdAt);
    });

    persistClearedMap(nextClearedMap);
    persistSeenMap(nextSeenMap);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-xl border border-slate-800 bg-slate-950/80 p-2 text-slate-300 transition hover:border-orange-500/40 hover:text-white"
        aria-label="Open notifications"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadThreads.length + unreadIssueNotifications.length > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white">
            {unreadThreads.length + unreadIssueNotifications.length > 9
              ? "9+"
              : unreadThreads.length + unreadIssueNotifications.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-80 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
                Notifications
              </p>
              <h3 className="mt-1 text-sm font-bold text-white">
                {unreadThreads.length + unreadIssueNotifications.length > 0
                  ? `${unreadThreads.length + unreadIssueNotifications.length} unread notification${
                      unreadThreads.length + unreadIssueNotifications.length > 1 ? "s" : ""
                    }`
                  : "No unread notifications"}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClearNotifications}
                disabled={recentNotifications.length === 0}
                className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300 transition hover:border-orange-500/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear
              </button>
          </div>

          <div className="mt-4 space-y-3">
            {recentNotifications.length > 0 ? (
              recentNotifications.map((entry) => {
                if (entry.kind === "issue") {
                  const { notification } = entry;
                  const isUnread = unreadIssueNotifications.some(
                    (item) => item.id === notification.id,
                  );
                  return (
                    <button
                      type="button"
                      key={entry.key}
                      onClick={() => handleIssueNotificationClick(notification)}
                      className={`rounded-2xl border px-4 py-3 ${
                        isUnread
                          ? "border-sky-500/30 bg-sky-500/5"
                          : "border-slate-800 bg-slate-950/70"
                      } w-full text-left transition hover:border-sky-500/40 hover:bg-slate-950`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-slate-900 p-2 text-sky-400">
                            <LifeBuoy size={14} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {notification.subject || "Issue update"}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {notification.message || "A support update is available."}
                            </p>
                          </div>
                        </div>
                        <span className="whitespace-nowrap text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </button>
                  );
                }

                const { thread } = entry;
                const isUnread = unreadThreads.some((item) => item.id === thread.id);
                return (
                  <button
                    type="button"
                    key={entry.key}
                    onClick={() => handleNotificationClick(thread)}
                    className={`rounded-2xl border px-4 py-3 ${
                      isUnread
                        ? "border-orange-500/30 bg-orange-500/5"
                        : "border-slate-800 bg-slate-950/70"
                    } w-full text-left transition hover:border-orange-500/40 hover:bg-slate-950`}
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
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-6 text-center text-sm text-slate-500">
                No notifications yet.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MessageBell;
