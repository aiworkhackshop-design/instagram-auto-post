import random
from flask import Flask, jsonify

app = Flask(__name__)

# AmazonアソシエイトID
AMAZON_TAG = "aiworkhacksho-22"

# 商品データ
PRODUCTS = [
    {
        "name": "Echo Dot 第5世代",
        "asin": "B09B8V1LZ3",
        "image": "https://m.media-amazon.com/images/I/61u48FEsCzL._AC_SL1000_.jpg"
    },
    {
        "name": "Fire TV Stick",
        "asin": "B0BQVPL3Q5",
        "image": "https://m.media-amazon.com/images/I/51Da2Z+FTFL._AC_SL1000_.jpg"
    },
    {
        "name": "Anker モバイルバッテリー",
        "asin": "B07S829LBX",
        "image": "https://m.media-amazon.com/images/I/61S9aVnRZDL._AC_SL1500_.jpg"
    },
    {
        "name": "SwitchBot スマートロック",
        "asin": "B07XH9YPK9",
        "image": "https://m.media-amazon.com/images/I/61cLkGx+9PL._AC_SL1500_.jpg"
    },
    {
        "name": "Echo Show 5",
        "asin": "B08KGTZP3S",
        "image": "https://m.media-amazon.com/images/I/71F6R6q2J4L._AC_SL1000_.jpg"
    }
]


def generate_affiliate_link(asin):
    return f"https://www.amazon.co.jp/dp/{asin}/?tag={AMAZON_TAG}"


def generate_caption(product):

    templates = [

f"""【Amazonで人気】

{product['name']}

これかなり便利。

購入はこちら👇
{generate_affiliate_link(product['asin'])}

#Amazonおすすめ
#便利グッズ
#買ってよかった
""",

f"""これ売れてる👇

{product['name']}

Amazonで話題の商品

リンク👇
{generate_affiliate_link(product['asin'])}

#Amazon購入品
#便利アイテム
""",

f"""【保存推奨】

{product['name']}

持ってると便利なアイテム

詳細👇
{generate_affiliate_link(product['asin'])}

#Amazonランキング
#おすすめ商品
"""
]

    return random.choice(templates)


def generate_post():

    product = random.choice(PRODUCTS)

    link = generate_affiliate_link(product["asin"])

    caption = generate_caption(product)

    return {
        "product_name": product["name"],
        "asin": product["asin"],
        "affiliate_link": link,
        "image": product["image"],
        "caption": caption
    }


@app.route("/")
def home():
    return "Amazon Instagram Auto System Running"


@app.route("/product")
def product():
    return jsonify(generate_post())


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
