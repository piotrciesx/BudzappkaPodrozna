"use client";

import { useMemo, useState } from "react";

type Props = {
  month: Date;
  setMonth: (date: Date) => void;
  theme: string;
  onToggleTheme: () => void;
  isLoggedIn: boolean;
  avatarUrl: string | null;
  userName: string;
  onLogin: () => void;
  onLogout: () => void;
  onResetMonth: () => void;
  onResetAll: () => void;
};

export default function TopBar({
  month,
  setMonth,
  theme,
  onToggleTheme,
  isLoggedIn,
  avatarUrl,
  userName,
  onLogin,
  onLogout,
  onResetMonth,
  onResetAll,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

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

  const monthLabel = useMemo(() => {
    return month.toLocaleDateString("pl-PL", {
      month: "long",
      year: "numeric",
    });
  }, [month]);

  return (
    <div className="bar top-bar">
      <div className="bar-left">
        {!isLoggedIn ? (
          <button className="google-btn" onClick={onLogin}>
            Zaloguj Google
          </button>
        ) : (
          <div className="avatar-wrap">
            <button className="avatar-btn" onClick={() => setMenuOpen((p) => !p)}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName} className="avatar-img" />
              ) : (
                <span className="avatar-fallback">
                  {userName?.slice(0, 1).toUpperCase()}
                </span>
              )}
            </button>

            {menuOpen && (
              <div className="avatar-menu">
                <div className="avatar-menu-name">{userName}</div>
                <button
                  className="danger-lite-btn"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                >
                  Wyloguj
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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
        <button className="soft-btn" onClick={onToggleTheme}>
          {theme === "light" ? "🌙 noc" : "☀️ dzień"}
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