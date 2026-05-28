"use client";

import { useState, useEffect } from "react";

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

export default function Home() {
  const [images, setImages] = useState([]);
  const [search, setSearch] = useState("");
  const [weeklyMenu, setWeeklyMenu] = useState([]);
  const [filterCategory, setFilterCategory] = useState("すべて");
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [shoppingList, setShoppingList] = useState([]);

  useEffect(() => {
    const savedImages = localStorage.getItem("savedImages");
    if (savedImages) setImages(JSON.parse(savedImages));
  }, []);

  useEffect(() => {
    localStorage.setItem("savedImages", JSON.stringify(images));
  }, [images]);

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setImages((prev) => [...prev, { url: data.secure_url, title: "", memo: "", tags: "", category: "主菜", ingredients: "", seasons: [] }]);
    }
    setUploading(false);
  };

  const updateImage = (index, field, value) => {
    setImages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const toggleSeason = (index, season) => {
    setImages((prev) => {
      const updated = [...prev];
      const seasons = updated[index].seasons || [];
      updated[index] = {
        ...updated[index],
        seasons: seasons.includes(season) ? seasons.filter((s) => s !== season) : [...seasons, season],
      };
      return updated;
    });
  };

  const makeWeeklyMenu = () => {
    const currentSeason = getCurrentSeason();
    const days = ["月", "火", "水", "木", "金", "土", "日"];
    setShoppingList([]);

    const pick = (cat) => {
      const all = images.filter((img) => img.category === cat);
      const seasonal = all.filter((img) => (img.seasons || []).includes(currentSeason));
      const pool = seasonal.length > 0 ? seasonal : all;
      return [...pool].sort(() => 0.5 - Math.random());
    };

    const main = pick("主菜");
    const side = pick("副菜");
    const soup = pick("汁物");

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
        if (dish && dish.ingredients) {
          dish.ingredients.split(/[、,，\n]/).forEach((item) => {
            const trimmed = item.trim();
            if (trimmed) allIngredients.push(trimmed);
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
    <div style={{ padding: 20, background: "#f5f5f5", minHeight: "100vh" }}>
      <h1 style={{ marginBottom: 4 }}>🍳 献立アプリ</h1>
      <p style={{ color: "#888", marginBottom: 20, fontSize: 14 }}>今は{currentSeason}🌿 旬のレシピを優先して献立を作ります</p>

      <input type="text" placeholder="検索..." value={search} onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12, borderRadius: 10, border: "1px solid #ccc", fontSize: 16 }} />

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["すべて", ...CATEGORIES].map((cat) => (
          <button key={cat} onClick={() => setFilterCategory(cat)}
            style={{ padding: "8px 16px", borderRadius: 20, border: "none", cursor: "pointer",
              background: filterCategory === cat ? "#4caf50" : "#ddd", color: filterCategory === cat ? "white" : "#333" }}>
            {cat}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={makeWeeklyMenu}
          style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "#4caf50", color: "white", cursor: "pointer" }}>
          🌿 旬の献立を作る
        </button>
        {weeklyMenu.length > 0 && (
          <button onClick={makeShoppingList}
            style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "#ff9800", color: "white", cursor: "pointer" }}>
            🛒 買い物リストを作る
          </button>
        )}
        <label style={{ padding: "10px 16px", borderRadius: 10, background: "#2196f3", color: "white", cursor: "pointer" }}>
          {uploading ? "アップロード中..." : "📷 画像を追加"}
          <input type="file" multiple onChange={handleImageChange} style={{ display: "none" }} accept="image/*" />
        </label>
      </div>

      {weeklyMenu.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h2>📅 今週の献立</h2>
          {weeklyMenu.map(({ day, main, side, soup }) => (
            <div key={day} style={{ background: "white", padding: 12, borderRadius: 10, marginBottom: 10 }}>
              <strong>{day}曜日：</strong>　🍖 {main?.title || "未設定"}　　🥗 {side?.title || "未設定"}　　🍜 {soup?.title || "未設定"}
            </div>
          ))}
        </div>
      )}

      {shoppingList.length > 0 && (
        <div style={{ marginBottom: 30, background: "white", padding: 16, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <h2>🛒 買い物リスト</h2>
          {shoppingList.map(({ name, count }) => (
            <div key={name} style={{ padding: "6px 0", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
              <span>{name}</span>
              {count > 1 && <span style={{ color: "#888", fontSize: 13 }}>×{count}</span>}
            </div>
          ))}
        </div>
      )}

      <h2>保存したレシピ候補</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 20, marginTop: 20 }}>
        {filtered.map((image) => {
          const realIndex = images.indexOf(image);
          return (
            <div key={realIndex} style={{ border: "1px solid #ddd", borderRadius: 16, padding: 12, background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <img src={image.url} onClick={() => setSelectedImage(image.url)}
                style={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 10, cursor: "pointer" }} />

              <select value={image.category || "主菜"} onChange={(e) => updateImage(realIndex, "category", e.target.value)}
                style={{ width: "100%", padding: 6, borderRadius: 8, border: "1px solid #ccc", marginTop: 8, marginBottom: 4 }}>
                {CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}
              </select>

              <input type="text" placeholder="料理名" value={image.title}
                onChange={(e) => updateImage(realIndex, "title", e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc", marginBottom: 8 }} />

              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px" }}>旬の季節：</p>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {SEASONS.map((season) => (
                    <button key={season} onClick={() => toggleSeason(realIndex, season)}
                      style={{ padding: "4px 10px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12,
                        background: (image.seasons || []).includes(season) ? "#4caf50" : "#eee",
                        color: (image.seasons || []).includes(season) ? "white" : "#555" }}>
                      {season}
                    </button>
                  ))}
                </div>
              </div>

              <textarea placeholder="食材（例：鶏肉200g、玉ねぎ1個）" value={image.ingredients || ""}
                onChange={(e) => updateImage(realIndex, "ingredients", e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc", minHeight: 60 }} />

              <textarea placeholder="メモを書く" value={image.memo}
                onChange={(e) => updateImage(realIndex, "memo", e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc", minHeight: 60, marginTop: 8 }} />

              <input type="text" placeholder="タグ（例：鶏肉、節約）" value={image.tags || ""}
                onChange={(e) => updateImage(realIndex, "tags", e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc", marginTop: 8 }} />

              <button onClick={() => setImages(images.filter((_, i) => i !== realIndex))}
                style={{ marginTop: 10, padding: "8px 12px", background: "red", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
                削除
              </button>
            </div>
          );
        })}
      </div>

      {selectedImage && (
        <div onClick={() => setSelectedImage(null)}
          style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, cursor: "pointer" }}>
          <img src={selectedImage} style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }} />
        </div>
      )}
    </div>
  );
}