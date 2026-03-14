import requests
from bs4 import BeautifulSoup
from flask import Flask, jsonify

app = Flask(__name__)

def get_rakuten_ranking():
    url = "https://ranking.rakuten.co.jp/daily/564500/"  # イヤホンランキング
    res = requests.get(url)
    soup = BeautifulSoup(res.text, "html.parser")

    items = []
    for item in soup.select(".rnkRanking_itemName")[:10]:
        title = item.text.strip()
        link = item.get("href")
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
