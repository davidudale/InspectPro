export const TABLE_GROUP_NONE = "none";

const normalizeGroupLabel = (value, fallbackLabel) => {
  const normalized = String(value ?? "").trim();
  return normalized || fallbackLabel || "Unassigned";
};

export const groupRowsByOption = (rows, groupBy, groupOptions = []) => {
  if (!groupBy || groupBy === TABLE_GROUP_NONE) {
    return [
      {
        key: TABLE_GROUP_NONE,
        label: "",
        items: rows,
      },
    ];
  }

  const selectedOption = groupOptions.find((option) => option.value === groupBy);
  if (!selectedOption) {
    return [
      {
        key: TABLE_GROUP_NONE,
        label: "",
        items: rows,
      },
    ];
  }

  const groups = new Map();

  rows.forEach((row) => {
    const rawValue = selectedOption.getValue ? selectedOption.getValue(row) : row?.[groupBy];
    const label = normalizeGroupLabel(rawValue, selectedOption.emptyLabel);
    const key = label.toLowerCase();

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label,
        items: [],
      });
    }

    groups.get(key).items.push(row);
  });

  return Array.from(groups.values()).sort((left, right) =>
    left.label.localeCompare(right.label),
  );
};
