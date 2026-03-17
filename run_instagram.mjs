import fetch from "node-fetch";

const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

const video_url = "https://your-video-url.mp4"; // ←ここ重要
const caption = "🔥今バズってる便利グッズ\n\nプロフからチェック👇";

async function sleep(ms){
  return new Promise(r => setTimeout(r, ms));
}

async function postReel(){

  console.log("START REEL");

  // ① メディア作成（動画）
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
  console.log("MEDIA:", mediaData);

  if(!mediaData.id){
    throw new Error("メディア作成失敗");
  }

  // ② 待機（重要）
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
  console.log("PUBLISH:", publishData);
}

postReel();
