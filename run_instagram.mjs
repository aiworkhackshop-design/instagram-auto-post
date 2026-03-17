import fetch from "node-fetch";

const IG_ID = process.env.IG_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

// ★ 自分のGitHub画像URLにする
const image_url = "https://raw.githubusercontent.com/xxxx/xxxx/main/images/product.jpg";

const caption = `🔥売れてる商品紹介

超人気商品

詳しくはプロフィール👇

#おすすめ商品 #Amazon`;

async function sleep(ms){
  return new Promise(r=>setTimeout(r,ms));
}

async function post(){

  const media = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method:"POST",
      body:new URLSearchParams({
        image_url,
        caption,
        access_token:ACCESS_TOKEN
      })
    }
  );

  const mediaData = await media.json();

  if(!mediaData.id){
    console.log(mediaData);
    process.exit(1);
  }

  await sleep(8000);

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
