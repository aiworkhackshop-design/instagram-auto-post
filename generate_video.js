function generateVideo(product) {
  console.log("GENERATE VIDEO");

  const safeTitle = product.title
    .replace(/'/g, "")
    .replace(/:/g, "")
    .slice(0, 18);

  execSync(`
    ffmpeg -y -loop 1 -i ${imagePath} \
    -vf "
    scale=1080:1920,

    zoompan=z='min(zoom+0.002,1.3)':d=180,

    drawbox=x=0:y=0:w=1080:h=350:color=black@0.6:t=fill,

    drawtext=fontfile=/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc:
    text='【保存しないと損】':
    fontcolor=yellow:
    fontsize=85:
    x=(w-text_w)/2:
    y=80,

    drawtext=fontfile=/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc:
    text='${safeTitle}':
    fontcolor=white:
    fontsize=60:
    x=(w-text_w)/2:
    y=200,

    drawbox=x=0:y=1550:w=1080:h=300:color=black@0.6:t=fill,

    drawtext=fontfile=/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc:
    text='👇プロフのリンクから':
    fontcolor=white:
    fontsize=55:
    x=(w-text_w)/2:
    y=1600,

    drawtext=fontfile=/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc:
    text='今すぐチェック':
    fontcolor=yellow:
    fontsize=70:
    x=(w-text_w)/2:
    y=1700,

    format=yuv420p
    " \
    -t 6 -r 30 -c:v libx264 -pix_fmt yuv420p ${videoPath}
  `);
}
