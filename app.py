# app.py
import os
import time
import logging
import requests
from flask import Flask, jsonify, request

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = Flask(__name__)

# 環境変数名（Render の環境変数と合わせること）
# INSTAGRAM_BUSINESS_ACCOUNT_ID : Instagram ビジネスアカウントの ID
# FACEBOOK_PAGE_ACCESS_TOKEN  : Facebook Page access token（長期推奨）
ACCOUNT_ID = os.getenv("INSTAGRAM_BUSINESS_ACCOUNT_ID")
ACCESS_TOKEN = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN")

if not ACCOUNT_ID or not ACCESS_TOKEN:
    log.warning("環境変数が足りません。INSTAGRAM_BUSINESS_ACCOUNT_ID と FACEBOOK_PAGE_ACCESS_TOKEN を確認してください。")

@app.route("/")
def home():
    return "OK - Instagram auto post service"

@app.route("/post", methods=["POST", "GET"])
def post_media():
    """
    POST body (optional JSON):
    {
      "image_url": "...",
      "caption": "..."
    }
    もしくは GET でテスト可能
    """
    # 入力を受け取る（優先順: POST JSON -> query params -> デフォルト）
    data_json = {}
    if request.method == "POST" and request.is_json:
        data_json = request.get_json()
    image_url = data_json.get("image_url") if data_json else request.args.get("image_url", "https://picsum.photos/1080/1080")
    caption = data_json.get("caption") if data_json else request.args.get("caption", "AIおすすめ商品ランキング")

    if not ACCOUNT_ID or not ACCESS_TOKEN:
        return jsonify({"error": "missing env vars", "need": ["INSTAGRAM_BUSINESS_ACCOUNT_ID", "FACEBOOK_PAGE_ACCESS_TOKEN"]}), 500

    # 1) Create media container (image)
    create_url = f"https://graph.facebook.com/v19.0/{ACCOUNT_ID}/media"
    payload = {
        "image_url": image_url,
        "caption": caption,
        "access_token": ACCESS_TOKEN
    }
    log.info("Creating media container: %s", create_url)
    r1 = requests.post(create_url, data=payload, timeout=30)
    try:
        res1 = r1.json()
    except Exception:
        return jsonify({"error": "invalid response from create", "text": r1.text}), 500

    if "error" in res1:
        log.error("create error: %s", res1)
        return jsonify({"step": "create", "result": res1}), 400

    creation_id = res1.get("id")
    if not creation_id:
        return jsonify({"error": "no creation id", "raw": res1}), 500

    # 2) Publish created media
    publish_url = f"https://graph.facebook.com/v19.0/{ACCOUNT_ID}/media_publish"
    publish_payload = {
        "creation_id": creation_id,
        "access_token": ACCESS_TOKEN
    }
    log.info("Publishing media: %s", publish_url)
    r2 = requests.post(publish_url, data=publish_payload, timeout=30)
    try:
        res2 = r2.json()
    except Exception:
        return jsonify({"error": "invalid response from publish", "text": r2.text}), 500

    if "error" in res2:
        log.error("publish error: %s", res2)
        return jsonify({"step": "publish", "result": res2}), 400

    # 正常なら投稿 ID が返る
    return jsonify({
        "step": "success",
        "creation_response": res1,
        "publish_response": res2
    }), 200

if __name__ == "__main__":
    # Render の場合 PORT 環境変数を使う
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
