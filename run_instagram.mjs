import fetch from "node-fetch";

const IG_ID =
  process.env.IG_ACCOUNT_ID ||
  process.env.INSTAGRAM_ACCOUNT_ID ||
  process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

const ACCESS_TOKEN =
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.FB_TOKEN;

const RAKUTEN_APP_ID =
  process.env.RAKUTEN_APP_ID || process.env.RAKUTEN_ACCESS_KEY;

async function getRakutenRanking() {

  const url =
    `https://app.rakuten.co.jp/services/api/IchibaItem/Ranking/20170628?applicationId=${RAKUTEN_APP_ID}`;

  const res = await fetch(url);
  const data = await res.json();

  const item = data.Items[0].Item;

  return {
    title: item.itemName,
    image: item.mediumImageUrls[0].imageUrl.replace("?_ex=128x128",""),
    url: item.itemUrl
  };
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

  const publishData = await publish.json();

  console.log("POST SUCCESS:", publishData);
}

async function run(){

  const product = await getRakutenRanking();

  const caption = `🔥楽天ランキング1位

${product.title}

詳しくはこちら👇
${product.url}

#楽天 #楽天市場`;

  await postImage(product.image, caption);
}

run();
