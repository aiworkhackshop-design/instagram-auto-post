import fetch from "node-fetch";

const IG_ID = process.env.IG_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

async function getRakutenRanking(){

  const res = await fetch("https://ranking.rakuten.co.jp/daily/");
  const html = await res.text();

  const imgMatch = html.match(/https:\/\/thumbnail.image.rakuten.co.jp\/.*?jpg/);

  if(!imgMatch){
    throw new Error("楽天画像取得失敗");
  }

  return {
    image: imgMatch[0],
    title: "楽天ランキング商品",
    url: "https://ranking.rakuten.co.jp/"
  };
}

async function sleep(ms){
  return new Promise(r=>setTimeout(r,ms));
}

async function postInstagram(image_url, caption){

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

async function run(){

  const product = await getRakutenRanking();

  const caption = `🔥楽天ランキング商品

${product.title}

詳しくはこちら👇
${product.url}

#楽天ランキング #おすすめ商品`;

  await postInstagram(product.image, caption);
}

run();
