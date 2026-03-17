import fetch from "node-fetch";
import FormData from "form-data";

const IG_ID = process.env.IG_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;

// ★テスト（後で楽天に変える）
const IMAGE_SOURCE = "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg";

async function sleep(ms){
  return new Promise(r=>setTimeout(r,ms));
}

// ① Cloudinaryに直接アップ
async function uploadToCloudinary(){

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
  console.log("CLOUDINARY:", data);

  if(!data.secure_url){
    throw new Error("Cloudinary失敗");
  }

  return data.secure_url;
}

// ② Instagram投稿
async function postInstagram(image_url){

  const media = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ID}/media`,
    {
      method:"POST",
      body:new URLSearchParams({
        image_url,
        caption: "🔥売れてる商品\n\nプロフィールから👇",
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

  console.log("PUBLISH:", await publish.json());
}

async function run(){

  console.log("① Cloudinaryアップ");
  const url = await uploadToCloudinary();

  console.log("② Instagram投稿");
  await postInstagram(url);

  console.log("✅ 完了");
}

run();
