import os
import requests
from flask import Flask, jsonify

app = Flask(__name__)

# トップページ
@app.route("/")
def home():
    return "Instagram Auto Post API running"

# 楽天ランキング取得
@app.route("/post")
def fetch():

    APP_ID = os.getenv("RAKUTEN_APP_ID")

    if not APP_ID:
        return {"error": "RAKUTEN_APP_ID not set"}

    url = "https://app.rakuten.co.jp/services/api/IchibaItem/Ranking/20220601"

    params = {
        "applicationId": APP_ID,
        "genreId": "0"
    }

    res = requests.get(url, params=params)

    return jsonify(res.json())


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
