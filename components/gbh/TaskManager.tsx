"use client";
import React, { useState } from "react";

export interface Task {
  id: string;
  text: string;
  category: "数学" | "英語" | "現代文" | "Vision" | "兵站";
  done: boolean;
  memo?: string;
}

export default function TaskManager() {
  const [taskList, setTaskList] = useState<Task[]>([
    { id: "1", text: "17歳の野望を開始せよ (筑波AC突破)", category: "Vision", done: false, memo: "情報メディア創成学類合格に向けた実績づくり" },
    { id: "2", text: "微分積分 演習問題 10問解く", category: "数学", done: false },
    { id: "3", text: "SVOC 精読長文 2文精読", category: "英語", done: true },
  ]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState<Task["category"]>("数学");

  const categories = ["ALL", "数学", "英語", "現代文", "Vision", "兵站"];

  const filteredTasks = selectedCategory === "ALL" ? taskList : taskList.filter((t) => t.category === selectedCategory);

  const addTask = () => {
    if (!newText.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      text: newText,
      category: newCategory,
      done: false,
    };
    setTaskList([...taskList, newTask]);
    setNewText("");
  };

  const toggleDone = (id: string) => {
    setTaskList(taskList.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px", color: "#fff" }}>
      <h3 style={{ margin: "0 0 15px 0", color: "#C9A84C", fontSize: "16px" }}>✅ ジャンル別 タスク管理ボード</h3>

      {/* ジャンル/カテゴリ タブフィルター */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "15px", flexWrap: "wrap" }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: "6px 12px",
              background: selectedCategory === cat ? "#C9A84C" : "#1a1a1a",
              color: selectedCategory === cat ? "#000" : "#888",
              border: "1px solid #C9A84C",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* タスク追加フォーム */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value as any)}
          style={{ padding: "8px", background: "#1a1a1a", border: "1px solid #333", color: "#C9A84C", borderRadius: "4px", fontWeight: "bold" }}
        >
          <option value="数学">数学</option>
          <option value="英語">英語</option>
          <option value="現代文">現代文</option>
          <option value="Vision">Vision</option>
          <option value="兵站">兵站</option>
        </select>

        <input
          type="text"
          placeholder="タスクを入力..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          style={{ flex: 1, padding: "8px", background: "#1a1a1a", border: "1px solid #333", color: "#fff", borderRadius: "4px" }}
        />
        <button onClick={addTask} style={{ padding: "8px 16px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>
          追加
        </button>
      </div>

      {/* タスク一覧 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filteredTasks.map((t) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#151515", padding: "10px 12px", borderRadius: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input type="checkbox" checked={t.done} onChange={() => toggleDone(t.id)} style={{ accentColor: "#C9A84C", cursor: "pointer" }} />
              <span style={{ fontSize: "11px", padding: "2px 6px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "3px" }}>
                {t.category}
              </span>
              <span style={{ textDecoration: t.done ? "line-through" : "none", color: t.done ? "#666" : "#fff" }}>{t.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}