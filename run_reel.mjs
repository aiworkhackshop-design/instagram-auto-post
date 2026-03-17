import fetch from "node-fetch";
import upload from "./upload.js";

const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

async function sleep(ms){
  return new Promise(r => setTimeout(r, ms));
}

async function postReel(){

  // ① 動画URL取得
  const video_url = await upload();

  const caption = "🔥今バズってる便利グッズ\nプロフからチェック👇";

  // ② メディア作成
  const media = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method:"POST",
      body:new URLSearchParams({
        media_type: "VIDEO",
        video_url: video_url,
        caption: caption,
        access_token: ACCESS_TOKEN
      })
    }
  );

  const mediaData = await media.json();
  console.log(mediaData);

  await sleep(15000);

  // ③ 投稿
  const publish = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media_publish`,
    {
      method:"POST",
      body:new URLSearchParams({
        creation_id: mediaData.id,
        access_token: ACCESS_TOKEN
      })
    }
  );

  const publishData = await publish.json();
  console.log(publishData);
}

postReel();
