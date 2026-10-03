"""Render the completed guide and validate its text and bounds."""

from pathlib import Path
import pymupdf as fitz

pdf = Path("docs/all-wall-guide/ALL-WALL-user-guide.pdf")
output = Path("/tmp/all-wall-guide-preview")
output.mkdir(parents=True, exist_ok=True)
doc = fitz.open(pdf)
assert len(doc) == 2
text = "\n".join(page.get_text() for page in doc)
for expected in [
    "1. Загрузите фото", "2. Отметьте поверхность",
    "3. Укажите размеры", "4. Профили между панелями",
    "5. Торцевые профили", "6. Масштабирование текстуры",
    "7. Подсветка ТВ-зоны", "8. Сохранение результата",
    "9. Если PDF отсутствует", "Масштаб рисунка", "Сбросить масштаб",
    "Профиль торц.", "Повторить загрузку PDF",
    "Восстановить PDF из расчёта", "Прикрепить PDF с устройства",
    "PDF прикреплён", "LED", "незаверш", "₽",
]:
    assert expected.casefold() in text.casefold(), expected
assert "\ufffd" not in text
for index, page in enumerate(doc):
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            x0, y0, x1, y1 = line["bbox"]
            assert 45 <= x0 < x1 <= 550, (index, line)
            assert 15 <= y0 < y1 <= 825, (index, line)
    for font in page.get_fonts():
        assert doc.extract_font(font[0])[3], "Font must be embedded"
    page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(output / f"page-{index + 1}.png")
print(f"Validated: {len(doc)} pages, {len(text)} readable characters, embedded fonts, safe bounds.")
print(output)