function generateVideo(product) {
  console.log("GENERATE VIDEO");

  execSync(`
    ffmpeg -y -loop 1 -i ${imagePath} \
    -vf "scale=1080:1920,
    drawtext=text='これ知らないと損':fontcolor=white:fontsize=80:x=(w-text_w)/2:y=200,
    drawtext=text='${product.title}':fontcolor=white:fontsize=60:x=(w-text_w)/2:y=350,
    format=yuv420p" \
    -t 6 -r 30 -c:v libx264 ${videoPath}
  `);
}
