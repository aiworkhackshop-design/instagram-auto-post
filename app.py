from flask import Flask, jsonify
import requests
import os

app = Flask(__name__)

@app.route("/")
def home():
    return "Rakuten API OK"

@app.route("/post")
def post():

    APP_ID = os.getenv("RAKUTEN_APP_ID")

    url = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601"

    params = {
        "applicationId": APP_ID,
        "keyword": "人気",
        "hits": 5
    }

    r = requests.get(url, params=params)

    return jsonify(r.json())

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
