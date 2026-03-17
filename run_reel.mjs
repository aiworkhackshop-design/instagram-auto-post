function sleep(ms){
  return new Promise(r => setTimeout(r, ms));
}

async function postReel(){

  console.log("START REEL");

  // ① メディア作成
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

  // 🔥 ここが重要（待つ）
  console.log("WAITING...");
  await sleep(20000); // ←20秒待つ

  // ② 公開
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
