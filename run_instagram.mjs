import fetch from "node-fetch";

const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.IG_ACCOUNT_ID;

console.log("IG_ID:", IG_ID);
console.log("TOKEN exists:", !!ACCESS_TOKEN);

const image_url = "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg";
const caption = "Instagram API 自動投稿テスト";

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function post() {

  try {

    const mediaRes = await fetch(
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

    const mediaData = await mediaRes.json();
    console.log("MEDIA RESPONSE:", mediaData);

    if (!mediaData.id) {
      console.error("MEDIA ERROR:", mediaData);
      throw new Error("media creation failed");
    }

    // Instagram処理待ち
    await sleep(5000);

    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${IG_ID}/media_publish`,
      {
        method: "POST",
        body: new URLSearchParams({
          creation_id: mediaData.id,
          access_token: ACCESS_TOKEN
        })
      }
    );

    const publishData = await publishRes.json();
    console.log("PUBLISH RESPONSE:", publishData);

  } catch (err) {

    console.error("ERROR:", err);

  }

}

post().then(() => {
  console.log("DONE");
});
