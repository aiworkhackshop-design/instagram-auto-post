import fetch from "node-fetch";
import fs from "fs";

const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.IG_ACCOUNT_ID;

// 商品読み込み
const products = JSON.parse(fs.readFileSync("./products.json", "utf-8"));
const product = products[0];

// ⚠️ 仮：画像を動画として使う（疑似リール）
const video_url = product.image; 

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

  console.log("WAITING...");
  await sleep(30000);

  // 投稿
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
