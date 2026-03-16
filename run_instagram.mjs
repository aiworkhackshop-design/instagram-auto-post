import fetch from "node-fetch"

const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
const IG_ACCOUNT_ID = process.env.IG_ACCOUNT_ID

const image_url = "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9"
const caption = "テスト投稿🔥 GitHub自動投稿"

async function postToInstagram() {

  try {

    // ① media作成
    const params = new URLSearchParams({
      image_url: image_url,
      caption: caption,
      access_token: ACCESS_TOKEN
    })

    const mediaRes = await fetch(
      `https://graph.facebook.com/v19.0/${IG_ACCOUNT_ID}/media`,
      {
        method: "POST",
        body: params
      }
    )

    const mediaData = await mediaRes.json()

    if (!mediaData.id) {
      console.log("media作成エラー:", mediaData)
      process.exit(1)
    }

    console.log("media id:", mediaData.id)

    // ② publish
    const publishParams = new URLSearchParams({
      creation_id: mediaData.id,
      access_token: ACCESS_TOKEN
    })

    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${IG_ACCOUNT_ID}/media_publish`,
      {
        method: "POST",
        body: publishParams
      }
    )

    const publishData = await publishRes.json()

    console.log("投稿成功:", publishData)

  } catch (err) {

    console.log("投稿エラー:", err)

  }

}

postToInstagram()
