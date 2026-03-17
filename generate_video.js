import { execSync } from "child_process";
import fs from "fs";
import fetch from "node-fetch";

const IMAGE_URL = "https://images.unsplash.com/photo-1542291026-7eec264c27ff";
const OUTPUT = "output.mp4";

async function downloadImage() {
  const res = await fetch(IMAGE_URL);
  const buffer = await res.buffer();
  fs.writeFileSync("image.jpg", buffer);
}

async function generateVideo() {
  execSync(`
    ffmpeg -y -loop 1 -i image.jpg \
    -vf "scale=1080:1920,zoompan=z='min(zoom+0.0015,1.2)':d=125" \
    -t 5 -pix_fmt yuv420p ${OUTPUT}
  `);
}

(async () => {
  await downloadImage();
  await generateVideo();
  console.log("VIDEO CREATED");
})();
