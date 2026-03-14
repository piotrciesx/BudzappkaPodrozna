"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { daysInMonth, ensureMonthRecord, ensureUserRecord } from "../lib/dbHelpers";

type Props = {
  categoryId: any;
  month: Date;
  session: any;
  onDataChanged: () => void;
};

export default function TransactionInput({
  categoryId,
  month,
  session,
  onDataChanged,
}: Props) {
  const [day, setDay] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);

  const dayRef = useRef<HTMLInputElement | null>(null);
  const descriptionRef = useRef<HTMLInputElement | null>(null);
  const amountRef = useRef<HTMLInputElement | null>(null);

  const maxDay = useMemo(() => daysInMonth(month), [month]);

  useEffect(() => {
    if (!session?.user?.id || description.trim().length < 2) {
      setSuggestions([]);
      setSelectedSuggestion(0);
      return;
    }

    loadSuggestions();
  }, [description, categoryId, session]);

  useEffect(() => {
    descriptionRef.current?.focus();
  }, [categoryId]);

  async function loadSuggestions() {
    const { data, error } = await supabase
      .from("transactions")
      .select("description, created_at")
      .eq("user_id", session.user.id)
      .eq("category_id", categoryId)
      .not("description", "is", null)
      .ilike("description", `${description.trim()}%`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadSuggestions error:", error);
      return;
    }

    const unique = Array.from(
      new Set(
        (data || [])
          .map((row) => row.description?.trim())
          .filter(Boolean)
      )
    ).slice(0, 6);

    setSuggestions(unique);
    setSelectedSuggestion(0);
  }

  function validate() {
    const parsedAmount = Number(amount);

    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Kwota musi być większa od 0.");
      return false;
    }

    if (day === "") return true;

    const parsedDay = Number(day);
    if (Number.isNaN(parsedDay)) {
      alert("Dzień musi być liczbą.");
      return false;
    }

    if (parsedDay === 0) return true;

    if (parsedDay < 1 || parsedDay > maxDay) {
      alert(`Dzień musi być z zakresu 1-${maxDay}.`);
      return false;
    }

    return true;
  }

  async function handleAdd() {
    if (!session?.user?.id) {
      alert("Najpierw zaloguj się.");
      return;
    }

    if (!validate()) return;

    await ensureUserRecord(session.user.id);

    const monthRow = await ensureMonthRecord({
      userId: session.user.id,
      month,
    });

    if (!monthRow?.id) {
      alert("Nie udało się przygotować rekordu miesiąca.");
      return;
    }

    const parsedDay = day === "" || Number(day) === 0 ? null : Number(day);
    const parsedAmount = Number(amount);

    const { error } = await supabase.from("transactions").insert({
      user_id: session.user.id,
      month_id: monthRow.id,
      category_id: categoryId,
      day: parsedDay,
      description: description.trim() || null,
      amount: parsedAmount,
    });

    if (error) {
      console.error("handleAdd error:", error);
      alert("Nie udało się dodać wpisu.");
      return;
    }

    setDay("");
    setDescription("");
    setAmount("");
    setSuggestions([]);
    setSelectedSuggestion(0);

   onDataChanged();

    setTimeout(() => {
      descriptionRef.current?.focus();
    }, 0);
  }

  function acceptSuggestion(value: string) {
    setDescription(value);
    setSuggestions([]);
    setTimeout(() => amountRef.current?.focus(), 0);
  }

  return (
    <div className="tx-input-wrap">
      <div className="tx-input-row">
        <input
          ref={dayRef}
          className="tx-day-input"
          placeholder="dzień"
          inputMode="numeric"
          value={day}
          autoFocus
          onChange={(e) => setDay(e.target.value.replace(/[^\d]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              descriptionRef.current?.focus();
            }
          }}
        />

        <div className="tx-description-box">
          <input
            ref={descriptionRef}
            className="tx-description-input"
            placeholder="opis"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && suggestions.length) {
                e.preventDefault();
                setSelectedSuggestion((prev) =>
                  Math.min(prev + 1, suggestions.length - 1)
                );
              }

              if (e.key === "ArrowUp" && suggestions.length) {
                e.preventDefault();
                setSelectedSuggestion((prev) => Math.max(prev - 1, 0));
              }

              if (e.key === "Enter") {
                if (suggestions.length > 0) {
                  e.preventDefault();
                  acceptSuggestion(suggestions[selectedSuggestion]);
                  return;
                }

                amountRef.current?.focus();
              }
            }}
          />

          {suggestions.length > 0 && (
            <div className="suggestions-box">
              {suggestions.map((s, index) => (
                <button
                  key={s + index}
                  type="button"
                  className={`suggestion-item ${
                    selectedSuggestion === index ? "active" : ""
                  }`}
                  onClick={() => acceptSuggestion(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <input
          ref={amountRef}
          className="tx-amount-input"
          placeholder="kwota"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(",", "."))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleAdd();
            }
          }}
        />

        <button className="soft-btn add-btn" onClick={handleAdd}>
          Dodaj
        </button>
      </div>
    </div>
  );
}