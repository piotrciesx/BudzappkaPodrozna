"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  downloadCsv,
  ensureMonthRecord,
  ensureUserRecord,
  fetchAllTransactions,
  fetchMonthTransactions,
  getMonthParts,
} from "../lib/dbHelpers";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import Dashboard from "../components/Dashboard";
import CategoryTree from "../components/CategoryTree";

export default function Page() {
  const [session, setSession] = useState<any>(null);
  const [month, setMonth] = useState(new Date());
  const [animDirection, setAnimDirection] = useState<"left" | "right" | null>(null);
  const touchStartX = useRef<number | null>(null);

function handleTouchStart(e: React.TouchEvent) {
  touchStartX.current = e.touches[0].clientX;
}

function handleTouchEnd(e: React.TouchEvent) {
  if (touchStartX.current === null) return;

  const deltaX = e.changedTouches[0].clientX - touchStartX.current;

  if (deltaX > 60) {
    setAnimDirection("right");

    setMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  }

  if (deltaX < -60) {
    setAnimDirection("left");

    setMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  }

  setTimeout(() => setAnimDirection(null), 250);
  touchStartX.current = null;
}
 const CACHE_KEY = "budzappka_data";
const [theme, setTheme] = useState("light");
  const [categories, setCategories] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("budget-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("budget-theme", theme);
  }, [theme]);

  useEffect(() => {
  const cached = localStorage.getItem(CACHE_KEY);

  if (cached) {
    try {
      const data = JSON.parse(cached);
      if (data.categories) setCategories(data.categories);
      if (data.transactions) setTransactions(data.transactions);
    } catch (e) {
      console.error("Cache parse error", e);
    }
  }

  loadCategories();
}, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    loadMonthTransactions();
  }, [session, month]);

  async function loadCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("level", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      console.error("loadCategories error:", error);
      return;
    }

    setCategories(data || []);
  }

  async function loadMonthTransactions() {
  if (!session?.user?.id) {
    setTransactions([]);
    setLoading(false);
    return;
  }

  setLoading(true);

  const list = await fetchMonthTransactions({
    userId: session.user.id,
    month,
  });

  setTransactions(list);

  // zapis do cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const parsed = cached ? JSON.parse(cached) : {};

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        ...parsed,
        transactions: list,
      })
    );
  } catch (e) {
    console.error("Cache save error", e);
  }

  setLoading(false);
}

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  async function handleResetMonth() {
    if (!session?.user?.id) {
      alert("Najpierw zaloguj się.");
      return;
    }

    const yes = window.confirm(
      "Czy na pewno usunąć wszystkie wpisy z bieżącego miesiąca?"
    );
    if (!yes) return;

    const monthRow = await ensureMonthRecord({
      userId: session.user.id,
      month,
    });

    if (!monthRow?.id) {
      alert("Nie udało się przygotować rekordu miesiąca.");
      return;
    }

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("user_id", session.user.id)
      .eq("month_id", monthRow.id);

    if (error) {
      console.error("handleResetMonth error:", error);
      alert("Nie udało się usunąć wpisów miesiąca.");
      return;
    }

    await loadMonthTransactions();
  }

  async function handleResetAll() {
    if (!session?.user?.id) {
      alert("Najpierw zaloguj się.");
      return;
    }

    const yes = window.confirm(
      "Czy na pewno usunąć wszystkie wpisy we wszystkich miesiącach?"
    );
    if (!yes) return;

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("user_id", session.user.id);

    if (error) {
      console.error("handleResetAll error:", error);
      alert("Nie udało się usunąć wszystkich wpisów.");
      return;
    }

    await loadMonthTransactions();
  }

  async function handleExportMonth() {
    if (!session?.user?.id) {
      alert("Najpierw zaloguj się.");
      return;
    }

    const { year, month: monthNumber } = getMonthParts(month);
    const list = await fetchMonthTransactions({
      userId: session.user.id,
      month,
    });

    const rows = [
      ["rok", "miesiąc", "dzień", "opis", "kwota", "category_id"],
      ...list.map((t) => [
        year,
        monthNumber,
        t.day ?? "",
        t.description ?? "",
        t.amount,
        t.category_id,
      ]),
    ];

    downloadCsv(`budzet_${year}_${monthNumber}.csv`, rows);
  }

  async function handleExportAll() {
    if (!session?.user?.id) {
      alert("Najpierw zaloguj się.");
      return;
    }

    const list = await fetchAllTransactions(session.user.id);

    const rows = [
      ["month_id", "dzień", "opis", "kwota", "category_id", "created_at"],
      ...list.map((t) => [
        t.month_id,
        t.day ?? "",
        t.description ?? "",
        t.amount,
        t.category_id,
        t.created_at,
      ]),
    ];

    downloadCsv("budzet_calosc.csv", rows);
  }

  async function ensureBaseDataForUser() {
    if (!session?.user?.id) return;

    await ensureUserRecord(session.user.id);
    await ensureMonthRecord({
      userId: session.user.id,
      month,
    });
  }

  useEffect(() => {
    ensureBaseDataForUser();
  }, [session, month]);

  const avatarUrl =
    session?.user?.user_metadata?.avatar_url ||
    session?.user?.user_metadata?.picture ||
    null;

  const userName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email ||
    "Użytkownik";

  const isLoggedIn = !!session?.user;

  return (
    <div
  className={`app-shell ${animDirection ? `slide-${animDirection}` : ""}`}
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
>
      <TopBar
        month={month}
        setMonth={setMonth}
        theme={theme}
        onToggleTheme={() =>
          setTheme((prev) => (prev === "light" ? "dark" : "light"))
        }
        isLoggedIn={isLoggedIn}
        avatarUrl={avatarUrl}
        userName={userName}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onResetMonth={handleResetMonth}
        onResetAll={handleResetAll}
      />

      <Dashboard
        month={month}
        categories={categories}
        transactions={transactions}
        loading={loading}
      />

      <div className="quick-note">
        {!isLoggedIn && (
          <div className="soft-warning">
            Zaloguj się, aby dodawać i edytować wpisy.
          </div>
        )}
      </div>

      <CategoryTree
        month={month}
        categories={categories}
        transactions={transactions}
        session={session}
        onDataChanged={loadMonthTransactions}
        onCategoriesChanged={loadCategories}
      />

      <BottomBar
        month={month}
        setMonth={setMonth}
        onResetMonth={handleResetMonth}
        onResetAll={handleResetAll}
        onExportMonth={handleExportMonth}
        onExportAll={handleExportAll}
      />
    </div>
  );
}