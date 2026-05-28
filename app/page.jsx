"use client";

import { useState, useEffect } from "react";

const CATEGORIES = ["主菜", "副菜", "汁物"];

export default function Home() {
  const [images, setImages] = useState([]);
  const [search, setSearch] = useState("");
  const [weeklyMenu, setWeeklyMenu] = useState([]);
  const [filterCategory, setFilterCategory] = useState("すべて");

  useEffect(() => {
    const savedImages = localStorage.getItem("savedImages");
    if (savedImages) setImages(JSON.parse(savedImages));
  }, []);

  useEffect(() => {
    localStorage.setItem("savedImages", JSON.stringify(images));
  }, [images]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => [...prev, { url: reader.result, title: "", memo: "", tags: "", category: "主菜" }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const makeWeeklyMenu = () => {
    const days = ["月", "火", "水", "木", "金", "土", "日"];
    const pick = (cat) => {
      const pool = images.filter((img) => img.category === cat);
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      return shuffled;
    };
    const main = pick("主菜");
    const side = pick("副菜");
    const soup = pick("汁物");
    setWeeklyMenu(days.map((day, i) => ({
      day,
      main: main[i % main.length]?.title || "未設定",
      side: side[i % side.length]?.title || "未設定",
      soup: soup[i % soup.length]?.title || "未設定",
    })));
  };

  const filtered = images.filter((img) => {
    const matchSearch = img.title.includes(search) || img.memo.includes(search) || (img.tags || "").includes(search);
    const matchCat = filterCategory === "すべて" || img.category === filterCategory;
    return matchSearch && matchCat;
  });

  return (
    <div style={{ padding: 20, background: "#f5f5f5", minHeight: "100vh" }}>
      <h1 style={{ marginBottom: 20 }}>🍳 献立アプリ</h1>

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

      <button onClick={makeWeeklyMenu}
        style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "#4caf50", color: "white", cursor: "pointer", marginBottom: 20 }}>
        1週間の献立を作る
      </button>

      <input type="file" multiple onChange={handleImageChange} style={{ display: "block", marginBottom: 20 }} />

      {weeklyMenu.length > 0 && (
        <div style={{ marginBottom: 30 }}>
          <h2>📅 今週の献立</h2>
          {weeklyMenu.map(({ day, main, side, soup }) => (
            <div key={day} style={{ background: "white", padding: 12, borderRadius: 10, marginBottom: 10 }}>
              <strong>{day}曜日：</strong>
              　🍖 {main}　　🥗 {side}　　🍜 {soup}
            </div>
          ))}
        </div>
      )}

      <h2>保存したレシピ候補</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 20, marginTop: 20 }}>
        {filtered.map((image, index) => (
          <div key={index} style={{ border: "1px solid #ddd", borderRadius: 16, padding: 12, background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <img src={image.url} style={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 10 }} />

            <select value={image.category || "主菜"} onChange={(e) => {
              const updated = [...images]; updated[images.indexOf(image)].category = e.target.value; setImages(updated);
            }} style={{ width: "100%", padding: 6, borderRadius: 8, border: "1px solid #ccc", marginTop: 8, marginBottom: 4 }}>
              {CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}
            </select>

            <input type="text" placeholder="料理名" value={image.title}
              onChange={(e) => { const updated = [...images]; updated[images.indexOf(image)].title = e.target.value; setImages(updated); }}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc", marginBottom: 8 }} />

            <textarea placeholder="メモを書く" value={image.memo}
              onChange={(e) => { const updated = [...images]; updated[images.indexOf(image)].memo = e.target.value; setImages(updated); }}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc", minHeight: 60 }} />

            <input type="text" placeholder="タグ（例：鶏肉、節約）" value={image.tags || ""}
              onChange={(e) => { const updated = [...images]; updated[images.indexOf(image)].tags = e.target.value; setImages(updated); }}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc", marginTop: 8 }} />

            <button onClick={() => setImages(images.filter((_, i) => i !== images.indexOf(image)))}
              style={{ marginTop: 10, padding: "8px 12px", background: "red", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
              削除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}