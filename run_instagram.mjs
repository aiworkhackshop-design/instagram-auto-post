import fetch from "node-fetch";

const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.IG_ACCOUNT_ID;

const image_url = "https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=1080&q=80";
const caption = "Instagram API 自動投稿テスト";

async function sleep(ms){
  return new Promise(r => setTimeout(r, ms));
}

async function post(){

  const media = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method:"POST",
      body:new URLSearchParams({
        image_url:image_url,
        caption:caption,
        access_token:ACCESS_TOKEN
      })
    }
  );

  const mediaData = await media.json();
  console.log(mediaData);

  if(!mediaData.id){
    console.log("MEDIA ERROR:",mediaData);
    return;
  }

  await sleep(8000);

  const publish = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media_publish`,
    {
      method:"POST",
      body:new URLSearchParams({
        creation_id:mediaData.id,
        access_token:ACCESS_TOKEN
      })
    }
  );

  const publishData = await publish.json();
  console.log(publishData);
}

post();
