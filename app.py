import os
import requests
from flask import Flask

app = Flask(__name__)

ACCOUNT_ID = os.getenv("INSTAGRAM_BUSINESS_ACCOUNT_ID")
ACCESS_TOKEN = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")


@app.route("/")
def home():
    return "Instagram Auto Post Running 🚀"


@app.route("/post")
def post():

    url = f"https://graph.facebook.com/v19.0/{ACCOUNT_ID}/media"

    data = {
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg",
        "caption": "AIおすすめ商品ランキング🔥",
        "access_token": ACCESS_TOKEN
    }

    r = requests.post(url, data=data)
    result = r.json()

    if "id" not in result:
        return result

    creation_id = result["id"]

    publish_url = f"https://graph.facebook.com/v19.0/{ACCOUNT_ID}/media_publish"

    publish_data = {
        "creation_id": creation_id,
        "access_token": ACCESS_TOKEN
    }

    r2 = requests.post(publish_url, data=publish_data)

    return r2.text


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
