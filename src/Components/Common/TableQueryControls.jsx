import React from "react";

const TableQueryControls = ({ filters = [], groupBy, onGroupByChange, groupOptions = [] }) => {
  const visibleFilters = filters.filter(
    (filter) => Array.isArray(filter.options) && filter.options.length > 1,
  );
  const hasGrouping = Array.isArray(groupOptions) && groupOptions.length > 1;

  if (visibleFilters.length === 0 && !hasGrouping) {
    return null;
  }

  const normalizeOption = (option) =>
    typeof option === "string" ? { value: option, label: option } : option;

  return (
    <div className="flex flex-col gap-3 border-b border-slate-800/80 bg-slate-950/20 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center">
      {visibleFilters.map((filter) => (
        <label key={filter.key} className="flex min-w-[180px] flex-1 flex-col gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          {filter.label}
          <select
            value={filter.value}
            onChange={(event) => filter.onChange?.(event.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200 outline-none transition-colors focus:border-orange-500"
          >
            {filter.options.map((option) => {
              const normalizedOption = normalizeOption(option);
              return (
                <option key={normalizedOption.value} value={normalizedOption.value}>
                  {normalizedOption.label}
                </option>
              );
            })}
          </select>
        </label>
      ))}

      {hasGrouping ? (
        <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Group By
          <select
            value={groupBy}
            onChange={(event) => onGroupByChange?.(event.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200 outline-none transition-colors focus:border-orange-500"
          >
            {groupOptions.map((option) => {
              const normalizedOption = normalizeOption(option);
              return (
                <option key={normalizedOption.value} value={normalizedOption.value}>
                  {normalizedOption.label}
                </option>
              );
            })}
          </select>
        </label>
      ) : null}
    </div>
  );
};

export default TableQueryControls;
