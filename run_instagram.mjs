import fetch from "node-fetch"

// 環境変数を統一（複数のキー名に対応）
const IG_ACCOUNT_ID =
  process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ||
  process.env.INSTAGRAM_ACCOUNT_ID ||
  process.env.IG_ACCOUNT_ID ||
  ""

const FB_TOKEN =
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
  process.env.FB_TOKEN ||
  ""

// 環境変数確認ログ
console.log("=".repeat(60))
console.log("[run_instagram] Instagram投稿スクリプト開始")
console.log("=".repeat(60))
console.log("IG_ACCOUNT_ID:", IG_ACCOUNT_ID)
console.log("FB_TOKEN:", FB_TOKEN ? "SET" : "MISSING")
console.log("")

// 環境変数チェック
if (!IG_ACCOUNT_ID) {
  console.error("❌ エラー: IG_ACCOUNT_ID が設定されていません")
  console.error("GitHub Secrets に INSTAGRAM_BUSINESS_ACCOUNT_ID を設定してください")
  process.exit(1)
}

if (!FB_TOKEN) {
  console.error("❌ エラー: FB_TOKEN が設定されていません")
  console.error("GitHub Secrets に FACEBOOK_PAGE_ACCESS_TOKEN を設定してください")
  process.exit(1)
}

async function run() {
  try {
    console.log("【1】商品取得")
    const res = await fetch("https://instagram-auto-post.onrender.com/product")
    const product = await res.json()
    console.log("商品:", product)

    const image = product.image
    const caption = product.caption

    console.log("\n【2】media作成")
    console.log(`API URL: https://graph.facebook.com/v21.0/${IG_ACCOUNT_ID}/media`)

    // media作成（JSON形式）
    const create = await fetch(
      `https://graph.facebook.com/v21.0/${IG_ACCOUNT_ID}/media`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image_url: image,
          caption: caption,
          access_token: FB_TOKEN
        })
      }
    )

    const media = await create.json()
    console.log("media レスポンス:", JSON.stringify(media, null, 2))

    if (media.error) {
      console.error("❌ media作成エラー:")
      console.error("  message:", media.error.message)
      console.error("  code:", media.error.code)
      console.error("  error_subcode:", media.error.error_subcode)
      console.error("  fbtrace_id:", media.error.fbtrace_id)
      process.exit(1)
    }

    if (!media.id) {
      console.error("❌ media.id が返されていません")
      process.exit(1)
    }

    console.log("✅ media作成成功:", media.id)

    console.log("\n【3】投稿 publish")
    console.log(`API URL: https://graph.facebook.com/v21.0/${IG_ACCOUNT_ID}/media_publish`)

    // publish（JSON形式）
    const publish = await fetch(
      `https://graph.facebook.com/v21.0/${IG_ACCOUNT_ID}/media_publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          creation_id: media.id,
          access_token: FB_TOKEN
        })
      }
    )

    const result = await publish.json()
    console.log("publish レスポンス:", JSON.stringify(result, null, 2))

    if (result.error) {
      console.error("❌ publish エラー:")
      console.error("  message:", result.error.message)
      console.error("  code:", result.error.code)
      console.error("  error_subcode:", result.error.error_subcode)
      console.error("  fbtrace_id:", result.error.fbtrace_id)
      process.exit(1)
    }

    if (!result.id) {
      console.error("❌ result.id が返されていません")
      process.exit(1)
    }

    console.log("✅ publish成功:", result.id)
    console.log("\n" + "=".repeat(60))
    console.log("✅ Instagram投稿完了")
    console.log("=".repeat(60))

  } catch (error) {
    console.error("❌ エラーが発生しました:")
    console.error(error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

run()
