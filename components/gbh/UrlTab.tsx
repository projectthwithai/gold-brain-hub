"use client";
import React, { useState, useEffect } from "react";

export interface UrlLinkItem {
  id: string;
  name: string;    // サイト名 (例: "Math Lab")
  icon: string;    // アイコン絵文字 (例: "📐")
  url: string;     // 遷移先URL (例: "https://...")
  category: string;// カテゴリ (例: "Apex Suite", "入試戦術", "AI/開発")
}

const DEFAULT_URL_LINKS: UrlLinkItem[] = [
  { id: "u1", name: "Math Lab", icon: "📐", url: "https://math-lab.example.com", category: "Apex Suite" },
  { id: "u2", name: "English Lab", icon: "🔤", url: "https://english-lab.example.com", category: "Apex Suite" },
  { id: "u3", name: "Japanese Lab", icon: "📚", url: "https://japanese-lab.example.com", category: "Apex Suite" },
  { id: "u4", name: "筑波大学 AC入試 募集要項", icon: "🏛️", url: "https://www.tsukuba.ac.jp/admission/undergraduate/ac/", category: "入試戦術" },
  { id: "u5", name: "Google AI Studio", icon: "🧠", url: "https://aistudio.google.dev/", category: "AI/開発" },
  { id: "u6", name: "Supabase Console", icon: "⚡", url: "https://supabase.com/dashboard", category: "AI/開発" },
  { id: "u7", name: "Vercel Dashboard", icon: "▲", url: "https://vercel.com/dashboard", category: "AI/開発" },
];

export default function UrlTab() {
  const [links, setLinks] = useState<UrlLinkItem[]>(DEFAULT_URL_LINKS);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // モーダル State
  const [isCreating, setIsCreating] = useState(false);
  const [editingLink, setEditingLink] = useState<UrlLinkItem | null>(null);

  const [inputName, setInputName] = useState("");
  const [inputIcon, setInputIcon] = useState("🔗");
  const [inputUrl, setInputUrl] = useState("https://");
  const [inputCategory, setInputCategory] = useState("Apex Suite");

  // 1. 初回ロード: localStorage からデータを復元
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gbh_url_links");
      if (saved) {
        try {
          setLinks(JSON.parse(saved));
        } catch (e) {}
      }
    }
  }, []);

  // 2. 変更時に localStorage へ自動保存
  const saveToLocal = (newLinks: UrlLinkItem[]) => {
    setLinks(newLinks);
    if (typeof window !== "undefined") {
      localStorage.setItem("gbh_url_links", JSON.stringify(newLinks));
    }
  };

  // サイト開く (新しいタブで爆速アクセス)
  const handleOpenUrl = (url: string) => {
    let target = url.trim();
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = `https://${target}`;
    }
    window.open(target, "_blank", "noopener,noreferrer");
  };

  // 新規追加
  const handleAddLink = () => {
    if (!inputName.trim() || !inputUrl.trim()) return;
    const item: UrlLinkItem = {
      id: `url_${Date.now()}`,
      name: inputName.trim(),
      icon: inputIcon.trim() || "🔗",
      url: inputUrl.trim(),
      category: inputCategory,
    };
    saveToLocal([...links, item]);
    setIsCreating(false);
    resetForm();
  };

  // 編集保存
  const handleSaveEdit = () => {
    if (!editingLink || !editingLink.name.trim() || !editingLink.url.trim()) return;
    const updated = links.map((l) => (l.id === editingLink.id ? editingLink : l));
    saveToLocal(updated);
    setEditingLink(null);
  };

  // 削除
  const handleDeleteLink = (id: string) => {
    if (confirm("このサイトリンクを削除しますか？")) {
      const updated = links.filter((l) => l.id !== id);
      saveToLocal(updated);
    }
  };

  const resetForm = () => {
    setInputName("");
    setInputIcon("🔗");
    setInputUrl("https://");
    setInputCategory("Apex Suite");
  };

  const startEdit = (item: UrlLinkItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLink(item);
  };

  const categories = ["ALL", "Apex Suite", "入試戦術", "AI/開発", "その他"];
  const filteredLinks = selectedCategory === "ALL" ? links : links.filter((l) => l.category === selectedCategory);

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px", color: "#fff", fontFamily: "sans-serif" }}>
      
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h3 style={{ margin: 0, color: "#C9A84C", fontSize: "18px" }}>🔗 有益ポータル ＆ サイトURLナビゲーター</h3>
          <span style={{ fontSize: "12px", color: "#888" }}>Apex Suite・筑波ACポータル・AI兵器へのワンタップ爆速アクセス</span>
        </div>

        <button
          onClick={() => { resetForm(); setIsCreating(true); }}
          style={{ padding: "8px 16px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
        >
          ＋ 新規サイトURLを追加
        </button>
      </div>

      {/* カテゴリフィルタータブ */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: "6px 12px",
              background: selectedCategory === cat ? "#C9A84C" : "#1a1a1a",
              color: selectedCategory === cat ? "#000" : "#888",
              border: `1px solid ${selectedCategory === cat ? "#C9A84C" : "#333"}`,
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* URLグリッドカード一覧 (クリックで爆速アクセス) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "15px" }}>
        {filteredLinks.map((item) => (
          <div
            key={item.id}
            onClick={() => handleOpenUrl(item.url)}
            style={{
              background: "#151515",
              border: "1px solid #222",
              borderRadius: "8px",
              padding: "15px",
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "100px",
              position: "relative",
              boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#C9A84C")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#222")}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <span style={{ fontSize: "28px" }}>{item.icon}</span>
                
                {/* ✏️ 編集 / 🗑️ 削除ボタン */}
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    onClick={(e) => startEdit(item, e)}
                    style={{ background: "#222", color: "#3b82f6", border: "1px solid #333", borderRadius: "3px", padding: "2px 6px", cursor: "pointer", fontSize: "11px" }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteLink(item.id); }}
                    style={{ background: "#222", color: "#e11d48", border: "1px solid #333", borderRadius: "3px", padding: "2px 6px", cursor: "pointer", fontSize: "11px" }}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <strong style={{ fontSize: "15px", color: "#fff", display: "block", marginBottom: "4px" }}>
                {item.name}
              </strong>
              <span style={{ fontSize: "11px", color: "#666", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.url}
              </span>
            </div>

            <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "10px", padding: "2px 6px", background: "#000", color: "#C9A84C", border: "1px solid #333", borderRadius: "3px" }}>
                {item.category || "General"}
              </span>
              <span style={{ fontSize: "11px", color: "#22c55e", fontWeight: "bold" }}>
                アクセス ➔
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ＋ 追加 / ✏️ 編集ポップアップモーダル */}
      {(isCreating || editingLink) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "360px", display: "flex", flexDirection: "column", gap: "12px", color: "#fff" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>{isCreating ? "＋ 有益サイトURLの新規追加" : "✏️ サイトURLの編集"}</h4>

            {/* アイコン絵文字 ＆ サイト名 */}
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="アイコン (例: 📐)"
                value={isCreating ? inputIcon : editingLink?.icon || "🔗"}
                onChange={(e) => isCreating ? setInputIcon(e.target.value) : editingLink && setEditingLink({ ...editingLink, icon: e.target.value })}
                style={{ width: "60px", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px", textAlign: "center", fontSize: "18px" }}
              />
              <input
                type="text"
                placeholder="サイト名 (例: Math Lab)..."
                value={isCreating ? inputName : editingLink?.name || ""}
                onChange={(e) => isCreating ? setInputName(e.target.value) : editingLink && setEditingLink({ ...editingLink, name: e.target.value })}
                style={{ flex: 1, padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px", fontWeight: "bold" }}
              />
            </div>

            {/* URL */}
            <div>
              <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>URL (遷移先アドレス):</span>
              <input
                type="text"
                placeholder="例: https://..."
                value={isCreating ? inputUrl : editingLink?.url || ""}
                onChange={(e) => isCreating ? setInputUrl(e.target.value) : editingLink && setEditingLink({ ...editingLink, url: e.target.value })}
                style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #C9A84C", color: "#3b82f6", borderRadius: "4px", boxSizing: "border-box" }}
              />
            </div>

            {/* カテゴリ */}
            <div>
              <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>カテゴリ:</span>
              <select
                value={isCreating ? inputCategory : editingLink?.category || "Apex Suite"}
                onChange={(e) => isCreating ? setInputCategory(e.target.value) : editingLink && setEditingLink({ ...editingLink, category: e.target.value })}
                style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px" }}
              >
                <option value="Apex Suite">Apex Suite</option>
                <option value="入試戦術">入試戦術</option>
                <option value="AI/開発">AI/開発</option>
                <option value="その他">その他</option>
              </select>
            </div>

            {/* ボタン */}
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                onClick={isCreating ? handleAddLink : handleSaveEdit}
                style={{ flex: 1, padding: "10px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
              >
                保存する
              </button>
              <button
                onClick={() => { setIsCreating(false); setEditingLink(null); }}
                style={{ flex: 1, padding: "10px", background: "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
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