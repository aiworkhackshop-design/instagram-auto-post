import os
import requests
from flask import Flask, jsonify

app = Flask(__name__)

ACCOUNT_ID = os.getenv("INSTAGRAM_BUSINESS_ACCOUNT_ID")
ACCESS_TOKEN = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")
RAKUTEN_APP_ID = os.getenv("RAKUTEN_APP_ID")

@app.route("/")
def home():
    return "AI Affiliate System Running"

@app.route("/post")
def post():

    # 楽天商品取得
    rakuten_url = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601"

    params = {
        "applicationId": RAKUTEN_APP_ID,
        "keyword": "ガジェット",
        "hits": 1
    }

    r = requests.get(rakuten_url, params=params)
    data = r.json()

    item = data["Items"][0]["Item"]

    title = item["itemName"]
    image = item["mediumImageUrls"][0]["imageUrl"]
    link = item["itemUrl"]

    caption = f"""【AIおすすめ商品】

{title}

詳しくはこちら👇
{link}
"""

    # Instagram投稿
    create_url = f"https://graph.facebook.com/v19.0/{ACCOUNT_ID}/media"

    payload = {
        "image_url": image,
        "caption": caption,
        "access_token": ACCESS_TOKEN
    }

    r1 = requests.post(create_url, data=payload)
    creation_id = r1.json()["id"]

    publish_url = f"https://graph.facebook.com/v19.0/{ACCOUNT_ID}/media_publish"

    payload2 = {
        "creation_id": creation_id,
        "access_token": ACCESS_TOKEN
    }

    r2 = requests.post(publish_url, data=payload2)

    return jsonify({
        "product": title,
        "image": image,
        "link": link,
        "instagram": r2.json()
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
