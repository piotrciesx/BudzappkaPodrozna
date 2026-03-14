"use client";

import { useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { sortTransactions } from "../lib/dbHelpers";

type Props = {
  categoryId: any;
  transactions: any[];
  session: any;
  month: Date;
  onDataChanged: () => void;
};

export default function TransactionList({
  categoryId,
  transactions,
  session,
  month,
  onDataChanged,
}: Props) {
  const [editingId, setEditingId] = useState<any>(null);
  const [editDay, setEditDay] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const list = useMemo(() => {
    return sortTransactions(
      transactions.filter((t) => t.category_id === categoryId)
    );
  }, [transactions, categoryId]);

  async function handleDelete(id: any) {
    const yes = window.confirm("Usunąć wpis?");
    if (!yes) return;

    const { error } = await supabase.from("transactions").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert("Nie udało się usunąć wpisu.");
      return;
    }

    onDataChanged();
  }

  function startEdit(t: any) {
    setEditingId(t.id);
    setEditDay(t.day ?? "");
    setEditDescription(t.description ?? "");
    setEditAmount(String(t.amount ?? ""));
  }

  async function saveEdit() {
    const parsedAmount = Number(editAmount);

    if (!editAmount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Kwota musi być większa od 0.");
      return;
    }

    const parsedDay =
      editDay === "" || Number(editDay) === 0 ? null : Number(editDay);

    const { error } = await supabase
      .from("transactions")
      .update({
        day: parsedDay,
        description: editDescription.trim() || null,
        amount: parsedAmount,
      })
      .eq("id", editingId);

    if (error) {
      console.error(error);
      alert("Nie udało się zapisać zmian.");
      return;
    }

    setEditingId(null);
    setEditDay("");
    setEditDescription("");
    setEditAmount("");
    onDataChanged();
  }

  if (list.length === 0) {
    return <div className="empty-list">Brak wpisów.</div>;
  }

  // grupowanie po dniu
  const grouped: any = {};

  list.forEach((t) => {
    const key = t.day || "no-day";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });

  const sortedDays = Object.keys(grouped).sort((a, b) => {
    if (a === "no-day") return 1;
    if (b === "no-day") return -1;
    return Number(b) - Number(a);
  });

  return (
    <div className="tx-list-wrap">
      {sortedDays.map((day) => (
        <div key={day}>
          <div className="tx-day-group">
            {day === "no-day" ? "bez dnia" : day}
          </div>

          {grouped[day].map((t: any) => {
            const isEditing = editingId === t.id;

            return (
              <div key={t.id} className="tx-row">
                {!isEditing ? (
                  <>
                    <div className="tx-row-left">
                      {t.description ? (
                        <span className="tx-description">{t.description}</span>
                      ) : null}
                    </div>

                    <div className="tx-row-right">
                      <span className="tx-amount">
                        {Number(t.amount).toFixed(2)}
                      </span>

                      {session?.user?.id && (
                        <>
                          <button
                            className="cat-mini-btn"
                            onClick={() => startEdit(t)}
                          >
                            ✎
                          </button>
                          <button
                            className="cat-mini-btn danger-mini"
                            onClick={() => handleDelete(t.id)}
                          >
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="edit-row">
                    <input
                      className="tx-day-input"
                      value={editDay}
                      onChange={(e) =>
                        setEditDay(e.target.value.replace(/[^\d]/g, ""))
                      }
                      placeholder="dzień"
                    />
                    <input
                      className="tx-description-input"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="opis"
                    />
                    <input
                      className="tx-amount-input"
                      value={editAmount}
                      onChange={(e) =>
                        setEditAmount(e.target.value.replace(",", "."))
                      }
                      placeholder="kwota"
                    />
                    <button className="soft-btn" onClick={saveEdit}>
                      Zapisz
                    </button>
                    <button
                      className="soft-btn"
                      onClick={() => setEditingId(null)}
                    >
                      Anuluj
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}