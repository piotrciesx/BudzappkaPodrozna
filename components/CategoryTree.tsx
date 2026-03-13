"use client";

import React, { useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import TransactionInput from "./TransactionInput";
import TransactionList from "./TransactionList";

type Props = {
  month: Date;
  categories: any[];
  transactions: any[];
  session: any;
  onDataChanged: () => void;
  onCategoriesChanged: () => void;
};

function CategoryTree({
  month,
  categories,
  transactions,
  session,
  onDataChanged,
  onCategoriesChanged,
}: Props) {
  const [openL2, setOpenL2] = useState<number | string | null>(null);
  const [openL3, setOpenL3] = useState<number | string | null>(null);

  const [addingTo, setAddingTo] = useState<string | number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  const incomeRoot = categories.find(
    (c) => c.level === 1 && c.name === "Przychody"
  );
  const expenseRoot = categories.find(
    (c) => c.level === 1 && c.name === "Wydatki"
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<any, any[]>();
    categories.forEach((c) => {
      const key = c.parent_id ?? "root";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return map;
  }, [categories]);

  function getChildren(parentId: any) {
    return childrenByParent.get(parentId) || [];
  }

  function getSubtreeIds(categoryId: any): any[] {
    const direct = getChildren(categoryId);
    let ids = [categoryId];
    direct.forEach((child) => {
      ids = ids.concat(getSubtreeIds(child.id));
    });
    return ids;
  }

  function sumForCategory(categoryId: any) {
    const ids = getSubtreeIds(categoryId);
    return transactions
      .filter((t) => ids.includes(t.category_id))
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  }

  async function handleAddCategory(parent: any) {
    if (!session?.user?.id) {
      alert("Najpierw zaloguj się.");
      return;
    }

    const name = newCategoryName.trim();
    if (!name) {
      alert("Podaj nazwę kategorii.");
      return;
    }

    const nextLevel = parent.level + 1;
    if (nextLevel > 3) {
      alert("Maksymalny level to 3.");
      return;
    }

    const { error } = await supabase.from("categories").insert({
      user_id: session.user.id,
      name,
      level: nextLevel,
      type: parent.type,
      parent_id: parent.id,
    });

    if (error) {
      console.error(error);
      alert("Nie udało się dodać kategorii.");
      return;
    }

    setNewCategoryName("");
    setAddingTo(null);
    onCategoriesChanged();
  }

  async function handleRenameCategory(category: any) {
    const nextName = window.prompt("Nowa nazwa kategorii:", category.name);
    if (!nextName || !nextName.trim()) return;

    const { error } = await supabase
      .from("categories")
      .update({ name: nextName.trim() })
      .eq("id", category.id);

    if (error) {
      console.error(error);
      alert("Nie udało się zmienić nazwy.");
      return;
    }

    onCategoriesChanged();
  }

  async function handleDeleteCategory(category: any) {
    const childCount = categories.filter((c) => c.parent_id === category.id).length;
    if (childCount > 0) {
      alert("Nie można usunąć kategorii, która ma podkategorie.");
      return;
    }

    const ownTransactions = transactions.filter((t) => t.category_id === category.id);
    if (ownTransactions.length > 0) {
      alert("Najpierw usuń wpisy z tej kategorii.");
      return;
    }

    const yes = window.confirm(`Usunąć kategorię "${category.name}"?`);
    if (!yes) return;

    const { error } = await supabase.from("categories").delete().eq("id", category.id);

    if (error) {
      console.error(error);
      alert("Nie udało się usunąć kategorii.");
      return;
    }

    onCategoriesChanged();
  }

  function renderAddInline(parent: any) {
    if (addingTo !== parent.id) return null;

    return (
      <div className="inline-add-row">
        <input
          className="inline-add-input"
          placeholder={
            parent.level === 1 ? "Nowa kategoria level 2" : "Nowa podkategoria level 3"
          }
          value={newCategoryName}
          autoFocus
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddCategory(parent);
          }}
        />
        <button className="soft-btn" onClick={() => handleAddCategory(parent)}>
          Dodaj
        </button>
        <button
          className="soft-btn"
          onClick={() => {
            setAddingTo(null);
            setNewCategoryName("");
          }}
        >
          Anuluj
        </button>
      </div>
    );
  }

  function renderCategoryBar(category: any, levelClass: string, extra?: React.ReactNode) {
    return (
      <div className={`cat-bar ${levelClass}`}>
        <button className="cat-bar-main" onClick={extra ? undefined : () => {}}>
          <span>{category.name}</span>
          <span className="cat-sum">{sumForCategory(category.id).toFixed(2)}</span>
        </button>

        <div className="cat-actions">
          {category.level < 3 && (
            <button
              className="cat-mini-btn"
              title="Dodaj podkategorię"
              onClick={(e) => {
                e.stopPropagation();
                setAddingTo(addingTo === category.id ? null : category.id);
                setNewCategoryName("");
              }}
            >
              +
            </button>
          )}
          {category.level > 1 && (
            <button
              className="cat-mini-btn"
              title="Zmień nazwę"
              onClick={(e) => {
                e.stopPropagation();
                handleRenameCategory(category);
              }}
            >
              ✎
            </button>
          )}
          {category.level > 1 && (
            <button
              className="cat-mini-btn danger-mini"
              title="Usuń kategorię"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCategory(category);
              }}
            >
              🗑
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderIncomeSection() {
    if (!incomeRoot) return null;

    const incomeL2 = getChildren(incomeRoot.id);

    return (
      <div className="tree-section">
        {renderCategoryBar(incomeRoot, "income-l1")}
        {renderAddInline(incomeRoot)}

        <div className="children-wrap">
          {incomeL2.map((l2) => {
            const hasL3 = getChildren(l2.id).length > 0;
            const isOpen = openL2 === l2.id;

            return (
              <div key={l2.id} className="node-block">
                <div
                  onClick={() => setOpenL2(isOpen ? null : l2.id)}
                  className="full-click-wrap"
                >
                  {renderCategoryBar(l2, "income-l2")}
                </div>

                {renderAddInline(l2)}

                {isOpen && (
                  <div className="node-content">
                    {!hasL3 && (
                      <>
                        <TransactionInput
                          month={month}
                          categoryId={l2.id}
                          session={session}
                          onDataChanged={onDataChanged}
                        />
                        <TransactionList
                          month={month}
                          categoryId={l2.id}
                          transactions={transactions}
                          onDataChanged={onDataChanged}
                          session={session}
                        />
                      </>
                    )}

                    {hasL3 && (
                      <>
                        {getChildren(l2.id).map((l3) => {
                          const openLeaf = openL3 === l3.id;
                          return (
                            <div key={l3.id} className="node-block leaf-node">
                              <div
                                onClick={() => setOpenL3(openLeaf ? null : l3.id)}
                                className="full-click-wrap"
                              >
                                {renderCategoryBar(l3, "income-l3")}
                              </div>

                              {openLeaf && (
                                <div className="node-content">
                                  <TransactionInput
                                    month={month}
                                    categoryId={l3.id}
                                    session={session}
                                    onDataChanged={onDataChanged}
                                  />
                                  <TransactionList
                                    month={month}
                                    categoryId={l3.id}
                                    transactions={transactions}
                                    onDataChanged={onDataChanged}
                                    session={session}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <div className="old-level2-list">
                          <TransactionList
                            month={month}
                            categoryId={l2.id}
                            transactions={transactions}
                            onDataChanged={onDataChanged}
                            session={session}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderExpenseSection() {
    if (!expenseRoot) return null;

    const expenseL2 = getChildren(expenseRoot.id);

    return (
      <div className="tree-section">
        {renderCategoryBar(expenseRoot, "expense-l1")}
        {renderAddInline(expenseRoot)}

        <div className="children-wrap">
          {expenseL2.map((l2) => {
            const isOpen = openL2 === l2.id;
            const level3 = getChildren(l2.id);

            return (
              <div key={l2.id} className="node-block">
                <div
                  onClick={() => setOpenL2(isOpen ? null : l2.id)}
                  className="full-click-wrap"
                >
                  {renderCategoryBar(l2, "expense-l2")}
                </div>

                {renderAddInline(l2)}

                {isOpen && (
                  <div className="node-content">
                    {level3.map((l3) => {
                      const openLeaf = openL3 === l3.id;

                      return (
                        <div key={l3.id} className="node-block leaf-node">
                          <div
                            onClick={() => setOpenL3(openLeaf ? null : l3.id)}
                            className="full-click-wrap"
                          >
                            {renderCategoryBar(l3, "expense-l3")}
                          </div>

                          {openLeaf && (
                            <div className="node-content">
                              <TransactionInput
                                month={month}
                                categoryId={l3.id}
                                session={session}
                                onDataChanged={onDataChanged}
                              />
                              <TransactionList
                                month={month}
                                categoryId={l3.id}
                                transactions={transactions}
                                onDataChanged={onDataChanged}
                                session={session}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="old-level2-list">
                      <TransactionList
                        month={month}
                        categoryId={l2.id}
                        transactions={transactions}
                        onDataChanged={onDataChanged}
                        session={session}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="tree-wrap">
      <div className="tree-title">Kategorie</div>
      {renderIncomeSection()}
      {renderExpenseSection()}
    </div>
  );
}

export default React.memo(CategoryTree);