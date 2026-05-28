"use client";

import { useState, useEffect } from "react";

const CATEGORIES = ["主菜", "副菜", "汁物"];

export default function Home() {
  const [images, setImages] = useState([]);
  const [search, setSearch] = useState("");
  const [weeklyMenu, setWeeklyMenu] = useState([]);
  const [filterCategory, setFilterCategory] = useState("すべて");
  const [selectedImage, setSelectedImage] = useState(null);

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

  const updateImage = (index, field, value) => {
    setImages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const makeWeeklyMenu = () => {
    const days = ["月", "火", "水", "木", "金", "土", "日"];
    const pick = (cat) => [...images.filter((img) => img.category === cat)].sort(() => 0.5 - Math.random());
    const main = pick("主菜");
    const side = pick("副菜");
    const soup = pick("汁物");
    setWeeklyMenu(days.map((day, i) => ({
      day,
      main: main.length > 0 ? main[i % main.length].title || "名前未設定" : "未設定",
      side: side.length > 0 ? side[i % side.length].title || "名前未設定" : "未設定",
      soup: soup.length > 0 ? soup[i % soup.length].title || "名前未設定" : "未設定",
    })));
  };

  const filtered = images.filter((img, i) => {
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
              <strong>{day}曜日：</strong>　🍖 {main}　　🥗 {side}　　🍜 {soup}
            </div>
          ))}
        </div>
      )}

      <h2>保存したレシピ候補</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 20, marginTop: 20 }}>
        {filtered.map((image, idx) => {
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

              <textarea placeholder="メモを書く" value={image.memo}
                onChange={(e) => updateImage(realIndex, "memo", e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc", minHeight: 60 }} />

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