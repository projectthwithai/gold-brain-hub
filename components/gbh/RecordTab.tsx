"use client";
import React, { useState } from "react";

export default function RecordTab() {
  const [targetAmount] = useState(180000);
  const [currentAmount, setCurrentAmount] = useState(45000);
  const [incomeInput, setIncomeInput] = useState("");

  const progressPct = Math.min(100, Math.round((currentAmount / targetAmount) * 100));

  const handleAddIncome = () => {
    const val = Number(incomeInput);
    if (!isNaN(val) && val > 0) {
      setCurrentAmount((prev) => prev + val);
      setIncomeInput("");
    }
  };

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px", color: "#fff" }}>
      <h3 style={{ margin: "0 0 15px 0", color: "#C9A84C", fontSize: "16px" }}>📊 記録 ＆ 兵站調達ダッシュボード</h3>

      <div style={{ background: "#151515", padding: "15px", borderRadius: "6px", marginBottom: "15px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
          <span>📱 物資調達: <strong>Galaxy S26 Ultra</strong></span>
          <span style={{ color: "#C9A84C", fontWeight: "bold" }}>{currentAmount.toLocaleString()} / {targetAmount.toLocaleString()} 円 ({progressPct}%)</span>
        </div>
        <div style={{ width: "100%", background: "#222", height: "12px", borderRadius: "6px", overflow: "hidden" }}>
          <div style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #C9A84C, #f59e0b)", height: "100%" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <input
          type="number"
          placeholder="クラウドワークス等の獲得金額 (円)"
          value={incomeInput}
          onChange={(e) => setIncomeInput(e.target.value)}
          style={{ flex: 1, padding: "8px", background: "#1a1a1a", border: "1px solid #333", color: "#fff", borderRadius: "4px" }}
        />
        <button
          onClick={handleAddIncome}
          style={{ padding: "8px 16px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
        >
          資金追加
        </button>
      </div>
    </div>
  );
}