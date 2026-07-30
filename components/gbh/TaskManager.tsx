"use client";
import React, { useState } from "react";

export interface Task {
  id: string;
  text: string;
  done: boolean;
  memo?: string;
}

export default function TaskManager({ TH }: { tasks?: any; setTasks?: any; TH?: any }) {
  const [taskList, setTaskList] = useState<Task[]>([
    { id: "1", text: "17歳の野望を開始せよ (筑波AC突破)", done: false, memo: "情報メディア創成学類合格に向けた実績づくり" },
    { id: "2", text: "朝5時 Deep Work 演習", done: true },
  ]);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskMemo, setNewTaskMemo] = useState("");
  const [activeMemoModal, setActiveMemoModal] = useState<Task | null>(null);

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      text: newTaskText,
      done: false,
      memo: newTaskMemo.trim() || undefined,
    };
    setTaskList([...taskList, newTask]);
    setNewTaskText("");
    setNewTaskMemo("");
  };

  const toggleDone = (id: string) => {
    setTaskList(taskList.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px", color: "#fff" }}>
      <h3 style={{ margin: "0 0 15px 0", color: "#C9A84C", fontSize: "16px" }}>✅ タスク管理ボード</h3>

      {/* タスク追加フォーム */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "15px" }}>
        <input
          type="text"
          placeholder="新規タスクを入力..."
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          style={{ padding: "8px", background: "#1a1a1a", border: "1px solid #333", color: "#fff", borderRadius: "4px" }}
        />
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="メモ (任意)..."
            value={newTaskMemo}
            onChange={(e) => setNewTaskMemo(e.target.value)}
            style={{ flex: 1, padding: "8px", background: "#1a1a1a", border: "1px solid #333", color: "#fff", borderRadius: "4px", fontSize: "12px" }}
          />
          <button onClick={addTask} style={{ padding: "8px 16px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>
            追加
          </button>
        </div>
      </div>

      {/* タスク一覧 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {taskList.map((task) => (
          <div key={task.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#151515", padding: "10px 12px", borderRadius: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input type="checkbox" checked={task.done} onChange={() => toggleDone(task.id)} style={{ cursor: "pointer" }} />
              <span style={{ textDecoration: task.done ? "line-through" : "none", color: task.done ? "#666" : "#fff" }}>{task.text}</span>
            </div>

            {/* 要件11: 条件付きメモボタン (memoが存在する時のみ 📄 表示) */}
            {task.memo && (
              <button
                onClick={() => setActiveMemoModal(task)}
                style={{ background: "none", border: "1px solid #C9A84C", color: "#C9A84C", borderRadius: "4px", padding: "2px 6px", cursor: "pointer", fontSize: "12px" }}
              >
                📄 メモ
              </button>
            )}
          </div>
        ))}
      </div>

      {/* メモ閲覧・編集モーダル */}
      {activeMemoModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "300px" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#C9A84C" }}>📄 タスクメモ</h4>
            <p style={{ fontSize: "14px", color: "#ccc", background: "#0d0d0d", padding: "10px", borderRadius: "4px" }}>{activeMemoModal.memo}</p>
            <button onClick={() => setActiveMemoModal(null)} style={{ marginTop: "15px", width: "100%", padding: "8px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}