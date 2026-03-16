import fetch from "node-fetch";

const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.IG_ACCOUNT_ID;

const image_url = "https://picsum.photos/800";
const caption = "GitHub自動投稿テスト";

async function post() {

  const media = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method: "POST",
      body: new URLSearchParams({
        image_url: image_url,
        caption: caption,
        access_token: ACCESS_TOKEN
      })
    }
  );

  const mediaData = await media.json();
  console.log("MEDIA:", mediaData);

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

await post();
