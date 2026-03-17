import fetch from "node-fetch";
import fs from "fs";

const IG_ID = process.env.IG_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

async function downloadImage(url, filepath){
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(filepath, Buffer.from(buffer));
}

async function sleep(ms){
  return new Promise(r=>setTimeout(r,ms));
}

async function post(){

  const imageUrl = "https://picsum.photos/1080/1080";
  const filePath = "./image.jpg";

  // ① ダウンロード
  await downloadImage(imageUrl, filePath);

  // ② アップロード
  const media = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method:"POST",
      body:new URLSearchParams({
        image_url: imageUrl, // ←ここ重要（実際はURLだが後で差し替え可能）
        caption: "テスト投稿",
        access_token: ACCESS_TOKEN
      })
    }
  );

  const mediaData = await media.json();

  if(!mediaData.id){
    console.log(mediaData);
    process.exit(1);
  }

  await sleep(8000);

  // ③ 投稿確定
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

  console.log(await publish.json());
}

post();
