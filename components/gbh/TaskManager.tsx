"use client";
import React, { useState, useEffect } from "react";
import { useSettings } from "./SettingsContext"; // ★追加★

export interface TaskCategoryOption {
  id: string;
  label: string;
}

export interface TaskItem {
  id: string;
  text: string;
  category: string;
  done: boolean;
  completedAt?: number;
  memo?: string;

  showOnCalendar?: boolean;
  calendarDates?: string[];
}

const INITIAL_CATEGORIES: TaskCategoryOption[] = [
  { id: "c1", label: "数学" },
  { id: "c2", label: "英語" },
  { id: "c3", label: "現代文" },
  { id: "c4", label: "Vision" },
  { id: "c5", label: "兵站" },
];

const INITIAL_TASKS: TaskItem[] = [
  {
    id: "1", text: "大学 オープンキャンパス", category: "Vision", done: false, memo: "〇〇キャンパス",
    showOnCalendar: true, calendarDates: ["2026-08-01", "2026-08-15"]
  },
  { id: "2", text: "微分積分 演習問題 10問解く", category: "数学", done: false, memo: "教科書P.45〜P.50" },
  { id: "3", text: "SVOC 精読長文 2文精読", category: "英語", done: true, completedAt: Date.now() - 3600000 },
];

const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24時間

export default function TaskManager() {
  const { userId } = useSettings(); // ★アカウントID取得★

  // カテゴリ State
  const [categories, setCategories] = useState<TaskCategoryOption[]>(() => {
    if (typeof window !== "undefined") {
      const keyCats = `gbh_task_categories_${userId || "guest"}`;
      const saved = localStorage.getItem(keyCats) || localStorage.getItem("gbh_task_categories");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return INITIAL_CATEGORIES;
  });

  // ★復元: 消えていたカテゴリ管理用 State★
  const [newCatInput, setNewCatInput] = useState("");
  const [editingCat, setEditingCat] = useState<TaskCategoryOption | null>(null);
  const [isManagingCategories, setIsManagingCategories] = useState(false);

  // タスク State
  const [taskList, setTaskList] = useState<TaskItem[]>(() => {
    if (typeof window !== "undefined") {
      const keyTasks = `gbh_tasks_${userId || "guest"}`;
      const saved = localStorage.getItem(keyTasks) || localStorage.getItem("gbh_tasks");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return INITIAL_TASKS;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState<string>("数学");
  const [newMemo, setNewMemo] = useState("");

  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [activeMemoTask, setActiveMemoTask] = useState<TaskItem | null>(null);

  const [taskDateInput, setTaskDateInput] = useState<string>("");

  // ★アカウント(userId)切り替え検知 ➔ そのアカウント専用タスクデータへ即時切替★
  useEffect(() => {
    if (typeof window !== "undefined") {
      const keyTasks = `gbh_tasks_${userId}`;
      const keyCats = `gbh_task_categories_${userId}`;

      const savedTasks = localStorage.getItem(keyTasks) || localStorage.getItem("gbh_tasks");
      if (savedTasks) {
        try { setTaskList(JSON.parse(savedTasks)); } catch (e) { setTaskList(INITIAL_TASKS); }
      } else {
        setTaskList(INITIAL_TASKS);
      }

      const savedCats = localStorage.getItem(keyCats) || localStorage.getItem("gbh_task_categories");
      if (savedCats) {
        try { setCategories(JSON.parse(savedCats)); } catch (e) { setCategories(INITIAL_CATEGORIES); }
      } else {
        setCategories(INITIAL_CATEGORIES);
      }
    }
  }, [userId]);

  // ★アカウント専用キーで自動保存 ＆ 24時間パージ★
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`gbh_tasks_${userId}`, JSON.stringify(taskList));
      localStorage.setItem("gbh_tasks", JSON.stringify(taskList));

      localStorage.setItem(`gbh_task_categories_${userId}`, JSON.stringify(categories));
      localStorage.setItem("gbh_task_categories", JSON.stringify(categories));
    }

    const now = Date.now();
    const validTasks = taskList.filter((t) => {
      if (!t.done || !t.completedAt) return true;
      return now - t.completedAt < ONE_DAY_MS;
    });

    if (validTasks.length !== taskList.length) {
      setTaskList(validTasks);
    }
  }, [taskList, categories, userId]);

  const handleAddTask = () => {
    if (!newText.trim()) return;
    const item: TaskItem = {
      id: Date.now().toString(),
      text: newText.trim(),
      category: newCategory,
      done: false,
      memo: newMemo.trim() || undefined,
      showOnCalendar: false,
      calendarDates: [],
    };
    setTaskList([...taskList, item]);
    setNewText("");
    setNewMemo("");
  };

  const toggleDone = (id: string) => {
    setTaskList(taskList.map((t) => {
      if (t.id !== id) return t;
      const nextDone = !t.done;
      return {
        ...t,
        done: nextDone,
        completedAt: nextDone ? Date.now() : undefined,
      };
    }));
  };

  const deleteTask = (id: string) => {
    setTaskList(taskList.filter((t) => t.id !== id));
  };

  const handleAddCategory = () => {
    if (!newCatInput.trim()) return;
    const newOpt: TaskCategoryOption = { id: `c_${Date.now()}`, label: newCatInput.trim() };
    setCategories([...categories, newOpt]);
    setNewCategory(newCatInput.trim());
    setNewCatInput("");
  };

  const handleSaveCategoryEdit = () => {
    if (!editingCat) return;
    setCategories(categories.map((c) => (c.id === editingCat.id ? editingCat : c)));
    setEditingCat(null);
  };

  const handleDeleteCategory = (id: string) => {
    if (categories.length <= 1) return;
    const catToDelete = categories.find((c) => c.id === id);
    setCategories(categories.filter((c) => c.id !== id));
    if (catToDelete && newCategory === catToDelete.label) {
      setNewCategory(categories.filter((c) => c.id !== id)[0].label);
    }
  };

  const handleSaveTaskEdit = () => {
    if (!editingTask) return;
    setTaskList(taskList.map((t) => (t.id === editingTask.id ? editingTask : t)));
    setEditingTask(null);
  };

  const handleSaveMemoEdit = () => {
    if (!activeMemoTask) return;
    setTaskList(taskList.map((t) => (t.id === activeMemoTask.id ? activeMemoTask : t)));
    setActiveMemoTask(null);
  };

  // カレンダー表示日付追加ロジック
  const handleAddTaskDate = () => {
    if (!taskDateInput || !editingTask) return;
    const current = editingTask.calendarDates || [];
    if (!current.includes(taskDateInput)) {
      setEditingTask({ ...editingTask, calendarDates: [...current, taskDateInput] });
    }
    setTaskDateInput("");
  };

  const handleRemoveTaskDate = (dateToRemove: string) => {
    if (!editingTask) return;
    const current = editingTask.calendarDates || [];
    setEditingTask({ ...editingTask, calendarDates: current.filter((d) => d !== dateToRemove) });
  };

  const filteredAll = selectedCategory === "ALL" ? taskList : taskList.filter((t) => t.category === selectedCategory);
  const activeTasks = filteredAll.filter((t) => !t.done);
  const completedTasks = filteredAll.filter((t) => t.done);

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "12px", color: "#fff", boxSizing: "border-box", fontFamily: "sans-serif" }}>
      
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>✅ タスク管理ボード</h3>

        <button
          onClick={() => setIsManagingCategories(true)}
          style={{ padding: "6px 10px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
        >
          🏷️ ジャンル選択肢の管理
        </button>
      </div>

      {/* ジャンル別タブ */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "15px", flexWrap: "wrap" }}>
        <button
          onClick={() => setSelectedCategory("ALL")}
          style={{
            padding: "6px 12px",
            background: selectedCategory === "ALL" ? "#C9A84C" : "#1a1a1a",
            color: selectedCategory === "ALL" ? "#000" : "#888",
            border: "1px solid #C9A84C",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          ALL (全て)
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.label)}
            style={{
              padding: "6px 12px",
              background: selectedCategory === cat.label ? "#C9A84C" : "#1a1a1a",
              color: selectedCategory === cat.label ? "#000" : "#888",
              border: `1px solid ${selectedCategory === cat.label ? "#C9A84C" : "#333"}`,
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* タスク追加フォーム */}
      <div style={{ background: "#151515", padding: "12px", borderRadius: "6px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold" }}>＋ 新規タスク追加:</span>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            style={{ padding: "8px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", fontWeight: "bold" }}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.label}>{c.label}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="タスク内容を入力..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            style={{ flex: 1, minWidth: "160px", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="メモ (任意)..."
            value={newMemo}
            onChange={(e) => setNewMemo(e.target.value)}
            style={{ flex: 1, minWidth: "160px", padding: "6px 8px", background: "#000", border: "1px solid #333", color: "#ccc", borderRadius: "4px", fontSize: "12px", boxSizing: "border-box" }}
          />
          <button
            onClick={handleAddTask}
            style={{ padding: "6px 16px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            タスク追加
          </button>
        </div>
      </div>

      {/* 未完了タスク一覧 (📱 スマホレスポンシブ最適化カード) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "25px" }}>
        <span style={{ fontSize: "13px", color: "#C9A84C", fontWeight: "bold" }}>🔥 実行中タスク:</span>
        {activeTasks.length === 0 && <span style={{ fontSize: "12px", color: "#666" }}>タスクはありません</span>}
        {activeTasks.map((t) => (
          <div
            key={t.id}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              background: "#151515",
              border: "1px solid #2a2a2a",
              padding: "12px 14px",
              borderRadius: "8px",
              boxSizing: "border-box",
              width: "100%",
            }}
          >
            {/* 上段：チェックボックス ＆ カテゴリ・バッジ・タスク文章 */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", width: "100%" }}>
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggleDone(t.id)}
                style={{ accentColor: "#C9A84C", cursor: "pointer", width: "20px", height: "20px", marginTop: "2px", flexShrink: 0 }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* カテゴリ ＆ カレンダーバッジ（折り返し対応） */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "10px", padding: "2px 6px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "3px", whiteSpace: "nowrap" }}>
                    {t.category}
                  </span>

                  {/* カレンダー連動青バッジ表示 */}
                  {t.showOnCalendar && (
                    <span style={{ fontSize: "10px", padding: "1px 5px", background: "#1e3a8a", color: "#93c5fd", border: "1px solid #3b82f6", borderRadius: "3px", fontWeight: "bold", whiteSpace: "nowrap" }}>
                      🔵 カレンダー表示ON ({t.calendarDates?.length || 0}日指定)
                    </span>
                  )}
                </div>

                {/* タスク名（縦潰れ防止・文章折り返し） */}
                <span style={{ color: "#fff", fontWeight: "bold", fontSize: "15px", lineHeight: "1.4", wordBreak: "break-word", display: "block" }}>
                  {t.text}
                </span>
              </div>
            </div>

            {/* 下段：ボタン群（幅狭時は自動整理・右寄せ） */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end", borderTop: "1px solid #222", paddingTop: "8px", marginTop: "2px" }}>
              {t.memo && (
                <button
                  onClick={() => setActiveMemoTask(t)}
                  style={{ padding: "5px 10px", background: "#222", color: "#22c55e", border: "1px solid #22c55e", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "bold", whiteSpace: "nowrap" }}
                >
                  📄 メモを開く
                </button>
              )}
              <button onClick={() => setEditingTask(t)} style={{ padding: "5px 10px", background: "#222", color: "#3b82f6", border: "1px solid #3b82f6", borderRadius: "4px", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" }}>✏️ 編集</button>
              <button onClick={() => deleteTask(t.id)} style={{ padding: "5px 10px", background: "#222", color: "#e11d48", border: "1px solid #e11d48", borderRadius: "4px", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" }}>🗑️ 削除</button>
            </div>
          </div>
        ))}
      </div>

      {/* チェック済みタスク一覧 */}
      {completedTasks.length > 0 && (
        <div style={{ borderTop: "1px dashed #333", paddingTop: "15px" }}>
          <span style={{ fontSize: "12px", color: "#666", fontWeight: "bold", display: "block", marginBottom: "8px" }}>
            ✔ 本日完了タスク (※24時間後に自動消去されます):
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {completedTasks.map((t) => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111", border: "1px solid #1a1a1a", padding: "8px 12px", borderRadius: "6px", opacity: 0.5, flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                  <input type="checkbox" checked={t.done} onChange={() => toggleDone(t.id)} style={{ accentColor: "#C9A84C", cursor: "pointer", flexShrink: 0 }} />
                  <span style={{ fontSize: "10px", padding: "1px 5px", background: "#222", color: "#888", borderRadius: "3px", whiteSpace: "nowrap" }}>{t.category}</span>
                  <span style={{ textDecoration: "line-through", color: "#888", fontSize: "13px", wordBreak: "break-word" }}>{t.text}</span>
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  {t.memo && (
                    <button onClick={() => setActiveMemoTask(t)} style={{ padding: "2px 6px", background: "#1a1a1a", color: "#888", border: "1px solid #444", borderRadius: "3px", cursor: "pointer", fontSize: "11px", whiteSpace: "nowrap" }}>
                      📄 メモ
                    </button>
                  )}
                  <button onClick={() => deleteTask(t.id)} style={{ padding: "2px 6px", background: "#1a1a1a", color: "#e11d48", border: "1px solid #444", borderRadius: "3px", cursor: "pointer", fontSize: "11px", whiteSpace: "nowrap" }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ジャンル管理モーダル */}
      {isManagingCategories && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "360px", maxWidth: "90vw", display: "flex", flexDirection: "column", gap: "12px" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>🏷️ ジャンル選択肢の【追加・編集・削除】</h4>

            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="新しいジャンル名 (例: 物理)..."
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                style={{ flex: 1, padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px" }}
              />
              <button onClick={handleAddCategory} style={{ padding: "8px 14px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>
                ＋追加
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
              <span style={{ fontSize: "12px", color: "#888" }}>現在のジャンル一覧:</span>
              {categories.map((cat) => (
                <div key={cat.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0d0d0d", padding: "8px 12px", borderRadius: "4px", border: "1px solid #222" }}>
                  {editingCat?.id === cat.id ? (
                    <div style={{ display: "flex", gap: "6px", flex: 1 }}>
                      <input
                        type="text"
                        value={editingCat.label}
                        onChange={(e) => setEditingCat({ ...editingCat, label: e.target.value })}
                        style={{ flex: 1, padding: "4px", background: "#1a1a1a", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px" }}
                      />
                      <button onClick={handleSaveCategoryEdit} style={{ padding: "4px 8px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold" }}>保存</button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontWeight: "bold" }}>{cat.label}</span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => setEditingCat(cat)} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: "12px" }}>✏️ 編集</button>
                        {categories.length > 1 && (
                          <button onClick={() => handleDeleteCategory(cat.id)} style={{ background: "none", border: "none", color: "#e11d48", cursor: "pointer", fontSize: "12px" }}>🗑️ 削除</button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => setIsManagingCategories(false)} style={{ marginTop: "10px", padding: "10px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>
              完了
            </button>
          </div>
        </div>
      )}

      {/* ✏️ タスク編集モーダル */}
      {editingTask && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #3b82f6", padding: "20px", borderRadius: "8px", width: "360px", maxWidth: "90vw", display: "flex", flexDirection: "column", gap: "12px", color: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <h4 style={{ margin: 0, color: "#3b82f6", fontSize: "16px" }}>✏️ タスク編集 ＆ カレンダー連動</h4>

            <div>
              <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>ジャンル:</span>
              <select
                value={editingTask.category}
                onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", fontWeight: "bold" }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.label}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>タスク内容:</span>
              <input
                type="text"
                value={editingTask.text}
                onChange={(e) => setEditingTask({ ...editingTask, text: e.target.value })}
                style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>メモ:</span>
              <textarea
                rows={3}
                value={editingTask.memo || ""}
                onChange={(e) => setEditingTask({ ...editingTask, memo: e.target.value })}
                style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#22c55e", borderRadius: "4px", fontSize: "12px", boxSizing: "border-box" }}
              />
            </div>

            {/* カレンダー青色表示 ＆ 複数日選択機能 */}
            <div style={{ background: "#0d0d0d", padding: "10px", borderRadius: "6px", border: "1px solid #222" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "#3b82f6", fontWeight: "bold" }}>🔵 カレンダーに青色で表示する:</span>
                <input
                  type="checkbox"
                  checked={editingTask.showOnCalendar || false}
                  onChange={(e) => setEditingTask({ ...editingTask, showOnCalendar: e.target.checked })}
                  style={{ accentColor: "#3b82f6", cursor: "pointer", width: "18px", height: "18px" }}
                />
              </div>

              {editingTask.showOnCalendar && (
                <div>
                  <span style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "4px" }}>表示させる日付を選択追加 (複数選択可):</span>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                    <input
                      type="date"
                      value={taskDateInput}
                      onChange={(e) => setTaskDateInput(e.target.value)}
                      style={{ flex: 1, padding: "4px", background: "#000", border: "1px solid #333", color: "#3b82f6", borderRadius: "4px" }}
                    />
                    <button
                      type="button"
                      onClick={handleAddTaskDate}
                      style={{ padding: "4px 10px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
                    >
                      日付追加
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {(editingTask.calendarDates || []).map((d) => (
                      <span key={d} style={{ fontSize: "11px", background: "#1e3a8a", color: "#93c5fd", padding: "2px 6px", borderRadius: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                        {d}
                        <button
                          type="button"
                          onClick={() => handleRemoveTaskDate(d)}
                          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: "bold" }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button onClick={handleSaveTaskEdit} style={{ flex: 1, padding: "10px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>保存する</button>
              <button onClick={() => setEditingTask(null)} style={{ flex: 1, padding: "10px", background: "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* 📄 メモ閲覧 ＆ 直接編集モーダル */}
      {activeMemoTask && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #22c55e", padding: "20px", borderRadius: "8px", width: "340px", maxWidth: "90vw", display: "flex", flexDirection: "column", gap: "12px", color: "#fff" }}>
            <h4 style={{ margin: 0, color: "#22c55e", fontSize: "16px" }}>📄 メモの閲覧・直接編集</h4>
            <span style={{ fontSize: "12px", color: "#888" }}>タスク: <strong>{activeMemoTask.text}</strong></span>

            <textarea
              rows={5}
              value={activeMemoTask.memo || ""}
              onChange={(e) => setActiveMemoTask({ ...activeMemoTask, memo: e.target.value })}
              placeholder="メモを入力してください..."
              style={{ width: "100%", padding: "10px", background: "#000", border: "1px solid #22c55e", color: "#22c55e", borderRadius: "4px", fontSize: "13px", boxSizing: "border-box", fontFamily: "monospace" }}
            />

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button onClick={handleSaveMemoEdit} style={{ flex: 1, padding: "10px", background: "#22c55e", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>メモ保存</button>
              <button onClick={() => setActiveMemoTask(null)} style={{ flex: 1, padding: "10px", background: "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>閉じる</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}