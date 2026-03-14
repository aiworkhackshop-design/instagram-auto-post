import os
import requests
from flask import Flask, jsonify

app = Flask(__name__)

ACCOUNT_ID = os.getenv("INSTAGRAM_BUSINESS_ACCOUNT_ID")
ACCESS_TOKEN = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")
RAKUTEN_APP_ID = os.getenv("RAKUTEN_APP_ID")

@app.route("/")
def home():
    return "AIアフィリエイトシステム稼働中"

@app.route("/post")
def post():

    rakuten_url = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601"

    params = {
        "applicationId": RAKUTEN_APP_ID,
        "keyword": "イヤホン",
        "hits": 1
    }

    r = requests.get(rakuten_url, params=params)
    data = r.json()

    if "Items" not in data or len(data["Items"]) == 0:
        return jsonify({"error":"楽天商品取得失敗","raw":data})

    item = data["Items"][0]["Item"]

    title = item["itemName"]
    image = item["mediumImageUrls"][0]["imageUrl"]
    link = item["itemUrl"]

    caption = f"{title}\n\n詳しくはこちら\n{link}"

    create_url = f"https://graph.facebook.com/v19.0/{ACCOUNT_ID}/media"

    payload = {
        "image_url": image,
        "caption": caption,
        "access_token": ACCESS_TOKEN
    }

    r1 = requests.post(create_url, data=payload)
    creation = r1.json()

    if "id" not in creation:
        return jsonify({"instagram_error":creation})

    publish_url = f"https://graph.facebook.com/v19.0/{ACCOUNT_ID}/media_publish"

    payload2 = {
        "creation_id": creation["id"],
        "access_token": ACCESS_TOKEN
    }

    r2 = requests.post(publish_url, data=payload2)

    return jsonify({
        "product": title,
        "link": link,
        "instagram": r2.json()
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
