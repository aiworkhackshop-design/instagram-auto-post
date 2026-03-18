import fs from "fs";
import { execSync } from "child_process";

// ===== ENV =====
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.IG_ACCOUNT_ID;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;

// ===== PATH =====
const imagePath = "./image.jpg";
const videoPath = "./video.mp4";

// ===== UTIL =====
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
    throw new Error("products.json が空");
  }

  const valid = products.filter(p => p.image && p.title && p.url);
  if (valid.length === 0) {
    throw new Error("有効な商品なし");
  }

  return valid[Math.floor(Math.random() * valid.length)];
}

// ===== 画像DL（ネイティブfetch） =====
async function downloadImage(url) {
  console.log("DOWNLOAD:", url);

  const res = await fetch(url);
  if (!res.ok) throw new Error("画像取得失敗");

  const buffer = await res.arrayBuffer();
  fs.writeFileSync(imagePath, Buffer.from(buffer));
}

// ===== 🔥 動画生成 =====
function generateVideo(product) {
  console.log("GENERATE VIDEO");

  const safeTitle = product.title
    .replace(/'/g, "")
    .replace(/:/g, "")
    .slice(0, 25);

  execSync(`
    ffmpeg -y -loop 1 -i ${imagePath} \
    -vf "
    scale=1080:1920,
    zoompan=z='min(zoom+0.0015,1.5)':d=180,

    drawbox=x=0:y=0:w=1080:h=420:color=black@0.6:t=fill,

    drawtext=fontfile=/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc:
    text='【99%が知らない】':
    fontcolor=yellow:
    fontsize=80:
    x=(w-text_w)/2:
    y=120,

    drawtext=fontfile=/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc:
    text='${safeTitle}':
    fontcolor=white:
    fontsize=60:
    x=(w-text_w)/2:
    y=260,

    format=yuv420p
    " \
    -t 6 -r 30 -c:v libx264 -pix_fmt yuv420p ${videoPath}
  `);
}

// ===== Cloudinary（ネイティブFormData） =====
async function uploadToCloudinary() {
  console.log("UPLOAD CLOUDINARY");

  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(videoPath)]));
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
    throw new Error("Cloudinary失敗");
  }

  return data.secure_url;
}

// ===== 処理待ち =====
async function waitForMedia(mediaId) {
  for (let i = 0; i < 12; i++) {
    console.log("WAITING...");

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${mediaId}?fields=status_code&access_token=${ACCESS_TOKEN}`
    );

    const data = await res.json();

    if (data.status_code === "FINISHED") return;

    await sleep(8000);
  }

  throw new Error("動画処理終わらない");
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

  if (!mediaData.id) throw new Error("メディア作成失敗");

  await waitForMedia(mediaData.id);

  console.log("PUBLISH");

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
  console.log("RESULT:", publishData);

  if (!publishData.id) throw new Error("投稿失敗");
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

    await postReel(product, video_url);

    console.log("SUCCESS 🎉");

  } catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
  }
}

run();
