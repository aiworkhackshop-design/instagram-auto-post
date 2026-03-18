#!/usr/bin/env python3
"""
Instagram Reel Generator v2 - Professional Quality
High-quality reel generation with proper Japanese font support, 9:16 optimization,
and professional design suitable for actual Instagram monetization
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
    AudioFileClip, ColorClip, vfx, VideoFileClip, CompositeAudioClip
)
from PIL import Image, ImageDraw, ImageFont
import numpy as np

# ==================== Configuration ====================
REEL_WIDTH = 1080
REEL_HEIGHT = 1920
REEL_FPS = 30
REEL_DURATION = 15  # seconds
CACHE_DIR = "/tmp/reel_cache_v2"
POSTED_PRODUCTS_FILE = "/tmp/posted_products_reel_v2.json"

# Japanese Font Path - Noto Sans CJK JP
FONT_BOLD = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
FONT_REGULAR = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"

# BGM URLs (copyright-free music)
BGM_URLS = {
    "upbeat": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "chill": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    "energetic": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
}

# Strong Hook Headlines - Large, Eye-catching
HOOK_HEADLINES = [
    "これ知ってた？",
    "今売れてる",
    "この値段で？",
    "99%知らない",
    "プロが選ぶ",
    "毎日使いたい",
    "今すぐチェック"
]

# Color Palette - High Contrast
COLORS = {
    "bg_dark": (15, 15, 20),  # Almost black
    "bg_light": (255, 255, 255),  # White
    "accent_gold": (255, 215, 0),  # Gold
    "accent_red": (255, 50, 50),  # Red
    "text_white": (255, 255, 255),  # White
    "text_black": (15, 15, 20),  # Dark
}

# ==================== Helper Functions ====================

def ensure_cache_dir():
    """Create cache directory"""
    Path(CACHE_DIR).mkdir(parents=True, exist_ok=True)

def load_posted_products() -> Dict:
    """Load products posted in last 24 hours"""
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
    except Exception as e:
        print(f"⚠️ Error loading posted products: {e}")
    return {}

def save_posted_product(product_id: str, product_name: str):
    """Save product to prevent duplicate posting"""
    try:
        data = load_posted_products()
        data[product_id] = {
            'name': product_name,
            'timestamp': datetime.now().isoformat()
        }
        with open(POSTED_PRODUCTS_FILE, 'w') as f:
            json.dump(data, f)
    except Exception as e:
        print(f"⚠️ Error saving posted product: {e}")

def download_image(url: str, output_path: str, max_retries: int = 3) -> bool:
    """Download image with retry logic and fallback"""
    for attempt in range(max_retries):
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10, allow_redirects=True)
            if response.status_code == 200:
                with open(output_path, 'wb') as f:
                    f.write(response.content)
                print(f"✅ Image downloaded: {output_path}")
                return True
        except Exception as e:
            print(f"⚠️ Attempt {attempt + 1} failed: {e}")
    
    # Fallback: Use placeholder image
    print(f"⚠️ Using fallback image")
    try:
        response = requests.get("https://picsum.photos/1080/1920", timeout=10)
        with open(output_path, 'wb') as f:
            f.write(response.content)
        return True
    except:
        return False

def create_hook_slide(hook_text: str, duration: float = 2.0) -> ImageClip:
    """
    Create strong hook slide with large text
    Optimized for stopping scrolls on Instagram
    """
    # Create base image
    img = Image.new('RGB', (REEL_WIDTH, REEL_HEIGHT), COLORS["bg_dark"])
    draw = ImageDraw.Draw(img)
    
    # Add subtle gradient background effect (using PIL)
    for y in range(REEL_HEIGHT):
        alpha = int(255 * (y / REEL_HEIGHT) * 0.3)
        overlay = Image.new('RGBA', (REEL_WIDTH, 1), (255, 215, 0, alpha))
        img.paste(overlay, (0, y), overlay)
    
    # Draw large hook text
    try:
        font_size = 120
        font = ImageFont.truetype(FONT_BOLD, font_size)
    except:
        font = ImageFont.load_default()
    
    # Add emoji + text
    full_text = f"⚡ {hook_text}"
    
    # Get text bounding box for centering
    bbox = draw.textbbox((0, 0), full_text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (REEL_WIDTH - text_width) // 2
    y = (REEL_HEIGHT - text_height) // 2 - 200
    
    # Draw text with outline for better visibility
    outline_width = 3
    for adj_x in range(-outline_width, outline_width + 1):
        for adj_y in range(-outline_width, outline_width + 1):
            draw.text((x + adj_x, y + adj_y), full_text, font=font, fill=COLORS["text_black"])
    
    # Draw main text in gold
    draw.text((x, y), full_text, font=font, fill=COLORS["accent_gold"])
    
    # Add CTA text at bottom
    try:
        font_cta = ImageFont.truetype(FONT_REGULAR, 60)
    except:
        font_cta = ImageFont.load_default()
    
    cta_text = "👇 スクロールして見る"
    bbox_cta = draw.textbbox((0, 0), cta_text, font=font_cta)
    cta_width = bbox_cta[2] - bbox_cta[0]
    cta_x = (REEL_WIDTH - cta_width) // 2
    cta_y = REEL_HEIGHT - 300
    
    draw.text((cta_x, cta_y), cta_text, font=font_cta, fill=COLORS["accent_gold"])
    
    # Save and return clip
    hook_path = f"{CACHE_DIR}/hook_{datetime.now().timestamp()}.png"
    img.save(hook_path)
    
    return ImageClip(hook_path).set_duration(duration)

def create_product_slide(image_path: str, product_name: str, price: str, rating: float, duration: float = 5.0) -> ImageClip:
    """
    Create product showcase slide
    Large, centered product image with minimal text overlay
    """
    # Load product image
    try:
        product_img = Image.open(image_path)
        product_img.thumbnail((800, 800), Image.Resampling.LANCZOS)
    except Exception as e:
        print(f"❌ Error loading product image: {e}")
        return None
    
    # Create base slide
    img = Image.new('RGB', (REEL_WIDTH, REEL_HEIGHT), COLORS["bg_dark"])
    
    # Center product image
    product_x = (REEL_WIDTH - product_img.width) // 2
    product_y = (REEL_HEIGHT - product_img.height) // 2 - 200
    img.paste(product_img, (product_x, product_y), product_img if product_img.mode == 'RGBA' else None)
    
    draw = ImageDraw.Draw(img)
    
    # Add product name (short, bold)
    try:
        font_name = ImageFont.truetype(FONT_BOLD, 50)
        font_price = ImageFont.truetype(FONT_BOLD, 70)
        font_rating = ImageFont.truetype(FONT_REGULAR, 40)
    except:
        font_name = font_price = font_rating = ImageFont.load_default()
    
    # Product name at bottom
    name_text = product_name[:20]  # Truncate long names
    bbox = draw.textbbox((0, 0), name_text, font=font_name)
    name_x = (REEL_WIDTH - (bbox[2] - bbox[0])) // 2
    name_y = REEL_HEIGHT - 350
    
    draw.text((name_x, name_y), name_text, font=font_name, fill=COLORS["text_white"])
    
    # Price (large, gold)
    price_text = f"¥{price}"
    bbox = draw.textbbox((0, 0), price_text, font=font_price)
    price_x = (REEL_WIDTH - (bbox[2] - bbox[0])) // 2
    price_y = REEL_HEIGHT - 250
    
    draw.text((price_x, price_y), price_text, font=font_price, fill=COLORS["accent_gold"])
    
    # Rating
    rating_text = f"⭐ {rating:.1f}/5.0"
    bbox = draw.textbbox((0, 0), rating_text, font=font_rating)
    rating_x = (REEL_WIDTH - (bbox[2] - bbox[0])) // 2
    rating_y = REEL_HEIGHT - 150
    
    draw.text((rating_x, rating_y), rating_text, font=font_rating, fill=COLORS["accent_red"])
    
    # Save and return clip
    product_path = f"{CACHE_DIR}/product_{datetime.now().timestamp()}.png"
    img.save(product_path)
    
    return ImageClip(product_path).set_duration(duration)

def create_cta_slide(duration: float = 3.0) -> ImageClip:
    """
    Create Call-to-Action slide
    Directs users to profile/link
    """
    img = Image.new('RGB', (REEL_WIDTH, REEL_HEIGHT), COLORS["bg_dark"])
    draw = ImageDraw.Draw(img)
    
    # Add gradient
    for y in range(REEL_HEIGHT):
        alpha = int(255 * (y / REEL_HEIGHT) * 0.3)
        overlay = Image.new('RGBA', (REEL_WIDTH, 1), (255, 50, 50, alpha))
        img.paste(overlay, (0, y), overlay)
    
    try:
        font_main = ImageFont.truetype(FONT_BOLD, 90)
        font_sub = ImageFont.truetype(FONT_REGULAR, 50)
    except:
        font_main = font_sub = ImageFont.load_default()
    
    # Main CTA
    main_text = "プロフから\nチェック"
    bbox = draw.textbbox((0, 0), main_text, font=font_main)
    main_x = (REEL_WIDTH - (bbox[2] - bbox[0])) // 2
    main_y = (REEL_HEIGHT - (bbox[3] - bbox[1])) // 2 - 200
    
    draw.text((main_x, main_y), main_text, font=font_main, fill=COLORS["accent_gold"])
    
    # Sub text
    sub_text = "👇 最安値・クーポン情報"
    bbox = draw.textbbox((0, 0), sub_text, font=font_sub)
    sub_x = (REEL_WIDTH - (bbox[2] - bbox[0])) // 2
    sub_y = REEL_HEIGHT - 300
    
    draw.text((sub_x, sub_y), sub_text, font=font_sub, fill=COLORS["text_white"])
    
    # Save and return clip
    cta_path = f"{CACHE_DIR}/cta_{datetime.now().timestamp()}.png"
    img.save(cta_path)
    
    return ImageClip(cta_path).set_duration(duration)

def generate_reel(product: Dict, output_path: str = "./video_v2.mp4") -> bool:
    """
    Generate complete Instagram reel
    """
    print("\n" + "="*80)
    print("🎬 Instagram Reel Generator v2 - Professional Quality")
    print("="*80)
    
    ensure_cache_dir()
    
    # Download product image
    print("\n【1】Product Image Download")
    image_path = f"{CACHE_DIR}/product.jpg"
    if not download_image(product.get('image', ''), image_path):
        print("❌ Failed to download image")
        return False
    
    # Create slides
    print("\n【2】Creating Slides")
    
    # Hook slide
    hook_text = random.choice(HOOK_HEADLINES)
    hook_clip = create_hook_slide(hook_text, duration=2.0)
    print(f"✅ Hook slide created: {hook_text}")
    
    # Product slide
    product_clip = create_product_slide(
        image_path,
        product.get('title', 'Product'),
        product.get('price', '0'),
        float(product.get('rating', 4.5)),
        duration=8.0
    )
    print(f"✅ Product slide created")
    
    # CTA slide
    cta_clip = create_cta_slide(duration=3.0)
    print(f"✅ CTA slide created")
    
    # Concatenate clips
    print("\n【3】Compositing Video")
    final_clip = concatenate_videoclips([hook_clip, product_clip, cta_clip])
    
    # Write video
    print(f"\n【4】Rendering Video")
    final_clip.write_videofile(
        output_path,
        fps=REEL_FPS,
        codec='libx264',
        audio=False,
        verbose=False,
        logger=None
    )
    
    print(f"✅ Reel generated: {output_path}")
    
    # Save product to prevent duplicates
    save_posted_product(product.get('id', 'unknown'), product.get('title', 'Unknown'))
    
    return True

# ==================== Main ====================

if __name__ == "__main__":
    # Test product
    test_product = {
        'id': 'test_001',
        'title': 'ワイヤレスイヤホン',
        'price': '3,990',
        'rating': 4.6,
        'image': 'https://picsum.photos/1080/1920',
        'url': 'https://amazon.co.jp'
    }
    
    success = generate_reel(test_product, "./video_v2.mp4")
    if success:
        print("\n✅ Reel generation completed successfully!")
    else:
        print("\n❌ Reel generation failed")
