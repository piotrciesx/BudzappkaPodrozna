type Props = {
  month: Date;
  setMonth: (date: Date) => void;
  onResetMonth: () => void;
  onResetAll: () => void;
  onExportMonth: () => void;
  onExportAll: () => void;
};

export default function BottomBar({
  month,
  setMonth,
  onResetMonth,
  onResetAll,
  onExportMonth,
  onExportAll,
}: Props) {
  function prevMonth() {
    const next = new Date(month);
    next.setMonth(next.getMonth() - 1);
    setMonth(next);
  }

  function nextMonth() {
    const next = new Date(month);
    next.setMonth(next.getMonth() + 1);
    setMonth(next);
  }

  const monthLabel = month.toLocaleDateString("pl-PL", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bar bottom-bar">
      <div className="bar-left" />

      <div className="bar-center month-nav">
        <button className="icon-btn" onClick={prevMonth}>
          ←
        </button>
        <div className="month-label">{monthLabel}</div>
        <button className="icon-btn" onClick={nextMonth}>
          →
        </button>
      </div>

      <div className="bar-right">
        <button className="soft-btn" onClick={onExportMonth}>
          CSV miesiąc
        </button>
        <button className="soft-btn" onClick={onExportAll}>
          CSV całość
        </button>
        <button className="danger-lite-btn" onClick={onResetMonth}>
          Reset miesiąc
        </button>
        <button className="danger-btn" onClick={onResetAll}>
          Reset wszystko
        </button>
      </div>
    </div>
  );
}