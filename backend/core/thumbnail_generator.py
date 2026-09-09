import os
import io
import hashlib
from PIL import Image, ImageDraw, ImageFont
from django.core.files.base import ContentFile

PALETTES = [
    {"bg": (25, 25, 25), "accent": (67, 97, 238), "text": (255, 255, 255), "sub": (200, 200, 200)}, # Dark/Blue
    {"bg": (10, 25, 47), "accent": (100, 255, 218), "text": (255, 255, 255), "sub": (180, 200, 220)}, # Navy/Cyan
    {"bg": (30, 10, 40), "accent": (255, 105, 180), "text": (255, 255, 255), "sub": (220, 180, 200)}, # Purple/Pink
    {"bg": (15, 35, 25), "accent": (150, 255, 50), "text": (255, 255, 255), "sub": (180, 220, 180)}, # Forest/Lime
    {"bg": (40, 15, 15), "accent": (255, 140, 0), "text": (255, 255, 255), "sub": (220, 180, 180)}, # Maroon/Orange
]

def _get_font_path():
    import site
    site_pkgs = site.getsitepackages()[0]
    font_path = os.path.join(site_pkgs, "reportlab", "fonts", "VeraBd.ttf")
    if not os.path.exists(font_path):
        font_path = "VeraBd.ttf"
    return font_path

def generate_blog_thumbnail(title: str, subtitle: str, category: str, seed: str) -> ContentFile:
    """
    Generates a 1200x630 OpenGraph thumbnail image using Pillow.
    Returns a Django ContentFile ready to be saved to an ImageField.
    """
    font_path = _get_font_path()
    width, height = 1200, 630

    # Pick a pseudo-random palette based on the seed
    palette_idx = int(hashlib.md5(seed.encode()).hexdigest(), 16) % len(PALETTES)
    palette = PALETTES[palette_idx]

    img = Image.new('RGB', (width, height), color=palette["bg"])
    draw = ImageDraw.Draw(img)

    accent = palette["accent"]
    
    # Draw geometric shapes (right side pattern)
    draw.rectangle([800, -100, 1100, 200], fill=accent)
    draw.ellipse([900, 450, 1200, 750], fill=accent)
    draw.rectangle([700, 250, 850, 400], fill=accent)
    # Triangle / arrow shape
    draw.polygon([(650, 400), (750, 300), (850, 400), (750, 500)], fill=accent)
    # Small shapes
    draw.ellipse([1100, 250, 1150, 300], fill=accent)
    draw.rectangle([600, 550, 650, 600], fill=accent)

    try:
        font_large = ImageFont.truetype(font_path, 80)
        font_medium = ImageFont.truetype(font_path, 40)
        font_small = ImageFont.truetype(font_path, 30)
    except Exception as e:
        print("Warning: Could not load TTF font. Using default.", e)
        font_large = font_medium = font_small = ImageFont.load_default()

    # Wrap title (max width approx 700px)
    words = title.split()
    lines = []
    current_line = []
    for word in words:
        current_line.append(word)
        bbox = draw.textbbox((0, 0), " ".join(current_line), font=font_large)
        if (bbox[2] - bbox[0]) > 700:
            current_line.pop()
            lines.append(" ".join(current_line))
            current_line = [word]
    if current_line:
        lines.append(" ".join(current_line))
    
    y = 100
    for line in lines:
        draw.text((100, y), line, font=font_large, fill=palette["text"])
        bbox = draw.textbbox((0, 0), line, font=font_large)
        y += (bbox[3] - bbox[1]) + 20

    y += 20
    # Add subtitle (truncate if too long)
    if len(subtitle) > 60:
        subtitle = subtitle[:57] + "..."
    draw.text((100, y), subtitle, font=font_medium, fill=palette["sub"])

    # Draw category pill at the bottom
    if category:
        cat_y = 500
        cat_x = 100
        bbox = draw.textbbox((0, 0), category.upper(), font=font_small)
        cat_w = bbox[2] - bbox[0]
        cat_h = bbox[3] - bbox[1]
        
        draw.rounded_rectangle([cat_x, cat_y, cat_x + cat_w + 40, cat_y + cat_h + 30], radius=10, fill=accent)
        draw.text((cat_x + 20, cat_y + 15), category.upper(), font=font_small, fill=palette["bg"]) # bg color for text on accent pill

    # Save to bytes
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    filename = f"thumb_{seed[:8]}.png"
    return ContentFile(img_byte_arr.read(), name=filename)
