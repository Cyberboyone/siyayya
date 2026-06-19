import sys
from PIL import Image

def create_square_og(input_path, output_path, size=512):
    try:
        # Open the original logo
        img = Image.open(input_path).convert("RGBA")
        
        # Create a new white square image
        square = Image.new("RGBA", (size, size), (255, 255, 255, 255))
        
        # Calculate padding to keep aspect ratio
        img_w, img_h = img.size
        ratio = min((size - 80) / img_w, (size - 80) / img_h) # 40px padding on each side
        new_w = int(img_w * ratio)
        new_h = int(img_h * ratio)
        
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Paste the resized logo into the center
        offset = ((size - new_w) // 2, (size - new_h) // 2)
        square.paste(img, offset, img)
        
        # Convert to RGB (no transparency) for OG image best practices
        bg = Image.new("RGB", square.size, (255, 255, 255))
        bg.paste(square, mask=square.split()[3]) # Use alpha channel as mask
        
        bg.save(output_path, "PNG")
        print(f"Successfully created {output_path}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    create_square_og("public/logo.png", "public/og-product.png", 512)
