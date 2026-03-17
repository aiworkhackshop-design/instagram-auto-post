import fetch from "node-fetch";

const IG_ID = process.env.IG_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

// ★ここ重要（必ず直URL画像にする）
const image_url = "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg";

const caption = `🔥売れてる商品

詳細はプロフィールから👇

#おすすめ商品 #Amazon #楽天`;

async function sleep(ms){
  return new Promise(r=>setTimeout(r,ms));
}

async function post(){

  console.log("POST START");

  const media = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method:"POST",
      body:new URLSearchParams({
        image_url,
        caption,
        access_token: ACCESS_TOKEN
      })
    }
  );

  const mediaData = await media.json();
  console.log("MEDIA:", mediaData);

  if(!mediaData.id){
    console.error("MEDIA ERROR");
    process.exit(1);
  }

  await sleep(8000);

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

  if(!publishData.id){
    process.exit(1);
  }

  console.log("SUCCESS");
}

post();
