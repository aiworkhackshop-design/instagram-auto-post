import requests
from flask import Flask, jsonify
import re

app = Flask(__name__)

def get_rakuten_ranking():
    url = "https://ranking.rakuten.co.jp/daily/564500/"
    r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
    html = r.text

    titles = re.findall(r'itemName":"(.*?)"', html)
    urls = re.findall(r'itemUrl":"(.*?)"', html)

    items = []

    for i in range(min(len(titles), len(urls), 10)):
        items.append({
            "title": titles[i],
            "url": urls[i]
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
