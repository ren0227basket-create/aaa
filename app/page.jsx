"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://wlqrcoebopobjzhenyww.supabase.co",
  "sb_publishable_RB9FccU3HZ30b7Py-8GWrA_cB2HvQN_"
);

const CATEGORIES = ["主菜", "副菜", "汁物"];
const SEASONS = ["春", "夏", "秋", "冬"];
const CLOUD_NAME = "dix5womo0";
const UPLOAD_PRESET = "jmxpadhf";

function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return "春";
  if (month >= 6 && month <= 8) return "夏";
  if (month >= 9 && month <= 11) return "秋";
  return "冬";
}

const theme = {
  bg: "#EFECE7", surface: "#E0DDD8", card: "#FFFFFF",
  primary: "#5C5248", text: "#2C2820", muted: "#8C8480",
  accent: "#A0896F", danger: "#B05A4A",
};

export default function Home() {
  const [images, setImages] = useState([]);
  const [search, setSearch] = useState("");
  const [weeklyMenu, setWeeklyMenu] = useState([]);
  const [filterCategory, setFilterCategory] = useState("すべて");
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [shoppingList, setShoppingList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("recipes").select("*").order("created_at", { ascending: false });
    if (!error) setImages(data);
    setLoading(false);
  };

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST", body: formData,
      });
      const data = await res.json();
      const { data: inserted } = await supabase.from("recipes").insert({
        url: data.secure_url, title: "", memo: "", tags: "", category: "主菜", ingredients: "", seasons: [],
      }).select().single();
      if (inserted) setImages((prev) => [inserted, ...prev]);
    }
    setUploading(false);
  };

  const updateImage = async (id, field, value) => {
    setImages((prev) => prev.map((img) => img.id === id ? { ...img, [field]: value } : img));
    await supabase.from("recipes").update({ [field]: value }).eq("id", id);
  };

  const toggleSeason = async (id, season) => {
    const img = images.find((i) => i.id === id);
    const seasons = img.seasons || [];
    const newSeasons = seasons.includes(season) ? seasons.filter((s) => s !== season) : [...seasons, season];
    setImages((prev) => prev.map((i) => i.id === id ? { ...i, seasons: newSeasons } : i));
    await supabase.from("recipes").update({ seasons: newSeasons }).eq("id", id);
  };

  const deleteImage = async (id) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    await supabase.from("recipes").delete().eq("id", id);
  };

  const makeWeeklyMenu = () => {
    const currentSeason = getCurrentSeason();
    const days = ["月", "火", "水", "木", "金", "土", "日"];
    setShoppingList([]);
    const pick = (cat) => {
      const all = images.filter((img) => img.category === cat);
      const seasonal = all.filter((img) => (img.seasons || []).includes(currentSeason));
      return [...(seasonal.length > 0 ? seasonal : all)].sort(() => 0.5 - Math.random());
    };
    const main = pick("主菜"), side = pick("副菜"), soup = pick("汁物");
    setWeeklyMenu(days.map((day, i) => ({
      day,
      main: main.length > 0 ? main[i % main.length] : null,
      side: side.length > 0 ? side[i % side.length] : null,
      soup: soup.length > 0 ? soup[i % soup.length] : null,
    })));
  };

  const makeShoppingList = () => {
    const allIngredients = [];
    weeklyMenu.forEach(({ main, side, soup }) => {
      [main, side, soup].forEach((dish) => {
        if (dish?.ingredients) {
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
    const matchSearch = img.title.includes(search) || img.memo.includes(search) || (img.tags || "").includes(search);
    const matchCat = filterCategory === "すべて" || img.category === filterCategory;
    return matchSearch && matchCat;
  });

  const currentSeason = getCurrentSeason();

  return (
    <div style={{ background: theme.bg, minHeight: "100vh", fontFamily: "'Zen Kaku Gothic New', 'Hiragino Sans', sans-serif" }}>
      <div style={{ background: theme.bg, padding: "24px 20px 16px", borderBottom: `1px solid ${theme.surface}` }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{ width: 40, height: 40, background: theme.primary, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🍳</div>
            <div>
              <div style={{ fontSize: 20, color: theme.text, fontWeight: 500 }}>献立アプリ</div>
              <div style={{ fontSize: 11, color: theme.muted }}>旬の食材で、毎日の食卓を</div>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 12, color: theme.accent, background: theme.surface, padding: "4px 12px", borderRadius: 20 }}>今は{currentSeason} 🌿</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 16px" }}>
        <input type="text" placeholder="レシピを検索..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "10px 16px", borderRadius: 24, border: `1px solid ${theme.surface}`, background: theme.card, fontSize: 14, color: theme.text, marginBottom: 16, boxSizing: "border-box", outline: "none" }} />

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {["すべて", ...CATEGORIES].map((cat) => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              style={{ padding: "6px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit",
                background: filterCategory === cat ? theme.primary : theme.surface,
                color: filterCategory === cat ? theme.bg : theme.primary }}>
              {cat}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          <button onClick={makeWeeklyMenu}
            style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: theme.primary, color: theme.bg, cursor: "pointer", fontSize: 14, fontFamily: "inherit", fontWeight: 500 }}>
            🌿 旬の献立を作る
          </button>
          {weeklyMenu.length > 0 && (
            <button onClick={makeShoppingList}
              style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: theme.accent, color: "white", cursor: "pointer", fontSize: 14, fontFamily: "inherit", fontWeight: 500 }}>
              🛒 買い物リスト
            </button>
          )}
          <label style={{ padding: "10px 20px", borderRadius: 8, background: theme.surface, color: theme.primary, cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
            {uploading ? "アップロード中..." : "📷 画像を追加"}
            <input type="file" multiple onChange={handleImageChange} style={{ display: "none" }} accept="image/*" />
          </label>
        </div>

        {weeklyMenu.length > 0 && (
          <div style={{ background: theme.card, borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: theme.muted, marginBottom: 12 }}>📅 今週の献立</div>
            {weeklyMenu.map(({ day, main, side, soup }) => (
              <div key={day} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: `0.5px solid ${theme.surface}` }}>
                <span style={{ width: 40, fontSize: 13, color: theme.muted, flexShrink: 0 }}>{day}曜</span>
                <span style={{ fontSize: 13, color: theme.text }}>🍖 {main?.title || "未設定"}　🥗 {side?.title || "未設定"}　🍜 {soup?.title || "未設定"}</span>
              </div>
            ))}
          </div>
        )}

        {shoppingList.length > 0 && (
          <div style={{ background: theme.card, borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: theme.muted, marginBottom: 12 }}>🛒 買い物リスト</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
              {shoppingList.map(({ name, count }) => (
                <div key={name} style={{ background: theme.bg, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: theme.text, display: "flex", justifyContent: "space-between" }}>
                  <span>{name}</span>
                  {count > 1 && <span style={{ color: theme.accent }}>×{count}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontSize: 13, color: theme.muted, marginBottom: 12 }}>
          {loading ? "読み込み中..." : `保存したレシピ (${filtered.length}件)`}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
          {filtered.map((image) => (
            <div key={image.id} style={{ background: theme.card, borderRadius: 12, overflow: "hidden" }}>
              <img src={image.url} onClick={() => setSelectedImage(image.url)}
                style={{ width: "100%", height: 200, objectFit: "cover", cursor: "pointer", display: "block" }} />
              <div style={{ padding: 12 }}>
                <select value={image.category || "主菜"} onChange={(e) => updateImage(image.id, "category", e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${theme.surface}`, background: theme.bg, color: theme.primary, fontSize: 12, marginBottom: 8, fontFamily: "inherit" }}>
                  {CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}
                </select>

                <input type="text" placeholder="料理名" value={image.title}
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

                <textarea placeholder="メモ" value={image.memo}
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
      </div>

      {selectedImage && (
        <div onClick={() => setSelectedImage(null)}
          style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, cursor: "pointer" }}>
          <img src={selectedImage} style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }} />
        </div>
      )}
    </div>
  );
}