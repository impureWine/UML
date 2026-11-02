from pathlib import Path
import json,re,math
from html import escape
from PIL import Image,ImageDraw,ImageFont
import fitz
ROOT=Path(__file__).resolve().parent
W,H=680,800
FONT='C:/Windows/Fonts/msyh.ttc'
ops=[];edges=[]
def shape(name,kind,x,y,w,h,fill='white',stroke='#858585',lw=.85):
    ops.append(dict(name=name,kind=kind,x=x,y=y,w=w,h=h,fill=fill,stroke=stroke,lw=lw))
def text(name,x,y,w,h,value,size=11.5,color='#222222',bold=False):
    ops.append(dict(name=name,kind='text',x=x,y=y,w=w,h=h,text=value,size=size,color=color,bold=bold))
def line(name,a,b,color='#707070',lw=.85):
    ops.append(dict(name=name,kind='line',a=a,b=b,color=color,lw=lw))
def label(x,y,value,w=100):
    shape('label-background','rect',x-w/2,y-7,w,14,'white','white',0)
    text('edge-label',x-w/2,y-7,w,14,value,10,'#555555')
def relation(a,b,kind,points):
    edges.append((a,b,kind))
    for index,(p,q) in enumerate(zip(points,points[1:])):
        if kind=='..>':
            length=math.dist(p,q)
            for t in range(0,int(length),8):
                t1=t/length;t2=min(length,t+4.5)/length
                line(f'{a}-{b}-dash',tuple(p[i]+(q[i]-p[i])*t1 for i in [0,1]),tuple(p[i]+(q[i]-p[i])*t2 for i in [0,1]))
        else:line(f'{a}-{b}-{index}',p,q)
    if kind in ['-->','..>']:
        x,y=points[-1];a0,b0=points[-2];angle=math.atan2(y-b0,x-a0)
        for t in [-.48,.48]:line('arrowhead',(x,y),(x-6*math.cos(angle+t),y-6*math.sin(angle+t)))
    if kind=='*--':
        x,y=points[0];nx,ny=points[1];vert=abs(ny-y)>abs(nx-x)
        shape('composition-diamond','diamond',x-3.5 if vert else x,y if vert else y-3.5,7 if vert else 12,12 if vert else 7,'#707070','#707070')

relation('Game','AccountManager','..>',[(255,85),(192,85)]);label(223,68,'提交结果',58)
relation('Game','NetworkManager','-->',[(425,85),(488,85)]);label(456,68,'联机使用',58)
relation('Game','Player','*--',[(278,152),(278,178),(107,178),(107,220)])
label(123,203,'2',15);label(292,163,'1',15)
relation('Game','Board','*--',[(402,152),(402,178),(573,178),(573,220)])
label(555,203,'1',15);label(388,163,'1',15)
relation('Game','Deck','*--',[(340,152),(340,220)])
label(353,166,'1',15);label(353,206,'1',15)
relation('Game','Rule','-->',[(425,120),(457,120),(457,657),(425,657)]);label(457,571,'委托裁决',58)
relation('Player','Character','*--',[(107,332),(107,405)])
label(120,347,'1',15);label(130,389,'0..1',34)
relation('Character','Skill','*--',[(107,517),(107,605)])
label(120,533,'1',15);label(132,589,'1..*',36)
relation('Player','Card','--',[(192,285),(221,285),(221,371),(285,371),(285,405)])
label(241,300,'0..1',34);label(313,390,'0..90',40);label(251,354,'手牌',32)
relation('Deck','Card','--',[(340,332),(340,405)])
label(364,347,'0..1',34);label(366,390,'0..90',40);label(366,370,'库存',32)
relation('Board','Bomb','--',[(573,332),(573,405)])
label(588,348,'1',15);label(599,389,'0..*',34);label(604,369,'场上炸弹',55)
shape('crossing-gap-1','rect',103,552,8,10,'white','white',0)
shape('crossing-gap-2','rect',453,552,8,10,'white','white',0)
relation('Bomb','Player','-->',[(573,517),(573,557),(10,557),(10,277),(22,277)])
label(599,531,'0..*',34);label(29,345,'1',15);label(347,557,'所有者',44)
relation('Rule','Skill','..>',[(255,657),(192,657)]);label(223,638,'技能效果',59)

def cls(x,y,cn,en,body,palette,abstract=False):
    fill,stroke=palette
    shape(en,'rect',x,y,170,112,'white',stroke)
    shape(en+'-header','rect',x,y,170,44,fill,stroke)
    text(en+'-cn',x+3,y+3,164,20,cn,12.5,bold=True)
    text(en+'-en',x+3,y+23,164,18,en,10.5,stroke)
    for i,s in enumerate(body):text(en+'-body',x+4,y+49+i*15,162,15,s)
blue=('#EAF2FA','#4E78A0');green=('#EAF5F1','#4D857B');purple=('#F1EDF8','#84719D')
cls(22,40,'账号管理','AccountManager',['+ 注册登录()','+ 保存战绩()'],blue)
cls(255,40,'对局管理','Game',['+ 阶段与回合','+ 开始对局()','+ 推进回合()','+ 确认结果()'],blue)
cls(488,40,'联机管理','NetworkManager',['+ 创建加入房间()','+ 同步与计时()'],blue)
cls(22,220,'玩家','Player',['+ 位置、手牌与库存雷','+ 准备与出牌()'],green)
cls(255,220,'公共牌库','CardDeck',['+ 剩余牌','+ 抽牌()'],green)
cls(488,220,'棋盘','MountainBoard',['+ 0至40阶','+ 查询阶位()'],green)
cls(22,405,'角色','Character',['+ 名称与元素'],purple)
cls(255,405,'实体牌','PlayingCard',['+ 标识与花色'],green)
cls(488,405,'炸弹','Bomb',['+ 标识'],green)
cls(22,605,'技能组件（抽象）','SkillComponent',['+ 来源与技能状态','+ 检查条件与应用效果()'],purple)
cls(255,605,'规则裁决','JudgeRule',['+ 判断胜负()','+ 结算移动与炸弹()'],purple)
# Compact UML key; caption and methodological notes remain outside the figure.
relation('key','composition','*--',[(70,762),(110,762)]);text('key-composition',114,753,48,18,'组合',10.5)
relation('key','association','-->',[(240,762),(280,762)]);text('key-association',284,753,48,18,'关联',10.5)
relation('key','dependency','..>',[(410,762),(450,762)]);text('key-dependency',454,753,48,18,'依赖',10.5)
edges=edges[:13]
source=(ROOT.parent/'02-classdiagram-simple.puml').read_text(encoding='utf-8')
matches=re.findall(r'^(\w+)(?: "[^"]+")? (\.\.>|-->|\*--|--)(?: "[^"]+")? (\w+)',source,re.M)
assert sorted((a,b,k) for a,k,b in matches)==sorted(edges)
assert len(re.findall(r'^(?:abstract )?class ',source,re.M))==11
(ROOT/'figure-model.json').write_text(json.dumps(dict(width=W,height=H,ops=ops,edges=edges),ensure_ascii=False,indent=2),encoding='utf-8')
# Reuse the already checked exporter without running the use-case layout.
exporter=(ROOT.parent/'report_polished/build_figure.py').read_text(encoding='utf-8')
exporter=exporter[exporter.index('svg=['):exporter.index('source=source.replace')]
exporter=exporter.replace("'01-usecasediagram-simple_polished'","'02-classdiagram-simple_polished'")
exporter=exporter.replace("(d.ellipse if kind=='ellipse' else d.rectangle)(bbox,fill=fill,outline=stroke,width=max(1,round(lw*scale)))", """if kind=='diamond':
            poly=[(x+w/2,y),(x+w,y+h/2),(x+w/2,y+h),(x,y+h/2)]
            d.polygon([(a*scale,b*scale) for a,b in poly],fill=fill)
        else:(d.ellipse if kind=='ellipse' else d.rectangle)(bbox,fill=fill,outline=stroke,width=max(1,round(lw*scale)))""")
exporter=exporter.replace("(page.draw_oval if kind=='ellipse' else page.draw_rect)(pr,color=rgb(stroke),fill=rgb(fill),width=lw*ps)","""if kind=='diamond':
            page.draw_polyline([fitz.Point(a*ps,b*ps) for a,b in poly],color=rgb(stroke),fill=rgb(fill),closePath=True,width=lw*ps)
            svg.append('<polygon points="'+' '.join(f'{a},{b}' for a,b in poly)+f'" fill="{fill}"/>')
        else:(page.draw_oval if kind=='ellipse' else page.draw_rect)(pr,color=rgb(stroke),fill=rgb(fill),width=lw*ps)""")
exporter=exporter.replace("else:svg.append(f'<rect", "elif kind!='diamond':svg.append(f'<rect")
exec(exporter)
(ROOT/'02-classdiagram-simple_polished.puml').write_text(source,encoding='utf-8')
print('Verified 11 classes and 13 source relationships; labels fit; PNG 300 dpi.')
