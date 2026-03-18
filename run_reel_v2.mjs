import fs from "fs";
import { spawnSync } from "child_process";
import fetch from "node-fetch";

// ====== 環境変数 ======
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.INSTAGRAM_ACCOUNT_ID || process.env.IG_ACCOUNT_ID;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "reel_upload_1";
const API_VERSION = process.env.API_VERSION || "v21.0";

// ====== パス ======
const imagePath = "./image.jpg";
const videoPath = "./video.mp4";

// ====== ユーティリティ ======
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
function abort(msg) { console.error("ABORT:", msg); process.exit(1); }

function log(msg, type = "INFO") {
  const timestamp = new Date().toISOString();
  const prefix = {
    INFO: "ℹ️",
    SUCCESS: "✅",
    ERROR: "❌",
    WARNING: "⚠️"
  }[type] || "ℹ️";
  console.log(`[${timestamp}] ${prefix} ${msg}`);
}

function logSection(title) {
  console.log("\n" + "=".repeat(80));
  console.log(title);
  console.log("=".repeat(80));
}

// 曜日に基づいて投稿タイプを決定
function getPostType() {
  const now = new Date();
  const day = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  
  // Reel: Mon(1), Wed(3), Fri(5)
  // Carousel: Sun(0)
  
  if ([1, 3, 5].includes(day)) {
    return "reel";
  } else if (day === 0) {
    return "carousel";
  } else {
    return null; // No post scheduled for this day
  }
}

function assertEnv() {
  logSection("【環境変数チェック】");
  
  if (!ACCESS_TOKEN) abort("FACEBOOK_PAGE_ACCESS_TOKEN missing");
  if (!IG_ID) abort("IG_ACCOUNT_ID missing");
  if (!CLOUD_NAME) abort("CLOUDINARY_CLOUD_NAME missing");
  if (!CLOUDINARY_UPLOAD_PRESET) abort("CLOUDINARY_UPLOAD_PRESET missing");
  
  log(`IG_ID: ${IG_ID}`, "SUCCESS");
  log(`ACCESS_TOKEN: ${ACCESS_TOKEN ? "✅ SET" : "❌ MISSING"}`, "INFO");
  log(`CLOUD_NAME: ${CLOUD_NAME}`, "INFO");
  log(`API_VERSION: ${API_VERSION}`, "INFO");
}

function getProduct() {
  if (!fs.existsSync("./products.json")) abort("products.json not found");
  const raw = fs.readFileSync("./products.json", "utf-8");
  const list = JSON.parse(raw);
  const valid = (Array.isArray(list) ? list : []).filter(p => p.image && p.title && p.url);
  if (valid.length === 0) abort("no valid product in products.json");
  const p = valid[Math.floor(Math.random() * valid.length)];
  // 小加工
  p.title = `【神】${p.title}`.slice(0, 28); // 長さ抑える
  return p;
}

// download image with UA
async function downloadImage(url) {
  logSection("【1】画像ダウンロード");
  log(`URL: ${url}`, "INFO");
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      redirect: "follow"
    });
    if (!res.ok) throw new Error(`http ${res.status}`);
    const arr = new Uint8Array(await res.arrayBuffer());
    fs.writeFileSync(imagePath, Buffer.from(arr));
    log(`✅ 画像保存: ${imagePath}`, "SUCCESS");
    return;
  } catch (err) {
    log(`❌ 画像取得失敗: ${err.message || err}`, "ERROR");
    abort("Image download failed - cannot proceed without product image");
  }
}

// generate video using Python script (generate_reel_v2.py)
function generateVideo(product) {
  logSection("【2】リール生成（修正版）");
  log(`商品: ${product.title}`, "INFO");
  log(`ASIN: ${product.asin || "N/A"}`, "INFO");
  log(`価格: ${product.price || "N/A"}`, "INFO");
  log(`評価: ${product.rating || "N/A"}`, "INFO");
  log(`画像URL: ${product.image}`, "INFO");

  // Call Python script to generate high-quality reel
  const args = [
    "generate_reel_v2.py"
  ];

  log(`Python スクリプト実行中...`, "INFO");
  const res = spawnSync("python3", args, { stdio: "inherit", timeout: 180000 });
  if (res.status !== 0) {
    abort("generate_reel_v2.py failed (see output above)");
  }
  log(`✅ リール生成完了: ${videoPath}`, "SUCCESS");
}

// Cloudinary upload using base64 JSON (unsigned preset)
async function uploadToCloudinary() {
  logSection("【3】Cloudinary アップロード");
  
  if (!fs.existsSync(videoPath)) abort(`${videoPath} not found`);
  
  const fileBuffer = fs.readFileSync(videoPath);
  const base64 = fileBuffer.toString("base64");
  
  const formData = new FormData();
  formData.append("file", `data:video/mp4;base64,${base64}`);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("resource_type", "video");
  
  log(`Preset: ${CLOUDINARY_UPLOAD_PRESET}`, "INFO");
  
  try {
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
    const res = await fetch(uploadUrl, {
      method: "POST",
      body: formData
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Upload failed: ${res.status} ${errText}`);
    }
    
    const data = await res.json();
    const videoUrl = data.secure_url;
    const publicId = data.public_id;
    
    log(`✅ Cloudinary アップロード成功`, "SUCCESS");
    log(`Public ID: ${publicId}`, "INFO");
    log(`動画URL: ${videoUrl}`, "INFO");
    
    return videoUrl;
  } catch (err) {
    abort(`Cloudinary upload error: ${err.message}`);
  }
}

// Create media on Instagram
async function createMedia(videoUrl) {
  logSection("【5】リール投稿");
  
  const captions = [
    "【保存推奨】今バズってる商品👇\n👇プロフからチェック",
    "今売れてる商品TOP5👇\n👇プロフからチェック",
    "この値段で？神商品👇\n👇プロフからチェック"
  ];
  const caption = captions[Math.floor(Math.random() * captions.length)];
  const hashtags = "#Amazon #便利グッズ #買ってよかった";
  
  const body = {
    media_type: "REELS",
    video_url: videoUrl,
    caption: `${caption}\n\n${hashtags}`
  };
  
  log(`メディア作成中...`, "INFO");
  
  try {
    const url = `https://graph.instagram.com/${API_VERSION}/${IG_ID}/media`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        access_token: ACCESS_TOKEN
      })
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Create media failed: ${res.status} ${errText}`);
    }
    
    const data = await res.json();
    const mediaId = data.id;
    
    log(`メディアID: ${mediaId}`, "INFO");
    return mediaId;
  } catch (err) {
    abort(`Create media error: ${err.message}`);
  }
}

// Publish media
async function publishMedia(mediaId) {
  logSection("【4】メディア処理待機");
  
  // Poll status
  for (let i = 1; i <= 12; i++) {
    log(`ステータス確認中... (${i}/12)`, "INFO");
    
    try {
      const url = `https://graph.instagram.com/${API_VERSION}/${mediaId}?fields=status&access_token=${ACCESS_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      const status = data.status;
      
      log(`ステータス: ${status}`, "INFO");
      
      if (status === "FINISHED") {
        log(`投稿中...`, "INFO");
        
        // Publish
        const pubUrl = `https://graph.instagram.com/${API_VERSION}/${IG_ID}/media_publish`;
        const pubRes = await fetch(pubUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: mediaId,
            access_token: ACCESS_TOKEN
          })
        });
        
        if (!pubRes.ok) {
          const errText = await pubRes.text();
          throw new Error(`Publish failed: ${pubRes.status} ${errText}`);
        }
        
        const pubData = await pubRes.json();
        const postId = pubData.id;
        
        log(`投稿ID: ${postId}`, "INFO");
        return postId;
      }
    } catch (err) {
      log(`Status check error: ${err.message}`, "WARNING");
    }
    
    if (i < 12) await sleep(5000);
  }
  
  abort("Media processing timeout");
}

// Main
async function main() {
  try {
    assertEnv();
    const product = getProduct();
    
    logSection("【商品情報】");
    log(`商品名: ${product.title}`, "INFO");
    log(`ASIN: ${product.asin || "N/A"}`, "INFO");
    log(`価格: ${product.price || "N/A"}`, "INFO");
    log(`評価: ${product.rating || "N/A"}`, "INFO");
    log(`画像URL: ${product.image}`, "INFO");
    
    await downloadImage(product.image);
    generateVideo(product);
    const videoUrl = await uploadToCloudinary();
    const mediaId = await createMedia(videoUrl);
    const postId = await publishMedia(mediaId);
    
    logSection("✅ 投稿処理完了");
    log(`🎉 リール投稿が正常に完了しました`, "SUCCESS");
    log(`投稿URL: https://www.instagram.com/reel/${postId}/`, "INFO");
  } catch (err) {
    log(`Fatal error: ${err.message}`, "ERROR");
    process.exit(1);
  }
}

main();
