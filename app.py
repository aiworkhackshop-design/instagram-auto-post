import requests
from flask import Flask, jsonify

app = Flask(__name__)

def get_rakuten_ranking():

    url = "https://ranking.rakuten.co.jp/api/ranking/v1/json"

    params = {
        "period": "daily",
        "genreId": "564500",
        "page": "1"
    }

    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    r = requests.get(url, params=params, headers=headers)

    data = r.json()

    items = []

    for item in data["RankingItems"][:10]:

        items.append({
            "title": item["Item"]["itemName"],
            "url": item["Item"]["itemUrl"]
        })

    return items


@app.route("/")
def home():
    return "Instagram自動投稿システム稼働"


@app.route("/rakuten")
def rakuten():
    items = get_rakuten_ranking()
    return jsonify(items)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
