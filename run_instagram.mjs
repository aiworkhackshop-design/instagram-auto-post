import fetch from "node-fetch";
import crypto from "crypto";

const IG_ID =
  process.env.IG_ACCOUNT_ID ||
  process.env.INSTAGRAM_ACCOUNT_ID ||
  process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

const ACCESS_TOKEN =
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.FB_TOKEN;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

/* ---------- Amazon 売れ筋取得 (RSS) ---------- */
async function getAmazonBestSeller() {
  const rss =
    "https://www.amazon.co.jp/gp/rss/bestsellers/digital-text/2275256051/ref=zg_bs_rss"; // カテゴリは後で変更可

  const res = await fetch(rss);
  const xml = await res.text();

  const items = [...xml.matchAll(/<item>(.*?)<\/item>/gs)];

  if (!items.length) throw new Error("No items found");

  const pick = items[Math.floor(Math.random() * items.length)][1];

  const title = pick.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1];
  const link = pick.match(/<link>(.*?)<\/link>/)?.[1];

  return { title, link };
}

/* ---------- 商品ページから画像取得 ---------- */
async function scrapeImage(url) {
  const html = await (await fetch(url)).text();

  const img =
    html.match(/"large":"(https.*?)"/)?.[1] ||
    html.match(/"hiRes":"(https.*?)"/)?.[1];

  if (!img) throw new Error("Image not found");

  return img.replace(/\\u002F/g, "/");
}

/* ---------- AIキャプション ---------- */
async function createCaption(title, link) {
  if (!OPENAI_API_KEY) {
    return `🔥今Amazonで売れてる商品\n\n${title}\n\n詳しくはこちら👇\n${link}`;
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Instagramの売れる商品紹介キャプションを作る"
        },
        {
          role: "user",
          content: `この商品を紹介するInstagram投稿を書いてください\n\n${title}\n${link}`
        }
      ]
    })
  });

  const data = await res.json();

  return data.choices[0].message.content;
}

/* ---------- Instagram 投稿 ---------- */
async function postInstagram(image, caption) {
  const media = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method: "POST",
      body: new URLSearchParams({
        image_url: image,
        caption,
        access_token: ACCESS_TOKEN
      })
    }
  );

  const mediaData = await media.json();

  if (!mediaData.id) {
    console.log("MEDIA ERROR", mediaData);
    return;
  }

  await new Promise((r) => setTimeout(r, 8000));

  const publish = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media_publish`,
    {
      method: "POST",
      body: new URLSearchParams({
        creation_id: mediaData.id,
        access_token: ACCESS_TOKEN
      })
    }
  );

  const publishData = await publish.json();

  console.log("POSTED", publishData);
}

/* ---------- 実行 ---------- */
async function run() {
  console.log("Fetching Amazon product...");

  const product = await getAmazonBestSeller();

  console.log(product);

  const image = await scrapeImage(product.link);

  console.log("Image:", image);

  const caption = await createCaption(product.title, product.link);

  console.log("Caption:", caption);

  await postInstagram(image, caption);
}

run();
