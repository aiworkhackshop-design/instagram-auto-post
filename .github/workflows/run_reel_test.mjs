import fetch from "node-fetch";

const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

// 確実に動くテスト動画
const video_url = "https://filesamples.com/samples/video/mp4/sample_640x360.mp4";

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {

  console.log("① メディア作成開始");

  const mediaRes = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method: "POST",
      body: new URLSearchParams({
        media_type: "VIDEO",
        video_url: video_url,
        caption: "テスト投稿🔥",
        access_token: ACCESS_TOKEN
      })
    }
  );

  const mediaData = await mediaRes.json();
  console.log("MEDIA:", mediaData);

  if (!mediaData.id) {
    throw new Error("メディア作成失敗");
  }

  console.log("② 待機中（30秒）");
  await sleep(30000);

  console.log("③ 投稿");

  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media_publish`,
    {
      method: "POST",
      body: new URLSearchParams({
        creation_id: mediaData.id,
        access_token: ACCESS_TOKEN
      })
    }
  );

  const publishData = await publishRes.json();
  console.log("PUBLISH:", publishData);

}

main();
