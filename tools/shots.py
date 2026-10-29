# python3 tools/shots.py 出力フォルダ … 1366×650 で スクリーンショットを とる
import os, sys
from playwright.sync_api import sync_playwright
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(R, 'shots')
os.makedirs(OUT, exist_ok=True)
URL = 'file://' + os.path.abspath(os.path.join(R, 'index.html'))
errs = []

def shot(pg, name, wait=1300):
    pg.wait_for_timeout(wait); pg.screenshot(path=os.path.join(OUT, name + '.png'))

def keys(pg, s):
    for ch in s: pg.evaluate(f"__otasuke.key({ch!r})")

def click(pg, sel): pg.click(sel); pg.wait_for_timeout(250)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1366, 'height': 650})
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); shot(pg, '01_title', 500)
    # 挑戦 → くりあがり あり → たくさん
    click(pg, '[data-h=chal]'); shot(pg, '02_kind', 300)
    click(pg, '[data-h="k:add1"]'); shot(pg, '03_level', 300)
    click(pg, '[data-h="l:many"]')
    # 1問目を 8＋5 に さしかえて、リセットで はじめから
    pg.evaluate("__otasuke.st.prob = window.OTASUKE.parse('8+5')")
    pg.evaluate("document.querySelector('#bReset').click()"); pg.wait_for_timeout(200)
    pg.click('[data-m=yes]'); shot(pg, '04_add_s1')
    keys(pg, '2'); shot(pg, '05_add_s1_typed', 200)
    pg.evaluate("__otasuke.key('OK')"); shot(pg, '06_add_s2')
    keys(pg, '3'); pg.evaluate("__otasuke.key('OK')"); shot(pg, '07_add_move')
    pg.click('#figL .blk.can'); shot(pg, '08_add_move1', 400)
    pg.click('#figL .blk.can'); shot(pg, '09_add_moved', 400)
    shot(pg, '10_add_eq1')
    keys(pg, '10'); pg.evaluate("__otasuke.key('OK')"); shot(pg, '11_add_eq2')
    pg.click('#tabs [data-v=line]'); shot(pg, '12_line', 400)
    keys(pg, '13'); pg.evaluate("__otasuke.key('OK')"); shot(pg, '13_final')
    keys(pg, '13'); pg.evaluate("__otasuke.key('OK')"); shot(pg, '14_done', 2600)
    # ひき算（減加法）・数の線
    pg.evaluate("""(()=>{const o=__otasuke; o.st.prob=window.OTASUKE.parse('13-9');})()""")
    pg.evaluate("document.querySelector('#bReset').click()"); pg.wait_for_timeout(200); pg.click('[data-m=yes]')
    keys(pg, '3'); pg.evaluate("__otasuke.key('OK')"); shot(pg, '15_sub_move_line')
    pg.click('#tabs [data-v=blk]'); shot(pg, '16_sub_move_blk', 400)
    for i in range(9): pg.click('#figL .blk.can'); pg.wait_for_timeout(80)
    shot(pg, '17_sub_taken')
    # まちがい
    keys(pg, '2'); pg.evaluate("__otasuke.key('OK')"); shot(pg, '18_wrong', 700)
    # さくらんぼだけ
    pg.click('#tabs [data-v=sak]'); shot(pg, '19_sak', 400)
    # せってい
    pg.click('#bSet'); shot(pg, '20_settings', 400); pg.click('[data-m=close]')
    # すこし（おたすけモード）
    pg.evaluate("__otasuke.showHome('mode')"); click(pg, '[data-h=help]'); click(pg, '[data-h="l:some"]')
    shot(pg, '21_formula', 300)
    keys(pg, '7+6'); shot(pg, '22_formula_typed', 200)
    pg.evaluate("__otasuke.key('OK')"); shot(pg, '23_some')
    keys(pg, '12'); pg.evaluate("__otasuke.key('OK')"); shot(pg, '24_some_assist', 2500)
    pg.evaluate("__otasuke.showHome('mode')"); click(pg, '[data-h=help]'); click(pg, '[data-h="l:many"]')
    keys(pg, '15-2'); pg.evaluate("__otasuke.key('OK')"); shot(pg, '25_teen_sub')
    # けっか
    pg.evaluate("""(()=>{const o=__otasuke; o.G.mode='chal'; o.G.kind='add0'; o.G.qi=9; o.G.score=8; o.G.res=[1,1,0,1,1,1,0,1,1,1].map(Boolean);})()""")
    pg.evaluate("document.querySelector('#bNew').click()"); shot(pg, '26_result', 900)
    b.close()
print('errors:', errs)
