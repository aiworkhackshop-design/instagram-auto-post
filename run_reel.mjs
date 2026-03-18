// run_reel.mjs
import fs from "fs";
import { spawnSync } from "child_process";
import path from "path";

// ===== ENV =====
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.IG_ACCOUNT_ID;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "reel_upload_1"; // <-- your preset
// File names
const imagePath = "./image.jpg";
const videoPath = "./video.mp4";

// ===== util =====
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function safePublicId() {
  // keep only letters/numbers/underscore/dash to avoid "slashes" or invalid chars
  return `reel_${Date.now()}`;
}
function assertEnv() {
  if (!ACCESS_TOKEN) throw new Error("FACEBOOK_PAGE_ACCESS_TOKEN missing");
  if (!IG_ID) throw new Error("IG_ACCOUNT_ID missing");
  if (!CLOUD_NAME) throw new Error("CLOUDINARY_CLOUD_NAME missing");
}

// ===== PRODUCT =====
function getProduct() {
  const raw = fs.readFileSync("./products.json", "utf-8");
  const products = JSON.parse(raw);
  const valid = products.filter(p => p.image && p.title && p.url);
  if (valid.length === 0) throw new Error("商品データ不正");
  const product = valid[Math.floor(Math.random() * valid.length)];
  product.title = `【神】${product.title}`;
  return product;
}

// ===== download image (fallback OK) =====
async function downloadImage(url) {
  console.log("DOWNLOAD:", url);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`画像取得失敗: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(imagePath, buffer);
    console.log("Saved image ->", imagePath);
  } catch (err) {
    console.log("画像取得失敗, fallback を使用します:", err.message || err);
    const fallback = await fetch("https://picsum.photos/1080/1920");
    const buf = Buffer.from(await fallback.arrayBuffer());
    fs.writeFileSync(imagePath, buf);
    console.log("Saved fallback image ->", imagePath);
  }
}

// ===== generate video (use spawnSync to avoid shell quoting issues) =====
function generateVideo(product) {
  console.log("GENERATE VIDEO");
  // make safe short title (no single quotes etc)
  let safeTitle = product.title.replace(/'/g, "").replace(/:/g, "").slice(0, 30);
  // filter graph - pass as single arg to ffmpeg (no shell quoting)
  const fontFile = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc";
  // ensure font path exists fallback to system font if not
  const fontToUse = fs.existsSync(fontFile) ? fontFile : "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

  const drawTopText = `drawbox=x=0:y=0:w=1080:h=340:color=black@0.6:t=fill,drawtext=fontfile=${fontToUse}:text='【保存しないと損]':fontcolor=yellow:fontsize=78:x=(w-text_w)/2:y=60`;
  // Note: the filter parser doesn't like mismatched brackets; keep texts simple and avoid inner bracket conflicts.
  // We'll avoid using both bracket chars in same drawtext; use safeTitle for the second line.
  const drawTitle = `drawtext=fontfile=${fontToUse}:text='${safeTitle}':fontcolor=white:fontsize=56:x=(w-text_w)/2:y=160`;
  const bottomBox = `drawbox=x=0:y=1500:w=1080:h=420:color=black@0.55:t=fill`;
  const bottomCTA = `drawtext=fontfile=${fontToUse}:text='👇プロフからチェック':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=1590`;
  const filter = [
    "scale=1080:1920",
    "zoompan=z='min(zoom+0.002,1.12)':d=180",
    drawTopText,
    drawTitle,
    bottomBox,
    bottomCTA,
    "format=yuv420p"
  ].join(",");

  // Build ffmpeg args
  const args = [
    "-y",
    "-loop", "1",
    "-i", imagePath,
    "-vf", filter,
    "-t", "6",
    "-r", "30",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    videoPath
  ];

  console.log("ffmpeg args prepared. running...");
  const res = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (res.error) {
    console.error("ffmpeg spawn error:", res.error);
    throw res.error;
  }
  if (res.status !== 0) {
    throw new Error("ffmpeg failed (exit " + res.status + ")");
  }
  console.log("Generated video ->", videoPath);
}

// ===== Cloudinary upload via multipart/form-data =====
async function uploadToCloudinary() {
  console.log("UPLOAD CLOUDINARY");

  const buffer = fs.readFileSync(videoPath);
  const b64 = buffer.toString("base64");
  const publicId = safePublicId();

  // Use FormData so Cloudinary receives multipart/form-data
  const form = new FormData();
  form.append("file", `data:video/mp4;base64,${b64}`);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  form.append("public_id", publicId);
  form.append("resource_type", "video");

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
  const res = await fetch(url, {
    method: "POST",
    body: form
  });

  const data = await res.json();
  console.log("CLOUDINARY:", data);
  if (!data.secure_url) {
    throw new Error("Cloudinary失敗: " + (data.error ? JSON.stringify(data.error) : "unknown"));
  }
  return data.secure_url;
}

// ===== wait for Instagram media processing =====
async function waitForMedia(mediaId) {
  for (let i = 0; i < 15; i++) {
    console.log("CHECK STATUS...");
    const res = await fetch(`https://graph.facebook.com/v19.0/${mediaId}?fields=status_code&access_token=${ACCESS_TOKEN}`);
    const data = await res.json();
    console.log("STATUS:", data);
    if (data.status_code === "FINISHED") return;
    await sleep(5000);
  }
  throw new Error("動画処理終わらない");
}

// ===== post reel =====
async function postReel(product, video_url) {
  const caption = `
【保存推奨】

今バズってる商品👇

${product.title}

👇プロフからチェック
${product.url}

#Amazon #便利グッズ #買ってよかった
`.trim();

  console.log("CREATE MEDIA");
  const params = new URLSearchParams({
    media_type: "REELS",
    video_url,
    caption,
    access_token: ACCESS_TOKEN
  });

  const media = await fetch(`https://graph.facebook.com/v19.0/${IG_ID}/media`, {
    method: "POST",
    body: params
  });
  const mediaData = await media.json();
  console.log("MEDIA:", mediaData);
  if (!mediaData.id) throw new Error("メディア作成失敗: " + JSON.stringify(mediaData));

  await waitForMedia(mediaData.id);

  console.log("PUBLISH");
  const publish = await fetch(`https://graph.facebook.com/v19.0/${IG_ID}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({
      creation_id: mediaData.id,
      access_token: ACCESS_TOKEN
    })
  });
  const publ = await publish.json();
  console.log("PUBLISH:", publ);
  if (!publ.id) throw new Error("投稿失敗: " + JSON.stringify(publ));
}

// ===== main =====
async function run() {
  try {
    console.log("START");
    assertEnv();
    const product = getProduct();
    console.log("PRODUCT:", product);

    await downloadImage(product.image);
    generateVideo(product);

    const video_url = await uploadToCloudinary();
    console.log("VIDEO:", video_url);

    await postReel(product, video_url);
    console.log("SUCCESS 🎉");
  } catch (err) {
    console.error("ERROR:", err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
