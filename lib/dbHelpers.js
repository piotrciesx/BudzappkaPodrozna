import { supabase } from "./supabaseClient";

export function getMonthParts(date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

export function getMonthIndex(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export async function ensureUserRecord(userId) {
  if (!userId) return null;

  const { data: existing, error: fetchError } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError) {
    console.error("ensureUserRecord fetch error:", fetchError);
    return null;
  }

  if (existing) return existing;

  const { data, error } = await supabase
    .from("users")
    .insert({ id: userId })
    .select()
    .single();

  if (error) {
    console.error("ensureUserRecord insert error:", error);
    return null;
  }

  return data;
}

export async function ensureMonthRecord({ userId, month }) {
  if (!userId || !month) return null;

  const { year, month: monthNumber } = getMonthParts(month);

  const { data, error } = await supabase
    .from("months")
    .select("*")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", monthNumber)
    .maybeSingle();

  if (error) {
    console.error("ensureMonthRecord fetch error:", error);
    return null;
  }

  if (data) return data;

  const { data: inserted, error: insertError } = await supabase
    .from("months")
    .insert({
      user_id: userId,
      year: year,
      month: monthNumber,
    })
    .select()
    .single();

  if (insertError) {
    console.error("ensureMonthRecord insert error:", insertError);
    return null;
  }

  return inserted;
}

export async function fetchMonthTransactions({ userId, month }) {
  if (!userId || !month) return [];

  const monthRow = await ensureMonthRecord({ userId, month });
  if (!monthRow?.id) return [];

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("month_id", monthRow.id)
    .order("day", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchMonthTransactions error:", error);
    return [];
  }

  return data || [];
}

export async function fetchAllTransactions(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchAllTransactions error:", error);
    return [];
  }

  return data || [];
}

export function sortTransactions(list) {
  return [...list].sort((a, b) => {
    const dayA = a.day ?? 999;
    const dayB = b.day ?? 999;

    if (dayA !== dayB) return dayA - dayB;

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) =>
          `"${String(cell ?? "")
            .replace(/"/g, '""')
            .replace(/\n/g, " ")}"`
        )
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  window.URL.revokeObjectURL(url);
}