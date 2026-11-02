"""Render the simplified UML previews locally, without changing the originals."""
from pathlib import Path
from html import escape
from PIL import Image, ImageDraw, ImageFont
import math

ROOT = Path(__file__).resolve().parent
FONT = 'C:/Windows/Fonts/msyh.ttc'

class Canvas:
    def __init__(self, width, height):
        self.im = Image.new('RGB', (width, height), 'white')
        self.d = ImageDraw.Draw(self.im)
        self.svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">', '<rect width="100%" height="100%" fill="white"/>']
    def line(self, points, arrow=False, dash=False):
        self.d.line(points, fill='#526276', width=2)
        coords = ' '.join(f'{x},{y}' for x,y in points)
        self.svg.append(f'<polyline points="{coords}" fill="none" stroke="#526276" stroke-width="2"'+ (' stroke-dasharray="6 4"' if dash else '') + '/>')
        if arrow:
            x,y = points[-1]; a,b = points[-2]; angle = math.atan2(y-b,x-a)
            ends = [(x-11*math.cos(angle+t),y-11*math.sin(angle+t)) for t in [-.45,.45]]
            self.line([ends[0], (x,y), ends[1]])
    def text(self, x,y,s,size=19):
        self.d.text((x,y),s,font=ImageFont.truetype(FONT,size),fill='#21334a',anchor='mm')
        self.svg.append(f'<text x="{x}" y="{y}" text-anchor="middle" dominant-baseline="central" font-family="Microsoft YaHei,sans-serif" font-size="{size}" fill="#21334a">{escape(s)}</text>')
    def shape(self, box, ellipse=False):
        (self.d.ellipse if ellipse else self.d.rectangle)(box,fill='#f2f6fb',outline='#526276',width=2)
        x,y,r,b=box
        if ellipse: self.svg.append(f'<ellipse cx="{(x+r)/2}" cy="{(y+b)/2}" rx="{(r-x)/2}" ry="{(b-y)/2}" fill="#f2f6fb" stroke="#526276" stroke-width="2"/>')
        else: self.svg.append(f'<rect x="{x}" y="{y}" width="{r-x}" height="{b-y}" fill="#f2f6fb" stroke="#526276" stroke-width="2"/>')
    def save(self,name):
        self.im.save(ROOT / (name+'.png'))
        (ROOT / (name+'.svg')).write_text('\n'.join(self.svg+['</svg>']),encoding='utf-8')

c=Canvas(1000,1050)
c.text(500,38,'40阶登山博弈游戏 · 简易用例图',28)
c.shape((420,85,950,965)); c.text(685,110,'系统边界',18)
labels=['注册与登录','查看资料与战绩','浏览规则与调整设置','开始本地或AI对战','创建或加入联机房间','选角与初始选牌','准备：换牌与布雷','使用技能与锁定出牌','查看回合结算与回溯','查看最终结果与退出']
ys=[165+i*80 for i in range(10)]
for ax,ay,label,indices in [(150,165,'未登录使用者',[0]),(150,405,'账号使用者',list(range(5))),(150,765,'对局玩家',list(range(5,10)))]:
    c.shape((ax-16,ay-55,ax+16,ay-23),True)
    c.line([(ax,ay-23),(ax,ay+23)]); c.line([(ax-30,ay),(ax+30,ay)])
    c.line([(ax-24,ay+53),(ax,ay+23),(ax+24,ay+53)])
    c.text(ax,ay+77,label)
    for i in indices: c.line([(ax+30,ay),(470,ys[i])])
for y,label in zip(ys,labels):
    c.shape((470,y-27,900,y+27),True);c.text(685,y,label,20)
c.text(500,1000,'同一使用者可承担不同角色；连线表示参与关系。',18)
c.save('01-usecasediagram-simple')

c=Canvas(1380,1090)
c.text(690,35,'40阶登山博弈游戏 · 简易类图',28)
# Relationships are drawn first so that class boxes cover crossing endpoints.
c.line([(550,150),(370,150)],True,True);c.text(460,128,'提交结果',17)
c.line([(830,150),(1010,150)],True);c.text(920,128,'联机时使用',17)
c.line([(590,210),(590,270),(230,270),(230,330)],True);c.text(355,252,'包含 2 名玩家',17)
c.line([(790,210),(790,270),(1150,270),(1150,330)],True);c.text(1010,252,'包含 1 个棋盘',17)
c.line([(690,210),(690,330)],True);c.text(755,292,'委托裁决',17)
c.line([(550,395),(420,395),(420,680),(390,680),(390,880),(370,880)],True,True);c.text(449,480,'技能效果',16)
c.line([(230,450),(230,510)],True);c.text(318,480,'拥有 0..1',16)
c.line([(230,630),(230,800)],True);c.text(315,715,'包含 1..*',16)
c.line([(1150,450),(1150,800)],True);c.text(1237,695,'场上 0..*',16)
c.line([(1150,920),(1150,950),(45,950),(45,395),(90,395)],True);c.text(690,938,'每枚炸弹归属 1 名玩家',16)
c.line([(690,210),(875,210),(875,570),(830,570)],True);c.text(927,480,'包含牌库',16)
c.line([(690,630),(690,800)],True);c.text(777,710,'库存 0..90',16)
c.line([(370,420),(470,420),(470,770),(640,770),(640,800)]);c.text(550,745,'手牌 0..90',16)
def box(x,y,title,en,body):
    c.shape((x,y,x+280,y+120));c.text(x+140,y+22,title,22);c.text(x+140,y+48,en,17)
    c.line([(x,y+66),(x+280,y+66)])
    for i,s in enumerate(body):c.text(x+140,y+83+i*23,s,16)
box(90,90,'账号管理','AccountManager',['注册登录 / 保存战绩'])
box(550,90,'对局管理','Game',['阶段与回合','开始对局 / 推进回合 / 确认结果'])
box(1010,90,'联机管理','NetworkManager',['创建加入房间 / 同步与计时'])
box(90,330,'玩家','Player',['位置、手牌与库存雷','准备与出牌'])
box(550,330,'规则裁决','JudgeRule',['判断胜负','结算移动与炸弹'])
box(1010,330,'棋盘','MountainBoard',['0至40阶 / 查询阶位'])
box(90,510,'角色','Character',['名称与元素'])
box(550,510,'公共牌库','CardDeck',['剩余牌 / 抽牌'])
box(90,800,'技能组件（抽象）','SkillComponent',['来源与技能状态','检查条件与应用效果'])
box(550,800,'实体牌','PlayingCard',['标识与花色'])
box(1010,800,'炸弹','Bomb',['标识'])
c.text(690,980,'预览以标注说明数量与归属；完整 UML 关系符号见同名 PlantUML 源文件。',18)
c.text(690,1015,'具体技能合并为技能组件；档案、房间、账本、回溯快照及表现类省略。',18)
c.save('02-classdiagram-simple')
