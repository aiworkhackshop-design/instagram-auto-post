import fetch from "node-fetch";
import fs from "fs";
import { execSync } from "child_process";
import FormData from "form-data";

// ===== ENV =====
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.IG_ACCOUNT_ID;

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;

// ===== 設定 =====
const imagePath = "./image.jpg";
const videoPath = "./video.mp4";

// ===== 共通関数 =====
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function assertEnv() {
  if (!ACCESS_TOKEN) throw new Error("FACEBOOK_PAGE_ACCESS_TOKEN missing");
  if (!IG_ID) throw new Error("IG_ACCOUNT_ID missing");
  if (!CLOUD_NAME) throw new Error("CLOUDINARY_CLOUD_NAME missing");
}

// ===== 商品取得 =====
function getProduct() {
  const raw = fs.readFileSync("./products.json", "utf-8");
  const products = JSON.parse(raw);

  if (!Array.isArray(products) || products.length === 0) {
    throw new Error("products.json が空 or 配列じゃない");
  }

  const valid = products.filter(p => p.image && p.title && p.url);

  if (valid.length === 0) {
    throw new Error("有効な商品データがない（image/title/url必須）");
  }

  return valid[Math.floor(Math.random() * valid.length)];
}

// ===== 画像ダウンロード =====
async function downloadImage(imageUrl) {
  console.log("DOWNLOAD IMAGE:", imageUrl);

  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error("画像取得失敗");

  const buffer = await res.arrayBuffer();
  fs.writeFileSync(imagePath, Buffer.from(buffer));
}

// ===== 動画生成 =====
function generateVideo() {
  console.log("GENERATE VIDEO");

  execSync(`
    ffmpeg -y -loop 1 -i ${imagePath} \
    -vf "scale=1080:1920,format=yuv420p" \
    -t 6 -r 30 -c:v libx264 ${videoPath}
  `);
}

// ===== Cloudinary =====
async function uploadToCloudinary() {
  console.log("UPLOAD CLOUDINARY");

  const form = new FormData();
  form.append("file", fs.createReadStream(videoPath));
  form.append("upload_preset", "ml_default");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
    {
      method: "POST",
      body: form
    }
  );

  const data = await res.json();

  if (!data.secure_url) {
    console.error(data);
    throw new Error("Cloudinaryアップロード失敗");
  }

  return data.secure_url;
}

// ===== 投稿 =====
async function postReel(product, video_url) {
  const caption = `
🔥 今売れてる商品

${product.title}

👇 詳細はこちら
${product.url}

#Amazon #おすすめ #便利グッズ #ガジェット
`;

  console.log("CREATE MEDIA");

  const media = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method: "POST",
      body: new URLSearchParams({
        media_type: "REELS",
        video_url,
        caption,
        access_token: ACCESS_TOKEN
      })
    }
  );

  const mediaData = await media.json();
  console.log("MEDIA:", mediaData);

  if (!mediaData.id) {
    throw new Error("メディア作成失敗");
  }

  console.log("WAIT 30s...");
  await sleep(30000);

  const publish = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media_publish`,
    {
      method: "POST",
      body: new URLSearchParams({
        creation_id: mediaData.id,
        access_token: ACCESS_TOKEN
      })
    }
  );

  const publishData = await publish.json();
  console.log("PUBLISH:", publishData);
}

// ===== 実行 =====
async function run() {
  try {
    console.log("START");

    assertEnv();

    const product = getProduct();
    console.log("PRODUCT:", product);

    await downloadImage(product.image);
    generateVideo();

    const video_url = await uploadToCloudinary();
    console.log("VIDEO URL:", video_url);

    await postReel(product, video_url);

    console.log("SUCCESS 🎉");
  } catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
  }
}

run();
