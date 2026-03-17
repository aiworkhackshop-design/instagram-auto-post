import fetch from "node-fetch";
import fs from "fs";

const IG_ID =
  process.env.IG_ACCOUNT_ID ||
  process.env.INSTAGRAM_ACCOUNT_ID ||
  process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

const ACCESS_TOKEN =
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.FB_TOKEN;

// 商品データ読み込み
function getProduct() {
  const data = JSON.parse(fs.readFileSync("./products.json", "utf-8"));
  return data[Math.floor(Math.random() * data.length)];
}

async function sleep(ms){
  return new Promise(r => setTimeout(r, ms));
}

async function postImage(image_url, caption){

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
    console.log("MEDIA ERROR", mediaData);
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

  const publishData = await publish.json();

  console.log("POST SUCCESS", publishData);
}

async function run(){

  console.log("START");

  const product = getProduct();

  console.log(product);

  const caption = `🔥おすすめ商品

${product.title}

詳しくはこちら👇
${product.url}

#Amazon #便利グッズ #おすすめ`;

  await postImage(product.image, caption);
}

run();
