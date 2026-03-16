import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { ChevronDown, MessageSquare, Send, Users } from "lucide-react";
import { toast } from "react-toastify";
import { db } from "../Auth/firebase";

const getDisplayName = (user) =>
  user?.fullName || user?.name || user?.displayName || user?.email || "Unknown User";

const getThreadId = (project) => String(project?.projectId || project?.id || "").trim();

const buildParticipants = (project) => {
  if (!project) return [];

  return [
    {
      key: "inspector",
      label: "Inspector",
      id: project.inspectorId,
      name: project.inspectorName,
    },
    {
      key: "supervisor",
      label: "Lead Inspector",
      id: project.supervisorId,
      name: project.supervisorName,
    },
    
    {
      key: "manager",
      label: "Manager",
      id: project.managerId,
      name: project.managerName,
    },
  ].filter((participant) => participant.id || participant.name);
};

const buildParticipantIds = (project) =>
  [
    project?.inspectorId,
    project?.supervisorId,
    project?.externalReviewerId,
    project?.managerId,
  ].filter(Boolean);

const ProjectChatbox = ({
  user,
  assignmentField = "",
  title = "Project Chat",
  description = "Chat with users assigned to the selected project.",
  emptyStateLabel = "No projects available for chat yet.",
}) => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [messages, setMessages] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [messagesError, setMessagesError] = useState("");
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const listRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) {
      setProjects([]);
      setSelectedProjectId("");
      setProjectsLoading(false);
      setProjectsError("");
      return undefined;
    }

    setProjectsLoading(true);
    setProjectsError("");
    const projectsRef = assignmentField
      ? query(collection(db, "projects"), where(assignmentField, "==", user.uid))
      : collection(db, "projects");

    const unsubscribe = onSnapshot(
      projectsRef,
      (snapshot) => {
        const nextProjects = snapshot.docs
          .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
          .filter((project) => getThreadId(project))
          .sort((left, right) => {
            const leftTime =
              left.updatedAt?.toMillis?.() ||
              left.lastUpdated?.toMillis?.() ||
              left.createdAt?.toMillis?.() ||
              left.timestamp?.toMillis?.() ||
              0;
            const rightTime =
              right.updatedAt?.toMillis?.() ||
              right.lastUpdated?.toMillis?.() ||
              right.createdAt?.toMillis?.() ||
              right.timestamp?.toMillis?.() ||
              0;
            return rightTime - leftTime;
          });

        setProjects(nextProjects);
        setSelectedProjectId((current) => {
          if (nextProjects.some((project) => getThreadId(project) === current)) {
            return current;
          }
          return getThreadId(nextProjects[0]) || "";
        });
        setProjectsLoading(false);
      },
      (error) => {
        setProjects([]);
        setProjectsLoading(false);
        setProjectsError(error.message || "Unable to load project threads.");
        toast.error(`Project chat unavailable: ${error.message || "Unable to load project threads."}`);
      },
    );

    return () => unsubscribe();
  }, [assignmentField, user?.uid]);

  const selectedProject = useMemo(
    () => projects.find((project) => getThreadId(project) === selectedProjectId) || null,
    [projects, selectedProjectId],
  );

  const participants = useMemo(
    () => buildParticipants(selectedProject),
    [selectedProject],
  );

  const selectedProjectLabel =
    selectedProject?.projectName ||
    selectedProject?.projectId ||
    selectedProject?.id ||
    "Project Chat";

  useEffect(() => {
    if (!selectedProjectId) {
      setMessages([]);
      setMessagesLoading(false);
      setMessagesError("");
      return undefined;
    }

    setMessagesLoading(true);
    setMessagesError("");
    const messagesRef = query(
      collection(db, "project_chats", selectedProjectId, "messages"),
      orderBy("timestamp", "asc"),
      limit(50),
    );

    const unsubscribe = onSnapshot(
      messagesRef,
      (snapshot) => {
        setMessages(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
        setMessagesLoading(false);
      },
      (error) => {
        setMessages([]);
        setMessagesLoading(false);
        setMessagesError(error.message || "Unable to load messages.");
        toast.error(`Project messages unavailable: ${error.message || "Unable to load messages."}`);
      },
    );

    return () => unsubscribe();
  }, [selectedProjectId]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !selectedProjectId || !selectedProject || !user?.uid || isSending) {
      return;
    }

    setIsSending(true);
    try {
      const participantIds = buildParticipantIds(selectedProject);
      const threadRef = doc(db, "project_chats", selectedProjectId);
      const messageRef = doc(collection(db, "project_chats", selectedProjectId, "messages"));
      const senderName = getDisplayName(user);
      const batch = writeBatch(db);

      batch.set(
        threadRef,
        {
          projectId: selectedProject.projectId || selectedProjectId,
          projectDocId: selectedProject.id || "",
          projectName: selectedProject.projectName || "",
          clientName: selectedProject.clientName || selectedProject.client || "",
          participantIds,
          participants: buildParticipants(selectedProject),
          lastMessageText: text,
          lastMessageSenderId: user.uid,
          lastMessageSenderName: senderName,
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      batch.set(messageRef, {
        text,
        projectId: selectedProject.projectId || selectedProjectId,
        projectDocId: selectedProject.id || "",
        userId: user.uid,
        userEmail: user.email || "",
        userName: senderName,
        userRole: user.role || "",
        timestamp: serverTimestamp(),
      });
      await batch.commit();
      setDraft("");
      toast.success("Message sent");
    } catch (error) {
      toast.error(`Message failed: ${error.message || "Unable to send message."}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = async () => {
    if (!selectedProjectId || isClearing) {
      return;
    }

    setIsClearing(true);
    try {
      const threadRef = doc(db, "project_chats", selectedProjectId);
      const messagesCollectionRef = collection(db, "project_chats", selectedProjectId, "messages");
      const batchSize = 200;

      while (true) {
        const snapshot = await getDocs(query(messagesCollectionRef, limit(batchSize)));
        if (snapshot.empty) {
          break;
        }

        const batch = writeBatch(db);
        snapshot.docs.forEach((messageDoc) => {
          batch.delete(messageDoc.ref);
        });
        await batch.commit();

        if (snapshot.size < batchSize) {
          break;
        }
      }

      const threadBatch = writeBatch(db);
      threadBatch.delete(threadRef);
      await threadBatch.commit();

      setDraft("");
      toast.success("Project chat cleared");
    } catch (error) {
      toast.error(`Unable to clear chat: ${error.message || "Please try again."}`);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="fixed bottom-3 right-3 z-50  w-[min(22rem,calc(100vw-0.75rem))] sm:bottom-4 sm:right-4 sm:w-[23rem]">
      {isCollapsed ? (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="ml-auto flex w-full max-w-[17rem] items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/95 px-3 py-2.5 text-left shadow-2xl backdrop-blur-md transition hover:border-orange-500/40"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-orange-500">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{title}</p>
              <p className="truncate text-xs text-slate-400">
                {selectedProjectId ? selectedProjectLabel : "Open project chat"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 ? (
              <span className="rounded-full bg-orange-600 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                {messages.length}
              </span>
            ) : null}
            <ChevronDown size={16} className="text-slate-400" />
          </div>
        </button>
      ) : (
        <div className="max-h-[min(36rem,calc(100vh-1rem))] overflow-y-auto rounded-[1.5rem] border border-slate-800 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700 sm:max-h-[min(40rem,calc(100vh-2rem))] sm:p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-orange-500">
                  <MessageSquare size={18} />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-bold text-white">{title}</h2>
                  
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-400 transition hover:text-white"
              aria-label="Minimize chat widget"
            >
              <ChevronDown size={18} />
            </button>
          </div>

          <div className="mt-3 space-y-2.5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
                Project Thread
              </label>
              <select
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-orange-500"
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                disabled={projectsLoading || projects.length === 0}
              >
                {projects.length === 0 ? (
                  <option value="">No available projects</option>
                ) : (
                  projects.map((project) => (
                    <option key={getThreadId(project)} value={getThreadId(project)}>
                      {(project.projectName || project.projectId || project.id) +
                        " - " +
                        (project.clientName || project.client || "Client")}
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedProject && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <Users size={14} className="text-orange-400" />
                  <p className="text-xs font-bold uppercase tracking-[0.2em]">
                    Project Team
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {participants.length > 0 ? (
                    participants.map((participant) => (
                      <span
                        key={`${participant.key}-${participant.id || participant.name}`}
                        className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] text-slate-300"
                      >
                        {participant.label}: {participant.name || "Unassigned"}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">No assigned participants found.</span>
                  )}
                </div>
              </div>
            )}

            <div
              ref={listRef}
              className="h-[240px] space-y-2.5 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/70 p-3 scrollbar-thin scrollbar-track-slate-950 scrollbar-thumb-slate-700 sm:h-[200px] "
            >
              {projectsLoading ? (
                <p className="text-sm text-slate-500">Loading project threads...</p>
              ) : projectsError ? (
                <p className="text-sm text-rose-400">{projectsError}</p>
              ) : !selectedProjectId ? (
                <p className="text-sm text-slate-500">{emptyStateLabel}</p>
              ) : messagesLoading ? (
                <p className="text-sm text-slate-500">Loading messages...</p>
              ) : messagesError ? (
                <p className="text-sm text-rose-400">{messagesError}</p>
              ) : messages.length > 0 ? (
                messages.map((message) => {
                  const isCurrentUser = message.userId === user?.uid;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          isCurrentUser
                            ? "bg-orange-600 text-white text-sm"
                            : "border border-slate-800 bg-slate-900 text-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-[0.18em]">
                            {message.userName || "Unknown User"}
                          </span>
                          {message.userRole ? (
                            <span
                              className={`text-[10px] ${
                                isCurrentUser ? "text-orange-100/80" : "text-slate-500"
                              }`}
                            >
                              {message.userRole}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                          {message.text || ""}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">
                  No messages yet. Start the conversation for this project.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 sm:h-[100px]">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={
                  selectedProjectId
                    ? "Send a message to the assigned project team..."
                    : "Select a project to start chatting..."
                }
                disabled={!selectedProjectId || isSending}
                className="h-20 w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
              <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleClearChat}
                    disabled={!selectedProjectId || messages.length === 0 || isSending || isClearing}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                  >
                    {isClearing ? "Clearing" : "Clear Chat"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!draft.trim() || !selectedProjectId || isSending || isClearing}
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    <Send size={14} />
                    {isSending ? "Sending" : "Send"}
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectChatbox;
