"""High resolution PNG and editable SVG previews for the simplified UML."""
from pathlib import Path
from html import escape
import math
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FONT = 'C:/Windows/Fonts/msyh.ttc'
INK, MUTED, EDGE = '#22364B', '#768595', '#8A9AAA'
BLUE = ('#EAF2FA', '#4E78A0')
TEAL = ('#EAF5F1', '#4D857B')
LILAC = ('#F1EDF8', '#84719D')

class Sheet:
    def __init__(self,w,h):
        self.w,self.h=w,h
        self.im=Image.new('RGB',(w*2,h*2),'white'); self.d=ImageDraw.Draw(self.im)
        self.svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">', '<rect width="100%" height="100%" fill="white"/>']
    def text(self,x,y,s,size=20,color=INK,anchor='middle'):
        self.d.text((x*2,y*2),s,font=ImageFont.truetype(FONT,size*2),fill=color,anchor='lm' if anchor=='start' else 'mm')
        self.svg.append(f'<text x="{x}" y="{y}" font-family="Microsoft YaHei,sans-serif" font-size="{size}" fill="{color}" text-anchor="{anchor}" dominant-baseline="central">{escape(s)}</text>')
    def rect(self,b,fill='white',stroke='#DDE5EB',radius=12):
        x,y,r,bottom=b
        self.d.rounded_rectangle(tuple(v*2 for v in b),radius=radius*2,fill=fill,outline=stroke,width=2)
        self.svg.append(f'<rect x="{x}" y="{y}" width="{r-x}" height="{bottom-y}" rx="{radius}" fill="{fill}" stroke="{stroke}"/>')
    def line(self,pts,kind='plain',color=EDGE):
        if kind=='dependency':
            for (x,y),(a,b) in zip(pts,pts[1:]):
                length=math.hypot(a-x,b-y)
                for n in range(0,int(length),12):
                    t=n/length; u=min(n+7,length)/length
                    self.d.line([(2*(x+(a-x)*t),2*(y+(b-y)*t)),(2*(x+(a-x)*u),2*(y+(b-y)*u))],fill=color,width=3)
        else:self.d.line([(x*2,y*2) for x,y in pts],fill=color,width=3)
        coords=' '.join(f'{x},{y}' for x,y in pts)
        self.svg.append(f'<polyline points="{coords}" fill="none" stroke="{color}" stroke-width="1.5" stroke-linejoin="round"'+(' stroke-dasharray="7 5"' if kind=='dependency' else '')+'/>')
        if kind in ['arrow','dependency']:
            x,y=pts[-1];a,b=pts[-2];t=math.atan2(y-b,x-a)
            self.line([(x-11*math.cos(t-.45),y-11*math.sin(t-.45)),(x,y),(x-11*math.cos(t+.45),y-11*math.sin(t+.45))],color=color)
        if kind=='composition':
            x,y=pts[0];a,b=pts[1];t=math.atan2(b-y,a-x)
            p=[(x,y),(x+10*math.cos(t)-5*math.sin(t),y+10*math.sin(t)+5*math.cos(t)),(x+20*math.cos(t),y+20*math.sin(t)),(x+10*math.cos(t)+5*math.sin(t),y+10*math.sin(t)-5*math.cos(t))]
            self.d.polygon([(a*2,b*2) for a,b in p],fill=color)
            self.svg.append('<polygon points="'+' '.join(f'{a},{b}' for a,b in p)+f'" fill="{color}"/>')
    def ellipse(self,b,fill='white',stroke=EDGE):
        x,y,r,z=b;self.d.ellipse(tuple(v*2 for v in b),fill=fill,outline=stroke,width=3)
        self.svg.append(f'<ellipse cx="{(x+r)/2}" cy="{(y+z)/2}" rx="{(r-x)/2}" ry="{(z-y)/2}" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>')
    def label(self,x,y,s):
        width=ImageFont.truetype(FONT,17).getlength(s)+16
        self.rect((x-width/2,y-14,x+width/2,y+14),'white','white',4);self.text(x,y,s,17,MUTED)
    def header(self,num,title,subtitle):
        self.rect((48,42,104,80),INK,INK,7);self.text(76,61,num,18,'white')
        self.text(125,61,title,30,anchor='start');self.text(49,109,subtitle,17,MUTED,anchor='start')
        self.line([(49,143),(self.w-49,143)],color='#E3E9EE')
    def save(self,name):
        self.im.save(ROOT/(name+'.png'))
        (ROOT/(name+'.svg')).write_text('\n'.join(self.svg+['</svg>']),encoding='utf-8')

s=Sheet(1450,930)
s.header('01','40阶登山博弈游戏｜简易用例图','账号功能与对局功能分组呈现，保留核心参与关系')
s.rect((280,184,1170,790),'#FAFCFE','#DCE5EE',16)
s.text(725,216,'40阶登山博弈游戏',22)
for x,title,palette in [(320,'账号与对战入口',BLUE),(765,'对局核心操作',TEAL)]:
    s.rect((x,253,x+365,298),palette[0],palette[0],8);s.text(x+182,275,title,19,palette[1])
def actor(x,y,title,palette):
    s.ellipse((x-15,y-44,x+15,y-14),'white',palette[1])
    s.line([(x,y-14),(x,y+30)],color=palette[1]);s.line([(x-28,y+4),(x+28,y+4)],color=palette[1]);s.line([(x-24,y+57),(x,y+30),(x+24,y+57)],color=palette[1])
    s.text(x,y+87,title,20)
actor(135,295,'未登录使用者',BLUE)
actor(135,580,'账号使用者',BLUE)
actor(1315,535,'对局玩家',TEAL)
ys=[350,438,526,614,702]
for y in ys:s.line([(163,584),(320,y)],color='#9EB3C6')
s.line([(163,299),(245,299),(245,350),(320,350)],color=BLUE[1])
for y in ys:s.line([(1287,539),(1130,y)],color='#98B7AD')
left=['注册与登录','查看资料与战绩','浏览规则与调整设置','开始本地或AI对战','创建或加入联机房间']
right=['选角与初始选牌','准备：换牌与布雷','使用技能与锁定出牌','查看回合结算与回溯','查看最终结果与退出']
for x,labels,palette in [(320,left,BLUE),(765,right,TEAL)]:
    for y,label in zip(ys,labels):
        s.ellipse((x,y-30,x+365,y+30),'white',palette[1]);s.text(x+182,y,label,20)
s.text(725,844,'同一使用者可在首页与对局中承担不同角色；AI属于系统内部对象。',17,MUTED)
s.save('01-usecasediagram-simple')

s=Sheet(1580,1320)
s.header('02','40阶登山博弈游戏｜简易类图','以对局管理为中心，保留玩家、资源、规则与联机关系')
# Fixed lanes keep relationship lines clear of the class bodies.
s.line([(630,270),(420,270)],'dependency');s.label(525,247,'提交结果')
s.line([(950,270),(1160,270)],'arrow');s.label(1055,247,'联机时使用')
s.line([(670,350),(670,414),(260,414),(260,490)],'composition');s.label(419,393,'2 名玩家')
s.line([(790,350),(790,490)],'composition');s.label(852,419,'1 个牌库')
s.line([(910,350),(910,414),(1320,414),(1320,490)],'composition');s.label(1123,393,'1 个棋盘')
s.line([(950,310),(1050,310),(1050,1110),(950,1110)],'arrow');s.label(1050,990,'委托裁决')
s.line([(260,620),(260,760)],'composition');s.label(325,693,'0..1 个角色')
s.line([(260,890),(260,1030)],'composition');s.label(326,960,'1..* 个技能')
s.line([(790,620),(790,760)]);s.label(866,695,'库存 0..90')
s.line([(420,580),(520,580),(520,710),(690,710),(690,760)]);s.label(600,690,'手牌 0..90')
s.line([(1320,620),(1320,760)]);s.label(1395,695,'场上 0..*')
s.line([(1320,890),(1320,954),(60,954),(60,555),(100,555)],'arrow');s.label(790,954,'每枚炸弹归属 1 名玩家')
s.line([(630,1110),(420,1110)],'dependency');s.label(525,1088,'技能效果')
def cls(x,y,title,en,body,palette):
    s.rect((x,y,x+320,y+130),'white',palette[1],10)
    s.rect((x+1,y+1,x+319,y+66),palette[0],palette[0],9)
    s.line([(x,y+67),(x+320,y+67)],color=palette[1])
    s.text(x+160,y+24,title,22);s.text(x+160,y+49,en,16,palette[1])
    for i,t in enumerate(body):s.text(x+160,y+89+i*24,t,17)
cls(100,220,'账号管理','AccountManager',['注册登录 · 保存战绩'],BLUE)
cls(630,220,'对局管理','Game',['阶段与回合','开始对局 · 推进回合 · 确认结果'],BLUE)
cls(1160,220,'联机管理','NetworkManager',['创建加入房间 · 同步与计时'],BLUE)
cls(100,490,'玩家','Player',['位置、手牌与库存雷','准备与出牌'],TEAL)
cls(630,490,'公共牌库','CardDeck',['剩余牌 · 抽牌'],TEAL)
cls(1160,490,'棋盘','MountainBoard',['0至40阶 · 查询阶位'],TEAL)
cls(100,760,'角色','Character',['名称与元素'],LILAC)
cls(630,760,'实体牌','PlayingCard',['标识与花色'],TEAL)
cls(1160,760,'炸弹','Bomb',['标识'],TEAL)
cls(100,1030,'技能组件（抽象）','SkillComponent',['来源与技能状态','检查条件与应用效果'],LILAC)
cls(630,1030,'规则裁决','JudgeRule',['判断胜负','结算移动与炸弹'],LILAC)
s.line([(60,1210),(1520,1210)],color='#E3E9EE')
s.line([(100,1255),(160,1255)],'composition');s.text(180,1255,'组合',17,MUTED,anchor='start')
s.line([(300,1255),(360,1255)],'arrow');s.text(380,1255,'关联',17,MUTED,anchor='start')
s.line([(500,1255),(560,1255)],'dependency');s.text(580,1255,'依赖',17,MUTED,anchor='start')
s.text(1320,1255,'具体技能合并为技能组件',17,MUTED)
s.save('02-classdiagram-simple')
