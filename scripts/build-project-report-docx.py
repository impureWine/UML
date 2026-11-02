from pathlib import Path
import re
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from PIL import Image

root=Path(__file__).resolve().parents[1]
base=root/'docs'
lines=(base/'项目报告-云上之约.md').read_text(encoding='utf-8-sig').splitlines()
doc=Document()
sec=doc.sections[0]
sec.page_width=Cm(21);sec.page_height=Cm(29.7)
sec.top_margin=Cm(2);sec.bottom_margin=Cm(2)
sec.left_margin=Cm(2);sec.right_margin=Cm(2)
for name in ['Normal','Title','Heading 1','Heading 2','Heading 3','Caption']:
    s=doc.styles[name];s.font.name='Microsoft YaHei';s.font.color.rgb=RGBColor(0,0,0)
    s.element.rPr.rFonts.set(qn('w:eastAsia'),'微软雅黑')
doc.styles['Normal'].font.size=Pt(10.5)
doc.styles['Normal'].paragraph_format.line_spacing=1.35
doc.styles['Normal'].paragraph_format.space_after=Pt(7)
for name,size in [('Title',24),('Heading 1',17),('Heading 2',13),('Heading 3',11)]:
    doc.styles[name].font.size=Pt(size)
    doc.styles[name].paragraph_format.space_before=Pt(14)
    doc.styles[name].paragraph_format.space_after=Pt(8)
doc.styles['Caption'].font.size=Pt(9)
doc.styles['Caption'].paragraph_format.line_spacing=1.15
for border in doc.styles['Title'].element.xpath('.//w:pBdr'):
    border.getparent().remove(border)
for level in [1,2]:
    name=f'TOC {level}'
    s=doc.styles[name] if name in doc.styles else doc.styles.add_style(name,WD_STYLE_TYPE.PARAGRAPH)
    s.font.name='Microsoft YaHei';s.font.size=Pt(10.5);s.font.color.rgb=RGBColor(0,0,0)
    s.element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'),'微软雅黑')
    s.paragraph_format.space_before=Pt(0);s.paragraph_format.space_after=Pt(3)
    s.paragraph_format.line_spacing=1.15;s.paragraph_format.keep_with_next=False
    s.paragraph_format.left_indent=Cm(0.6 if level==2 else 0)

def link(p,text,url):
    h=OxmlElement('w:hyperlink');h.set(qn('r:id'),p.part.relate_to(url,RT.HYPERLINK,is_external=True))
    r=OxmlElement('w:r');pr=OxmlElement('w:rPr');c=OxmlElement('w:color');c.set(qn('w:val'),'245A81');pr.append(c)
    u=OxmlElement('w:u');u.set(qn('w:val'),'single');pr.append(u);r.append(pr)
    t=OxmlElement('w:t');t.text=text;r.append(t);h.append(r);p._p.append(h)

def inline(p,text):
    for t in re.split(r'(\[[^\]]+\]\(https?://[^)]+\)|\*\*.+?\*\*|`[^`]+`)',text):
        m=re.fullmatch(r'\[([^\]]+)\]\((https?://[^)]+)\)',t)
        if m:link(p,m[1],m[2])
        elif t.startswith('**') and t.endswith('**'):p.add_run(t[2:-2]).bold=True
        elif t.startswith('`') and t.endswith('`'):p.add_run(t[1:-1]).font.name='Consolas'
        else:p.add_run(t)

i=0
while i<len(lines):
    line=lines[i].strip()
    if not line:i+=1;continue
    if line=='## 目录':
        doc.add_page_break()
        p=doc.add_paragraph();r=p.add_run('目录');r.bold=True;r.font.size=Pt(20)
        i+=1;continue
    if line=='[[TOC]]':
        p=doc.add_paragraph()
        r=p.add_run();begin=OxmlElement('w:fldChar');begin.set(qn('w:fldCharType'),'begin');r._r.append(begin)
        instruction=OxmlElement('w:instrText');instruction.set(qn('xml:space'),'preserve');instruction.text=' TOC \\o "1-2" \\h \\z \\u ';p.add_run()._r.append(instruction)
        sep=OxmlElement('w:fldChar');sep.set(qn('w:fldCharType'),'separate');p.add_run()._r.append(sep)
        p.add_run('目录将在排版时更新')
        end=OxmlElement('w:fldChar');end.set(qn('w:fldCharType'),'end');p.add_run()._r.append(end)
        doc.add_page_break();i+=1;continue
    if line.startswith('```'):
        i+=1
        while i<len(lines) and not lines[i].startswith('```'):
            p=doc.add_paragraph();r=p.add_run(lines[i]);r.font.name='Consolas';r.font.size=Pt(9);i+=1
        i+=1;continue
    h=re.match(r'^(#{1,3}) (.+)',line)
    if h:
        title=h[2]
        if len(h[1])==1:
            doc.add_paragraph('《云上之约》AI辅助开发项目报告','Title')
        else:doc.add_heading(title,level=len(h[1])-1)
        i+=1;continue
    img=re.match(r'^!\[(.*?)\]\((.*?)\)$',line)
    if img:
        file=base/img[2]
        w,h=Image.open(file).size
        maxh=21 if file.name=='class-diagram.png' else (14.5 if 'example-' in file.name or 'process-' in file.name else 12)
        width=min(17,maxh*w/h)
        p=doc.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.keep_with_next=True
        p.paragraph_format.space_after=Pt(4)
        shape=p.add_run().add_picture(str(file),width=Cm(width));shape._inline.docPr.set('descr',img[1])
        i+=1;continue
    if line.startswith('|'):
        rows=[]
        while i<len(lines) and lines[i].strip().startswith('|'):
            row=[x.strip() for x in lines[i].strip().split('|')[1:-1]]
            if not all(re.fullmatch(r':?-+:?',x) for x in row):rows.append(row)
            i+=1
        table=doc.add_table(rows=0,cols=len(rows[0]));table.alignment=WD_TABLE_ALIGNMENT.CENTER;table.autofit=False
        widths=([3.1,8.1,5.8] if len(rows[0])==3 else [3,4.5,5,4.5] if len(rows[0])==4 else [5,12])
        if len(rows[0])==3 and rows[0][0]=='轮次':widths=[1.5,6,9.5]
        for col,w in zip(table.columns,widths):col.width=Cm(w)
        pr=table._tbl.tblPr;b=OxmlElement('w:tblBorders')
        for edge in ['top','left','bottom','right','insideH','insideV']:
            el=OxmlElement('w:'+edge);el.set(qn('w:val'),'single');el.set(qn('w:sz'),'4');el.set(qn('w:color'),'D9D9D9');b.append(el)
        pr.append(b)
        for ri,row in enumerate(rows):
            cells=table.add_row().cells
            if ri==0:
                header=OxmlElement('w:tblHeader');table.rows[-1]._tr.get_or_add_trPr().append(header)
            for ci,(cell,txt) in enumerate(zip(cells,row)):
                cell.width=Cm(widths[ci]);cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
                p=cell.paragraphs[0];p.paragraph_format.space_before=Pt(4);p.paragraph_format.space_after=Pt(4);p.paragraph_format.line_spacing=1.15
                inline(p,txt)
                for r in p.runs:r.font.size=Pt(8.5);r.bold=ri==0
                if ri==0 or ri%2==0:
                    shade=OxmlElement('w:shd');shade.set(qn('w:fill'),'EAF0F6' if ri==0 else 'F7F9FB');cell._tc.get_or_add_tcPr().append(shade)
        doc.add_paragraph().paragraph_format.space_after=Pt(2)
        continue
    if re.match(r'^图\d+',line):
        p=doc.add_paragraph(style='Caption');inline(p,line)
    else:
        p=doc.add_paragraph();inline(p,line)
        if line.startswith('**') and line.endswith('**'):p.paragraph_format.keep_with_next=True
    i+=1

p=sec.footer.paragraphs[0];p.alignment=WD_ALIGN_PARAGRAPH.CENTER
f=OxmlElement('w:fldSimple');f.set(qn('w:instr'),'PAGE');p._p.append(f)
doc.core_properties.title='《云上之约》AI辅助开发项目报告'
doc.core_properties.subject='面向对象程序设计课程项目报告'
out=base/'项目报告-云上之约.docx';doc.save(out)
print(out)
