"use client";
import React, { useState, useEffect } from "react";
import { useSettings } from "./SettingsContext"; // ★アカウントID取得★

export interface IncomeLog {
  id: string;
  source: string;
  amount: number;
  date: string;
}

export interface SupplyTarget {
  id: string;
  name: string;
  targetAmount: number;
  done?: boolean;
  completedAt?: number;
}

const INITIAL_TARGETS: SupplyTarget[] = [
  { id: "st1", name: "最新スマホ", targetAmount: 180000, done: false },
  { id: "st2", name: "最新PC", targetAmount: 120000, done: false },
];

const INITIAL_INCOME_LOGS: IncomeLog[] = [
  { id: "i1", source: "バイト", amount: 25000, date: "2026-07-25" },
  { id: "i2", source: "SNS収益", amount: 30000, date: "2026-08-01" },
];

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default function RecordTab() {
  const { userId } = useSettings(); // ★アカウントID取得★

  // ★修正: アカウント(userId)ごとの完全独立ロード★
  const [targets, setTargets] = useState<SupplyTarget[]>(() => {
    if (typeof window !== "undefined") {
      const key = `gbh_supply_targets_${userId || "guest"}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return INITIAL_TARGETS;
  });

  const [incomeLogs, setIncomeLogs] = useState<IncomeLog[]>(() => {
    if (typeof window !== "undefined") {
      const key = `gbh_income_logs_${userId || "guest"}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return INITIAL_INCOME_LOGS;
  });

  const [spentAmount, setSpentAmount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const key = `gbh_spent_amount_${userId || "guest"}`;
      const saved = localStorage.getItem(key);
      if (saved) return Number(saved);
    }
    return 0;
  });

  const [editingTarget, setEditingTarget] = useState<SupplyTarget | null>(null);
  const [isCreatingTarget, setIsCreatingTarget] = useState(false);
  const [newTargetName, setNewTargetName] = useState("");
  const [newTargetAmount, setNewTargetAmount] = useState<number>(180000);

  const [newIncomeSource, setNewIncomeSource] = useState("");
  const [newIncomeAmount, setNewIncomeAmount] = useState<number>(10000);

  // ★アカウント(userId)切り替え検知 ➔ データ読み替え★
  useEffect(() => {
    if (typeof window !== "undefined") {
      const keyTargets = `gbh_supply_targets_${userId || "guest"}`;
      const keyLogs = `gbh_income_logs_${userId || "guest"}`;
      const keySpent = `gbh_spent_amount_${userId || "guest"}`;

      const savedTargets = localStorage.getItem(keyTargets);
      if (savedTargets) {
        try { setTargets(JSON.parse(savedTargets)); } catch (e) { setTargets(INITIAL_TARGETS); }
      } else {
        setTargets(INITIAL_TARGETS);
      }

      const savedLogs = localStorage.getItem(keyLogs);
      if (savedLogs) {
        try { setIncomeLogs(JSON.parse(savedLogs)); } catch (e) { setIncomeLogs(INITIAL_INCOME_LOGS); }
      } else {
        setIncomeLogs(INITIAL_INCOME_LOGS);
      }

      const savedSpent = localStorage.getItem(keySpent);
      setSpentAmount(savedSpent ? Number(savedSpent) : 0);
    }
  }, [userId]);

  // ★アカウント専用キーでのみ保存＆24時間パージ★
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`gbh_supply_targets_${userId || "guest"}`, JSON.stringify(targets));
      localStorage.setItem(`gbh_income_logs_${userId || "guest"}`, JSON.stringify(incomeLogs));
      localStorage.setItem(`gbh_spent_amount_${userId || "guest"}`, spentAmount.toString());
    }

    const now = Date.now();
    const validTargets = targets.filter((t) => {
      if (!t.done || !t.completedAt) return true;
      return now - t.completedAt < ONE_DAY_MS;
    });

    if (validTargets.length !== targets.length) {
      setTargets(validTargets);
    }
  }, [targets, incomeLogs, spentAmount, userId]);

  // 累計獲得資金の計算
  const totalIncome = incomeLogs.reduce((acc, log) => acc + log.amount, 0);

  // ★追加: 現在の所持資金 (累計獲得 - 累計消費) ★
  const currentMoney = totalIncome - spentAmount;

  // 収入ログ追加 ➔ リアルタイム加算
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
      done: false,
    };
    setTargets([...targets, item]);
    setIsCreatingTarget(false);
    setNewTargetName("");
  };

  // ★追加: 物資目標達成 (購入・調達完了) 処理 ★
  const handleAchieveTarget = (id: string) => {
    const tgt = targets.find((t) => t.id === id);
    if (!tgt) return;

    // 現在の所持金から引く (消費累積を加算)
    setSpentAmount((prev) => prev + tgt.targetAmount);

    // 達成フラグ & タイムスタンプ更新
    setTargets(
      targets.map((t) =>
        t.id === id ? { ...t, done: true, completedAt: Date.now() } : t
      )
    );
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

  const activeTargets = targets.filter((t) => !t.done);
  const completedTargets = targets.filter((t) => t.done);

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "16px", color: "#fff", fontFamily: "sans-serif", boxSizing: "border-box" }}>
      
      {/* ヘッダー (累計 ＆ 現在の資金) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h3 style={{ margin: 0, color: "#C9A84C", fontSize: "18px" }}>📱 兵站調達 ＆ 資金獲得ダッシュボード</h3>
          <span style={{ fontSize: "12px", color: "#888" }}>収入・機材調達進捗の完全管理</span>
        </div>

        {/* 💰 所持資金 & 累計資金の2連表示 */}
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ textAlign: "right", background: "#111", padding: "6px 12px", borderRadius: "6px", border: "1px solid #3b82f6" }}>
            <span style={{ fontSize: "10px", color: "#93c5fd", display: "block", fontWeight: "bold" }}>現在の所持資金</span>
            <strong style={{ fontSize: "18px", color: currentMoney >= 0 ? "#3b82f6" : "#ef4444" }}>
              ¥ {currentMoney.toLocaleString()} 円
            </strong>
          </div>

          <div style={{ textAlign: "right", background: "#111", padding: "6px 12px", borderRadius: "6px", border: "1px solid #22c55e" }}>
            <span style={{ fontSize: "10px", color: "#86efac", display: "block", fontWeight: "bold" }}>累計獲得資金</span>
            <strong style={{ fontSize: "18px", color: "#22c55e" }}>
              ¥ {totalIncome.toLocaleString()} 円
            </strong>
          </div>
        </div>
      </div>

      {/* 1. 実行中 物資調達目標リスト */}
      <div style={{ marginBottom: "30px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ fontSize: "14px", color: "#C9A84C", fontWeight: "bold" }}>📦 物資調達目標一覧:</span>
          <button
            onClick={() => setIsCreatingTarget(true)}
            style={{ padding: "6px 12px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}
          >
            ＋ 物資目標を追加
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {activeTargets.length === 0 && <span style={{ fontSize: "12px", color: "#666" }}>物資目標はありません</span>}
          {activeTargets.map((tgt) => {
            const pct = Math.min(100, Math.round((currentMoney / tgt.targetAmount) * 100));
            const canAfford = currentMoney >= tgt.targetAmount;

            return (
              <div key={tgt.id} style={{ background: "#151515", border: "1px solid #222", padding: "14px", borderRadius: "8px", boxSizing: "border-box" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                  <span style={{ fontWeight: "bold", fontSize: "15px", color: "#fff" }}>📱 {tgt.name}</span>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "13px", color: "#C9A84C", fontWeight: "bold" }}>
                      所持金 ¥{currentMoney.toLocaleString()} / ¥{tgt.targetAmount.toLocaleString()} 円
                    </span>

                    {/* 🎉 達成 (調達完了) ボタン */}
                    <button
                      onClick={() => handleAchieveTarget(tgt.id)}
                      style={{
                        padding: "4px 10px",
                        background: canAfford ? "#22c55e" : "#1a1a1a",
                        color: canAfford ? "#000" : "#666",
                        border: `1px solid ${canAfford ? "#22c55e" : "#444"}`,
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "bold",
                        whiteSpace: "nowrap"
                      }}
                    >
                      🎉 達成
                    </button>

                    <button
                      onClick={() => setEditingTarget(tgt)}
                      style={{ padding: "4px 8px", background: "#222", color: "#3b82f6", border: "1px solid #3b82f6", borderRadius: "4px", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" }}
                    >
                      ✏️ 編集
                    </button>
                  </div>
                </div>

                {/* 所持資金プログレスバー */}
                <div style={{ width: "100%", background: "#222", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(0, pct)}%`, background: canAfford ? "#22c55e" : "linear-gradient(90deg, #C9A84C, #f59e0b)", height: "100%", transition: "width 0.4s ease-in-out" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. 本日完了 調達目標リスト (24時間パージ) */}
      {completedTargets.length > 0 && (
        <div style={{ borderTop: "1px dashed #333", paddingTop: "15px", marginBottom: "25px" }}>
          <span style={{ fontSize: "12px", color: "#666", fontWeight: "bold", display: "block", marginBottom: "8px" }}>
            ✔ 本日調達完了目標 (※24時間後に自動消去されます):
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {completedTargets.map((tgt) => (
              <div key={tgt.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111", border: "1px solid #1a1a1a", padding: "8px 12px", borderRadius: "6px", opacity: 0.5, flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "12px", color: "#22c55e", fontWeight: "bold" }}>✔ 調達完了</span>
                  <span style={{ textDecoration: "line-through", color: "#888", fontSize: "14px", fontWeight: "bold" }}>📱 {tgt.name}</span>
                </div>
                <span style={{ textDecoration: "line-through", color: "#666", fontSize: "12px" }}>-¥{tgt.targetAmount.toLocaleString()} 円</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. 収入・資金入力フォーム */}
      <div style={{ background: "#151515", padding: "14px", borderRadius: "8px", marginBottom: "25px", border: "1px solid #222" }}>
        <span style={{ fontSize: "13px", color: "#22c55e", fontWeight: "bold", display: "block", marginBottom: "10px" }}>💰 資金獲得ログの記録 (収入):</span>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="収入源 (例: バイト, SNS収益)..."
            value={newIncomeSource}
            onChange={(e) => setNewIncomeSource(e.target.value)}
            style={{ flex: 2, minWidth: "180px", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px", boxSizing: "border-box" }}
          />
          <input
            type="number"
            step="1000"
            placeholder="金額 (円)"
            value={newIncomeAmount}
            onChange={(e) => setNewIncomeAmount(Number(e.target.value))}
            style={{ flex: 1, minWidth: "100px", padding: "8px", background: "#000", border: "1px solid #C9A84C", color: "#22c55e", borderRadius: "4px", fontWeight: "bold", boxSizing: "border-box" }}
          />
          <button
            onClick={handleAddIncome}
            style={{ padding: "8px 20px", background: "#22c55e", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            ＋ 資金追加
          </button>
        </div>
      </div>

      {/* 4. 資金獲得履歴ログ一覧 */}
      <div>
        <span style={{ fontSize: "13px", color: "#888", fontWeight: "bold", display: "block", marginBottom: "10px" }}>📜 資金調達・獲得履歴:</span>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {incomeLogs.length === 0 && <span style={{ fontSize: "12px", color: "#555" }}>まだ収入ログはありません</span>}
          {incomeLogs.map((log) => (
            <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111", border: "1px solid #1a1a1a", padding: "10px 12px", borderRadius: "6px", flexWrap: "wrap", gap: "8px" }}>
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
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "340px", maxWidth: "90vw", display: "flex", flexDirection: "column", gap: "12px", color: "#fff" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>{isCreatingTarget ? "＋ 物資調達目標の追加" : "✏️ 物資調達目標の編集・削除"}</h4>

            <div>
              <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>物資名 (目標):</span>
              <input
                type="text"
                placeholder="例: 最新のスマホ, 最新のPC..."
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