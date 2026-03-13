"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type Props = {
  month: Date;
  categories: any[];
  transactions: any[];
  loading: boolean;
};

export default function Dashboard({
  categories,
  transactions,
  loading,
}: Props) {
  const [openCards, setOpenCards] = useState({
    balance: true,
    pie: true,
    income: false,
    expense: false,
    fixed: false,
    variable: false,
  });

  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;

    const incomeStructure: Record<string, number> = {
      Praca: 0,
      Pozostałe: 0,
    };

    const expenseStructure: Record<string, number> = {
      Stałe: 0,
      Zmienne: 0,
    };

    const fixedStructure: Record<string, number> = {
      "Mieszkanie i rachunki": 0,
      Raty: 0,
      Subskrypcje: 0,
      Pozostałe: 0,
    };

    const variableStructure: Record<string, number> = {
      Podróże: 0,
      "Jedzenie poza domem": 0,
      Okolicznościowe: 0,
      Codzienne: 0,
      Pozostałe: 0,
    };

    transactions.forEach((t) => {
      const cat = categoryMap.get(t.category_id);
      if (!cat) return;

      const amount = Number(t.amount || 0);

      if (cat.type === "income") {
        income += amount;
        if (incomeStructure[cat.name] !== undefined) {
          incomeStructure[cat.name] += amount;
        }
      }

      if (cat.type === "expense") {
        expense += amount;

        const parent = categoryMap.get(cat.parent_id);
        if (parent?.name === "Stałe") {
          expenseStructure["Stałe"] += amount;
          if (fixedStructure[cat.name] !== undefined) {
            fixedStructure[cat.name] += amount;
          }
        }

        if (parent?.name === "Zmienne") {
          expenseStructure["Zmienne"] += amount;
          if (variableStructure[cat.name] !== undefined) {
            variableStructure[cat.name] += amount;
          }
        }
      }
    });

    return {
      income,
      expense,
      balance: income - expense,
      incomeStructure,
      expenseStructure,
      fixedStructure,
      variableStructure,
    };
  }, [transactions, categoryMap]);

  const pieData = [
    { name: "Przychody", value: totals.income },
    { name: "Wydatki", value: totals.expense },
  ];

  function toggle(key: keyof typeof openCards) {
    setOpenCards((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="dashboard-wrap">
      <DashboardCard
        title="Bilans miesiąca"
        open={openCards.balance}
        onToggle={() => toggle("balance")}
      >
        {loading ? (
          <div>Ładowanie...</div>
        ) : (
          <div className="stats-grid">
            <div className="stat-box green-soft">
              <div className="stat-label">Przychody</div>
              <div className="stat-value green-text">{totals.income.toFixed(2)}</div>
            </div>
            <div className="stat-box red-soft">
              <div className="stat-label">Wydatki</div>
              <div className="stat-value red-text">{totals.expense.toFixed(2)}</div>
            </div>
            <div className="stat-box neutral-soft">
              <div className="stat-label">Saldo</div>
              <div
                className={`stat-value ${
                  totals.balance > 0
                    ? "green-text"
                    : totals.balance < 0
                    ? "red-text"
                    : "neutral-text"
                }`}
              >
                {totals.balance.toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </DashboardCard>

      <DashboardCard
        title="Wykres: przychody vs wydatki"
        open={openCards.pie}
        onToggle={() => toggle("pie")}
      >
        <div className="pie-wrap">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                outerRadius={90}
                isAnimationActive={true}
              >
                <Cell fill="#2e9f63" />
                <Cell fill="#d45151" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard
        title="Struktura przychodów"
        open={openCards.income}
        onToggle={() => toggle("income")}
      >
        <SummaryLine name="Praca" value={totals.incomeStructure["Praca"]} green />
        <SummaryLine
          name="Pozostałe"
          value={totals.incomeStructure["Pozostałe"]}
          green
        />
        <SummaryLine name="Suma" value={totals.income} green strong />
      </DashboardCard>

      <DashboardCard
        title="Struktura wydatków"
        open={openCards.expense}
        onToggle={() => toggle("expense")}
      >
        <SummaryLine name="Stałe" value={totals.expenseStructure["Stałe"]} red />
        <SummaryLine name="Zmienne" value={totals.expenseStructure["Zmienne"]} red />
        <SummaryLine name="Suma" value={totals.expense} red strong />
      </DashboardCard>

      <DashboardCard
        title="Struktura wydatków stałych"
        open={openCards.fixed}
        onToggle={() => toggle("fixed")}
      >
        {Object.entries(totals.fixedStructure).map(([name, value]) => (
          <SummaryLine key={name} name={name} value={value} red />
        ))}
        <SummaryLine
          name="Suma"
          value={totals.expenseStructure["Stałe"]}
          red
          strong
        />
      </DashboardCard>

      <DashboardCard
        title="Struktura wydatków zmiennych"
        open={openCards.variable}
        onToggle={() => toggle("variable")}
      >
        {Object.entries(totals.variableStructure).map(([name, value]) => (
          <SummaryLine key={name} name={name} value={value} red />
        ))}
        <SummaryLine
          name="Suma"
          value={totals.expenseStructure["Zmienne"]}
          red
          strong
        />
      </DashboardCard>
    </div>
  );
}

function DashboardCard({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="dash-card">
      <button className="dash-card-head" onClick={onToggle}>
        <span>{title}</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && <div className="dash-card-body">{children}</div>}
    </div>
  );
}

function SummaryLine({
  name,
  value,
  green,
  red,
  strong,
}: {
  name: string;
  value: number;
  green?: boolean;
  red?: boolean;
  strong?: boolean;
}) {
  return (
    <div className={`summary-line ${strong ? "strong" : ""}`}>
      <span>{name}</span>
      <span className={green ? "green-text" : red ? "red-text" : ""}>
        {Number(value).toFixed(2)}
      </span>
    </div>
  );
}