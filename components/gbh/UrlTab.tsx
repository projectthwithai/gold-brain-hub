"use client";
import React, { useState, useEffect } from "react";

// カテゴリオプション型
export interface UrlCategoryOption {
  id: string;
  label: string;
}

export interface UrlLinkItem {
  id: string;
  name: string;    // サイト名 (例: "Math Lab")
  icon: string;    // アイコン絵文字 (例: "📐")
  url: string;     // 遷移先URL (例: "https://...")
  category: string;// カテゴリ (例: "Apex Suite", "学習", "AI/開発")
}

const DEFAULT_CATEGORIES: UrlCategoryOption[] = [
  { id: "uc1", label: "Apex Suite" },
  { id: "uc2", label: "学習" },
  { id: "uc3", label: "AI/開発" },
  { id: "uc4", label: "その他" },
];

const DEFAULT_URL_LINKS: UrlLinkItem[] = [
  { id: "u1", name: "Math Lab", icon: "📐", url: "https://math-lab-ruby.vercel.app", category: "Apex Suite" },
  { id: "u2", name: "English Lab", icon: "🔤", url: "https://english-lab-five.vercel.app", category: "Apex Suite" },
  { id: "u3", name: "Japanese Lab", icon: "📚", url: "https://japanese-lab-omega.vercel.app", category: "Apex Suite" },
  { id: "u4", name: "Duolingo", icon: "🦉", url: "https://ja.duolingo.com/", category: "学習" },
  { id: "u5", name: "Google AI Studio", icon: "🧠", url: "https://aistudio.google.com/prompts/new_chat", category: "AI/開発" },
  { id: "u6", name: "Supabase Console", icon: "⚡", url: "https://supabase.com/dashboard", category: "AI/開発" },
  { id: "u7", name: "Vercel Dashboard", icon: "▲", url: "https://vercel.com/dashboard", category: "AI/開発" },
];

export default function UrlTab() {
  const [links, setLinks] = useState<UrlLinkItem[]>(DEFAULT_URL_LINKS);
  const [categories, setCategories] = useState<UrlCategoryOption[]>(DEFAULT_CATEGORIES);

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // カテゴリ管理モーダル State
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCatInput, setNewCatInput] = useState("");
  const [editingCat, setEditingCat] = useState<UrlCategoryOption | null>(null);

  // リンク作成・編集モーダル State
  const [isCreating, setIsCreating] = useState(false);
  const [editingLink, setEditingLink] = useState<UrlLinkItem | null>(null);

  const [inputName, setInputName] = useState("");
  const [inputIcon, setInputIcon] = useState("🔗");
  const [inputUrl, setInputUrl] = useState("https://");
  const [inputCategory, setInputCategory] = useState("Apex Suite");

  const [isLoaded, setIsLoaded] = useState(false);

  // 1. 初回ロード: localStorage からリンク ＆ カテゴリデータを復元
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLinks = localStorage.getItem("gbh_url_links");
      if (savedLinks) {
        try { setLinks(JSON.parse(savedLinks)); } catch (e) {}
      }

      const savedCats = localStorage.getItem("gbh_url_categories");
      if (savedCats) {
        try { setCategories(JSON.parse(savedCats)); } catch (e) {}
      }

      setIsLoaded(true);
    }
  }, []);

  // 2. 変更時に localStorage へ自動保存
  useEffect(() => {
    if (typeof window !== "undefined" && isLoaded) {
      localStorage.setItem("gbh_url_links", JSON.stringify(links));
    }
  }, [links, isLoaded]);

  useEffect(() => {
    if (typeof window !== "undefined" && isLoaded) {
      localStorage.setItem("gbh_url_categories", JSON.stringify(categories));
    }
  }, [categories, isLoaded]);

  // サイト開く (新しいタブで爆速アクセス)
  const handleOpenUrl = (url: string) => {
    let target = url.trim();
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = `https://${target}`;
    }
    window.open(target, "_blank", "noopener,noreferrer");
  };

  // リンク新規追加
  const handleAddLink = () => {
    if (!inputName.trim() || !inputUrl.trim()) return;
    const item: UrlLinkItem = {
      id: `url_${Date.now()}`,
      name: inputName.trim(),
      icon: inputIcon.trim() || "🔗",
      url: inputUrl.trim(),
      category: inputCategory || categories[0]?.label || "General",
    };
    setLinks([...links, item]);
    setIsCreating(false);
    resetForm();
  };

  // リンク編集保存
  const handleSaveEdit = () => {
    if (!editingLink || !editingLink.name.trim() || !editingLink.url.trim()) return;
    const updated = links.map((l) => (l.id === editingLink.id ? editingLink : l));
    setLinks(updated);
    setEditingLink(null);
  };

  // リンク削除
  const handleDeleteLink = (id: string) => {
    if (confirm("このサイトリンクを削除しますか？")) {
      setLinks(links.filter((l) => l.id !== id));
    }
  };

  // カテゴリ追加
  const handleAddCategory = () => {
    if (!newCatInput.trim()) return;
    const newOpt: UrlCategoryOption = { id: `uc_${Date.now()}`, label: newCatInput.trim() };
    setCategories([...categories, newOpt]);
    setInputCategory(newCatInput.trim());
    setNewCatInput("");
  };

  // カテゴリ編集保存
  const handleSaveCategoryEdit = () => {
    if (!editingCat) return;
    setCategories(categories.map((c) => (c.id === editingCat.id ? editingCat : c)));
    setEditingCat(null);
  };

  // カテゴリ削除
  const handleDeleteCategory = (id: string) => {
    if (categories.length <= 1) return;
    const catToDelete = categories.find((c) => c.id === id);
    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);

    if (catToDelete && inputCategory === catToDelete.label) {
      setInputCategory(updated[0].label);
    }
    if (catToDelete && selectedCategory === catToDelete.label) {
      setSelectedCategory("ALL");
    }
  };

  const resetForm = () => {
    setInputName("");
    setInputIcon("🔗");
    setInputUrl("https://");
    setInputCategory(categories[0]?.label || "Apex Suite");
  };

  const startEdit = (item: UrlLinkItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLink(item);
  };

  const filteredLinks = selectedCategory === "ALL" ? links : links.filter((l) => l.category === selectedCategory);

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "16px", color: "#fff", fontFamily: "sans-serif", boxSizing: "border-box" }}>
      
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h3 style={{ margin: 0, color: "#C9A84C", fontSize: "18px" }}>🔗 有益ポータル ＆ サイトURLナビゲーター</h3>
          <span style={{ fontSize: "12px", color: "#888" }}>Apex Suite・学習・AI兵器へのワンタップ爆速アクセス</span>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {/* カテゴリ管理ボタン */}
          <button
            onClick={() => setIsManagingCategories(true)}
            style={{ padding: "6px 12px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
          >
            🏷️ カテゴリの管理
          </button>

          <button
            onClick={() => { resetForm(); setIsCreating(true); }}
            style={{ padding: "6px 12px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}
          >
            ＋ 新規サイトURLを追加
          </button>
        </div>
      </div>

      {/* カテゴリフィルタータブ (動的) */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
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

      {/* URLグリッドカード一覧 (クリックで爆速アクセス) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
        {filteredLinks.length === 0 && <span style={{ fontSize: "12px", color: "#666" }}>登録されているサイトURLはありません</span>}
        {filteredLinks.map((item) => (
          <div
            key={item.id}
            onClick={() => handleOpenUrl(item.url)}
            style={{
              background: "#151515",
              border: "1px solid #222",
              borderRadius: "8px",
              padding: "12px",
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
                
                {/* 編集 / 削除ボタン */}
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

              <strong style={{ fontSize: "15px", color: "#fff", display: "block", marginBottom: "4px", wordBreak: "break-word" }}>
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

      {/* 🏷️ カテゴリ管理モーダル */}
      {isManagingCategories && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "360px", maxWidth: "90vw", display: "flex", flexDirection: "column", gap: "12px", color: "#fff" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>🏷️ カテゴリ選択肢の【追加・編集・削除】</h4>

            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="新しいカテゴリ名 (例: 英語学習)..."
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                style={{ flex: 1, padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px" }}
              />
              <button onClick={handleAddCategory} style={{ padding: "8px 14px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>
                ＋追加
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
              <span style={{ fontSize: "12px", color: "#888" }}>現在のカテゴリ一覧:</span>
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

      {/* ＋ 追加 / ✏️ 編集ポップアップモーダル */}
      {(isCreating || editingLink) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "360px", maxWidth: "90vw", display: "flex", flexDirection: "column", gap: "12px", color: "#fff" }}>
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

            {/* 動的カテゴリ選択 */}
            <div>
              <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>カテゴリ:</span>
              <select
                value={isCreating ? inputCategory : editingLink?.category || categories[0]?.label || "General"}
                onChange={(e) => isCreating ? setInputCategory(e.target.value) : editingLink && setEditingLink({ ...editingLink, category: e.target.value })}
                style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px", fontWeight: "bold" }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.label}>{c.label}</option>
                ))}
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