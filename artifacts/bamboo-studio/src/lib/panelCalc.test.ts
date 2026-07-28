// Edge-case unit tests for the докрой (donor-strip) calculation.
// Run: pnpm --filter @workspace/bamboo-studio run test:calc
import { strict as assert } from 'node:assert';
import { optimizedPanelCalc, packWidthRemainders, columnHiddenJoints, panelsWord, rowsWord, PANEL_H_MM } from './panelCalc.ts';

let passed = 0;
const check = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`✓ ${name}`);
};

check('высота ровно 2,8 м — 1 ряд, без докроя', () => {
  const r = optimizedPanelCalc(3, 2800);
  assert.deepEqual(r, { needed: 3, fullRows: 1, remMm: 0, donorPanels: 0, stripsPerPanel: 0 });
});

check('высота ровно 5,6 м — 2 ряда, без докроя', () => {
  const r = optimizedPanelCalc(3, 5600);
  assert.deepEqual(r, { needed: 6, fullRows: 2, remMm: 0, donorPanels: 0, stripsPerPanel: 0 });
});

check('очень маленький остаток 1 см (2,81 м)', () => {
  const r = optimizedPanelCalc(4, 2810);
  assert.equal(r.fullRows, 1);
  assert.equal(r.remMm, 10);
  assert.equal(r.stripsPerPanel, 280);
  assert.equal(r.donorPanels, 1); // 4 полосы из одного донора
  assert.equal(r.needed, 5);
});

check('субмиллиметровый остаток (< 1 мм) схлопывается в 0', () => {
  const r = optimizedPanelCalc(2, 2800.5);
  assert.equal(r.remMm, 0);
  assert.equal(r.donorPanels, 0);
  assert.equal(r.needed, 2);
});

check('высота меньше панели (2,5 м) — 1 ряд, без докроя', () => {
  const r = optimizedPanelCalc(3, 2500);
  assert.deepEqual(r, { needed: 3, fullRows: 1, remMm: 0, donorPanels: 0, stripsPerPanel: 0 });
});

check('высота не задана (0) — считается как одна панель', () => {
  const r = optimizedPanelCalc(5, 0);
  assert.deepEqual(r, { needed: 5, fullRows: 1, remMm: 0, donorPanels: 0, stripsPerPanel: 0 });
});

check('ноль колонн — всё по нулям', () => {
  const r = optimizedPanelCalc(0, 3000);
  assert.equal(r.needed, 0);
  assert.equal(r.donorPanels, 0);
});

check('отрицательные значения не ломают расчёт', () => {
  assert.equal(optimizedPanelCalc(-2, 3000).needed, 0);
  const r = optimizedPanelCalc(3, -100);
  assert.equal(r.needed, 3); // высота < 0 → как одна панель
});

check('никогда «0 панелей режется на 0 полос»', () => {
  for (const h of [2801, 2810, 2900, 3000, 4200, 5599, 5601, 8399, 10000]) {
    for (const cols of [1, 2, 3, 7, 40]) {
      const r = optimizedPanelCalc(cols, h);
      if (r.remMm > 0) {
        assert.ok(r.donorPanels >= 1, `donorPanels>=1 при h=${h}, cols=${cols}`);
        assert.ok(r.stripsPerPanel >= 1, `stripsPerPanel>=1 при h=${h}, cols=${cols}`);
      } else {
        assert.equal(r.donorPanels, 0);
        assert.equal(r.stripsPerPanel, 0);
      }
      assert.ok(r.needed >= cols * r.fullRows);
    }
  }
});

check('большой остаток (почти вся панель): 5,59 м → 1 полоса из донора', () => {
  const r = optimizedPanelCalc(3, 5599);
  assert.equal(r.fullRows, 1);
  assert.equal(r.remMm, 2799);
  assert.equal(r.stripsPerPanel, 1);
  assert.equal(r.donorPanels, 3);
});

check('высота 3 м, 5 колонн — классический докрой', () => {
  const r = optimizedPanelCalc(5, 3000);
  assert.equal(r.remMm, 200);
  assert.equal(r.stripsPerPanel, Math.floor(PANEL_H_MM / 200)); // 14
  assert.equal(r.donorPanels, 1);
  assert.equal(r.needed, 6);
});

check('packWidthRemainders: пустой/нулевой ввод → 0 панелей', () => {
  assert.equal(packWidthRemainders([]), 0);
  assert.equal(packWidthRemainders([0, -5]), 0);
});

check('packWidthRemainders: полосы упаковываются в общие панели', () => {
  assert.equal(packWidthRemainders([600, 600]), 1);      // 1220 ≥ 600+600
  assert.equal(packWidthRemainders([700, 700]), 2);      // не помещаются вместе
  assert.equal(packWidthRemainders([400, 400, 400]), 1); // 1200 ≤ 1220
});

check('склонения: панель / панели / панелей', () => {
  const cases: [number, string][] = [
    [1, 'панель'], [2, 'панели'], [3, 'панели'], [4, 'панели'],
    [5, 'панелей'], [10, 'панелей'], [11, 'панелей'], [12, 'панелей'],
    [14, 'панелей'], [21, 'панель'], [22, 'панели'], [25, 'панелей'],
    [100, 'панелей'], [101, 'панель'], [111, 'панелей'],
  ];
  for (const [n, w] of cases) assert.equal(panelsWord(n), w, `panelsWord(${n})`);
  assert.equal(rowsWord(2), 'ряда');
  assert.equal(rowsWord(5), 'рядов');
  assert.equal(rowsWord(21), 'ряд');
});

check('columnHiddenJoints: круглая колонна — 4 панели по периметру, 2 видимые', () => {
  // Замкнутый контур из 4 панелей = 4 стыка; на видимой части учтён 1 стык
  // (между двумя видимыми панелями) ⇒ на скрытой части не хватает 3
  assert.equal(columnHiddenJoints(4, 1, 0), 3);
});

check('columnHiddenJoints: прямоугольная колонна с загибами', () => {
  // 4 грани по 1 панели, 1 видимый загиб: всего стыков 4−1=3, видимых учтено 0 ⇒ 3
  assert.equal(columnHiddenJoints(4, 0, 1), 3);
  // угловой профиль на видимом стыке уже учтён ⇒ остаётся 2
  assert.equal(columnHiddenJoints(4, 1, 1), 2);
});

check('columnHiddenJoints: граничные случаи', () => {
  assert.equal(columnHiddenJoints(1, 0, 0), 0);  // одна панель оборачивает колонну — стыков нет
  assert.equal(columnHiddenJoints(0, 0, 0), 0);
  assert.equal(columnHiddenJoints(3, 5, 0), 0);  // видимых учтено больше — ничего не добавляем
  assert.equal(columnHiddenJoints(4, 0, 9), 0);  // загибов больше, чем стыков
});

console.log(`\n${passed} tests passed`);
