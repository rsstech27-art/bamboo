import fitz
from pathlib import Path

pdf_path = Path('attached_assets/allwall-kp-bounded.pdf')
out_dir = Path('.agents/outputs/pdf-check-bounded')
out_dir.mkdir(parents=True, exist_ok=True)

doc = fitz.open(pdf_path)
print(f'pages={len(doc)}')
for page_no, page in enumerate(doc):
    rect = page.rect
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    image_path = out_dir / f'page-{page_no + 1}.png'
    pix.save(image_path)
    blocks = page.get_text('dict').get('blocks', [])
    text_blocks = [b for b in blocks if b.get('type') == 0]
    max_right = 0
    max_bottom = 0
    min_left = rect.width
    min_top = rect.height
    outside = []
    for block in text_blocks:
        x0, y0, x1, y1 = block['bbox']
        max_right = max(max_right, x1)
        max_bottom = max(max_bottom, y1)
        min_left = min(min_left, x0)
        min_top = min(min_top, y0)
        if x0 < 0 or y0 < 0 or x1 > rect.width or y1 > rect.height:
            outside.append((round(x0, 2), round(y0, 2), round(x1, 2), round(y1, 2)))
    print(f'page={page_no + 1} size={rect.width:.2f}x{rect.height:.2f}pt text_bounds=({min_left:.2f},{min_top:.2f})-({max_right:.2f},{max_bottom:.2f}) outside={outside}')
