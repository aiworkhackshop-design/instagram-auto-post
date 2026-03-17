import fetch from "node-fetch";
import FormData from "form-data";

const IG_ID = process.env.IG_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;

const IMAGE_SOURCE = "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg";

async function sleep(ms){
  return new Promise(r=>setTimeout(r,ms));
}

// Cloudinary
async function uploadToCloudinary(){

  console.log("Cloudinary開始");

  const form = new FormData();
  form.append("file", IMAGE_SOURCE);
  form.append("upload_preset", "ml_default");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: form
    }
  );

  const data = await res.json();
  console.log("Cloudinary結果:", data);

  if(!data.secure_url){
    throw new Error("Cloudinary失敗");
  }

  return data.secure_url;
}

// Instagram
async function postInstagram(image_url){

  console.log("Instagram開始");

  const media = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method:"POST",
      body:new URLSearchParams({
        image_url,
        caption: "🔥売れてる商品",
        access_token: ACCESS_TOKEN
      })
    }
  );

  const mediaData = await media.json();
  console.log("MEDIA:", mediaData);

  if(!mediaData.id){
    throw new Error("MEDIA失敗");
  }

  await sleep(8000);

  const publish = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media_publish`,
    {
      method:"POST",
      body:new URLSearchParams({
        creation_id: mediaData.id,
        access_token: ACCESS_TOKEN
      })
    }
  );

  const publishData = await publish.json();
  console.log("PUBLISH:", publishData);
}

async function run(){

  console.log("START");

  const url = await uploadToCloudinary();

  console.log("URL:", url);

  await postInstagram(url);

  console.log("完了");
}

run();
