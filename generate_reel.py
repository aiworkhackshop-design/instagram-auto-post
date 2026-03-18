#!/usr/bin/env python3
"""
Instagram Reel Generator with BGM, Text Animation, and Transitions
Generates professional reels with product showcase, animations, and audio
"""

import os
import json
import random
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Tuple

import requests
from moviepy.editor import (
    ImageClip, TextClip, CompositeVideoClip, concatenate_videoclips,
    AudioFileClip, ColorClip, vfx, VideoFileClip
)
from PIL import Image, ImageDraw, ImageFont
import numpy as np

# Configuration
REEL_WIDTH = 1080
REEL_HEIGHT = 1920
REEL_FPS = 30
REEL_DURATION = 15  # seconds
CACHE_DIR = "/tmp/reel_cache"
POSTED_PRODUCTS_FILE = "/tmp/posted_products_reel.json"

# BGM URLs (copyright-free music)
BGM_URLS = {
    "upbeat": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "chill": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    "energetic": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
}

# Animation settings
ANIMATION_DURATION = 0.5  # seconds
TRANSITION_DURATION = 0.3  # seconds

# Text animation templates
TEXT_HOOKS = [
    "⚡ これ知ってた？",
    "🔥 今売れてる神アイテム",
    "💰 この値段でこの性能",
    "⭐ 99%の人が知らない",
    "🎯 プロが選ぶ商品",
    "✨ 毎日使いたくなる",
    "🚀 今すぐチェック"
]

CAPTION_TEMPLATES = [
    "この商品、本当にすごい。\n\n{product_name}\n\n⭐ {review_avg}/5.0\n💰 ¥{price}\n\nプロフィールから最安チェック👇",
    "{product_name}が話題沸騰中。\n\n{review_count}件のレビュー\n⭐ {review_avg}/5.0\n💰 ¥{price}\n\nプロフィールから最安チェック👇",
    "これ買って正解だった。\n\n{product_name}\n\n⭐ {review_avg}/5.0\n💰 ¥{price}\n\nプロフィールから最安チェック👇"
]

HASHTAGS = {
    "beauty": "#美容家電 #ドライヤー #ヘアアイロン #美容 #時短",
    "gadget": "#スマートウォッチ #イヤホン #ガジェット #家電 #テック",
    "kitchen": "#キッチン家電 #調理器具 #時短家電 #便利グッズ #生活",
    "general": "#ショッピング #Amazon #楽天 #ランキング #おすすめ"
}

def ensure_cache_dir():
    """キャッシュディレクトリを作成"""
    Path(CACHE_DIR).mkdir(parents=True, exist_ok=True)

def load_posted_products() -> Dict:
    """24時間以内に投稿したリール用商品を読み込む"""
    try:
        if os.path.exists(POSTED_PRODUCTS_FILE):
            with open(POSTED_PRODUCTS_FILE, 'r') as f:
                data = json.load(f)
                from datetime import timedelta
                now = datetime.now()
                return {
                    k: v for k, v in data.items()
                    if datetime.fromisoformat(v['timestamp']) > now - timedelta(hours=24)
                }
    except:
        pass
    return {}

def save_posted_product(product_id: str, product_name: str):
    """投稿したリール用商品を記録"""
    try:
        data = load_posted_products()
        data[product_id] = {
            'name': product_name,
            'timestamp': datetime.now().isoformat()
        }
        os.makedirs(os.path.dirname(POSTED_PRODUCTS_FILE), exist_ok=True)
        with open(POSTED_PRODUCTS_FILE, 'w') as f:
            json.dump(data, f)
    except Exception as e:
        print(f"Warning: Failed to save posted product: {e}")

def download_image(url: str, cache_key: str) -> Optional[str]:
    """画像をダウンロードしてキャッシュ"""
    try:
        cache_path = os.path.join(CACHE_DIR, f"{cache_key}.jpg")
        
        if os.path.exists(cache_path):
            return cache_path
        
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        with open(cache_path, 'wb') as f:
            f.write(response.content)
        
        return cache_path
    except Exception as e:
        print(f"Error downloading image: {e}")
        return None

def download_bgm(bgm_type: str = "upbeat") -> Optional[str]:
    """BGMをダウンロード"""
    try:
        url = BGM_URLS.get(bgm_type, BGM_URLS["upbeat"])
        cache_path = os.path.join(CACHE_DIR, f"bgm_{bgm_type}.mp3")
        
        if os.path.exists(cache_path):
            return cache_path
        
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        with open(cache_path, 'wb') as f:
            f.write(response.content)
        
        return cache_path
    except Exception as e:
        print(f"Warning: Failed to download BGM: {e}")
        return None

def optimize_product_image(image_path: str, output_path: str) -> str:
    """Amazon画像の背景処理最適化"""
    try:
        # 画像を開く
        img = Image.open(image_path).convert('RGB')
        
        # リール用にリサイズ（9:16 aspect ratio）
        aspect_ratio = REEL_WIDTH / REEL_HEIGHT  # 0.5625
        img_aspect = img.width / img.height
        
        if img_aspect > aspect_ratio:
            # 画像が広い場合
            new_width = int(img.height * aspect_ratio)
            left = (img.width - new_width) // 2
            img = img.crop((left, 0, left + new_width, img.height))
        else:
            # 画像が狭い場合
            new_height = int(img.width / aspect_ratio)
            top = (img.height - new_height) // 2
            img = img.crop((0, top, img.width, top + new_height))
        
        # リール解像度にリサイズ
        img = img.resize((REEL_WIDTH, REEL_HEIGHT), Image.Resampling.LANCZOS)
        
        # グラデーション背景を追加（背景処理最適化）
        background = Image.new('RGB', (REEL_WIDTH, REEL_HEIGHT), color=(20, 20, 30))
        
        # 画像を中央に配置
        offset = ((REEL_WIDTH - img.width) // 2, (REEL_HEIGHT - img.height) // 2)
        background.paste(img, offset)
        
        background.save(output_path, quality=95)
        return output_path
    except Exception as e:
        print(f"Error optimizing image: {e}")
        return image_path

def create_text_animation_clip(text: str, duration: float, start_time: float) -> CompositeVideoClip:
    """テキストアニメーション付きクリップを作成"""
    try:
        # テキストクリップ作成
        txt_clip = TextClip(
            text,
            fontsize=60,
            font='Arial-Bold',
            color='white',
            method='caption',
            size=(REEL_WIDTH - 60, None),
            align='center'
        )
        
        # アニメーション効果を適用
        # フェードイン
        txt_clip = txt_clip.set_duration(duration)
        txt_clip = txt_clip.set_position('center')
        txt_clip = txt_clip.fx(vfx.fadein, duration=0.3)
        txt_clip = txt_clip.fx(vfx.fadeout, duration=0.3)
        
        # スケールアニメーション（ズームイン）
        def scale_func(t):
            return 1 + (t / duration) * 0.2  # 最大20%ズーム
        
        txt_clip = txt_clip.set_position(lambda t: (
            REEL_WIDTH // 2 - txt_clip.w * scale_func(t) // 2,
            REEL_HEIGHT // 2 - txt_clip.h * scale_func(t) // 2
        ))
        
        return txt_clip.set_start(start_time)
    except Exception as e:
        print(f"Error creating text animation: {e}")
        return None

def create_transition_clip(duration: float = TRANSITION_DURATION) -> VideoFileClip:
    """トランジション効果クリップを作成"""
    try:
        # 黒フェード効果
        fade_clip = ColorClip(size=(REEL_WIDTH, REEL_HEIGHT), color=(0, 0, 0))
        fade_clip = fade_clip.set_duration(duration)
        fade_clip = fade_clip.fx(vfx.fadein, duration=duration/2)
        fade_clip = fade_clip.fx(vfx.fadeout, duration=duration/2)
        return fade_clip
    except Exception as e:
        print(f"Error creating transition: {e}")
        return None

def generate_reel(product_data: Dict, output_path: str) -> bool:
    """リールを生成"""
    try:
        ensure_cache_dir()
        
        print(f"🎬 Generating reel for: {product_data['product_name']}")
        
        # 商品画像をダウンロード・最適化
        image_cache_key = f"product_{product_data['product_id']}"
        image_path = download_image(product_data['image'], image_cache_key)
        
        if not image_path:
            print("❌ Failed to download product image")
            return False
        
        # 画像を最適化
        optimized_image = os.path.join(CACHE_DIR, f"optimized_{image_cache_key}.jpg")
        optimize_product_image(image_path, optimized_image)
        
        # メインビデオクリップ（商品画像）
        main_clip = ImageClip(optimized_image).set_duration(REEL_DURATION - 1)
        
        # テキストアニメーション
        hook = random.choice(TEXT_HOOKS)
        text_clip = create_text_animation_clip(hook, 1.5, 0.5)
        
        # キャプション生成
        caption = random.choice(CAPTION_TEMPLATES).format(
            product_name=product_data['product_name'],
            price=product_data['price'],
            review_avg=product_data['review_avg'],
            review_count=product_data['review_count']
        )
        
        # ビデオ合成
        video_clips = [main_clip]
        if text_clip:
            video_clips.append(text_clip)
        
        final_video = CompositeVideoClip(video_clips, size=(REEL_WIDTH, REEL_HEIGHT))
        
        # BGMを追加
        bgm_type = random.choice(list(BGM_URLS.keys()))
        bgm_path = download_bgm(bgm_type)
        
        if bgm_path:
            try:
                audio = AudioFileClip(bgm_path)
                # BGMを動画の長さに合わせる
                if audio.duration > REEL_DURATION:
                    audio = audio.subclipped(0, REEL_DURATION)
                elif audio.duration < REEL_DURATION:
                    # ループ処理（簡易版）
                    audio = audio.set_duration(REEL_DURATION)
                
                final_video = final_video.set_audio(audio)
            except Exception as e:
                print(f"⚠️ Warning: Failed to add BGM: {e}")
        
        # ファイルに書き込み
        print(f"💾 Writing reel to: {output_path}")
        final_video.write_videofile(
            output_path,
            fps=REEL_FPS,
            codec='libx264',
            audio_codec='aac',
            verbose=False,
            logger=None
        )
        
        # 投稿記録
        save_posted_product(product_data['product_id'], product_data['product_name'])
        
        print(f"✅ Reel generated successfully: {output_path}")
        return True
        
    except Exception as e:
        print(f"❌ Error generating reel: {e}")
        import traceback
        traceback.print_exc()
        return False

def get_reel_data(product_data: Dict) -> Dict:
    """リール投稿用のデータを生成"""
    try:
        caption = random.choice(CAPTION_TEMPLATES).format(
            product_name=product_data['product_name'],
            price=product_data['price'],
            review_avg=product_data['review_avg'],
            review_count=product_data['review_count']
        )
        
        # ハッシュタグを選択
        category = product_data.get('category', 'general')
        hashtags = HASHTAGS.get(category, HASHTAGS['general'])
        
        # 最終キャプション
        final_caption = f"{caption}\n\n{hashtags}"
        
        return {
            "caption": final_caption,
            "thumbnail": product_data.get('image', ''),
            "product_name": product_data['product_name']
        }
    except Exception as e:
        print(f"Error generating reel data: {e}")
        return {}

if __name__ == "__main__":
    # テスト用
    test_product = {
        "product_id": "test_001",
        "product_name": "テスト商品",
        "price": "5,980",
        "review_avg": "4.5",
        "review_count": 1000,
        "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1080",
        "category": "gadget"
    }
    
    output_file = "/tmp/test_reel.mp4"
    generate_reel(test_product, output_file)
