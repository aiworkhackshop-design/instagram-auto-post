import os
import requests
from flask import Flask, jsonify

app = Flask(__name__)

RAKUTEN_KEY = os.getenv("RAKUTEN_ACCESS_KEY")


def get_rakuten_items(keyword="イヤホン"):
    url = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601"

    params = {
        "applicationId": RAKUTEN_KEY,
        "keyword": keyword,
        "hits": 10,
        "sort": "-reviewCount"
    }

    response = requests.get(url, params=params)
    data = response.json()

    items = []

    if "Items" in data:
        for item in data["Items"]:
            i = item["Item"]

            items.append({
                "title": i["itemName"],
                "price": i["itemPrice"],
                "url": i["itemUrl"],
                "image": i["mediumImageUrls"][0]["imageUrl"] if i["mediumImageUrls"] else ""
            })

    return items


@app.route("/")
def home():
    return "Instagram Auto Post System Running"


@app.route("/rakuten")
def rakuten():
    items = get_rakuten_items()
    return jsonify(items)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
