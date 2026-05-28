"use client";

import { useState, useEffect } from "react";

const CATEGORIES = ["主菜", "副菜", "汁物"];
const CLOUD_NAME = "dix5womo0";
const UPLOAD_PRESET = "jmxpadhf";

export default function Home() {
  const [images, setImages] = useState([]);
  const [search, setSearch] = useState("");
  const [weeklyMenu, setWeeklyMenu] = useState([]);
  const [filterCategory, setFilterCategory] = useState("すべて");
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [shoppingList, setShoppingList] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

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
      setImages((prev) => [...prev, { url: data.secure_url, title: "", memo: "", tags: "", category: "主菜", ingredients: "" }]);
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

  const makeWeeklyMenu = async () => {
    setAiLoading(true);
    setShoppingList([]);

    const month = new Date().getMonth() + 1;
    const season = month >= 3 && month <= 5 ? "春" : month >= 6 && month <= 8 ? "夏" : month >= 9 && month <= 11 ? "秋" : "冬";

    const recipeList = images.map((img, i) => ({
      id: i,
      title: img.title || "名前未設定",
      category: img.category,
      tags: img.tags || "",
      ingredients: img.ingredients || "",
    }));

    const prompt = `今は${season}です。以下のレシピリストから、旬の食材を使っているものを優先して1週間分（7日）の献立を選んでください。

レシピリスト:
${JSON.stringify(recipeList, null, 2)}

条件:
- 毎日「主菜」「副菜」「汁物」を1つずつ選ぶ
- 旬の食材（${season}らしい野菜や食材）を含むレシピを優先する
- 同じ料理が連続しないようにする
- 該当カテゴリのレシピがない場合はnullにする

以下のJSON形式のみで返してください（説明不要）:
[
  {"day":"月","mainId":0,"sideId":1,"soupId":2},
  ...
]`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content[0].text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);

      setWeeklyMenu(parsed.map(({ day, mainId, sideId, soupId }) => ({
        day,
        main: mainId !== null && images[mainId] ? images[mainId] : null,
        side: sideId !== null && images[sideId] ? images[sideId] : null,
        soup: soupId !== null && images[soupId] ? images[soupId] : null,
      })));
    } catch (e) {
      // AIが失敗したらランダムにフォールバック
      const days = ["月", "火", "水", "木", "金", "土", "日"];
      const pick = (cat) => [...images.filter((img) => img.category === cat)].sort(() => 0.5 - Math.random());
      const main = pick("主菜");
      const side = pick("副菜");
      const soup = pick("汁物");
      setWeeklyMenu(days.map((day, i) => ({
        day,
        main: main.length > 0 ? main[i % main.length] : null,
        side: side.length > 0 ? side[i % side.length] : null,
        soup: soup.length > 0 ? soup[i % soup.length] : null,
      })));
    }
    setAiLoading(false);
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

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={makeWeeklyMenu} disabled={aiLoading}
          style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: aiLoading ? "#aaa" : "#4caf50", color: "white", cursor: aiLoading ? "not-allowed" : "pointer" }}>
          {aiLoading ? "🤖 AI考え中..." : "✨ AI献立を作る"}
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