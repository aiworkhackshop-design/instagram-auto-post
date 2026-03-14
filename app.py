import os
import requests
from flask import Flask

app = Flask(__name__)

TOKEN = os.environ.get("INSTAGRAM_TOKEN")
ACCOUNT_ID = os.environ.get("INSTAGRAM_ACCOUNT_ID")

@app.route("/")
def home():
    return "Instagram自動投稿BOT稼働中"

@app.route("/post")
def post():
    image_url = "https://picsum.photos/1080/1080"
    caption = "AI WorkHack テスト投稿 🚀"

    create_url = f"https://graph.facebook.com/v19.0/{ACCOUNT_ID}/media"
    create_res = requests.post(create_url, data={
        "image_url": image_url,
        "caption": caption,
        "access_token": TOKEN
    }).json()

    creation_id = create_res.get("id")

    publish_url = f"https://graph.facebook.com/v19.0/{ACCOUNT_ID}/media_publish"
    publish_res = requests.post(publish_url, data={
        "creation_id": creation_id,
        "access_token": TOKEN
    }).json()

    return publish_res

if __name__ == "__main__":
    app.run()
