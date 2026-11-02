"""Report-sized UML use-case figure; all content comes from the simplified PUML."""
from pathlib import Path
import json, math, re
from html import escape
from PIL import Image, ImageDraw, ImageFont
import fitz

ROOT=Path(__file__).resolve().parent
W,H=680,420
FONT='C:/Windows/Fonts/msyh.ttc'
ops=[]
def shape(name,kind,x,y,w,h,fill='white',stroke='#858585',lw=0.9):
    ops.append(dict(name=name,kind=kind,x=x,y=y,w=w,h=h,fill=fill,stroke=stroke,lw=lw))
def text(name,x,y,w,h,value,size=12,color='#222222',bold=False):
    ops.append(dict(name=name,kind='text',x=x,y=y,w=w,h=h,text=value,size=size,color=color,bold=bold))
def line(name,a,b,color='#707070',lw=0.9):
    ops.append(dict(name=name,kind='line',a=a,b=b,color=color,lw=lw))

shape('系统边界','rect',119,15,442,389,stroke='#858585',lw=0.8)
text('系统名称',129,25,422,23,'40阶登山博弈游戏',14,bold=True)
text('账号分组',140,59,180,22,'账号与对战入口',12,color='#4E78A0',bold=True)
text('对局分组',350,59,180,22,'对局核心操作',12,color='#4D857B',bold=True)
ys=[110,171,232,293,354]
left=['注册与登录','查看资料与战绩','浏览规则与调整设置','开始本地或AI对战','创建或加入联机房间']
right=['选角与初始选牌','准备：换牌与布雷','使用技能与锁定出牌','查看回合结算与回溯','查看最终结果与退出']
edges=[('Visitor','Login')]+[('User',n) for n in ['Login','Profile','Settings','Start','Online']]+[('Player',n) for n in ['Select','Prepare','Play','Round','End']]
# Association lines are undirected and all eleven source edges are retained.
line('Visitor-Login',(79,92),(140,110))
for y,n in zip(ys,['Login','Profile','Settings','Start','Online']):line('User-'+n,(79,265),(140,y))
for y,n in zip(ys,['Select','Prepare','Play','Round','End']):line('Player-'+n,(601,232),(530,y))
for x,values,fill,border,ids in [(140,left,'#F3F7FC','#4E78A0',['Login','Profile','Settings','Start','Online']),(350,right,'#F3F8F6','#4D857B',['Select','Prepare','Play','Round','End'])]:
    for y,value,id in zip(ys,values,ids):
        shape(id,'ellipse',x,y-20,180,40,fill,border)
        text(id+'-label',x+7,y-14,166,28,value,12)
def actor(name,x,y,label):
    shape(name+'-head','ellipse',x-8,y-26,16,16,'white','#444444')
    line(name+'-body',(x,y-10),(x,y+19),'#444444')
    line(name+'-arms',(x-19,y),(x+19,y),'#444444')
    line(name+'-leg-left',(x,y+19),(x-16,y+39),'#444444')
    line(name+'-leg-right',(x,y+19),(x+16,y+39),'#444444')
    text(name+'-label',x-54,y+43,108,23,label,12)
actor('Visitor',60,92,'未登录使用者')
actor('User',60,265,'账号使用者')
actor('Player',620,232,'对局玩家')

source=(ROOT.parent/'01-usecasediagram-simple.puml').read_text(encoding='utf-8')
original_edges=re.findall(r'^(Visitor|User|Player) -- (\w+)',source,re.M)
assert sorted(original_edges)==sorted(edges)
assert len(left+right)==10 and len(edges)==11
(ROOT/'figure-model.json').write_text(json.dumps(dict(width=W,height=H,ops=ops,edges=edges),ensure_ascii=False,indent=2),encoding='utf-8')
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="180mm" height="{180*H/W}mm" viewBox="0 0 {W} {H}">','<rect width="100%" height="100%" fill="white"/>']
scale=180/25.4*300/W
im=Image.new('RGB',(round(W*scale),round(H*scale)),'white');d=ImageDraw.Draw(im)
pdf=fitz.open();page=pdf.new_page(width=180/25.4*72,height=180/25.4*72*H/W)
ps=page.rect.width/W
page.insert_font(fontname='CJK',fontfile=FONT)
pf=fitz.Font(fontfile=FONT)
def rgb(s):
    if s=='white':return (1,1,1)
    return tuple(int(s[i:i+2],16)/255 for i in [1,3,5])
for o in ops:
    kind=o['kind']
    if kind=='line':
        a,b=o['a'],o['b'];lw=o['lw'];col=o['color']
        d.line([(a[0]*scale,a[1]*scale),(b[0]*scale,b[1]*scale)],fill=col,width=max(1,round(lw*scale)))
        page.draw_line(fitz.Point(a[0]*ps,a[1]*ps),fitz.Point(b[0]*ps,b[1]*ps),color=rgb(col),width=lw*ps)
        svg.append(f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="{col}" stroke-width="{lw}"/>')
    elif kind=='text':
        x,y=o['x']+o['w']/2,o['y']+o['h']/2;s=o['text'];size=o['size'];col=o['color']
        font=ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc' if o['bold'] else FONT,round(size*scale))
        assert font.getlength(s) < o['w']*scale, s
        d.text((x*scale,y*scale),s,font=font,anchor='mm',fill=col)
        width=pf.text_length(s,fontsize=size*ps)
        page.insert_text((x*ps-width/2,y*ps+size*ps*.35),s,fontname='CJK',fontsize=size*ps,color=rgb(col))
        svg.append(f'<text x="{x}" y="{y}" text-anchor="middle" dominant-baseline="central" font-family="Microsoft YaHei,sans-serif" font-size="{size}" font-weight="{700 if o["bold"] else 400}" fill="{col}">{escape(s)}</text>')
    else:
        x,y,w,h=o['x'],o['y'],o['w'],o['h'];fill,stroke,lw=o['fill'],o['stroke'],o['lw']
        bbox=tuple(v*scale for v in (x,y,x+w,y+h));pr=fitz.Rect(x*ps,y*ps,(x+w)*ps,(y+h)*ps)
        (d.ellipse if kind=='ellipse' else d.rectangle)(bbox,fill=fill,outline=stroke,width=max(1,round(lw*scale)))
        (page.draw_oval if kind=='ellipse' else page.draw_rect)(pr,color=rgb(stroke),fill=rgb(fill),width=lw*ps)
        if kind=='ellipse':svg.append(f'<ellipse cx="{x+w/2}" cy="{y+h/2}" rx="{w/2}" ry="{h/2}" fill="{fill}" stroke="{stroke}" stroke-width="{lw}"/>')
        else:svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" stroke-width="{lw}"/>')
stem=ROOT/'01-usecasediagram-simple_polished'
im.save(str(stem)+'.png',dpi=(300,300))
Path(str(stem)+'.svg').write_text('\n'.join(svg+['</svg>']),encoding='utf-8')
pdf.save(str(stem)+'.pdf');pdf.close()
source=source.replace('title 40阶登山博弈游戏 · 简易用例图','title 40阶登山博弈游戏 · 简易用例图（报告版）')
(ROOT/'01-usecasediagram-simple_polished.puml').write_text(source,encoding='utf-8')
print('Verified: 3 actors, 10 use cases, 11 unchanged associations. PNG: '+str(im.size))
