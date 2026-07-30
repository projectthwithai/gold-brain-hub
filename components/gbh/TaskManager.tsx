// components/gbh/TaskManager.tsx
// @ts-nocheck
"use client";
import { useState } from "react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// サブコンポーネント
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 追加ボタン行
const AddRow = ({ onClick, label, TH }: any) => (
  <button onClick={onClick} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "10px", background: "transparent", border: `1px dashed #333`, color: "#888", cursor: "pointer", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>{label}</button>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// メインコンポーネント
//   タスク一覧表示・追加・完了処理・24時間自動パージを担う
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function TaskManager({ tasks, setTasks, TH, currentDayStr }: any) {
  // モーダル状態（タスク編集・追加）
  const [modal, setModal] = useState<any>(null);

  // 【24時間自動パージ】
  // 未完了タスクは常に表示。完了済みタスクは今日完了したもののみ表示（昨日以前は非表示）。
  const displayTasks = tasks.filter(tk => !tk.done || (tk.updated_at || "").split('T')[0] === currentDayStr);

  // 【完了処理】タスクの完了/未完了をトグル
  const toggleTask = (id: string) => setTasks(prev => prev.map(tk => tk.id === id ? { ...tk, done: !tk.done, updated_at: new Date().toISOString() } : tk));

  // 【追加・編集保存】
  const saveTask = (item: any, d: any) => {
    const nextTask = { ...item, ...d };
    if (!nextTask.text?.trim()) return;
    if (!item) setTasks(prev => [...prev, { id: String(Date.now()), done: false, ...nextTask }]);
    else setTasks(prev => prev.map(tk => tk.id === item.id ? { ...tk, ...nextTask } : tk));
  };

  // 【追加・編集モーダルを開く】
  const openTaskModal = (item: any) => setModal({
    type: "task",
    item,
    draft: {
      text: item?.text || "",
      memo: item?.memo || "",
    },
  });

  return (
    <>
      {/* タスク一覧パネル */}
      <div style={{ background: TH.surface, border: `1px solid ${TH.borderGold}`, borderRadius: 4, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${TH.gold}44,transparent)` }} />
        <div style={{ padding: "12px 15px", borderBottom: `1px solid ${TH.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 11, letterSpacing: 3, color: TH.gold, textTransform: "uppercase" }}>TASKS</h2>
        </div>
        {Array.from(new Set(displayTasks.map(tk => tk.category || "Focus"))).map(cat => (
          <div key={cat} style={{marginBottom:15}}>
            <div style={{padding:"4px 15px", background:"#111", fontSize:9, color:TH.gold}}>{cat.toUpperCase()}</div>
            {displayTasks.filter(tk => (tk.category || "Focus") === cat).map(tk => (
              <div key={tk.id} className="row" style={{display:"flex", alignItems:"center", gap:10, borderBottom:`1px solid ${TH.border}`, padding:"10px 15px"}}>
                <div onClick={() => toggleTask(tk.id)} style={{ width: 18, height: 18, border: `1px solid ${tk.done ? TH.gold : TH.border}`, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{tk.done && "✓"}</div>
                <span style={{ flex: 1, fontSize: 13, textDecoration: tk.done ? "line-through" : "none", opacity: tk.done ? 0.5 : 1, marginLeft:10, cursor: "pointer" }} onClick={()=>openTaskModal(tk)}>{tk.text}</span>
                {tk.memo && <span onClick={()=>openTaskModal(tk)} style={{fontSize:9, color:TH.goldDark, cursor:"pointer"}}>📄 MEMO</span>}
              </div>
            ))}
          </div>
        ))}
        <AddRow onClick={() => openTaskModal(null)} label="+ Add Task" TH={TH} />
      </div>

      {/* タスク編集・追加モーダル */}
      {modal?.type === "task" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: TH.surface, padding: 25, borderRadius: 8, width: "100%", maxWidth: 400, border: `1px solid ${TH.gold}` }}>
            <h3 style={{ color: TH.gold, marginBottom: 15 }}>TASK DETAILS</h3>
            <input style={{ width: "100%", background: TH.inputBg, color: TH.text, border: `1px solid ${TH.border}`, padding: 10, marginBottom: 10 }} value={modal.draft?.text || ""} onChange={e => setModal((prev: any) => ({ ...prev, draft: { ...prev.draft, text: e.target.value } }))} />
            <textarea style={{ width: "100%", background: TH.inputBg, color: TH.text, border: `1px solid ${TH.border}`, padding: 10, minHeight: 100 }} value={modal.draft?.memo || ""} onChange={e => setModal((prev: any) => ({ ...prev, draft: { ...prev.draft, memo: e.target.value } }))} placeholder="Memo..." />
            <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
              <button onClick={() => { saveTask(modal.item, modal.draft); setModal(null); }} style={{ flex: 1, padding: 10, background: TH.gold, border: "none", fontWeight: "bold", cursor:"pointer" }}>SAVE</button>
              {modal.item && <button onClick={() => { setTasks(prev => prev.filter(tk => tk.id !== modal.item.id)); setModal(null); }} style={{ padding: 10, color: "red", background: "none", border: "1px solid red", cursor:"pointer" }}>DEL</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
