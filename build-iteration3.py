import re,json,pathlib
p=pathlib.Path('.')
s=(p/'docs/03-design.md').read_text(encoding='utf-8-sig')
rows=[]
for line in s.splitlines():
 if re.match(r'\| [A-Za-z]+ / [A-Z_]+ \|',line):
  cells=line.split('|'); rows.append((cells[1].strip().split(' / ')[0],cells[2].strip()+'。'+cells[3].strip()))
skills=dict(rows)
names=['巴巴托斯','摩拉克斯','巴尔泽布','布耶尔','芙卡洛斯','赫布里穆','瓦沙嘉','伊斯塔露','阿斯莫代','若娜瓦','纳贝里士','“黄金”莱茵多特','莱茵多特/纳贝里士']
titles=['风之神','岩之神','雷之神','草之神','水之神','火之神','冰之神','时间之影','空间之执政','死亡之执政','生命之执政','黄金 · 炼金术士','吞噬生之执政']
colors=['#55d9ab','#e6b64e','#bd91ff','#b6ef65','#69bfff','#ff9361','#b0f4ef','#fff3ca','#ff6777','#db4c69','#97ebbd','#dfc276','#bce9c4']
paths=['M4 12c-4-9 21-11 18-2s-16 1-10 12 21-3 16-9M3 25c9 8 23 5 25-2','m16 2 12 14-12 14L4 16Zm0 8 5 6-5 6-5-6Z','m19 2-13 17h10l-3 12 14-19H17Z','M16 30C-6 19 5 3 16 16 27 3 38 19 16 30ZM16 16V2','M16 2C13 9 4 15 5 21a11 11 0 0 0 22 0C28 15 19 9 16 2Z','M15 2c5 8-3 9 3 14l5-7c13 18-1 25-11 20S3 13 9 10c-1 7 4 7 6-8Z','M16 1v30M3 8l26 16M3 24 29 8M11 4l5 5 5-5M11 28l5-5 5 5','M16 2a14 14 0 1 0 0 28 14 14 0 0 0 0-28Zm0 3v11l8 5M4 16h4m16 0h4','m16 2 13 7v15l-13 7-13-7V9Zm0 14L3 9m13 7 13-7M16 16v15','M2 16S8 5 16 5s14 11 14 11-6 11-14 11S2 16 2 16Zm14-7 5 7-5 7-5-7Z','M16 29V9M16 20C3 22 2 13 2 6c9 0 13 2 14 10C17 8 21 6 30 6c0 12-4 17-14 14Z','m16 1 4 11 11 4-11 4-4 11-4-11L1 16l11-4Z']
active={'JadeShield','NatureRecon','WaterDefeatDraw','FreezeCard','TimeRewind','SpaceOperation','DeathCardBomb','LifeReplenish','AlchemyTransmutation'}
cn=['风行加步','初雷庇护','岩胜加步','玉璋护盾','雷库存增益','雷爆弃牌','草木洞察','水胜加步','逆流补给','烈焰连胜','冻结','神性压制','时间回溯','空间操作','死亡退行','死亡布雷','生命兑换','生命补给','首次炼金优惠','炼金转化']
labels=dict(zip(skills,cn))
chars=[]
for i,name in enumerate(names):
 line=next(x for x in s.splitlines() if x.startswith('| CH-'+str(i+1).zfill(2)+' '))
 keys=[k for k in skills if k in line]
 # fusion line explicitly references source components
 if i==12: keys=['GoldenFirstExchangeDiscount','AlchemyTransmutation','LifeExchangeBonus','LifeReplenish']
 chars.append(dict(id='CH-'+str(i+1).zfill(2),name=name,title=titles[i],color=colors[i],faction='七神' if i<7 else '四影' if i<11 else '坎瑞亚' if i==11 else '隐藏融合',paths=[paths[11],paths[10]] if i==12 else [paths[i]],skills=[dict(name=labels[k],type='主动' if k in active else '被动',description=skills[k]) for k in keys]))
rules=['0阶起步，40阶登顶。剪刀胜布、布胜石头、石头胜剪刀；基础前进2/3/5阶，平局不动，角色加步另计。','公共牌90张（各30张）。硬币决定先后，交替各取30张。唯一普通准备阶段：2牌换1雷、1雷换2牌；普通初始3雷，总上限4；1～39阶可布雷，同阶可多雷。','每轮先技能、后锁牌、再同时揭牌。对手无牌时单向出牌计胜，风4/岩6/水5及火连胜照常生效。双方无牌且未登顶，阶高者胜，同阶平局。','只查实际落脚，一次1雷，敌雷优先，自雷也炸；普通退10阶最低0，新落脚继续查雷。火焚毁→护盾完整免疫→风首次免退→普通爆炸；死亡可改退13阶。','候选终局须等待本轮回溯机会结束才记战绩。隐藏融合由黄金正式战胜生命解锁；融合保留黄金和生命四组件，对冰仅生命侧受压制。','图鉴演示不消耗资源；私有雷位、手牌及技能情报只给授权席位。主动技能除时间回溯外在本人锁牌前合法窗口使用，具体条件见角色资料。']
(p/'src/resources/characters.js').write_text('const data = '+json.dumps(chars,ensure_ascii=False,indent=2)+';\nexport const CHARACTERS = Object.freeze(data.map(c => Object.freeze({...c, paths: Object.freeze(c.paths), skills: Object.freeze(c.skills.map(Object.freeze))})));\nexport function characterById(id) { const c=CHARACTERS.find(c=>c.id===id); if(!c) throw new TypeError("未知角色"); return c; }\nexport const CORE_RULES = Object.freeze('+json.dumps(rules,ensure_ascii=False)+');\n',encoding='utf-8')
