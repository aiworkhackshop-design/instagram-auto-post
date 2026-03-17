import fetch from "node-fetch";

const IG_ID = process.env.IG_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const products = [
  {
    image: "https://m.media-amazon.com/images/I/61LtuGzXeaL._AC_SL1500_.jpg",
    title: "Anker モバイルバッテリー",
    url: "https://amzn.to/"
  },
  {
    image: "https://m.media-amazon.com/images/I/71lJkA6bGEL._AC_SL1500_.jpg",
    title: "Fire TV Stick",
    url: "https://amzn.to/"
  },
  {
    image: "https://m.media-amazon.com/images/I/61CGHv6kmWL._AC_SL1500_.jpg",
    title: "Echo Dot",
    url: "https://amzn.to/"
  }
];

function getRandomProduct(){
  return products[Math.floor(Math.random()*products.length)];
}

async function sleep(ms){
  return new Promise(r=>setTimeout(r,ms));
}

async function post(){

  const p = getRandomProduct();

  const caption = `🔥売れてる商品紹介

${p.title}

詳しくはこちら👇
${p.url}

#Amazon #おすすめ商品 #ガジェット`;

  const media = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method:"POST",
      body:new URLSearchParams({
        image_url:p.image,
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
