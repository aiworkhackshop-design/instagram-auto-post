// run_reel.mjs
import fs from "fs";
import { execSync } from "child_process";

// ===== ENV =====
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID =
  process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.IG_ACCOUNT_ID;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "reel_upload_1";

// ===== 設定ファイルパス =====
const imagePath = "./image.jpg";
const videoPath = "./video.mp4";

// ===== 共通 =====
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

  const valid = products.filter((p) => p.image && p.title && p.url);
  if (valid.length === 0) throw new Error("商品データ不正: image/title/url 必須");

  const product = valid[Math.floor(Math.random() * valid.length)];
  product.title = `【神】${product.title}`;
  return product;
}

// ===== 画像DL（失敗しても止まらない） =====
async function downloadImage(url) {
  console.log("DOWNLOAD:", url);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("画像取得失敗: " + res.status);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(imagePath, Buffer.from(buffer));
    console.log("Saved image ->", imagePath);
    return;
  } catch (err) {
    console.warn("画像取得失敗, fallback を使用します:", err.message || err);
    const fallback = await fetch("https://picsum.photos/1080/1920");
    const buf = await fallback.arrayBuffer();
    fs.writeFileSync(imagePath, Buffer.from(buf));
    console.log("Saved fallback image ->", imagePath);
  }
}

// ===== ffmpeg 用テキストエスケープ =====
function safeDrawText(s, maxLen = 28) {
  if (!s) return "";
  // remove problematic characters for drawtext (quotes, colons, slashes, newlines)
  let t = String(s)
    .replace(/['"]/g, "") // quotes
    .replace(/[:\/\\]/g, "") // colon/slash/backslash
    .replace(/\r?\n/g, " ")
    .trim();
  if (t.length > maxLen) t = t.slice(0, maxLen) + "...";
  // escape percent signs and commas for ffmpeg drawtext contexts
  t = t.replace(/%/g, "\\%").replace(/,/g, "\\,");
  return t;
}

// ===== 動画生成 =====
function generateVideo(product) {
  console.log("GENERATE VIDEO");
  const titleText = safeDrawText(product.title, 30);
  const subtitle = "👇プロフからチェック";

  // フォントパス（runner によって違うので、存在するものを試す）
  const possibleFonts = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansJP-Bold.otf",
  ];
  let fontfile = null;
  for (const p of possibleFonts) {
    try {
      if (fs.existsSync(p)) {
        fontfile = p;
        break;
      }
    } catch (e) {}
  }

  // drawtext fontpart
  const fontPart = fontfile ? `fontfile=${fontfile}:` : "";

  // ffmpeg コマンド（シンプルにして安定化）
  const vf = [
    "scale=1080:1920",
    "zoompan=z='min(zoom+0.002,1.12)':d=180",
    // top banner
    `drawbox=x=0:y=0:w=1080:h=340:color=black@0.55:t=fill`,
    // headline
    `drawtext=${fontPart}text='【保存しないと損'] :fontcolor=yellow:fontsize=78:x=(w-text_w)/2:y=60`,
    // title (product)
    `drawtext=${fontPart}text='${titleText}':fontcolor=white:fontsize=56:x=(w-text_w)/2:y=160`,
    // bottom CTA area
    `drawbox=x=0:y=1500:w=1080:h=420:color=black@0.55:t=fill`,
    `drawtext=${fontPart}text='${subtitle}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=1590`,
    "format=yuv420p",
  ].join(",");

  // run ffmpeg
  try {
    execSync(
      `ffmpeg -y -loop 1 -i ${imagePath} -vf "${vf}" -t 6 -r 30 -c:v libx264 -pix_fmt yuv420p ${videoPath}`,
      { stdio: "inherit" }
    );
    console.log("Generated video ->", videoPath);
  } catch (err) {
    console.error("ffmpeg failed:", err.message || err);
    throw err;
  }
}

// ===== Cloudinary アップロード（base64 / unsigned preset） =====
async function uploadToCloudinary() {
  console.log("UPLOAD CLOUDINARY with preset:", UPLOAD_PRESET);

  const buffer = fs.readFileSync(videoPath);
  const base64 = buffer.toString("base64");
  const body = {
    file: `data:video/mp4;base64,${base64}`,
    upload_preset: UPLOAD_PRESET,
    public_id: `reel_${Date.now()}`, // no slashes
    resource_type: "video",
  };

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  console.log("CLOUDINARY:", data);

  if (data.error) {
    throw new Error(`Cloudinary error: ${JSON.stringify(data.error)}`);
  }
  if (!data.secure_url) throw new Error("Cloudinary did not return secure_url");
  return data.secure_url;
}

// ===== Instagram 投稿ステータス待ち =====
async function waitForMedia(mediaId) {
  console.log("waitForMedia id:", mediaId);
  for (let i = 0; i < 12; i++) {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${mediaId}?fields=status_code&access_token=${ACCESS_TOKEN}`
    );
    const data = await res.json();
    console.log("STATUS:", data);
    if (data.status_code === "FINISHED") return;
    await sleep(5000);
  }
  throw new Error("動画処理が終わらない（timeout）");
}

// ===== 投稿 =====
async function postReel(product, video_url) {
  const caption = `【保存推奨】

今バズってる商品👇

${product.title}

👇プロフからチェック
${product.url}

#Amazon #便利グッズ #買ってよかった
`;

  console.log("CREATE MEDIA (instagram) with video_url:", video_url);

  const media = await fetch(`https://graph.facebook.com/v19.0/${IG_ID}/media`, {
    method: "POST",
    body: new URLSearchParams({
      media_type: "REELS",
      video_url,
      caption,
      access_token: ACCESS_TOKEN,
    }),
  });

  const mediaData = await media.json();
  console.log("MEDIA response:", mediaData);
  if (!mediaData.id) throw new Error("メディア作成失敗: " + JSON.stringify(mediaData));

  // wait for processing
  await waitForMedia(mediaData.id);

  console.log("PUBLISH");
  const publish = await fetch(`https://graph.facebook.com/v19.0/${IG_ID}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({
      creation_id: mediaData.id,
      access_token: ACCESS_TOKEN,
    }),
  });
  const publishData = await publish.json();
  console.log("PUBLISH response:", publishData);
  if (!publishData.id) throw new Error("投稿失敗: " + JSON.stringify(publishData));
  return publishData;
}

// ===== 実行 =====
async function run() {
  try {
    console.log("START");
    assertEnv();

    const product = getProduct();
    console.log("PRODUCT:", product);

    await downloadImage(product.image);
    generateVideo(product);

    const video_url = await uploadToCloudinary();
    console.log("VIDEO URL:", video_url);

    const result = await postReel(product, video_url);
    console.log("SUCCESS 🎉", result);
  } catch (err) {
    console.error("ERROR:", err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
