import requests
import random

# 楽天商品取得
def get_rakuten_items(app_id, keyword):
    url = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706"
    params = {
        "applicationId": app_id,
        "keyword": keyword,
        "hits": 5
    }

    res = requests.get(url, params=params)
    data = res.json()

    items = data["Items"]
    item = random.choice(items)["Item"]

    return {
        "title": item["itemName"],
        "url": item["itemUrl"],
        "image": item["mediumImageUrls"][0]["imageUrl"]
    }


# 投稿文生成
def generate_caption(item):
    caption = f"""
【おすすめ商品】

{item['title']}

気になる人はこちら👇
{item['url']}

#楽天 #おすすめ商品 #買ってよかった
"""
    return caption


if __name__ == "__main__":
    RAKUTEN_APP_ID = 4ca9cb0b-cba7-4e23-9b48-05bba9a349d1

    item = get_rakuten_items(RAKUTEN_APP_ID, "便利グッズ")
    caption = generate_caption(item)

    print("タイトル:", item["title"])
    print("URL:", item["url"])
    print("投稿文:", caption)
