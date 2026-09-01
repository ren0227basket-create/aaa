"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wlqrcoebopobjzhenyww.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_RB9FccU3HZ30b7Py-8GWrA_cB2HvQN_";
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""; 
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dix5womo0";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "jmxpadhf";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CATEGORIES = ["主菜", "副菜", "汁物", "その他"];
const SEASONS = ["春", "夏", "秋", "冬"];

function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return "春";
  if (month >= 6 && month <= 8) return "夏";
  if (month >= 9 && month <= 11) return "秋";
  return "冬";
}

function shuffleArray(array) {
  const clone = [...array];
  for (let i = clone.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

const theme = {
  bg: "#EFECE7", surface: "#E0DDD8", card: "#FFFFFF",
  primary: "#5C5248", text: "#2C2820", muted: "#8C8480",
  accent: "#A0896F", danger: "#B05A4A", favorite: "#FFB020",
};

export default function Home() {
  const [images, setImages] = useState([]);
  const [search, setSearch] = useState("");
  const [weeklyMenu, setWeeklyMenu] = useState([]);
  const [checkedDishes, setCheckedDishes] = useState({});
  const [filterCategory, setFilterCategory] = useState("すべて"); // "お気に入り" も入る
  const [uploading, setUploading] = useState(false);
  const [shoppingList, setShoppingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingImage, setEditingImage] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const openLightbox = (url) => {
    setLightboxImage(url);
  };

  const closeModals = () => {
    if (editingImage) setEditingImage(null);
    if (lightboxImage) setLightboxImage(null);
  };

  useEffect(() => {
    fetchRecipes();
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);



  const fetchRecipes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("recipes").select("*").order("created_at", { ascending: false });
    if (!error && data) setImages(data);
    setLoading(false);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setUploading(true);

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const data = await res.json();

        let title = "";
        if (GEMINI_API_KEY) {
          try {
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result;
                if (typeof result === "string") {
                  resolve(result.split(",")[1]);
                } else {
                  reject(new Error("ファイルを読み込めませんでした"));
                }
              };
              reader.onerror = () => reject(new Error("ファイル読み込みエラー"));
              reader.readAsDataURL(file);
            });
            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { text: "この料理の名前を日本語で答えてください。料理名だけを短く答えてください。料理じゃない場合は空文字を返してください。" },
                    { inline_data: { mime_type: file.type, data: base64 } }
                  ]
                }]
              }),
            });
            const geminiData = await geminiRes.json();
            title = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
          } catch (err) {
            console.error("Gemini error:", err);
          }
        }

        const { data: inserted } = await supabase.from("recipes").insert({
          url: data.secure_url, title, memo: "", tags: "", category: "主菜", ingredients: "", seasons: [], is_favorite: false
        }).select().single();
        
        if (inserted) setImages((prev) => [inserted, ...prev]);
      } catch (err) {
        console.error("Upload error:", err);
      }
    }
    setUploading(false);
  };

  const updateImage = async (id, field, value) => {
    setImages((prev) => prev.map((img) => img.id === id ? { ...img, [field]: value } : img));
    setEditingImage((prev) => prev && prev.id === id ? { ...prev, [field]: value } : prev);
    await supabase.from("recipes").update({ [field]: value }).eq("id", id);
  };

  const toggleFavorite = async (e, id) => {
    e.stopPropagation(); // 親要素のクリックイベント（モーダル展開など）を防止
    const img = images.find((i) => i.id === id);
    if (!img) return;
    const nextValue = !img.is_favorite;

    setImages((prev) => prev.map((i) => i.id === id ? { ...i, is_favorite: nextValue } : i));
    setEditingImage((prev) => prev && prev.id === id ? { ...prev, is_favorite: nextValue } : prev);
    await supabase.from("recipes").update({ is_favorite: nextValue }).eq("id", id);
  };

  const toggleSeason = async (id, season) => {
    const img = images.find((i) => i.id === id);
    if (!img) return;
    const seasons = img.seasons || [];
    const newSeasons = seasons.includes(season) ? seasons.filter((s) => s !== season) : [...seasons, season];
    
    setImages((prev) => prev.map((i) => i.id === id ? { ...i, seasons: newSeasons } : i));
    setEditingImage((prev) => prev && prev.id === id ? { ...prev, seasons: newSeasons } : prev);
    await supabase.from("recipes").update({ seasons: newSeasons }).eq("id", id);
  };

  const deleteImage = async (id) => {
    if (!confirm("削除しますか？")) return;
    setImages((prev) => prev.filter((img) => img.id !== id));
    if (editingImage?.id === id) setEditingImage(null);
    await supabase.from("recipes").delete().eq("id", id);
  };

  const makeWeeklyMenu = () => {
    const currentSeason = getCurrentSeason();
    const days = ["月", "火", "水", "木", "金", "土", "日"];
    setShoppingList([]);
    setCheckedDishes({});

    const pick = (cat) => {
      const all = images.filter((img) => img.category === cat);
      const seasonal = all.filter((img) => (img.seasons || []).includes(currentSeason));
      return shuffleArray(seasonal.length > 0 ? seasonal : all);
    };

    const main = pick("主菜"), side = pick("副菜"), soup = pick("汁物");
    setWeeklyMenu(days.map((day, i) => ({
      day,
      main: main.length > 0 ? main[i % main.length] : null,
      side: side.length > 0 ? side[i % side.length] : null,
      soup: soup.length > 0 ? soup[i % soup.length] : null,
    })));
  };

  const toggleDishCheck = (key) => {
    setCheckedDishes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const makeShoppingList = () => {
    const allIngredients = [];
    weeklyMenu.forEach(({ day, main, side, soup }) => {
      [
        { dish: main, key: `${day}-main` },
        { dish: side, key: `${day}-side` },
        { dish: soup, key: `${day}-soup` },
      ].forEach(({ dish, key }) => {
        if (dish?.ingredients && checkedDishes[key]) {
          dish.ingredients.split(/[、,，\n]/).forEach((item) => {
            const t = item.trim();
            if (t) allIngredients.push(t);
          });
        }
      });
    });
    const counts = {};
    allIngredients.forEach((item) => { counts[item] = (counts[item] || 0) + 1; });
    setShoppingList(Object.entries(counts).map(([name, count]) => ({ name, count })));
  };

  const filtered = images.filter((img) => {
    const matchSearch = (img.title || "").includes(search) || (img.memo || "").includes(search) || (img.tags || "").includes(search);
    
    if (filterCategory === "⭐ お気に入り" || filterCategory === "お気に入り") {
      return matchSearch && img.is_favorite;
    }
    const matchCat = filterCategory === "すべて" || img.category === filterCategory;
    return matchSearch && matchCat;
  });

  const favoriteRecipes = [...images].filter((img) => img.is_favorite).sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  const currentSeason = getCurrentSeason();
  const checkedCount = Object.values(checkedDishes).filter(Boolean).length;

  return (
    <div style={{ background: theme.bg, minHeight: "100vh", fontFamily: "'Zen Kaku Gothic New', 'Hiragino Sans', sans-serif" }}>

      {/* ヘッダー */}
      <div style={{ background: theme.bg, padding: isMobile ? "16px 16px 10px" : "24px 20px 16px", borderBottom: `1px solid ${theme.surface}`, position: isMobile ? "sticky" : "static", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, background: theme.primary, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🍳</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: isMobile ? 17 : 20, color: theme.text, fontWeight: 500 }}>献立アプリ</div>
              {!isMobile && <div style={{ fontSize: 11, color: theme.muted }}>旬の食材で、毎日の食卓を</div>}
            </div>
            <span style={{ fontSize: 11, color: theme.accent, background: theme.surface, padding: "3px 10px", borderRadius: 20 }}>今は{currentSeason} 🌿</span>
            <label style={{ padding: isMobile ? "6px 12px" : "8px 16px", borderRadius: 8, background: theme.primary, color: theme.bg, cursor: "pointer", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>
              {uploading ? "追加中..." : "+ 追加"}
              <input type="file" multiple onChange={handleImageChange} style={{ display: "none" }} accept="image/*" />
            </label>
          </div>
          <input type="text" placeholder="レシピを検索..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "8px 14px", borderRadius: 20, border: `1px solid ${theme.surface}`, background: theme.card, fontSize: 13, color: theme.text, boxSizing: "border-box", outline: "none" }} />
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "10px 12px" : "16px 16px" }}>

        {/* カテゴリフィルター（お気に入りを追加） */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
          {[
            { label: "すべて", value: "すべて" },
            { label: "⭐ お気に入り", value: "お気に入り" },
            ...CATEGORIES.map((cat) => ({ label: cat, value: cat }))
          ].map((item) => (
            <button key={item.value} onClick={() => setFilterCategory(item.value)}
              style={{ padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontFamily: "inherit", whiteSpace: "nowrap",
                background: filterCategory === item.value ? theme.primary : theme.surface,
                color: filterCategory === item.value ? theme.bg : theme.primary }}>
              {item.label}
            </button>
          ))}
        </div>

        {/* アクションボタン */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button onClick={makeWeeklyMenu}
            style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: theme.primary, color: theme.bg, cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 500 }}>
            🌿 献立を作る
          </button>
          {weeklyMenu.length > 0 && (
            <button onClick={makeShoppingList} disabled={checkedCount === 0}
              style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: checkedCount > 0 ? theme.accent : theme.surface, color: checkedCount > 0 ? "white" : theme.muted, cursor: checkedCount > 0 ? "pointer" : "not-allowed", fontSize: 13, fontFamily: "inherit", fontWeight: 500 }}>
              🛒 買い物リスト{checkedCount > 0 ? `（${checkedCount}品）` : ""}
            </button>
          )}
        </div>

        {favoriteRecipes.length > 0 && (
          <div style={{ background: theme.card, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: theme.muted }}>⭐ お気に入り一覧</div>
              <button onClick={() => setFilterCategory("お気に入り")}
                style={{ border: "none", background: theme.bg, color: theme.primary, borderRadius: 999, padding: "4px 8px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                すべて表示
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {favoriteRecipes.map((recipe) => (
                <button key={recipe.id} onClick={() => setEditingImage(recipe)}
                  style={{ border: "none", background: theme.bg, borderRadius: 999, padding: "6px 10px", fontSize: 12, color: theme.primary, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                  <span style={{ color: theme.favorite }}>★</span>
                  <span>{recipe.title || "名前未設定"}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 今週の献立 */}
        {weeklyMenu.length > 0 && (
          <div style={{ background: theme.card, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: theme.muted, marginBottom: 6 }}>📅 今週の献立 — 買う料理にチェック✓</div>
            {weeklyMenu.map(({ day, main, side, soup }) => (
              <div key={day} style={{ padding: "8px 0", borderBottom: `0.5px solid ${theme.surface}` }}>
                <span style={{ fontSize: 12, color: theme.muted, marginRight: 8 }}>{day}曜</span>
                <span style={{ fontSize: 12, display: "inline-flex", gap: 10, flexWrap: "wrap" }}>
                  {[
                    { icon: "🍖", dish: main, key: `${day}-main` },
                    { icon: "🥗", dish: side, key: `${day}-side` },
                    { icon: "🍜", dish: soup, key: `${day}-soup` },
                  ].map(({ icon, dish, key }) => dish ? (
                    <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <input type="checkbox" checked={!!checkedDishes[key]} onChange={() => toggleDishCheck(key)}
                        style={{ cursor: "pointer", accentColor: theme.primary }} />
                      <span onClick={() => setEditingImage(dish)}
                        style={{ cursor: "pointer", color: theme.primary, textDecoration: "underline", textDecorationColor: theme.surface }}>
                        {icon} {dish.title || "名前未設定"}
                      </span>
                    </span>
                  ) : (
                    <span key={key} style={{ color: theme.muted }}>{icon} 未設定</span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 買い物リスト */}
        {shoppingList.length > 0 && (
          <div style={{ background: theme.card, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: theme.muted, marginBottom: 10 }}>🛒 買い物リスト</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 6 }}>
              {shoppingList.map(({ name, count }) => (
                <div key={name} style={{ background: theme.bg, borderRadius: 8, padding: "6px 10px", fontSize: 12, color: theme.text, display: "flex", justifyContent: "space-between" }}>
                  <span>{name}</span>
                  {count > 1 && <span style={{ color: theme.accent }}>×{count}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontSize: 12, color: theme.muted, marginBottom: 10 }}>
          {loading ? "読み込み中..." : `${filtered.length}件のレシピ`}
        </div>

        {/* 一覧セクション */}
        {isMobile ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
            {filtered.map((image) => (
              <div key={image.id} style={{ position: "relative", aspectRatio: "1", overflow: "hidden", cursor: "pointer" }}
                onClick={() => setEditingImage(image)}>
                <img src={image.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={image.title} />
                
                {/* スマホお気に入りボタン */}
                <button onClick={(e) => toggleFavorite(e, image.id)}
                  style={{ position: "absolute", top: 4, left: 4, background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: image.is_favorite ? theme.favorite : "#ccc", cursor: "pointer" }}>
                  {image.is_favorite ? "★" : "☆"}
                </button>

                {image.title && (
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.6))", padding: "16px 5px 4px" }}>
                    <div style={{ fontSize: 10, color: "white", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{image.title}</div>
                  </div>
                )}
                {(image.seasons || []).length > 0 && (
                  <div style={{ position: "absolute", top: 3, right: 3, background: "rgba(0,0,0,0.5)", borderRadius: 8, padding: "1px 5px", fontSize: 9, color: "white" }}>
                    {image.seasons.join("・")}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
            {filtered.map((image) => (
              <div key={image.id} style={{ background: theme.card, borderRadius: 12, overflow: "hidden", position: "relative" }}>
                <img src={image.url} onClick={() => setEditingImage(image)} alt={image.title}
                  style={{ width: "100%", height: 200, objectFit: "cover", cursor: "pointer", display: "block" }} />
                
                {/* PC版お気に入りボタン */}
                <button onClick={(e) => toggleFavorite(e, image.id)}
                  style={{ position: "absolute", top: 8, left: 8, background: "rgba(255,255,255,0.85)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: image.is_favorite ? theme.favorite : theme.muted, cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                  {image.is_favorite ? "★" : "☆"}
                </button>

                <div style={{ padding: 12 }}>
                  <select value={image.category || "主菜"} onChange={(e) => updateImage(image.id, "category", e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${theme.surface}`, background: theme.bg, color: theme.primary, fontSize: 12, marginBottom: 8, fontFamily: "inherit" }}>
                    {CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}
                  </select>
                  <input type="text" placeholder="料理名" value={image.title || ""}
                    onChange={(e) => updateImage(image.id, "title", e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${theme.surface}`, fontSize: 13, color: theme.text, marginBottom: 8, boxSizing: "border-box", fontFamily: "inherit", background: "white" }} />
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: theme.muted, marginBottom: 4 }}>旬の季節</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {SEASONS.map((season) => (
                        <button key={season} onClick={() => toggleSeason(image.id, season)}
                          style={{ padding: "3px 8px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, fontFamily: "inherit",
                            background: (image.seasons || []).includes(season) ? theme.primary : theme.surface,
                            color: (image.seasons || []).includes(season) ? "white" : theme.muted }}>
                          {season}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea placeholder="食材（例：鶏肉200g、玉ねぎ1個）" value={image.ingredients || ""}
                    onChange={(e) => updateImage(image.id, "ingredients", e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${theme.surface}`, fontSize: 12, color: theme.text, minHeight: 56, marginBottom: 8, boxSizing: "border-box", fontFamily: "inherit", resize: "none", background: "white" }} />
                  <textarea placeholder="メモ" value={image.memo || ""}
                    onChange={(e) => updateImage(image.id, "memo", e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${theme.surface}`, fontSize: 12, color: theme.text, minHeight: 48, marginBottom: 8, boxSizing: "border-box", fontFamily: "inherit", resize: "none", background: "white" }} />
                  <input type="text" placeholder="タグ（例：鶏肉、節約）" value={image.tags || ""}
                    onChange={(e) => updateImage(image.id, "tags", e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: `1px solid ${theme.surface}`, fontSize: 12, color: theme.text, marginBottom: 10, boxSizing: "border-box", fontFamily: "inherit", background: "white" }} />
                  <button onClick={() => deleteImage(image.id)}
                    style={{ width: "100%", padding: "7px", background: "transparent", color: theme.danger, border: `1px solid ${theme.danger}`, borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* モーダル */}
      {editingImage && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModals(); }}>
          <div style={{ background: theme.bg, width: isMobile ? "100%" : "480px", borderRadius: isMobile ? "16px 16px 0 0" : "16px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ position: "relative" }}>
              <img src={editingImage.url} onClick={() => openLightbox(editingImage.url)} alt={editingImage.title}
                style={{ width: "100%", height: 240, objectFit: "cover", borderRadius: isMobile ? "16px 16px 0 0" : "16px 16px 0 0", cursor: "zoom-in", display: "block" }} />
              
              {/* モーダル内お気に入りボタン */}
              <button onClick={(e) => toggleFavorite(e, editingImage.id)}
                style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.5)", border: "none", color: editingImage.is_favorite ? theme.favorite : "white", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {editingImage.is_favorite ? "★" : "☆"}
              </button>

              <button onClick={closeModals}
                style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.5)", border: "none", color: "white", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <div style={{ padding: 16 }}>
              <select value={editingImage.category || "主菜"} onChange={(e) => updateImage(editingImage.id, "category", e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${theme.surface}`, background: theme.card, color: theme.primary, fontSize: 13, marginBottom: 10, fontFamily: "inherit" }}>
                {CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}
              </select>
              <input type="text" placeholder="料理名" value={editingImage.title || ""}
                onChange={(e) => updateImage(editingImage.id, "title", e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${theme.surface}`, fontSize: 14, color: theme.text, marginBottom: 10, boxSizing: "border-box", fontFamily: "inherit", background: theme.card }} />
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: theme.muted, marginBottom: 6 }}>旬の季節</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {SEASONS.map((season) => (
                    <button key={season} onClick={() => toggleSeason(editingImage.id, season)}
                      style={{ flex: 1, padding: "6px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit",
                        background: (editingImage.seasons || []).includes(season) ? theme.primary : theme.surface,
                        color: (editingImage.seasons || []).includes(season) ? "white" : theme.muted }}>
                      {season}
                    </button>
                  ))}
                </div>
              </div>
              <textarea placeholder="食材（例：鶏肉200g、玉ねぎ1個）" value={editingImage.ingredients || ""}
                onChange={(e) => updateImage(editingImage.id, "ingredients", e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${theme.surface}`, fontSize: 13, color: theme.text, minHeight: 70, marginBottom: 10, boxSizing: "border-box", fontFamily: "inherit", resize: "none", background: theme.card }} />
              <textarea placeholder="メモ" value={editingImage.memo || ""}
                onChange={(e) => updateImage(editingImage.id, "memo", e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${theme.surface}`, fontSize: 13, color: theme.text, minHeight: 60, marginBottom: 10, boxSizing: "border-box", fontFamily: "inherit", resize: "none", background: theme.card }} />
              <input type="text" placeholder="タグ（例：鶏肉、節約）" value={editingImage.tags || ""}
                onChange={(e) => updateImage(editingImage.id, "tags", e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${theme.surface}`, fontSize: 13, color: theme.text, marginBottom: 14, boxSizing: "border-box", fontFamily: "inherit", background: theme.card }} />
              <button onClick={() => deleteImage(editingImage.id)}
                style={{ width: "100%", padding: "10px", background: "transparent", color: theme.danger, border: `1px solid ${theme.danger}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ライトボックス */}
      {lightboxImage && (
        <div onClick={closeModals}
          style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, cursor: "pointer" }}>
          <img src={lightboxImage} style={{ maxWidth: "100vw", maxHeight: "100vh", objectFit: "contain" }} alt="拡大ライトボックス" />
        </div>
      )}
    </div>
  );
}
