import fs from "fs";
import { execSync } from "child_process";

// ===== ENV =====
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID =
  process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.IG_ACCOUNT_ID;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;

// ===== 設定 =====
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
  if (valid.length === 0) throw new Error("商品データ不正");

  const product = valid[Math.floor(Math.random() * valid.length)];

  product.title = `【神】${product.title}`;
  return product;
}

// ===== 画像DL =====
async function downloadImage(url) {
  console.log("DOWNLOAD:", url);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();

    const buffer = await res.arrayBuffer();
    fs.writeFileSync(imagePath, Buffer.from(buffer));
  } catch {
    console.log("⚠️ fallback画像使用");

    const fallback = await fetch("https://picsum.photos/1080/1920");
    const buffer = await fallback.arrayBuffer();
    fs.writeFileSync(imagePath, Buffer.from(buffer));
  }
}

// ===== 動画生成 =====
function generateVideo(product) {
  console.log("GENERATE VIDEO");

  const safeTitle = product.title
    .replace(/'/g, "")
    .replace(/:/g, "")
    .slice(0, 18);

  execSync(`
    ffmpeg -y -loop 1 -i ${imagePath} \
    -vf "
    scale=1080:1920,
    zoompan=z='min(zoom+0.002,1.3)':d=180,

    drawbox=x=0:y=0:w=1080:h=350:color=black@0.6:t=fill,

    drawtext=fontfile=/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc:
    text='【保存しないと損】':
    fontcolor=yellow:
    fontsize=85:
    x=(w-text_w)/2:
    y=80,

    drawtext=fontfile=/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc:
    text='${safeTitle}':
    fontcolor=white:
    fontsize=60:
    x=(w-text_w)/2:
    y=200,

    drawbox=x=0:y=1550:w=1080:h=300:color=black@0.6:t=fill,

    drawtext=fontfile=/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc:
    text='👇プロフからチェック':
    fontcolor=white:
    fontsize=55:
    x=(w-text_w)/2:
    y=1600,

    drawtext=fontfile=/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc:
    text='今すぐ見る':
    fontcolor=yellow:
    fontsize=70:
    x=(w-text_w)/2:
    y=1700,

    format=yuv420p
    " \
    -t 6 -r 30 -c:v libx264 -pix_fmt yuv420p ${videoPath}
  `);
}

// ===== Cloudinary（最終完全版） =====
async function uploadToCloudinary() {
  console.log("UPLOAD CLOUDINARY");

  const buffer = fs.readFileSync(videoPath);
  const base64 = buffer.toString("base64");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        file: `data:video/mp4;base64,${base64}`,
        upload_preset: "リールアップロード", // ←ここ修正済み
        public_id: `reel_${Date.now()}`,     // ←これが超重要
        resource_type: "video"
      })
    }
  );

  const data = await res.json();
  console.log("CLOUDINARY:", data);

  if (!data.secure_url) {
    throw new Error("Cloudinary失敗");
  }

  return data.secure_url;
}

// ===== ステータス待機 =====
async function waitForMedia(mediaId) {
  for (let i = 0; i < 10; i++) {
    console.log("CHECK STATUS...");

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${mediaId}?fields=status_code&access_token=${ACCESS_TOKEN}`
    );

    const data = await res.json();
    console.log("STATUS:", data);

    if (data.status_code === "FINISHED") return;

    await sleep(10000);
  }

  throw new Error("動画処理終わらない");
}

// ===== 投稿 =====
async function postReel(product, video_url) {
  const caption = `
【保存推奨】

今バズってる商品👇

${product.title}

👇プロフからチェック
${product.url}

#Amazon #便利グッズ #買ってよかった
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
  console.log("PUBLISH:", publishData);

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
    console.log("VIDEO:", video_url);

    await postReel(product, video_url);

    console.log("SUCCESS 🎉");

  } catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
  }
}

run();
