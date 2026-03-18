// run_reel.mjs
import fs from "fs";
import { execSync } from "child_process";

// ===== ENV =====
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.IG_ACCOUNT_ID;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "reel_upload_1";

// ===== paths =====
const imagePath = "./image.jpg";
const videoPath = "./video.mp4";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function assertEnv() {
  if (!ACCESS_TOKEN) throw new Error("FACEBOOK_PAGE_ACCESS_TOKEN missing");
  if (!IG_ID) throw new Error("IG_ACCOUNT_ID missing");
  if (!CLOUD_NAME) throw new Error("CLOUDINARY_CLOUD_NAME missing");
}

// ===== load product =====
function getProduct() {
  const raw = fs.readFileSync("./products.json", "utf-8");
  const products = JSON.parse(raw);
  const valid = products.filter(p => p.image && p.title && p.url);
  if (valid.length === 0) throw new Error("products.json に有効データがありません");
  const product = valid[Math.floor(Math.random() * valid.length)];
  product.title = `【神】${product.title}`;
  return product;
}

// ===== download image (failsafe) =====
async function downloadImage(url) {
  console.log("DOWNLOAD:", url);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("status " + res.status);
    const buf = await res.arrayBuffer();
    fs.writeFileSync(imagePath, Buffer.from(buf));
    console.log("Saved image ->", imagePath);
  } catch (e) {
    console.warn("画像取得失敗, fallbackを使用します:", e.message || e);
    const fallback = await fetch("https://picsum.photos/1080/1920");
    const fb = await fallback.arrayBuffer();
    fs.writeFileSync(imagePath, Buffer.from(fb));
    console.log("Saved fallback image ->", imagePath);
  }
}

// ===== safe text for drawtext =====
function safeDrawText(s, maxLen = 28) {
  if (!s) return "";
  let t = String(s);
  // remove quotes that break ffmpeg drawtext
  t = t.replace(/['"]/g, "");
  // remove slashes and colons that can confuse some rules
  t = t.replace(/[\/:\\]/g, "");
  // remove newlines
  t = t.replace(/\r?\n/g, " ");
  // short-circuit too long strings
  t = t.trim();
  if (t.length > maxLen) t = t.slice(0, maxLen) + "...";
  // escape percent and comma for drawtext eval context
  t = t.replace(/%/g, "\\%").replace(/,/g, "\\,");
  return t;
}

// ===== generate video with ffmpeg =====
function generateVideo(product) {
  console.log("GENERATE VIDEO");
  const topHeadline = safeDrawText("【保存しないと損】", 18);
  const titleText = safeDrawText(product.title, 30);
  const cta = safeDrawText("👇プロフからチェック", 20);

  // find font
  const possibleFonts = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansJP-Bold.otf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
  ];
  let fontfile = possibleFonts.find(p => {
    try { return fs.existsSync(p); } catch(e) { return false; }
  });
  // if no font, leave fontfile empty (ffmpeg will use default font)
  const fontPart = fontfile ? `fontfile=${fontfile}:` : "";

  // build filterchain parts carefully (no stray chars)
  const vfParts = [
    "scale=1080:1920",
    // simple gentle zoompan (keep moderate)
    "zoompan=z='min(zoom+0.002,1.08)':d=180",
    // top semi-transparent banner
    "drawbox=x=0:y=0:w=1080:h=340:color=black@0.55:t=fill",
    // headline text (top)
    `drawtext=${fontPart}text='${topHeadline}':fontcolor=yellow:fontsize=72:x=(w-text_w)/2:y=60`,
    // product title
    `drawtext=${fontPart}text='${titleText}':fontcolor=white:fontsize=56:x=(w-text_w)/2:y=160`,
    // bottom CTA area
    "drawbox=x=0:y=1500:w=1080:h=420:color=black@0.55:t=fill",
    // CTA text
    `drawtext=${fontPart}text='${cta}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=1590`,
    // output pixel format
    "format=yuv420p"
  ];

  const vf = vfParts.join(",");

  // run ffmpeg
  try {
    execSync(
      `ffmpeg -y -loop 1 -i ${imagePath} -vf "${vf}" -t 6 -r 30 -c:v libx264 -pix_fmt yuv420p ${videoPath}`,
      { stdio: "inherit" }
    );
    console.log("Generated video:", videoPath);
  } catch (err) {
    console.error("ffmpeg failed:", err.message || err);
    throw err;
  }
}

// ===== upload to Cloudinary (base64 + unsigned preset) =====
async function uploadToCloudinary() {
  console.log("UPLOAD CLOUDINARY preset:", UPLOAD_PRESET);
  const buffer = fs.readFileSync(videoPath);
  const base64 = buffer.toString("base64");
  const body = {
    file: `data:video/mp4;base64,${base64}`,
    upload_preset: UPLOAD_PRESET,
    public_id: `reel_${Date.now()}`,
    resource_type: "video",
  };

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  console.log("CLOUDINARY:", data);
  if (data.error) throw new Error("Cloudinary error: " + JSON.stringify(data.error));
  if (!data.secure_url) throw new Error("Cloudinary didn't return secure_url");
  return data.secure_url;
}

// ===== wait for instagram media processing =====
async function waitForMedia(mediaId) {
  console.log("waitForMedia:", mediaId);
  for (let i = 0; i < 12; i++) {
    const res = await fetch(`https://graph.facebook.com/v19.0/${mediaId}?fields=status_code&access_token=${ACCESS_TOKEN}`);
    const json = await res.json();
    console.log("STATUS:", json);
    if (json.status_code === "FINISHED") return;
    await sleep(5000);
  }
  throw new Error("動画処理が終わらない");
}

// ===== post reel =====
async function postReel(product, videoUrl) {
  const caption = `【保存推奨】

今バズってる商品👇

${product.title}

👇プロフからチェック
${product.url}

#Amazon #便利グッズ #買ってよかった
`;
  console.log("CREATE MEDIA: videoUrl", videoUrl);
  const media = await fetch(`https://graph.facebook.com/v19.0/${IG_ID}/media`, {
    method: "POST",
    body: new URLSearchParams({
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      access_token: ACCESS_TOKEN
    })
  });
  const mediaData = await media.json();
  console.log("MEDIA response:", mediaData);
  if (!mediaData.id) throw new Error("メディア作成失敗: " + JSON.stringify(mediaData));
  await waitForMedia(mediaData.id);
  console.log("PUBLISH");
  const publish = await fetch(`https://graph.facebook.com/v19.0/${IG_ID}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({ creation_id: mediaData.id, access_token: ACCESS_TOKEN })
  });
  const publishData = await publish.json();
  console.log("PUBLISH response:", publishData);
  if (!publishData.id) throw new Error("投稿失敗: " + JSON.stringify(publishData));
  return publishData;
}

// ===== run =====
async function run() {
  try {
    console.log("START");
    assertEnv();
    const product = getProduct();
    console.log("PRODUCT:", product);
    await downloadImage(product.image);
    generateVideo(product);
    const videoUrl = await uploadToCloudinary();
    console.log("VIDEO URL:", videoUrl);
    const result = await postReel(product, videoUrl);
    console.log("SUCCESS:", result);
  } catch (err) {
    console.error("ERROR:", err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
