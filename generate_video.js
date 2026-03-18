function generateVideo(product) {
  console.log("GENERATE VIDEO");

  const safeTitle = product.title
    .replace(/'/g, "")
    .replace(/:/g, "")
    .slice(0, 20);

  execSync(`
    ffmpeg -y -loop 1 -i ${imagePath} \
    -vf "
    scale=1080:1920,
    zoompan=z='min(zoom+0.0015,1.4)':d=180,

    drawbox=x=0:y=0:w=1080:h=500:color=black@0.7:t=fill,
    drawbox=x=0:y=1500:w=1080:h=420:color=black@0.7:t=fill,

    drawtext=fontfile=/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc:
    text='【保存しないと損】':
    fontcolor=yellow:
    fontsize=90:
    x=(w-text_w)/2:
    y=120,

    drawtext=fontfile=/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc:
    text='${safeTitle}':
    fontcolor=white:
    fontsize=65:
    x=(w-text_w)/2:
    y=300,

    drawtext=fontfile=/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc:
    text='👇プロフのリンクから見れる':
    fontcolor=white:
    fontsize=55:
    x=(w-text_w)/2:
    y=1580,

    format=yuv420p
    " \
    -t 6 -r 30 -c:v libx264 -pix_fmt yuv420p ${videoPath}
  `);
}
