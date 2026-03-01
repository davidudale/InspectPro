import React, { useRef, useState } from "react";

const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  showCancel = true,
  tone = "danger",
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const toneClass =
    tone === "success"
      ? "bg-emerald-600 hover:bg-emerald-700"
      : tone === "warning"
        ? "bg-amber-600 hover:bg-amber-700"
        : tone === "info"
          ? "bg-blue-600 hover:bg-blue-700"
          : "bg-orange-600 hover:bg-orange-700";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <div className="space-y-3">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">
            {title}
          </h3>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            {message}
          </p>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          {showCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition-colors"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white transition-colors ${toneClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const useConfirmDialog = () => {
  const resolverRef = useRef(null);
  const [config, setConfig] = useState({
    open: false,
    title: "Confirm Action",
    message: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    showCancel: true,
    tone: "danger",
  });

  const openConfirm = (options = {}) =>
    new Promise((resolve) => {
      resolverRef.current = resolve;
      setConfig((prev) => ({
        ...prev,
        open: true,
        title: options.title ?? prev.title,
        message: options.message ?? "",
        confirmLabel: options.confirmLabel ?? "Confirm",
        cancelLabel: options.cancelLabel ?? "Cancel",
        showCancel: options.showCancel ?? true,
        tone: options.tone ?? "danger",
      }));
    });

  const handleClose = (result) => {
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
    setConfig((prev) => ({ ...prev, open: false }));
  };

  const dialog = (
    <ConfirmDialog
      {...config}
      onConfirm={() => handleClose(true)}
      onCancel={() => handleClose(false)}
    />
  );

  return { openConfirm, ConfirmDialog: dialog };
};

export default ConfirmDialog;
