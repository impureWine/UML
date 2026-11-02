from pathlib import Path
import pypdfium2 as pdfium
from PIL import Image,ImageDraw
from pypdf import PdfReader
from zipfile import ZipFile
import json

root=Path(__file__).resolve().parents[1]/'docs'
qa=root/'report-docx-qa'
pdf=pdfium.PdfDocument(str(qa/'report.pdf'))
thumbs=[]
for i,page in enumerate(pdf):
    img=page.render(scale=1.5).to_pil().convert('RGB')
    img.save(qa/f'page-{i+1}.png')
    img.thumbnail((400,566))
    thumb=Image.new('RGB',(420,600),'#dddddd')
    thumb.paste(img,((420-img.width)//2,20))
    ImageDraw.Draw(thumb).text((10,580),f'Page {i+1}',fill='black')
    thumbs.append(thumb)
for offset in range(0,len(thumbs),6):
    sheet=Image.new('RGB',(1260,1200),'white')
    for j,thumb in enumerate(thumbs[offset:offset+6]):sheet.paste(thumb,((j%3)*420,(j//3)*600))
    sheet.save(qa/f'contact-{offset//6+1}.jpg')
with ZipFile(root/'项目报告-云上之约.docx') as z:
    rel=z.read('word/_rels/document.xml.rels').decode()
    media=[p for p in z.namelist() if p.startswith('word/media/')]
reader=PdfReader(qa/'report.pdf')
report={'pages':len(pdf),'embedded_images':len(media),'github_link':'https://github.com/impureWine/UML' in rel,'run_link':'https://115.29.176.232/' in rel,'page_text_lengths':[len(p.extract_text() or '') for p in reader.pages]}
(qa/'audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report))
