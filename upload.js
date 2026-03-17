import fetch from "node-fetch";
import fs from "fs";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;

async function upload() {
  const file = fs.readFileSync("output.mp4");

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
    {
      method: "POST",
      body: form
    }
  );

  const data = await res.json();
  console.log("VIDEO URL:", data.secure_url);

  return data.secure_url;
}

export default upload;
