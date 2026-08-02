"use client";
import React, { useState } from "react";

// 資金獲得・副収入ログ型
export interface IncomeLog {
  id: string;
  source: string; // 例: "クラウドワークス 動画編集代行"
  amount: number; // 例: 15000
  date: string;   // 例: "2026-08-01"
}

// 兵站目標物資型
export interface SupplyTarget {
  id: string;
  name: string;         // 例: "Galaxy S26 Ultra"
  targetAmount: number; // 例: 180000
}

const INITIAL_TARGETS: SupplyTarget[] = [
  { id: "st1", name: "Galaxy S26 Ultra", targetAmount: 180000 },
  { id: "st2", name: "パートナー用PC", targetAmount: 120000 },
];

const INITIAL_INCOME_LOGS: IncomeLog[] = [
  { id: "i1", source: "クラウドワークス 動画編集代行案件 #1", amount: 25000, date: "2026-07-25" },
  { id: "i2", source: "AI導入支援コンサル代行", amount: 30000, date: "2026-08-01" },
];

export default function RecordTab() {
  // 兵站目標物資リスト (追加・編集・削除)
  const [targets, setTargets] = useState<SupplyTarget[]>(INITIAL_TARGETS);

  // 収入・資金獲得ログリスト (追加・削除)
  const [incomeLogs, setIncomeLogs] = useState<IncomeLog[]>(INITIAL_INCOME_LOGS);

  // モーダル編集 State
  const [editingTarget, setEditingTarget] = useState<SupplyTarget | null>(null);
  const [isCreatingTarget, setIsCreatingTarget] = useState(false);
  const [newTargetName, setNewTargetName] = useState("");
  const [newTargetAmount, setNewTargetAmount] = useState<number>(180000);

  // 新規収入ログ入力 State
  const [newIncomeSource, setNewIncomeSource] = useState("");
  const [newIncomeAmount, setNewIncomeAmount] = useState<number>(10000);

  // 累計獲得資金の全自動加算計算
  const totalIncome = incomeLogs.reduce((acc, log) => acc + log.amount, 0);

  // 収入ログ追加 ➔ リアルタイム全自動加算！
  const handleAddIncome = () => {
    if (!newIncomeSource.trim() || newIncomeAmount <= 0) return;
    const log: IncomeLog = {
      id: `i_${Date.now()}`,
      source: newIncomeSource.trim(),
      amount: newIncomeAmount,
      date: new Date().toISOString().split("T")[0],
    };
    setIncomeLogs([log, ...incomeLogs]);
    setNewIncomeSource("");
    setNewIncomeAmount(10000);
  };

  // 収入ログ削除
  const handleDeleteIncome = (id: string) => {
    setIncomeLogs(incomeLogs.filter((x) => x.id !== id));
  };

  // 物資目標追加
  const handleAddTarget = () => {
    if (!newTargetName.trim() || newTargetAmount <= 0) return;
    const item: SupplyTarget = {
      id: `st_${Date.now()}`,
      name: newTargetName.trim(),
      targetAmount: newTargetAmount,
    };
    setTargets([...targets, item]);
    setIsCreatingTarget(false);
    setNewTargetName("");
  };

  // 物資目標編集保存
  const handleSaveTargetEdit = () => {
    if (!editingTarget) return;
    setTargets(targets.map((t) => (t.id === editingTarget.id ? editingTarget : t)));
    setEditingTarget(null);
  };

  // 物資目標削除
  const handleDeleteTarget = (id: string) => {
    if (targets.length <= 1) return;
    setTargets(targets.filter((t) => t.id !== id));
    setEditingTarget(null);
  };

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px", color: "#fff", fontFamily: "sans-serif" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h3 style={{ margin: 0, color: "#C9A84C", fontSize: "18px" }}>📱 兵站調達 ＆ 資金獲得ダッシュボード</h3>
          <span style={{ fontSize: "12px", color: "#888" }}>クラウドワークス副収入・機材調達進捗の完全管理</span>
        </div>

        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: "11px", color: "#888", display: "block" }}>累計獲得資金</span>
          <strong style={{ fontSize: "22px", color: "#22c55e" }}>¥ {totalIncome.toLocaleString()} 円</strong>
        </div>
      </div>

      {/* 1. 兵站目標物資リスト (Galaxy S26 Ultra, パートナーPC等 追加・編集・削除可能) */}
      <div style={{ marginBottom: "30px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "14px", color: "#C9A84C", fontWeight: "bold" }}>📦 物資調達目標一覧:</span>
          <button
            onClick={() => setIsCreatingTarget(true)}
            style={{ padding: "6px 12px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}
          >
            ＋ 物資目標を追加
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {targets.map((tgt) => {
            const pct = Math.min(100, Math.round((totalIncome / tgt.targetAmount) * 100));
            return (
              <div key={tgt.id} style={{ background: "#151515", border: "1px solid #222", padding: "15px", borderRadius: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontWeight: "bold", fontSize: "15px", color: "#fff" }}>📱 {tgt.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "13px", color: "#C9A84C", fontWeight: "bold" }}>
                      ¥{totalIncome.toLocaleString()} / ¥{tgt.targetAmount.toLocaleString()} 円 ({pct}%)
                    </span>
                    <button
                      onClick={() => setEditingTarget(tgt)}
                      style={{ padding: "4px 8px", background: "#222", color: "#3b82f6", border: "1px solid #3b82f6", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
                    >
                      ✏️ 編集
                    </button>
                  </div>
                </div>

                {/* ゴールドプログレスバー */}
                <div style={{ width: "100%", background: "#222", height: "10px", borderRadius: "5px", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, background: "linear-gradient(90deg, #C9A84C, #22c55e)", height: "100%", transition: "width 0.4s ease-in-out" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. クラウドワークス副収入・資金入力フォーム */}
      <div style={{ background: "#151515", padding: "15px", borderRadius: "6px", marginBottom: "25px", border: "1px solid #222" }}>
        <span style={{ fontSize: "13px", color: "#22c55e", fontWeight: "bold", display: "block", marginBottom: "10px" }}>💰 資金獲得ログの記録 (クラウドワークス案件・副収入):</span>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="収入源 (例: クラウドワークス 動画編集代行 #2)..."
            value={newIncomeSource}
            onChange={(e) => setNewIncomeSource(e.target.value)}
            style={{ flex: 2, minWidth: "200px", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px" }}
          />
          <input
            type="number"
            step="1000"
            placeholder="金額 (円)"
            value={newIncomeAmount}
            onChange={(e) => setNewIncomeAmount(Number(e.target.value))}
            style={{ flex: 1, minWidth: "100px", padding: "8px", background: "#000", border: "1px solid #C9A84C", color: "#22c55e", borderRadius: "4px", fontWeight: "bold" }}
          />
          <button
            onClick={handleAddIncome}
            style={{ padding: "8px 20px", background: "#22c55e", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
          >
            ＋ 資金追加
          </button>
        </div>
      </div>

      {/* 3. 資金獲得履歴ログ一覧 */}
      <div>
        <span style={{ fontSize: "13px", color: "#888", fontWeight: "bold", display: "block", marginBottom: "10px" }}>📜 資金調達・獲得履歴:</span>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {incomeLogs.length === 0 && <span style={{ fontSize: "12px", color: "#555" }}>まだ収入ログはありません</span>}
          {incomeLogs.map((log) => (
            <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111", border: "1px solid #1a1a1a", padding: "10px 12px", borderRadius: "4px" }}>
              <div>
                <span style={{ fontSize: "11px", color: "#666", display: "block" }}>{log.date}</span>
                <span style={{ fontWeight: "bold", color: "#ccc", fontSize: "14px" }}>{log.source}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <strong style={{ color: "#22c55e", fontSize: "15px" }}>+¥{log.amount.toLocaleString()} 円</strong>
                <button
                  onClick={() => handleDeleteIncome(log.id)}
                  style={{ background: "none", border: "none", color: "#e11d48", cursor: "pointer", fontSize: "12px" }}
                >
                  🗑️ 削除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 物資目標 追加・編集モーダル */}
      {(isCreatingTarget || editingTarget) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "340px", display: "flex", flexDirection: "column", gap: "12px", color: "#fff" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>{isCreatingTarget ? "＋ 物資調達目標の追加" : "✏️ 物資調達目標の編集・削除"}</h4>

            <div>
              <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>物資名 (目標):</span>
              <input
                type="text"
                placeholder="例: Galaxy S26 Ultra, パートナーPC..."
                value={isCreatingTarget ? newTargetName : editingTarget?.name || ""}
                onChange={(e) => isCreatingTarget ? setNewTargetName(e.target.value) : editingTarget && setEditingTarget({ ...editingTarget, name: e.target.value })}
                style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>目標金額 (円):</span>
              <input
                type="number"
                step="5000"
                value={isCreatingTarget ? newTargetAmount : editingTarget?.targetAmount || 180000}
                onChange={(e) => isCreatingTarget ? setNewTargetAmount(Number(e.target.value)) : editingTarget && setEditingTarget({ ...editingTarget, targetAmount: Number(e.target.value) })}
                style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #C9A84C", color: "#22c55e", borderRadius: "4px", fontWeight: "bold", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <button
                onClick={isCreatingTarget ? handleAddTarget : handleSaveTargetEdit}
                style={{ flex: 1, padding: "10px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
              >
                保存する
              </button>

              {editingTarget && targets.length > 1 && (
                <button
                  onClick={() => handleDeleteTarget(editingTarget.id)}
                  style={{ padding: "10px 14px", background: "#e11d48", color: "#fff", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
                >
                  🗑️ 削除
                </button>
              )}

              <button
                onClick={() => { setIsCreatingTarget(false); setEditingTarget(null); }}
                style={{ padding: "10px 14px", background: "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}