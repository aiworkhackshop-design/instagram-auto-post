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

  if (!RAKUTEN_APP_ID) {
    console.log("RAKUTEN_APP_ID missing");
    process.exit(1);
  }

  const url =
    `https://app.rakuten.co.jp/services/api/IchibaItem/Ranking/20170628?applicationId=${RAKUTEN_APP_ID}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.Items || data.Items.length === 0) {
    console.log("Rakuten API error", data);
    process.exit(1);
  }

  const item = data.Items[0].Item;

  return {
    title: item.itemName,
    image: item.mediumImageUrls[0].imageUrl.replace("?_ex=128x128", ""),
    url: item.itemUrl
  };
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createMedia(image_url, caption) {

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method: "POST",
      body: new URLSearchParams({
        image_url,
        caption,
        access_token: ACCESS_TOKEN
      })
    }
  );

  const data = await res.json();

  if (!data.id) {
    console.log("MEDIA ERROR", data);
    process.exit(1);
  }

  return data.id;
}

async function publishMedia(creation_id) {

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media_publish`,
    {
      method: "POST",
      body: new URLSearchParams({
        creation_id,
        access_token: ACCESS_TOKEN
      })
    }
  );

  const data = await res.json();

  if (!data.id) {
    console.log("PUBLISH ERROR", data);
    process.exit(1);
  }

  console.log("POST SUCCESS", data);
}

async function run() {

  console.log("Fetching Rakuten ranking...");

  const product = await getRakutenRanking();

  console.log(product);

  const caption = `🔥楽天ランキング1位

${product.title}

詳しくはこちら👇
${product.url}

#楽天 #楽天市場 #おすすめ商品`;

  const creationId = await createMedia(product.image, caption);

  await sleep(8000);

  await publishMedia(creationId);
}

run();
