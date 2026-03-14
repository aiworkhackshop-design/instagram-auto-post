import fetch from "node-fetch"

const IG_ID = process.env.INSTAGRAM_ACCOUNT_ID
const TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN

async function run() {

  console.log("商品取得")

  const res = await fetch("https://instagram-auto-post.onrender.com/product")
  const product = await res.json()

  console.log(product)

  const image = product.image
  const caption = product.caption

  console.log("media作成")

  const create = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image_url: image,
        caption: caption,
        access_token: TOKEN
      })
    }
  )

  const media = await create.json()

  console.log("mediaID", media)

  console.log("投稿 publish")

  const publish = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media_publish`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        creation_id: media.id,
        access_token: TOKEN
      })
    }
  )

  const result = await publish.json()

  console.log("投稿結果", result)

}

run()
