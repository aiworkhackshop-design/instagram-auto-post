import fetch from "node-fetch";
import fs from "fs";
import { execSync } from "child_process";

const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.IG_ACCOUNT_ID;

// 商品取得
const products = JSON.parse(fs.readFileSync("./products.json", "utf-8"));
const product = products[0];

// 画像ダウンロード
const imagePath = "./image.jpg";
const videoPath = "./video.mp4";

async function downloadImage() {
  const res = await fetch(product.image);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(imagePath, Buffer.from(buffer));
}

// 動画生成（ffmpeg）
function generateVideo() {
  execSync(`
    ffmpeg -loop 1 -i ${imagePath} -c:v libx264 -t 5 -pix_fmt yuv420p -vf "scale=1080:1920" ${videoPath}
  `);
}

// ※ここ重要：動画を外部URL化（今回は簡易）
const video_url = "https://your-server.com/video.mp4";

const caption = `
🔥 今売れてる商品

${product.title}

👇 詳細はこちら
${product.url}

#Amazon #おすすめ #便利グッズ
`;

function sleep(ms){
  return new Promise(r => setTimeout(r, ms));
}

async function postReel(){

  console.log("START REEL");

  await downloadImage();
  generateVideo();

  // リール作成
  const media = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method:"POST",
      body:new URLSearchParams({
        media_type:"REELS",
        video_url:video_url,
        caption:caption,
        access_token:ACCESS_TOKEN
      })
    }
  );

  const mediaData = await media.json();
  console.log("MEDIA:", mediaData);

  if(!mediaData.id){
    throw new Error("メディア作成失敗");
  }

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

postReel();
