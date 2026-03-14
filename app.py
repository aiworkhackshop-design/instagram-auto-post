import requests
from flask import Flask, jsonify

app = Flask(__name__)


def get_rakuten():

    url = "https://ranking.rakuten.co.jp/api/ranking/v1/json"

    params = {
        "period": "daily",
        "genreId": "564500",
        "page": "1"
    }

    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    try:

        r = requests.get(url, params=params, headers=headers, timeout=10)

        if r.status_code != 200:
            return {"error": "Rakuten API status error", "status": r.status_code}

        data = r.json()

        items = []

        ranking = data.get("RankingItems", [])

        for item in ranking[:10]:

            product = item.get("Item", {})

            items.append({
                "title": product.get("itemName"),
                "url": product.get("itemUrl")
            })

        return items

    except Exception as e:

        return {"error": str(e)}


@app.route("/")
def home():
    return "Instagram自動投稿システム稼働"


@app.route("/rakuten")
def rakuten():
    return jsonify(get_rakuten())


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
