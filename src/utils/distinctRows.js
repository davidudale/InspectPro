export const distinctRowsByLatest = (rows, getKey, getTimestamp) => {
  const output = new Map();
  (rows || []).forEach((row) => {
    const rawKey = getKey ? getKey(row) : row?.id;
    const normalizedKey = String(rawKey || "").trim().toLowerCase();
    if (!normalizedKey) return;

    const existing = output.get(normalizedKey);
    const nextTs = Number(getTimestamp ? getTimestamp(row) : 0) || 0;
    const existingTs = Number(existing ? getTimestamp(existing) : 0) || 0;

    if (!existing || nextTs >= existingTs) {
      output.set(normalizedKey, row);
    }
  });
  return Array.from(output.values());
};
