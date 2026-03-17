import fetch from "node-fetch";
import fs from "fs";
import { execSync } from "child_process";
import FormData from "form-data";

const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.IG_ACCOUNT_ID;

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

// 商品取得
const products = JSON.parse(fs.readFileSync("./products.json", "utf-8"));
const product = products[Math.floor(Math.random() * products.length)];

const imagePath = "./image.jpg";
const videoPath = "./video.mp4";

// ① 画像ダウンロード
async function downloadImage() {
  const res = await fetch(product.image);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(imagePath, Buffer.from(buffer));
}

// ② 動画生成（9:16）
function generateVideo() {
  execSync(`
    ffmpeg -loop 1 -i ${imagePath} \
    -vf "scale=1080:1920,format=yuv420p" \
    -t 6 -r 30 -c:v libx264 ${videoPath}
  `);
}

// ③ Cloudinaryアップロード
async function uploadToCloudinary() {
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
  return data.secure_url;
}

// 待機
function sleep(ms){
  return new Promise(r => setTimeout(r, ms));
}

// ④ 投稿
async function postReel(video_url){

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
      method:"POST",
      body:new URLSearchParams({
        media_type:"REELS",
        video_url,
        caption,
        access_token:ACCESS_TOKEN
      })
    }
  );

  const mediaData = await media.json();
  console.log("MEDIA:", mediaData);

  if(!mediaData.id){
    throw new Error("メディア作成失敗");
  }

  console.log("WAIT...");
  await sleep(30000);

  const publish = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media_publish`,
    {
      method:"POST",
      body:new URLSearchParams({
        creation_id:mediaData.id,
        access_token:ACCESS_TOKEN
      })
    }
  );

  const publishData = await publish.json();
  console.log("PUBLISH:", publishData);
}

// 実行
async function run(){
  console.log("START");

  await downloadImage();
  generateVideo();

  const video_url = await uploadToCloudinary();
  console.log("VIDEO URL:", video_url);

  await postReel(video_url);
}

run();
