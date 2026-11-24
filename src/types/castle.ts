export type EraId = 1 | 2 | 3 | 4;
export type ViewMode = '3d' | 'ar';
export type MarkerType = 'aw' | 'hiro';
export type ChronoLayer = 'xiii' | 'xv' | 'xviii' | 'reko';
export type HotspotId = 'chapel' | 'palace' | 'gatehouse';

export interface EraMeta {
  id: EraId;
  roman: string;
  century: string;
  title: string;
  shortTitle: string;
  years: string;
  summary: string;
}

export const ERAS: EraMeta[] = [
  {
    id: 1,
    roman: 'I',
    century: 'XIII w.',
    title: 'Gród Piastowski',
    shortTitle: 'XIII w. · Gród',
    years: 'ok. 1200–1290',
    summary:
      'Drewniano-ziemna warownia książąt raciborskich nad zakolem Odry z ostrokołem, wieżą strażniczą i wczesną murowaną kaplicą.',
  },
  {
    id: 2,
    roman: 'II',
    century: 'XV w.',
    title: 'Zamek Gotycki',
    shortTitle: 'XV w. · Gotyk',
    years: 'XIV–XV w.',
    summary:
      'Rozbudowa z czerwonej cegły: strzelista kaplica św. Tomasza Becketa, mury z blankami, Dom Książęcy i budynek bramny z opuszczaną broną.',
  },
  {
    id: 3,
    roman: 'III',
    century: 'XVIII/XIX w.',
    title: 'Barok i Wielki Pożar',
    shortTitle: 'XVIII w. · Pożar',
    years: '1700–1858',
    summary:
      'Barokowa przebudowa skrzydeł pałacowych oraz kopulasty hełm wieży, przerwane dramatycznym pożarem kompleksu zamkowego.',
  },
  {
    id: 4,
    roman: 'IV',
    century: 'Dziś + 3D',
    title: 'Współczesność i Rekonstrukcja',
    shortTitle: 'Dziś · Skan 3D',
    years: '2026 · Rekonstrukcja',
    summary:
      'Zachowana bryła po rewitalizacji zestawiona z cyfrowym skanem laserowym nieistniejących dziś skrzydeł i dawnych hełmów wież.',
  },
];

export interface ChronoLegendItem {
  layer: ChronoLayer;
  label: string;
  period: string;
  hex: string;
}

export const CHRONO_LEGEND: ChronoLegendItem[] = [
  { layer: 'xiii', label: 'Relikty XIII w.', period: 'Gród piastowski', hex: '#22C55E' },
  { layer: 'xv', label: 'Mury gotyckie XV w.', period: 'Cegła gotycka', hex: '#EA580C' },
  { layer: 'xviii', label: 'Przebudowa XVIII w.', period: 'Tynk barokowy', hex: '#3B82F6' },
  { layer: 'reko', label: 'Rekonstrukcja 3D', period: 'Na bazie planów', hex: '#EAB308' },
];

export interface HotspotData {
  id: HotspotId;
  title: string;
  subtitle: string;
  notesByEra: Record<EraId, { heading: string; body: string; detail: string }>;
}

export const HOTSPOTS: Record<HotspotId, HotspotData> = {
  chapel: {
    id: 'chapel',
    title: 'Kaplica św. Tomasza Becketa',
    subtitle: 'Perła gotyku śląskiego',
    notesByEra: {
      1: {
        heading: 'Romański zalążek świątyni (XIII w.)',
        body: 'Pierwsza murowana kaplica zamkowa powstała pod koniec XIII wieku za panowania książąt raciborskich jako niewielka budowla z jasnego kamienia z półkolistą absydą.',
        detail: 'Fundacja wiązana jest z kultem św. Tomasza Becketa i sporem biskupa Tomasza II z księciem Henrykiem IV Probusem.',
      },
      2: {
        heading: 'Strzelista kaplica gotycka (XV w.)',
        body: 'Wzniesiona z czerwonej cegły z ostrołukowymi oknami maswerkowymi, wysokim dachem dwuspadowym, przyporami oraz smukłą sygnaturką na kalenicy.',
        detail: 'Zachwycała sklepieniami krzyżowo-żebrowymi i pełniła funkcję książęcej kaplicy kolegiackiej.',
      },
      3: {
        heading: 'Świadek przebudów i pożaru (XVIII/XIX w.)',
        body: 'Mimo barokizacji sąsiednich skrzydeł kaplica zachowała swój gotycki korpus. Podczas wielkiego pożaru w XIX wieku ogień zagroził więźbie dachowej i sąsiednim murom.',
        detail: 'Po zniszczeniach z połowy XIX w. przeprowadzono neogotycką restaurację świątyni.',
      },
      4: {
        heading: 'Zachowany zabytek klasy zero (Dziś)',
        body: 'Jedna z najlepiej zachowanych gotyckich kaplic zamkowych w Polsce, nazywana „śląską Sainte-Chapelle”. Skan 3D ukazuje jej historyczne powiązanie z utraconymi skrzydłami.',
        detail: 'Wpisana w program stałej ekspozycji Zamku Piastowskiego w Raciborzu.',
      },
    },
  },
  palace: {
    id: 'palace',
    title: 'Dom Książęcy i Skrzydła',
    subtitle: 'Rezydencja Piastów i komnaty',
    notesByEra: {
      1: {
        heading: 'Drewniany dwór książęcy (XIII w.)',
        body: 'Centralny budynek mieszkalny wczesnego grodu wzniesiony w konstrukcji zrębowej i palowej wewnątrz ziemno-drewnianego wału obronnego.',
        detail: 'Mieścił izbę biesiadną księcia, kancelarię oraz zaplecze gospodarcze osady nad Odrą.',
      },
      2: {
        heading: 'Ceglany Dom Książęcy (XV w.)',
        body: 'Dwukondygnacyjny murowany gmach reprezentacyjny z cegły gotyckiej, schodkowymi szczytami, drewnianym gankiem od strony dziedzińca i kominkowym ogrzewaniem.',
        detail: 'To tutaj rezydowali ostatni Piastowie raciborscy oraz książęta opawsko-raciborscy.',
      },
      3: {
        heading: 'Barokowy pałac w płomieniach (XVIII/XIX w.)',
        body: 'Przekształcony w jasną rezydencję barokową z gzymsami, pilastrami i reprezentacyjnymi salami. Wielki pożar z 1858 r. strawił dachy i wyższe kondygnacje.',
        detail: 'Po pożarze część zniszczonych skrzydeł zamkowych rozebrano lub zaadaptowano na browar zamkowy.',
      },
      4: {
        heading: 'Rewitalizacja i duchowa rekonstrukcja (Dziś)',
        body: 'Odrestaurowane skrzydło wschodnie i słodownia służą dziś celom muzealnym. Suwak skanowania 3D materializuje nieistniejące już północno-zachodnie skrzydła dawnego pałacu.',
        detail: 'Zrekonstruowane na podstawie XIX-wiecznych planów inwentaryzacyjnych i rycin archiwalnych.',
      },
    },
  },
  gatehouse: {
    id: 'gatehouse',
    title: 'Budynek Bramny i Wieża',
    subtitle: 'Kluczowy punkt obrony zamku',
    notesByEra: {
      1: {
        heading: 'Drewniana wieża strażnicza (XIII w.)',
        body: 'Czworoboczna drewniana strażnica strzegąca przeprawy przez Odrę i bramy wjazdowej w linii palisady. Na jej szczycie powiewała złoto-niebieska chorągiew Piastów.',
        detail: 'Zapewniała daleką obserwację doliny Odry od strony Bramy Morawskiej.',
      },
      2: {
        heading: 'Gotycka wieża bramna z broną (XV w.)',
        body: 'Potężna ceglana wieża z przejazdem ostrołukowym i żelazną kratą opuszczaną (broną). Kliknij budynek bramny na makiecie, aby podnieść lub opuścić bronę.',
        detail: 'Grube ceglane mury o wątku polskim łączyły się bezpośrednio z obwodem obronnym zamku.',
      },
      3: {
        heading: 'Hełm barokowy i alarm pożarowy (XVIII/XIX w.)',
        body: 'Wieżę zwieńczono ozdobnym barokowym hełmem kopulastym z latarnią. W chwili wielkiego pożaru to dzwon na wieży ostrzegał mieszkańców Raciborza przed żywiołem.',
        detail: 'Ocalała dolna partia bramy z przelotem nadal stanowiła główny wjazd na dziedziniec.',
      },
      4: {
        heading: 'Brama Zamkowa i dawny hełm (Dziś)',
        body: 'Budynek bramny wita dziś zwiedzających zamek. Przesuń suwak rekonstrukcji, aby zobaczyć historyczny, wyższy hełm wieży odtworzony cyfrowo nad współczesnym dachem.',
        detail: 'Interaktywna żelazna brona pozostaje czynna również w trybie prezentacji współczesnej.',
      },
    },
  },
};

export interface ProjectedHotspot {
  id: HotspotId;
  x: number;
  y: number;
  visible: boolean;
}
