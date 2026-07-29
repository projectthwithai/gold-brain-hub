// components/TaskBoard.tsx
// @ts-nocheck
import React from 'react';

export default function TaskBoard({ tasks, toggleTask, setModal, TH, t, currentDayStr, setTasks }: any) {
  
  // 1. 表示するタスクのフィルタリング
  const displayTasks = tasks.filter((tk: any) => {
    // 未完了タスクは常に出す
    if (!tk.done) return true;
    // 【第6項目】完了済みの場合：今日完了したものだけを出す（＝昨日以前のものは消える）
    const doneDate = tk.updated_at ? tk.updated_at.split('T')[0] : currentDayStr;
    return doneDate === currentDayStr;
  });

  // 2. カテゴリの抽出
  const categories = Array.from(new Set(displayTasks.map((tk: any) => tk.category || "Focus")));

  return (
    <div style={{ background: TH.surface, border: `1px solid ${TH.borderGold}`, borderRadius: 4, overflow: "hidden" }}>
      <div style={{ padding: "12px 15px", borderBottom: `1px solid ${TH.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 12, letterSpacing: 4, color: TH.gold, textTransform: "uppercase" }}>TASKS</h2>
      </div>

      {categories.map(cat => {
        // カテゴリ内のタスクをソート（未完了が上、完了が下）
        const sortedInCat = displayTasks
          .filter((tk: any) => (tk.category || "Focus") === cat)
          .sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));

        return (
          <div key={cat} style={{ marginBottom: 15 }}>
            {/* カテゴリヘッダー ＆ 一括削除 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 15px', background: "#0a0a0a", borderBottom: `1px solid ${TH.border}` }}>
              <span style={{ fontSize: 9, color: TH.gold, letterSpacing: 2 }}>{cat.toUpperCase()}</span>
              <button 
                onClick={() => setTasks(prev => prev.filter(tk => (tk.category || "Focus") !== cat))}
                style={{ fontSize: 8, color: '#FF7777', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                CLEAR ALL
              </button>
            </div>

            {/* 各タスクの行 */}
            {sortedInCat.map(tk => (
              <div key={tk.id} className="row" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", padding: "12px 15px", borderBottom: `1px solid ${TH.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* チェックボックス */}
                  <div 
                    onClick={(e) => { e.stopPropagation(); toggleTask(tk.id); }} 
                    style={{ width: 18, height: 18, border: `1px solid ${tk.done ? TH.gold : TH.border}`, background: tk.done ? `${TH.gold}1a` : "transparent", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                  >
                    {tk.done && <span style={{ color: TH.gold, fontSize: 12 }}>✓</span>}
                  </div>
                  
                  {/* タスク名（クリックで編集） */}
                  <span 
                    style={{ flex: 1, fontSize: 13, textDecoration: tk.done ? "line-through" : "none", opacity: tk.done ? 0.5 : 1, cursor: "pointer" }}
                    onClick={() => setModal({ type: "task", item: tk })}
                  >
                    {tk.text}
                  </span>
                  
                  <button onClick={() => setModal({ type: "task", item: tk })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>✏️</button>
                </div>

                {/* 【第11項目】メモがある場合のみ【メモを表示】ボタンを出す */}
                {tk.memo && tk.memo.trim() !== "" && (
                  <div style={{ paddingLeft: 28, marginTop: 5 }}>
                    <button 
                      onClick={() => setModal({ type: "task", item: tk })}
                      style={{ background: `${TH.gold}11`, border: `1px solid ${TH.goldDark}44`, color: TH.goldDark, fontSize: 9, padding: "2px 8px", borderRadius: 4, cursor: "pointer" }}
                    >
                      📄 メモを表示・編集
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      <button 
        onClick={() => setModal({ type: "task", item: null })} 
        style={{ width: "100%", padding: "12px", background: "transparent", border: "none", color: TH.textMuted, fontSize: 10, letterSpacing: 2, cursor: "pointer" }}
      >
        + ADD TASK
      </button>
    </div>
  );
}