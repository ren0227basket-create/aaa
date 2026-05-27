"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [images, setImages] = useState([]);
const [search, setSearch] = useState("");
const [weeklyMenu, setWeeklyMenu] = useState([]);
  useEffect(() => {
    // Load saved images from localStorage on component mount
    const savedImages = localStorage.getItem("savedImages");
    if (savedImages) {
      setImages(JSON.parse(savedImages));
    }
  }, []);

  useEffect(() => {
    // Save images to localStorage whenever images change
    localStorage.setItem("savedImages", JSON.stringify(images));
  }, [images]);

const handleImageChange = (e) => {
  const files = Array.from(e.target.files);

  files.forEach((file) => {
    const reader = new FileReader();

    reader.onload = () => {
     const newImage = {
  url: reader.result,
  title: "",
  memo: "",
  tags: "",
      };

      setImages((prev) => [...prev, newImage]);
    };

    reader.readAsDataURL(file);
  });
};

  return (
 <div
  style={{
    padding: 20,
    background: "#f5f5f5",
    minHeight: "100vh",
  }}
>
  <h1 style={{ marginBottom: 20 }}>
    🍳 献立アプリ
  </h1>
  <input
  type="text"
  placeholder="検索..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  style={{
    width: "100%",
    padding: 10,
    marginBottom: 20,
    borderRadius: 10,
    border: "1px solid #ccc",
    fontSize: 16,
  }}
/>
<button
  onClick={() => {
    const shuffled = [...images].sort(
      () => 0.5 - Math.random()
    );

    setWeeklyMenu(shuffled.slice(0, 7));
  }}
  style={{
    padding: "10px 16px",
    borderRadius: 10,
    border: "none",
    background: "#4caf50",
    color: "white",
    cursor: "pointer",
    marginBottom: 20,
  }}
>
  1週間の献立を作る
</button>

      <input
        type="file"
        multiple
        onChange={handleImageChange}
      />

      <h2 style={{ marginTop: 30 }}>
        保存したレシピ候補
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
  "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 20,
          marginTop: 20,
        }}
      >
        {weeklyMenu.length > 0 && (
  <div style={{ marginBottom: 30 }}>
    <h2>📅 今週の献立</h2>

    {[
      "月",
      "火",
      "水",
      "木",
      "金",
      "土",
      "日",
    ].map((day, index) => (
      <div
        key={day}
        style={{
          background: "white",
          padding: 12,
          borderRadius: 10,
          marginBottom: 10,
        }}
      >
        <strong>{day}曜日：</strong>

        {weeklyMenu[index]?.title || "未設定"}
      </div>
    ))}
  </div>
)}
        {images
  .filter((image) => {
    return (
     image.title.includes(search) ||
image.memo.includes(search) ||
(image.tags || "").includes(search)
    );
  })
  .map((image, index) => (
          <div
            key={index}
           style={{
  border: "1px solid #ddd",
  borderRadius: 16,
  padding: 12,
  background: "white",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
}}
          >
            <img
              src={image.url}
              width="200"
              style={{
  width: "100%",
  height: 220,
  objectFit: "cover",
  borderRadius: 10,
}}
            />
            <input
  type="text"
  placeholder="料理名"
  value={image.title}
  onChange={(e) => {
    const updated = [...images];
    updated[index].title = e.target.value;
    setImages(updated);
  }}
  style={{
    width: "100%",
    padding: 8,
    borderRadius: 8,
    border: "1px solid #ccc",
    marginTop: 10,
    marginBottom: 10,
  }}
/>

           <textarea
  placeholder="メモを書く"
  value={image.memo}
  onChange={(e) => {
    const updated = [...images];
    updated[index].memo = e.target.value;
    setImages(updated);
  }}
  style={{
    width: "100%",
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
    border: "1px solid #ccc",
    minHeight: 80,
  }}
></textarea>

<input
  type="text"
  placeholder="タグ（例：鶏肉、節約、パスタ）"
  value={image.tags || ""}
  onChange={(e) => {
    const updated = [...images];

    updated[index] = {
      ...updated[index],
      tags: e.target.value,
    };

    setImages(updated);
  }}
  style={{
    width: "100%",
    padding: 8,
    borderRadius: 8,
    border: "1px solid #ccc",
    marginTop: 10,
  }}
/>
            

            <button
              onClick={() => {
                setImages(
                  images.filter((_, i) => i !== index)
                );
              }}
              style={{
                marginTop: 10,
                padding: "8px 12px",
                background: "red",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              削除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}