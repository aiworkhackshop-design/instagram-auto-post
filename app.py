import random
import time
from flask import Flask

app = Flask(__name__)

TAG = "aiworkhacksho-22"

products = [
    ("Echo Dot", "B09B8V1LZ3"),
    ("Fire TV Stick", "B0BQVPL3Q5"),
    ("Anker モバイルバッテリー", "B07S829LBX"),
    ("SwitchBotスマートロック", "B07XH9YPK9"),
    ("エコーショー5", "B08KGTZP3S")
]

def generate_post():
    product = random.choice(products)
    name = product[0]
    asin = product[1]

    link = f"https://www.amazon.co.jp/dp/{asin}/?tag={TAG}"

    caption = f"""
Amazon人気商品

{name}

詳細はこちら👇
{link}

#Amazonおすすめ
#便利グッズ
#買ってよかった
"""

    print(caption)

@app.route("/")
def home():
    return "Instagram Auto Post Running"

def worker():
    while True:
        generate_post()
        time.sleep(3600)

import threading
threading.Thread(target=worker).start()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
