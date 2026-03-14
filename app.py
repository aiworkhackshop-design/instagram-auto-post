# app.py
import os
import requests
from flask import Flask, jsonify, send_file, Response
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

# 複数の候補URL（うまく取れない場合はここを追加）
RANKING_URLS = [
    "https://ranking.rakuten.co.jp/daily/564500/",  # 家電ランキング例（変更可）
]

# 候補セレクタ（複数試す）
CANDIDATE_SELECTORS = [
    "div.rnkRanking_itemName a",
    "div.rankingItem__title a",
    "li.rankingItem a",
    ".rnkRanking_itemName a",
    ".rnkRanking_itemTitle a",
    "a.ranking-item-link",
]

def fetch_html(url):
    headers = {"User-Agent": "Mozilla/5.0 (compatible)"}
    r = requests.get(url, headers=headers, timeout=15)
    r.raise_for_status()
    return r.text

def parse_candidates(html, base_url):
    soup = BeautifulSoup(html, "html.parser")
    found = []
    for sel in CANDIDATE_SELECTORS:
        elems = soup.select(sel)
        if not elems:
            continue
        for e in elems:
            text = e.get_text(strip=True)
            href = e.get("href") or ""
            href = urljoin(base_url, href)
            if text:
                found.append({"title": text, "url": href})
        if found:
            # 最初に見つかったセレクタで抜く（安定しない場合は消す）
            break
    return found

@app.route("/")
def home():
    return "Instagram自動投稿システム稼働"

@app.route("/rakuten")
def rakuten():
    items_all = []
    last_html = ""
    for url in RANKING_URLS:
        try:
            html = fetch_html(url)
            last_html = html
            items = parse_candidates(html, url)
            if items:
                items_all.extend(items)
            # ひとつでも見つかれば終了（必要なら続ける）
            if items_all:
                break
        except Exception as e:
            app.logger.exception("fetch/parsing failed for %s: %s", url, e)
            continue

    # 保存（デバッグ用）
    try:
        with open("rakuten_debug.html", "w", encoding="utf-8") as f:
            f.write(last_html or "")
        # Also write small json for quick download
        import json
        with open("rakuten.json", "w", encoding="utf-8") as f:
            json.dump(items_all, f, ensure_ascii=False)
    except Exception:
        app.logger.exception("failed to write debug files")

    return jsonify(items_all)

@app.route("/debug_html")
def debug_html():
    # デバッグ用に保存したHTMLを返す（公開環境で無効にしたければ削除）
    if os.path.exists("rakuten_debug.html"):
        return send_file("rakuten_debug.html", mimetype="text/html")
    return Response("no debug html", status=404)

@app.route("/download_json")
def download_json():
    if os.path.exists("rakuten.json"):
        return send_file("rakuten.json", mimetype="application/json")
    return Response("no json", status=404)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
