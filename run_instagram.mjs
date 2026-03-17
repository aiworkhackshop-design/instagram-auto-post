import fetch from "node-fetch";

// ===== 設定 =====
const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
const TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

// ===== 投稿データ（例）=====
const product = {
  title: "今売れてる神アイテム",
  image: "https://your-manus-image-url.jpg", // ← ManusのURLそのまま
  url: "https://your-site.com/product" // ← 実URL入れる
};

// ===== キャプション生成 =====
function buildCaption(product) {
  return `🔥【ガチで売れてる】\n${product.title}

✔ 今SNSで話題  
✔ コスパ最強  
✔ 在庫なくなる前にチェック  

👇 詳細はこちら  
${product.url}

#おすすめ商品 #Amazon #楽天`;
}

// ===== Instagram投稿 =====
async function postToInstagram() {
  console.log("START");

  const caption = buildCaption(product);

  // ① メディア作成
  const createRes = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: product.image,
        caption: caption,
        access_token: TOKEN,
      }),
    }
  );

  const createData = await createRes.json();
  console.log("create:", createData);

  if (!createData.id) {
    throw new Error("メディア作成失敗");
  }

  // ② 投稿公開
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media_publish`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        creation_id: createData.id,
        access_token: TOKEN,
      }),
    }
  );

  const publishData = await publishRes.json();
  console.log("publish:", publishData);

  if (!publishData.id) {
    throw new Error("投稿失敗");
  }

  console.log("✅ 投稿完了");
}

// ===== 実行 =====
postToInstagram().catch((e) => {
  console.error("❌ エラー:", e.message);
  process.exit(1);
});
