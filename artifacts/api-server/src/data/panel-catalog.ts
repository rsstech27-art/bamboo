/** Static panel catalog — mirrors PANEL_SERIES in bamboo-studio/src/App.tsx.
 *  Texture URLs are absolute paths served by the bamboo-studio Vite dev server. */

const BASE = '/bamboo-studio/';

export interface CatalogEntry {
  article: string;
  name: string;
  series: string;
  cost: number;
  photoUrl: string | null;
}

export const PANEL_CATALOG: CatalogEntry[] = [
  // ── Металлическая серия ──────────────────────────────────────────────────
  { article: '2210-25', name: 'Матов. серебро',         series: 'Металлическая серия',  cost: 6900, photoUrl: `${BASE}textures/tex-117.jpg` },
  { article: '2211-25', name: 'Матов. серый',           series: 'Металлическая серия',  cost: 6900, photoUrl: `${BASE}textures/tex-118.jpg` },
  { article: '2212-25', name: 'Матов. коричневый',      series: 'Металлическая серия',  cost: 6900, photoUrl: `${BASE}textures/tex-119.jpg` },
  { article: '2215-25', name: 'Узорч. серый',           series: 'Металлическая серия',  cost: 6900, photoUrl: `${BASE}textures/tex-122.jpg` },

  // ── Жидкий металл -25 ────────────────────────────────────────────────────
  { article: '2218-25', name: 'Зола',                   series: 'Жидкий металл -25',    cost: 6900, photoUrl: `${BASE}textures/tex-126.jpg` },
  { article: '2219-25', name: 'Золото',                 series: 'Жидкий металл -25',    cost: 6900, photoUrl: `${BASE}textures/tex-127.jpg` },
  { article: '2220-25', name: 'Серебро',                series: 'Жидкий металл -25',    cost: 6900, photoUrl: `${BASE}textures/tex-128.jpg` },
  { article: '2221-25', name: 'Шампанское',             series: 'Жидкий металл -25',    cost: 6900, photoUrl: `${BASE}textures/tex-129.jpg` },

  // ── ПЭТ матовая ──────────────────────────────────────────────────────────
  { article: '2225-25', name: 'Шампанское',             series: 'ПЭТ матовая',          cost: 5900, photoUrl: `${BASE}textures/tex-133.jpg` },
  { article: '2226-25', name: 'Античн. бронза',         series: 'ПЭТ матовая',          cost: 5900, photoUrl: `${BASE}textures/tex-134.jpg` },
  { article: '2227-25', name: 'Золото (длинное)',        series: 'ПЭТ матовая',          cost: 5900, photoUrl: `${BASE}textures/tex-135.jpg` },
  { article: '2228-25', name: 'Красный (длинный)',       series: 'ПЭТ матовая',          cost: 5900, photoUrl: `${BASE}textures/tex-136.jpg` },

  // ── Гальваническая ───────────────────────────────────────────────────────
  { article: '2005-15', name: 'Античн. бронза',         series: 'Гальваническая',       cost: 5400, photoUrl: `${BASE}textures/tex-140.jpg` },
  { article: '2006-15', name: 'Зола',                   series: 'Гальваническая',       cost: 5400, photoUrl: `${BASE}textures/tex-141.jpg` },
  { article: '2007-15', name: 'Сотовое золото',         series: 'Гальваническая',       cost: 5400, photoUrl: `${BASE}textures/tex-142.jpg` },
  { article: '2008-15', name: 'Вспышка золота',         series: 'Гальваническая',       cost: 5400, photoUrl: `${BASE}textures/tex-143.jpg` },

  // ── Жидкий металл -10 ────────────────────────────────────────────────────
  { article: '2121-10', name: 'Косм. зола',             series: 'Жидкий металл -10',    cost: 4900, photoUrl: `${BASE}textures/tex-147.jpg` },
  { article: '2122-10', name: 'Gucci',                  series: 'Жидкий металл -10',    cost: 4900, photoUrl: `${BASE}textures/tex-148.jpg` },
  { article: '2123-10', name: 'Античн. бронза',         series: 'Жидкий металл -10',    cost: 4900, photoUrl: `${BASE}textures/tex-149.jpg` },
  { article: '2124-10', name: 'Хамелеон',               series: 'Жидкий металл -10',    cost: 4900, photoUrl: `${BASE}textures/tex-150.jpg` },
  { article: '2125-10', name: 'Millard',                series: 'Жидкий металл -10',    cost: 4900, photoUrl: `${BASE}textures/tex-154.jpg` },
  { article: '2126-10', name: 'Таро-фиолетовый',        series: 'Жидкий металл -10',    cost: 4900, photoUrl: `${BASE}textures/tex-155.jpg` },
  { article: '2129-10', name: 'Красная медь',           series: 'Жидкий металл -10',    cost: 4900, photoUrl: `${BASE}textures/tex-156.jpg` },
  { article: '2130-10', name: 'Латунь',                 series: 'Жидкий металл -10',    cost: 4900, photoUrl: `${BASE}textures/tex-157.jpg` },
  { article: '2131-10', name: 'Золото',                 series: 'Жидкий металл -10',    cost: 4900, photoUrl: `${BASE}textures/tex-158.jpg` },

  // ── Частицы ──────────────────────────────────────────────────────────────
  { article: '2132-10', name: 'Сине-серые',             series: 'Частицы',              cost: 4900, photoUrl: `${BASE}textures/tex-162.jpg` },
  { article: '2133-10', name: 'Конопляная зола',        series: 'Частицы',              cost: 4900, photoUrl: `${BASE}textures/tex-163.jpg` },
  { article: '2134-10', name: 'Золото',                 series: 'Частицы',              cost: 4900, photoUrl: `${BASE}textures/tex-164.jpg` },
  { article: '2135-10', name: 'Красн.-коричн.',         series: 'Частицы',              cost: 4900, photoUrl: `${BASE}textures/tex-165.jpg` },

  // ── Щебень / Камень ──────────────────────────────────────────────────────
  { article: '8205-10', name: 'Кофе из щебня',          series: 'Щебень / Камень',      cost: 4500, photoUrl: `${BASE}textures/tex-175.jpg` },
  { article: '8206-10', name: 'Перл. камень',           series: 'Щебень / Камень',      cost: 4500, photoUrl: `${BASE}textures/tex-176.jpg` },
  { article: '8815-15', name: 'Камень золото',          series: 'Щебень / Камень',      cost: 4500, photoUrl: `${BASE}textures/tex-177.jpg` },
  { article: '8816-15', name: 'Красн. медн. пластина',  series: 'Щебень / Камень',      cost: 4500, photoUrl: `${BASE}textures/tex-178.jpg` },
  { article: '6311-8',  name: 'Серый щебень',           series: 'Щебень / Камень',      cost: 4500, photoUrl: `${BASE}textures/tex-182.jpg` },
  { article: '6315-8',  name: 'Грунт. щебень',          series: 'Щебень / Камень',      cost: 4500, photoUrl: `${BASE}textures/tex-183.jpg` },
  { article: '8201-8',  name: 'Позол. латунь',          series: 'Щебень / Камень',      cost: 4500, photoUrl: `${BASE}textures/tex-184.jpg` },
  { article: '8202-8',  name: 'Розовая медь',           series: 'Щебень / Камень',      cost: 4500, photoUrl: `${BASE}textures/tex-185.jpg` },

  // ── Патина / Медь ────────────────────────────────────────────────────────
  { article: '8203-8',  name: 'Позол. ржавчина',        series: 'Патина / Медь',        cost: 4500, photoUrl: `${BASE}textures/tex-189.jpg` },
  { article: '8204-8',  name: 'Зелёная медь',           series: 'Патина / Медь',        cost: 4500, photoUrl: `${BASE}textures/tex-190.jpg` },
  { article: '8805-8',  name: 'Медь оранжевая',         series: 'Патина / Медь',        cost: 4500, photoUrl: `${BASE}textures/tex-191.jpg` },
  { article: '8806-8',  name: 'Медь зелёная ржавч.',    series: 'Патина / Медь',        cost: 4500, photoUrl: `${BASE}textures/tex-192.jpg` },
  { article: '8807-10', name: 'Красн. ржав. камень',    series: 'Патина / Медь',        cost: 4500, photoUrl: `${BASE}textures/tex-196.jpg` },
  { article: '8808-10', name: 'Серый ржав. камень',     series: 'Патина / Медь',        cost: 4500, photoUrl: `${BASE}textures/tex-197.jpg` },

  // ── Льняное / Цемент ─────────────────────────────────────────────────────
  { article: '8207-5',  name: 'Льняное серебро',        series: 'Льняное / Цемент',     cost: 3900, photoUrl: `${BASE}textures/tex-198.jpg` },
  { article: '8208-5',  name: 'Серо-коричн. золото',    series: 'Льняное / Цемент',     cost: 3900, photoUrl: `${BASE}textures/tex-199.jpg` },
  { article: '8209-5',  name: 'Красн. бел. серебр.',    series: 'Льняное / Цемент',     cost: 3900, photoUrl: `${BASE}textures/tex-203.jpg` },
  { article: '8210-5',  name: 'Синий серый серебр.',    series: 'Льняное / Цемент',     cost: 3900, photoUrl: `${BASE}textures/tex-204.jpg` },
  { article: '8211-5',  name: 'Пик серого серебра',     series: 'Льняное / Цемент',     cost: 3900, photoUrl: `${BASE}textures/tex-205.jpg` },
  { article: '8212-5',  name: 'Цементный ясень',        series: 'Льняное / Цемент',     cost: 3900, photoUrl: `${BASE}textures/tex-206.jpg` },

  // ── Радуга / Хамелеон ────────────────────────────────────────────────────
  { article: '2216-10', name: 'Жемчужно-голубой',       series: 'Радуга / Хамелеон',    cost: 5900, photoUrl: `${BASE}textures/tex-210.jpg` },
  { article: '2222-30', name: 'Столб радужн. света',    series: 'Радуга / Хамелеон',    cost: 5900, photoUrl: `${BASE}textures/tex-211.jpg` },
  { article: '2223-30', name: 'Туманный ирис',          series: 'Радуга / Хамелеон',    cost: 5900, photoUrl: `${BASE}textures/tex-213.jpg` },

  // ── Зеркальная глянцевая ─────────────────────────────────────────────────
  { article: '8011-15', name: 'Зеркал. белая',          series: 'Зеркальная глянцевая', cost: 6400, photoUrl: `${BASE}textures/tex-217.jpg` },
  { article: '8012-15', name: 'Зеркал. чёрная',         series: 'Зеркальная глянцевая', cost: 6400, photoUrl: `${BASE}textures/tex-218.jpg` },
  { article: '8023-15', name: 'Молочный чай',           series: 'Зеркальная глянцевая', cost: 6400, photoUrl: `${BASE}textures/tex-219.jpg` },

  // ── Натуральное дерево ────────────────────────────────────────────────────
  { article: 'W-331', name: 'Дуб натуральный',          series: 'Натуральное дерево',   cost: 5200, photoUrl: `${BASE}textures/tex-331.jpg` },
  { article: 'W-332', name: 'Дуб бежевый',              series: 'Натуральное дерево',   cost: 5200, photoUrl: `${BASE}textures/tex-332.jpg` },
  { article: 'W-334', name: 'Дуб слоновая кость',       series: 'Натуральное дерево',   cost: 5200, photoUrl: `${BASE}textures/tex-334.jpg` },
  { article: 'W-340', name: 'Дуб медовый',              series: 'Натуральное дерево',   cost: 5200, photoUrl: `${BASE}textures/tex-340.jpg` },
  { article: 'W-341', name: 'Дуб янтарный',             series: 'Натуральное дерево',   cost: 5200, photoUrl: `${BASE}textures/tex-341.jpg` },
  { article: 'W-342', name: 'Дуб светлый',              series: 'Натуральное дерево',   cost: 5200, photoUrl: `${BASE}textures/tex-342.jpg` },
  { article: 'W-349', name: 'Ясень натуральный',        series: 'Натуральное дерево',   cost: 5200, photoUrl: `${BASE}textures/tex-349.jpg` },
  { article: 'W-350', name: 'Ясень белёный',            series: 'Натуральное дерево',   cost: 5200, photoUrl: `${BASE}textures/tex-350.jpg` },
  { article: 'W-351', name: 'Ясень светлый',            series: 'Натуральное дерево',   cost: 5200, photoUrl: `${BASE}textures/tex-351.jpg` },
  { article: 'W-352', name: 'Ясень тёплый',             series: 'Натуральное дерево',   cost: 5200, photoUrl: `${BASE}textures/tex-352.jpg` },
  { article: 'W-333', name: 'Орех светлый',             series: 'Натуральное дерево',   cost: 5200, photoUrl: `${BASE}textures/tex-333.jpg` },
  { article: 'W-336', name: 'Ясень серебристый',        series: 'Натуральное дерево',   cost: 5200, photoUrl: `${BASE}textures/tex-336.jpg` },
  { article: 'W-343', name: 'Дуб дымчатый',             series: 'Натуральное дерево',   cost: 5200, photoUrl: `${BASE}textures/tex-343.jpg` },
  { article: 'W-344', name: 'Дуб серый',                series: 'Натуральное дерево',   cost: 5200, photoUrl: `${BASE}textures/tex-344.jpg` },
  { article: 'W-353', name: 'Ясень серый',              series: 'Натуральное дерево',   cost: 5200, photoUrl: `${BASE}textures/tex-353.jpg` },
  { article: 'W-345', name: 'Орех тёмный',              series: 'Натуральное дерево',   cost: 5200, photoUrl: `${BASE}textures/tex-345.jpg` },
  { article: 'W-354', name: 'Ясень тёмный',             series: 'Натуральное дерево',   cost: 5200, photoUrl: `${BASE}textures/tex-354.jpg` },
  { article: 'W-335', name: 'Венге',                    series: 'Натуральное дерево',   cost: 5200, photoUrl: `${BASE}textures/tex-335.jpg` },

  // ── Рейки (деревянные) ────────────────────────────────────────────────────
  { article: 'RK-468', name: 'Дуб светлый',             series: 'Рейки (деревянные)',   cost: 7900, photoUrl: `${BASE}textures/tex-468.jpg` },
  { article: 'RK-443', name: 'Дуб кремовый',            series: 'Рейки (деревянные)',   cost: 7900, photoUrl: `${BASE}textures/tex-443.jpg` },
  { article: 'RK-457', name: 'Дуб натуральный',         series: 'Рейки (деревянные)',   cost: 7900, photoUrl: `${BASE}textures/tex-457.jpg` },
  { article: 'RK-464', name: 'Орех медовый',            series: 'Рейки (деревянные)',   cost: 7900, photoUrl: `${BASE}textures/tex-464.jpg` },
  { article: 'RK-459', name: 'Дуб беж',                 series: 'Рейки (деревянные)',   cost: 7900, photoUrl: `${BASE}textures/tex-459.jpg` },
  { article: 'RK-444', name: 'Дуб тоффи',               series: 'Рейки (деревянные)',   cost: 7900, photoUrl: `${BASE}textures/tex-444.jpg` },
  { article: 'RK-445', name: 'Дуб гриж',                series: 'Рейки (деревянные)',   cost: 7900, photoUrl: `${BASE}textures/tex-445.jpg` },
  { article: 'RK-469', name: 'Дуб тёплый серый',        series: 'Рейки (деревянные)',   cost: 7900, photoUrl: `${BASE}textures/tex-469.jpg` },
  { article: 'RK-458', name: 'Ясень серебро',           series: 'Рейки (деревянные)',   cost: 7900, photoUrl: `${BASE}textures/tex-458.jpg` },
  { article: 'RK-452', name: 'Дуб серый',               series: 'Рейки (деревянные)',   cost: 7900, photoUrl: `${BASE}textures/tex-452.jpg` },
  { article: 'RK-465', name: 'Дуб холодный серый',      series: 'Рейки (деревянные)',   cost: 7900, photoUrl: `${BASE}textures/tex-465.jpg` },
  { article: 'RK-456', name: 'Дуб сланец',              series: 'Рейки (деревянные)',   cost: 7900, photoUrl: `${BASE}textures/tex-456.jpg` },
  { article: 'RK-449', name: 'Дуб тёмно-коричн.',       series: 'Рейки (деревянные)',   cost: 7900, photoUrl: `${BASE}textures/tex-449.jpg` },
  { article: 'RK-451', name: 'Дуб эспрессо',            series: 'Рейки (деревянные)',   cost: 7900, photoUrl: `${BASE}textures/tex-451.jpg` },
  { article: 'RK-466', name: 'Орех тёмный',             series: 'Рейки (деревянные)',   cost: 7900, photoUrl: `${BASE}textures/tex-466.jpg` },
  { article: 'RK-450', name: 'Дуб эбони',               series: 'Рейки (деревянные)',   cost: 7900, photoUrl: `${BASE}textures/tex-450.jpg` },

  // ── Soft-touch / Кожа ────────────────────────────────────────────────────
  { article: 'K3001',   name: 'Зернистая кожа',         series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: `${BASE}textures/tex-255.jpg` },
  { article: 'K3002',   name: 'Кожа личи',              series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: `${BASE}textures/tex-257.jpg` },
  { article: 'K3003',   name: 'Плетёная кожа',          series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: `${BASE}textures/tex-256.jpg` },
  { article: 'K3004',   name: 'Вафельная кожа',         series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: `${BASE}textures/tex-258.jpg` },
  { article: '1011-8',  name: 'Тёмно-сер. облачный',   series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: `${BASE}textures/tex-263.jpg` },
  { article: '1013-8',  name: 'Бобовый песок',          series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: `${BASE}textures/tex-265.jpg` },
  { article: '1014-8',  name: 'Бавар. коричневый',      series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: `${BASE}textures/tex-267.jpg` },
  { article: '1015-8',  name: 'Ванильный жёлтый',       series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: `${BASE}textures/tex-264.jpg` },
  { article: '1017-8',  name: 'Сев. ветер серый',       series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: `${BASE}textures/tex-266.jpg` },
  { article: '1083-5',  name: 'Клеточка чёрная',        series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: `${BASE}textures/tex-270.jpg` },
  { article: '1002A-5', name: 'Белая гладь',            series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: null },
  { article: '1085-5',  name: 'Нежная гладь',           series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: null },
  { article: '1082-5',  name: 'Тёмная гладь',           series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: null },
  { article: '1080-5',  name: 'Светло-сер. гладь',      series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: null },
  { article: '1216-5',  name: 'Весеннее чувство',       series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: null },
  { article: '1217-5',  name: 'Коричневая кожа',        series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: null },
  { article: '1218-5',  name: 'Белый нефрит',           series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: null },
  { article: '1219-5',  name: 'Лондонский туман',       series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: null },
  { article: '1220-5',  name: 'Подкова серая',          series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: null },
  { article: '1221-5',  name: 'Сумерки',                series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: null },
  { article: '1222-5',  name: 'Венец. серая кожа',      series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: null },
  { article: '1223-5',  name: 'Элегантный серый',       series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: null },
  { article: '1055-5',  name: 'Растопл. молоко',        series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: null },
  { article: '1056-5',  name: 'Платиновый серый',       series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: null },
  { article: '1057-5',  name: 'Сюэфу',                  series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: null },
  { article: '1001-5',  name: 'Серый шоколад',          series: 'Soft-touch / Кожа',    cost: 4700, photoUrl: null },
];
