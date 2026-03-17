import fetch from "node-fetch";

const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.IG_ACCOUNT_ID;

// 仮動画（まずテスト用）
const video_url = "https://samplelib.com/lib/preview/mp4/sample-5s.mp4";

const caption = "🔥おすすめ商品（リールテスト）";

async function sleep(ms){
  return new Promise(r => setTimeout(r, ms));
}

async function postReel(){

  console.log("START REEL");

  // ① リール作成
  const media = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method:"POST",
      body:new URLSearchParams({
        media_type: "REELS",   // ←ここ重要
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

  await sleep(10000);

  // ② 公開
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
