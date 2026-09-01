手順: アイコンの追加と生成

1. 添付画像（元アイコン）を `public/source-icon.png` に置いてください。

2a. ImageMagick が使える場合（簡単）:

```bash
chmod +x scripts/generate-icons.sh
./scripts/generate-icons.sh
```

2b. Node スクリプトを使う場合:

```bash
npm install sharp png-to-ico --save-dev
node scripts/generate-icons.js
```

3. ブラウザで動作確認: `npm run dev`（Next.js のローカルサーバー）を起動して、タブのアイコンを確認してください。

生成されるファイル:
- `public/app-icon-32.png`
- `public/app-icon-192.png`
- `public/app-icon-512.png`
- `public/apple-touch-icon.png`
- `public/favicon.ico` (または `favicon-32.png` が残る場合あり)

もしよければ、今から私が `public/source-icon.png` に添付画像を保存して生成まで実行します。保存してよいですか？
