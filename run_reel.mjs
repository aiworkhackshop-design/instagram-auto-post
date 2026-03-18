// run_reel.mjs
import fs from "fs";
import { spawnSync } from "child_process";

// ====== 環境変数 ======
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.IG_ACCOUNT_ID;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "reel_upload_1";

// ====== パス ======
const imagePath = "./image.jpg";
const videoPath = "./video.mp4";

// ====== ユーティリティ ======
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
function abort(msg) { console.error("ABORT:", msg); process.exit(1); }

function assertEnv() {
  if (!ACCESS_TOKEN) abort("FACEBOOK_PAGE_ACCESS_TOKEN missing");
  if (!IG_ID) abort("IG_ACCOUNT_ID missing");
  if (!CLOUD_NAME) abort("CLOUDINARY_CLOUD_NAME missing");
  if (!CLOUDINARY_UPLOAD_PRESET) abort("CLOUDINARY_UPLOAD_PRESET missing");
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

// download image with UA and fallback
async function downloadImage(url) {
  console.log("DOWNLOAD:", url);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      redirect: "follow"
    });
    if (!res.ok) throw new Error(`http ${res.status}`);
    const arr = new Uint8Array(await res.arrayBuffer());
    fs.writeFileSync(imagePath, Buffer.from(arr));
    console.log("Saved image ->", imagePath);
    return;
  } catch (err) {
    console.warn("画像取得失敗, fallback を使用します:", err.message || err);
    const fb = await fetch("https://picsum.photos/1080/1920");
    const arr = new Uint8Array(await fb.arrayBuffer());
    fs.writeFileSync(imagePath, Buffer.from(arr));
    console.log("Saved fallback image ->", imagePath);
  }
}

// generate video using spawnSync to avoid shell quoting issues
function generateVideo(product) {
  console.log("GENERATE VIDEO");

  const safeTitle = product.title.replace(/['":]/g, "").replace(/\n/g, " ").slice(0, 28);
  // フォント -- 実行環境に合わせて変更する（ubuntu系ならDejaVu）
  const font = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

  const overlayTop = "【保存しないと損】";
  const bottomText = "👇プロフからチェック";

  const filterParts = [
    "scale=1080:1920",
    // シンプルなズーム（zoompanは画像単一だと扱いが微妙なので軽め）
    "zoompan=z='min(zoom+0.002,1.12)':d=180",
    "drawbox=x=0:y=0:w=1080:h=360:color=black@0.65:t=fill",
    `drawtext=fontfile=${font}:text='${overlayTop}':fontcolor=yellow:fontsize=72:x=(w-text_w)/2:y=60`,
    `drawtext=fontfile=${font}:text='${safeTitle}':fontcolor=white:fontsize=50:x=(w-text_w)/2:y=160`,
    "drawbox=x=0:y=1500:w=1080:h=420:color=black@0.55:t=fill",
    `drawtext=fontfile=${font}:text='${bottomText}':fontcolor=white:fontsize=46:x=(w-text_w)/2:y=1590`,
    "format=yuv420p"
  ];
  const vf = filterParts.join(",");

  const args = [
    "-y",
    "-loop", "1",
    "-i", imagePath,
    "-vf", vf,
    "-t", "6",
    "-r", "30",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    videoPath
  ];

  console.log("ffmpeg args:", args.slice(0,6).join(" "), "..."); // 全部出すと長い
  const res = spawnSync("ffmpeg", args, { stdio: "inherit", timeout: 120000 });
  if (res.status !== 0) {
    abort("ffmpeg failed (see output above)");
  }
  console.log("Generated video ->", videoPath);
}

// Cloudinary upload using base64 JSON (unsigned preset)
async function uploadToCloudinary() {
  console.log("UPLOAD CLOUDINARY preset:", CLOUDINARY_UPLOAD_PRESET);
  const b = fs.readFileSync(videoPath);
  const base64 = b.toString("base64");
  const payload = {
    file: `data:video/mp4;base64,${base64}`,
    upload_preset: CLOUDINARY_UPLOAD_PRESET,
    public_id: `reel_${Date.now()}`, // no slashes
    resource_type: "video"
  };
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    redirect: "follow"
  });
  const data = await res.json();
  console.log("CLOUDINARY:", data && data.error ? ("ERR: "+(data.error.message||JSON.stringify(data.error))) : "ok");
  if (!data.secure_url) {
    throw new Error("Cloudinary失敗: " + JSON.stringify(data));
  }
  return data.secure_url;
}

// wait for facebook media processing
async function waitForMedia(mediaId) {
  for (let i=0;i<12;i++) {
    console.log("CHECK STATUS...");
    const r = await fetch(`https://graph.facebook.com/v19.0/${mediaId}?fields=status_code&access_token=${ACCESS_TOKEN}`);
    const d = await r.json();
    console.log("STATUS:", d);
    if (d.status_code === "FINISHED") return;
    await sleep(5000);
  }
  throw new Error("動画処理終わらない");
}

// post reel
async function postReel(product, video_url) {
  const caption = `【保存推奨】

今バズってる商品👇

${product.title}

👇プロフからチェック
${product.url}

#Amazon #便利グッズ #買ってよかった
`;

  console.log("CREATE MEDIA");
  const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${IG_ID}/media`, {
    method: "POST",
    body: new URLSearchParams({
      media_type: "REELS",
      video_url,
      caption,
      access_token: ACCESS_TOKEN
    })
  });
  const mediaData = await mediaRes.json();
  console.log("MEDIA:", mediaData);
  if (!mediaData.id) throw new Error("メディア作成失敗: "+JSON.stringify(mediaData));
  await waitForMedia(mediaData.id);

  console.log("PUBLISH");
  const pub = await fetch(`https://graph.facebook.com/v19.0/${IG_ID}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({
      creation_id: mediaData.id,
      access_token: ACCESS_TOKEN
    })
  });
  const pubData = await pub.json();
  console.log("PUBLISH:", pubData);
  if (!pubData.id) throw new Error("投稿失敗: "+JSON.stringify(pubData));
}

// ===== main =====
(async function main(){
  try {
    console.log("START");
    assertEnv();
    const product = getProduct();
    console.log("PRODUCT:", product);

    await downloadImage(product.image);
    generateVideo(product);

    const video_url = await uploadToCloudinary();
    console.log("VIDEO URL:", video_url);

    await postReel(product, video_url);

    console.log("SUCCESS 🎉");
  } catch (err) {
    console.error("ERROR:", err && err.message ? err.message : err);
    process.exit(1);
  }
})();
