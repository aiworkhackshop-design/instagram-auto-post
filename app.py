import requests
from flask import Flask, jsonify
from bs4 import BeautifulSoup

app = Flask(__name__)

def get_rakuten_ranking():

    url = "https://ranking.rakuten.co.jp/daily/564500/"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }

    r = requests.get(url, headers=headers)
    soup = BeautifulSoup(r.text, "html.parser")

    items = []

    products = soup.select("a.rnkRanking_itemName")

    for p in products[:10]:

        title = p.text.strip()
        link = p.get("href")

        items.append({
            "title": title,
            "url": link
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
