import os
import requests
from flask import Flask

app = Flask(__name__)

ACCESS_TOKEN = os.environ.get("INSTAGRAM_ACCESS_TOKEN")
INSTAGRAM_ACCOUNT_ID = os.environ.get("INSTAGRAM_ACCOUNT_ID")


@app.route("/")
def home():
    return "Instagram自動投稿BOT稼働中"


@app.route("/post")
def post():
    
    image_url = "https://picsum.photos/1080"
    caption = "AI WorkHack テスト投稿 🚀"

    create_url = f"https://graph.facebook.com/v19.0/{INSTAGRAM_ACCOUNT_ID}/media"

    create_payload = {
        "image_url": image_url,
        "caption": caption,
        "access_token": ACCESS_TOKEN
    }

    r = requests.post(create_url, data=create_payload)
    result = r.json()

    if "id" not in result:
        return result

    creation_id = result["id"]

    publish_url = f"https://graph.facebook.com/v19.0/{INSTAGRAM_ACCOUNT_ID}/media_publish"

    publish_payload = {
        "creation_id": creation_id,
        "access_token": ACCESS_TOKEN
    }

    r2 = requests.post(publish_url, data=publish_payload)

    return r2.json()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
