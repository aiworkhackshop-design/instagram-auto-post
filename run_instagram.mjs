import fetch from "node-fetch";

const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.IG_ACCOUNT_ID;

const image_url = "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg";
const caption = "Instagram API 自動投稿テスト";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function post() {

  const media = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method: "POST",
      body: new URLSearchParams({
        image_url,
        caption,
        access_token: ACCESS_TOKEN
      })
    }
  );

  const mediaData = await media.json();
  console.log("MEDIA:", mediaData);

  if (!mediaData.id) throw new Error("media creation failed");

  // コンテナREADY待ち
  let status = "IN_PROGRESS";
  while (status === "IN_PROGRESS") {

    await sleep(3000);

    const statusRes = await fetch(
      `https://graph.facebook.com/v19.0/${mediaData.id}?fields=status_code&access_token=${ACCESS_TOKEN}`
    );

    const statusData = await statusRes.json();
    status = statusData.status_code;

    console.log("STATUS:", status);
  }

  if (status !== "FINISHED") {
    throw new Error("Container failed");
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
}

post();
