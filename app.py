import os
import requests
from flask import Flask

app = Flask(__name__)

ACCOUNT_ID = os.getenv("INSTAGRAM_BUSINESS_ACCOUNT_ID")
ACCESS_TOKEN = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")

@app.route("/")
def home():
    return "Instagram Auto Post Running"

@app.route("/post")
def post():

    url = f"https://graph.facebook.com/v19.0/{ACCOUNT_ID}/media"

    data = {
        "image_url": "https://picsum.photos/1080/1080",
        "caption": "AIおすすめ商品ランキング",
        "access_token": ACCESS_TOKEN
    }

    r = requests.post(url, data=data)
    return r.text
