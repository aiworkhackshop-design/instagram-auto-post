import requests
from bs4 import BeautifulSoup
from flask import Flask, jsonify
import random

app = Flask(__name__)


def get_rakuten_ranking():
    url = "https://ranking.rakuten.co.jp/daily/564500/"
    res = requests.get(url)
    soup = BeautifulSoup(res.text, "html.parser")

    items = []

    products = soup.select(".rnkRanking_itemName")

    for p in products[:10]:
        title = p.text.strip()
        link = p.get("href")

        items.append({
            "title": title,
            "url": link
        })

    return items


def generate_caption(product):

    templates = [
        "【今売れてる】\n{}\n\n詳細はこちら👇\n{}\n\n#楽天市場 #便利グッズ",
        "楽天ランキング上位🔥\n{}\n\n購入はこちら👇\n{}\n\n#楽天ランキング",
        "これ売れてる👇\n{}\n\nリンク👇\n{}\n\n#買ってよかった"
    ]

    template = random.choice(templates)

    caption = template.format(product["title"], product["url"])

    return caption


@app.route("/")
def home():
    return "Instagram自動投稿システム稼働"


@app.route("/rakuten")
def rakuten():

    items = get_rakuten_ranking()

    return jsonify(items)


@app.route("/post")
def post():

    items = get_rakuten_ranking()

    posts = []

    for i in items[:5]:

        caption = generate_caption(i)

        posts.append({
            "product": i["title"],
            "caption": caption,
            "url": i["url"]
        })

    return jsonify(posts)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
