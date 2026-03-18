// run_reel.mjs (Manus-aware, safer ffmpeg drawtext, cloudinary preset env)
import fs from "fs";
import path from "path";
import os from "os";
import { spawnSync } from "child_process";

const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.IG_ACCOUNT_ID;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "reel_upload_1";
const PRODUCTS_SOURCE = process.env.PRODUCTS_SOURCE || ""; // e.g. https://aiworkshop-egbeyarq.manus.space

const imagePath = path.resolve("./image.jpg");
const videoPath = path.resolve("./video.mp4");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "reel-"));

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function assertEnv(){
  if(!ACCESS_TOKEN) throw new Error("FACEBOOK_PAGE_ACCESS_TOKEN missing");
  if(!IG_ID) throw new Error("IG_ACCOUNT_ID missing");
  if(!CLOUD_NAME) throw new Error("CLOUDINARY_CLOUD_NAME missing");
  if(!CLOUD_PRESET) throw new Error("CLOUDINARY_UPLOAD_PRESET missing");
}

function findFont(){
  const candidates = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansJP-Bold.otf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
  ];
  for(const p of candidates) if(fs.existsSync(p)) return p;
  return null;
}

async function fetchJsonOrText(url){
  const res = await fetch(url);
  const ct = res.headers.get("content-type") || "";
  if(ct.includes("application/json")) return await res.json();
  return await res.text();
}

/* ---------- データ取得: Manus 対応 ----------
   戻り値: 商品オブジェクト {title,image,url}
   ロジック:
   - PRODUCTS_SOURCE が URL の場合、まず JSON を試す
   - HTML の場合 application/ld+json を探す or og:meta から抽出
   - 失敗したらローカル products.json を使う
*/
async function loadProducts(){
  if(PRODUCTS_SOURCE.startsWith("http")){
    try{
      console.log("Trying to fetch PRODUCTS_SOURCE:", PRODUCTS_SOURCE);
      const txt = await fetchJsonOrText(PRODUCTS_SOURCE);
      // case: JSON array or object
      if(Array.isArray(txt) && txt.length>0){
        console.log("Got JSON array from source");
        return txt;
      }
      if(typeof txt === "object" && txt !== null){
        // object -> maybe contains items
        if(Array.isArray(txt.items) && txt.items.length) return txt.items;
        // fallback: wrap the object
        return [txt];
      }
      // if HTML string: try to extract ld+json or og: tags
      const html = String(txt);
      // 1) ld+json
      const ldMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
      if(ldMatch){
        try{
          const parsed = JSON.parse(ldMatch[1]);
          // parsed could be object or array
          if(Array.isArray(parsed)) return parsed;
          if(parsed && parsed["@type"] && parsed.name){
            // convert to array of product-like objects
            return [ { title: parsed.name, image: parsed.image, url: parsed.url || PRODUCTS_SOURCE } ];
          }
        }catch(e){ console.warn("ld+json parse failed", e.message); }
      }
      // 2) og tags (title, image, url)
      const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
      const ogUrl = html.match(/<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i);
      if(ogTitle || ogImage){
        return [ { title: ogTitle ? ogTitle[1] : "product", image: ogImage ? ogImage[1] : null, url: ogUrl ? ogUrl[1] : PRODUCTS_SOURCE } ];
      }
      console.warn("Could not parse remote source, falling back to local products.json");
    }catch(err){
      console.warn("Fetch PRODUCTS_SOURCE failed:", err.message || err);
    }
  }

  // ローカル読み込み
  try{
    const raw = fs.readFileSync("./products.json","utf8");
    const arr = JSON.parse(raw);
    if(Array.isArray(arr) && arr.length) return arr;
    throw new Error("products.json invalid");
  }catch(err){
    throw new Error("No product data available (remote/local failed): " + (err.message || err));
  }
}

function pickValidProduct(products){
  const valid = products.filter(p => p && p.image && p.title && p.url);
  if(valid.length===0) throw new Error("商品データ不正 or 取得できず");
  const product = valid[Math.floor(Math.random()*valid.length)];
  product.title = `【神】${product.title.replace(/\n/g," ").slice(0,40)}`;
  return product;
}

async function downloadImage(url){
  console.log("DOWNLOAD:", url);
  try{
    const res = await fetch(url);
    if(!res.ok) throw new Error("bad response " + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(imagePath, buf);
    console.log("Saved image ->", imagePath);
    return;
  }catch(e){
    console.warn("画像取得失敗, fallback 使用:", e.message || e);
    const fb = await fetch("https://picsum.photos/1080/1920");
    const buf = Buffer.from(await fb.arrayBuffer());
    fs.writeFileSync(imagePath, buf);
    console.log("Saved fallback image ->", imagePath);
  }
}

function makeTextFile(name, text){
  const p = path.join(tmpDir, name + ".txt");
  fs.writeFileSync(p, text, "utf8");
  return p;
}

function generateVideo(product){
  console.log("GENERATE VIDEO");
  const font = findFont();
  if(!font) console.warn("フォントが見つかりません。日本語が化ける可能性あり");

  const topFile = makeTextFile("top", "【保存しないと損】");
  const titleFile = makeTextFile("title", product.title);
  const ctaFile = makeTextFile("cta", "👇プロフからチェック");

  const fontOpt = font ? `:fontfile=${font}` : "";

  const vfParts = [
    "scale=1080:1920",
    // 上の帯
    "drawbox=x=0:y=0:w=1080:h=360:color=black@0.55:t=fill",
    // 上テキスト
    `drawtext${fontOpt}:textfile=${topFile}:fontcolor=yellow:fontsize=78:x=(w-text_w)/2:y=40:box=0`,
    // タイトル
    `drawtext${fontOpt}:textfile=${titleFile}:fontcolor=white:fontsize=56:x=(w-text_w)/2:y=140:box=0`,
    // 下の帯
    "drawbox=x=0:y=1500:w=1080:h=420:color=black@0.55:t=fill",
    // CTA
    `drawtext${fontOpt}:textfile=${ctaFile}:fontcolor=white:fontsize=48:x=(w-text_w)/2:y=1580:box=0`,
    "format=yuv420p"
  ];
  const vf = vfParts.join(",");

  const args = [
    "-y",
    "-loop","1",
    "-i", imagePath,
    "-vf", vf,
    "-t","6",
    "-r","30",
    "-c:v","libx264",
    "-pix_fmt","yuv420p",
    videoPath
  ];
  console.log("Running ffmpeg...");
  const r = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if(r.status !== 0) throw new Error("ffmpeg failed");
  if(!fs.existsSync(videoPath)) throw new Error("動画生成失敗");
  console.log("Generated video ->", videoPath);
}

async function uploadToCloudinary(){
  console.log("UPLOAD CLOUDINARY preset:", CLOUD_PRESET);
  const buf = fs.readFileSync(videoPath);
  const base64 = buf.toString("base64");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({
      file: `data:video/mp4;base64,${base64}`,
      upload_preset: CLOUD_PRESET,
      public_id: `reel_${Date.now()}`,
      resource_type: "video"
    })
  });
  const data = await res.json();
  console.log("CLOUDINARY:", data);
  if(!data.secure_url) {
    console.error("Cloudinary failure object:", data);
    throw new Error("Cloudinary失敗");
  }
  return data.secure_url;
}

async function waitForMedia(mediaId){
  for(let i=0;i<12;i++){
    console.log("CHECK STATUS...", i+1);
    const res = await fetch(`https://graph.facebook.com/v19.0/${mediaId}?fields=status_code&access_token=${ACCESS_TOKEN}`);
    const data = await res.json();
    console.log("STATUS:", data);
    if(data.status_code === "FINISHED") return;
    await sleep(8000);
  }
  throw new Error("動画処理終わらない");
}

async function postReel(product, video_url){
  const caption = [
    "【保存推奨】",
    "",
    "今バズってる商品👇",
    "",
    product.title,
    "",
    "👇プロフからチェック",
    product.url,
    "",
    "#Amazon #便利グッズ #買ってよかった"
  ].join("\n");

  console.log("CREATE MEDIA");
  const media = await fetch(`https://graph.facebook.com/v19.0/${IG_ID}/media`, {
    method: "POST",
    body: new URLSearchParams({
      media_type: "REELS",
      video_url,
      caption,
      access_token: ACCESS_TOKEN
    })
  });
  const mediaData = await media.json();
  console.log("MEDIA:", mediaData);
  if(!mediaData.id) throw new Error("メディア作成失敗");

  await waitForMedia(mediaData.id);

  console.log("PUBLISH");
  const publish = await fetch(`https://graph.facebook.com/v19.0/${IG_ID}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({
      creation_id: mediaData.id,
      access_token: ACCESS_TOKEN
    })
  });
  const pubData = await publish.json();
  console.log("PUBLISH:", pubData);
  if(!pubData.id) throw new Error("投稿失敗");
}

async function run(){
  try{
    console.log("START");
    assertEnv();
    const products = await loadProducts();
    const product = pickValidProduct(products);
    console.log("PRODUCT:", product);

    await downloadImage(product.image);
    generateVideo(product);

    const video_url = await uploadToCloudinary();
    console.log("VIDEO URL:", video_url);

    await postReel(product, video_url);

    console.log("SUCCESS 🎉");
  }catch(err){
    console.error("ERROR:", err && err.message ? err.message : err);
    process.exit(1);
  }finally{
    try{ fs.rmSync(tmpDir, { recursive:true, force:true }); }catch(e){}
  }
}

run();
