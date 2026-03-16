import fetch from "node-fetch";

const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.IG_ACCOUNT_ID;

const image_url = "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg";
const caption = "Instagram API 自動投稿テスト";

async function post() {

  try {

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

    if (!mediaData.id) {
      throw new Error("media creation failed");
    }

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

  } catch (err) {

    console.error("ERROR:", err);

  }

}

post().then(() => {
  console.log("DONE");
});
