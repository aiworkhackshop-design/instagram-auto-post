import os
import requests
from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/")
def home():
    return "API running"

@app.route("/fetch")
def fetch():

    APP_ID = os.getenv("RAKUTEN_APP_ID")

    url = "https://app.rakuten.co.jp/services/api/IchibaItem/Ranking/20220601"

    params = {
        "applicationId": APP_ID,
        "genreId": "0"
    }

    res = requests.get(url, params=params)

    return jsonify(res.json())


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
