import requests
import random
import time

TAG = "エアワークハックショー-22"

products = [
    ("Echo Dot", "B09B8V1LZ3"),
    ("Fire TV Stick", "B0BQVPL3Q5"),
    ("Anker モバイルバッテリー", "B07S829LBX"),
    ("SwitchBot スマートロック", "B07XH9YPK9"),
    ("Echo Show 5", "B08KGTZP3S")
]

def generate_post():
    product = random.choice(products)
    name = product[0]
    asin = product[1]

    link = f"https://www.amazon.co.jp/dp/{asin}/?tag={TAG}"

    caption = f"""
【Amazon人気商品】

{name}

詳細はこちら👇
{link}

#Amazonおすすめ
#便利グッズ
#買ってよかった
"""

    print(caption)

while True:
    generate_post()
    time.sleep(3600)
