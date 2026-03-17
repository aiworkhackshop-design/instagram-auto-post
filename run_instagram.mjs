import fetch from "node-fetch";

const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.IG_ACCOUNT_ID;

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;

// 🔥 商品データ（仮：後でAPI化）
const product = {
  title: "今売れてる神アイテム",
  image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff", // ←あとで楽天に変える
  url: "https://example.com"
};

// Cloudinaryアップロード
async function uploadToCloudinary(imageUrl) {
  console.log("Cloudinary開始");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: new URLSearchParams({
        file: imageUrl,
        upload_preset: "ml_default"
      })
    }
  );

  const data = await res.json();
  console.log("Cloudinary結果:", data);

  if (!data.secure_url) {
    throw new Error("Cloudinary失敗");
  }

  return data.secure_url;
}

// Instagram投稿
async function postToInstagram(imageUrl, caption) {

  const media = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method: "POST",
      body: new URLSearchParams({
        image_url: imageUrl,
        caption: caption,
        access_token: ACCESS_TOKEN
      })
    }
  );

  const mediaData = await media.json();
  console.log("MEDIA:", mediaData);

  if (!mediaData.id) {
    throw new Error("media作成失敗");
  }

  // 少し待つ
  await new Promise(r => setTimeout(r, 8000));

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
  console.log("PUBLISH:", publishData);
}

// 実行
async function run() {
  console.log("START");

  // ① CloudinaryでURL生成
  const imageUrl = await uploadToCloudinary(product.image);

  // ② キャプション生成（ここ重要）
  const caption = `
🔥【ガチで売れてる】
${product.title}

✔ 今SNSで話題
✔ コスパ最強
✔ 在庫なくなる前にチェック

👇詳細はプロフィールから
${product.url}

#おすすめ商品 #Amazon #楽天
`;

  // ③ 投稿
  await postToInstagram(imageUrl, caption);
}

run();
