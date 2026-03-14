import requests
import os
from flask import Flask, jsonify

app = Flask(__name__)

RAKUTEN_APP_ID = os.environ.get("RAKUTEN_APP_ID")


def get_rakuten_items(keyword="イヤホン"):

    url = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601"

    params = {
        "applicationId": RAKUTEN_APP_ID,
        "keyword": keyword,
        "hits": 10
    }

    try:

        r = requests.get(url, params=params, timeout=10)
        data = r.json()

        items = []

        for item in data.get("Items", []):

            product = item["Item"]

            items.append({
                "title": product["itemName"],
                "price": product["itemPrice"],
                "url": product["itemUrl"],
                "image": product["mediumImageUrls"][0]["imageUrl"]
            })

        return items

    except Exception as e:

        return {"error": str(e)}


@app.route("/")
def home():
    return "Instagram自動投稿システム稼働"


@app.route("/rakuten")
def rakuten():
    return jsonify(get_rakuten_items())


@app.route("/rakuten/<keyword>")
def rakuten_search(keyword):
    return jsonify(get_rakuten_items(keyword))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
