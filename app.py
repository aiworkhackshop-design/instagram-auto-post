from flask import Flask, jsonify
import requests
import os

app = Flask(__name__)

@app.route("/")
def home():
    return "Rakuten API server running"

@app.route("/post")
def fetch():

    APP_ID = os.getenv("RAKUTEN_APP_ID")

    url = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601"

    params = {
        "applicationId": APP_ID,
        "keyword": "人気",
        "sort": "-reviewCount"
    }

    res = requests.get(url, params=params)

    return jsonify(res.json())

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
