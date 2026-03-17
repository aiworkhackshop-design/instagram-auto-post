import fetch from "node-fetch";

// 🔥 強制的に全部拾う
const IG_ID =
  process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ||
  process.env.IG_ACCOUNT_ID ||
  "17841445883155732"; // ← 最後の保険

const TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

console.log("IG_ID:", IG_ID);
console.log("TOKEN存在:", !!TOKEN);

// ===== 投稿データ =====
const product = {
  title: "テスト投稿",
  image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
  url: "https://ai.workhack.shop"
};

function buildCaption(product) {
  return `🔥テスト投稿

${product.title}

${product.url}`;
}

async function postToInstagram() {
  console.log("START");

  const caption = buildCaption(product);

  // 🔥 form-dataで送る（これ重要）
  const params = new URLSearchParams();
  params.append("image_url", product.image);
  params.append("caption", caption);
  params.append("access_token", TOKEN);

  const createRes = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method: "POST",
      body: params,
    }
  );

  const createData = await createRes.json();
  console.log("create:", createData);

  if (!createData.id) {
    throw new Error("メディア作成失敗");
  }

  // 少し待つ
  await new Promise((r) => setTimeout(r, 8000));

  const publishParams = new URLSearchParams();
  publishParams.append("creation_id", createData.id);
  publishParams.append("access_token", TOKEN);

  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media_publish`,
    {
      method: "POST",
      body: publishParams,
    }
  );

  const publishData = await publishRes.json();
  console.log("publish:", publishData);

  if (!publishData.id) {
    throw new Error("投稿失敗");
  }

  console.log("✅ 投稿成功");
}

postToInstagram().catch((e) => {
  console.error("❌ エラー:", e.message);
  process.exit(1);
});
