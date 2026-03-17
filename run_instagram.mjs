import fetch from "node-fetch";

const IG_ID = process.env.IG_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

// ★ 画像プロキシ（これが超重要）
const proxy = (url) =>
  `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;

// 商品データ（とりあえず3つ）
const products = [
  {
    image: proxy("https://m.media-amazon.com/images/I/61LtuGzXeaL._AC_SL1500_.jpg"),
    title: "Anker モバイルバッテリー",
    url: "https://amzn.to/"
  },
  {
    image: proxy("https://m.media-amazon.com/images/I/71lJkA6bGEL._AC_SL1500_.jpg"),
    title: "Fire TV Stick",
    url: "https://amzn.to/"
  },
  {
    image: proxy("https://m.media-amazon.com/images/I/61CGHv6kmWL._AC_SL1500_.jpg"),
    title: "Echo Dot",
    url: "https://amzn.to/"
  }
];

// ランダム選択
function getRandomProduct(){
  return products[Math.floor(Math.random()*products.length)];
}

// 待機
async function sleep(ms){
  return new Promise(r=>setTimeout(r,ms));
}

// 投稿
async function post(){

  const p = getRandomProduct();

  const caption = `🔥売れてる商品紹介

${p.title}

詳しくはこちら👇
${p.url}

#Amazon #おすすめ商品 #ガジェット`;

  // メディア作成
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
    console.log("MEDIA ERROR:",mediaData);
    process.exit(1);
  }

  console.log("MEDIA CREATED:", mediaData.id);

  await sleep(8000);

  // 投稿確定
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

  console.log("POST SUCCESS:", publishData);
}

post();
