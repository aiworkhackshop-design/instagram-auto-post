import os
import requests
from flask import Flask, jsonify, request

app = Flask(__name__)

RAKUTEN_KEY = os.getenv("RAKUTEN_ACCESS_KEY")

def fetch_raw(keyword):
    url = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601"

    params = {
        "applicationId": RAKUTEN_KEY,
        "keyword": keyword,
        "hits": 5
    }

    r = requests.get(url, params=params)

    return r.json()


@app.route("/")
def home():
    return "Instagram自動投稿システム稼働"


@app.route("/rakuten")
def rakuten():
    keyword = request.args.get("keyword", "イヤホン")

    data = fetch_raw(keyword)

    return jsonify(data)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
