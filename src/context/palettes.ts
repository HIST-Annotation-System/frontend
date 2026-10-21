// Colour palettes the team can switch between; values live in assets/styles/palettes.css (generated).
export type PaletteGroup = 'classic' | 'bold';

export interface PaletteOption {
  id: string;
  name: string;
  group: PaletteGroup;
  /** Google Fonts stylesheet with the palette's fonts; injected only while the palette is active. */
  fontHref?: string;
  /** Swatches for the picker: page, surface, primary, accent. */
  light: [string, string, string, string];
  dark: [string, string, string, string];
}

/** New users start on the recommended palette; a remembered choice wins. */
export const DEFAULT_PALETTE = 'papier-dab';

export const PALETTES: PaletteOption[] = [
  {id: 'histano', name: 'HistAno', group: 'classic', fontHref: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap', light: ['#F4F5F7', '#FFFFFF', '#183556', '#2C9497'], dark: ['#0E1219', '#151B24', '#2F5B8A', '#3BB3B6']},
  {id: 'szkielko', name: 'Szkiełko', group: 'classic', fontHref: 'https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500&display=swap', light: ['#f3f3f2', '#fbfbfa', '#262827', '#1b4f90'], dark: ['#161717', '#1e1f1f', '#e4e5e4', '#aecbf5']},
  {id: 'szwajcarski', name: 'Szwajcarski', group: 'classic', fontHref: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;500;600;700&family=Atkinson+Hyperlegible+Mono:wght@400;500&display=swap', light: ['#EFEFEF', '#FCFCFC', '#111111', '#111111'], dark: ['#141414', '#1C1C1C', '#EDEDED', '#EDEDED']},
  {id: 'muzeum', name: 'Muzeum', group: 'classic', fontHref: 'https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;500;600;700&family=Red+Hat+Mono:wght@400;500&display=swap', light: ['#F3F1EC', '#FBFAF7', '#22201C', '#7B6B34'], dark: ['#171614', '#201E1B', '#E8E3DA', '#C4BC96']},
  {id: 'papier-dab', name: 'Papier i DAB', group: 'classic', fontHref: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&family=Courier+Prime:wght@400;700&display=swap', light: ['#f5f0e7', '#fdfaf4', '#6e4420', '#454482'], dark: ['#1a1714', '#23201c', '#e0bca6', '#c0c3f1']},
  {id: 'hematoksylina', name: 'Hematoksylina', group: 'classic', fontHref: 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Fragment+Mono&display=swap', light: ['#F2F0F4', '#FBFAFC', '#3B2D63', '#7E5833'], dark: ['#17151A', '#201D24', '#C7BDE4', '#CDB4A2']},
  {id: 'trichrom', name: 'Trichrom', group: 'classic', fontHref: 'https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap', light: ['#f1f4f0', '#fafcf9', '#315b38', '#5d8a24'], dark: ['#151916', '#1d221e', '#8fb38b', '#c5d393']},
  {id: 'kobalt', name: 'Kobalt', group: 'bold', fontHref: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap', light: ['#F2EEE4', '#FBF9F3', '#002FA7', '#002FA7'], dark: ['#171614', '#201E1B', '#BCC8F9', '#BCC8F9']},
  {id: 'riso', name: 'Druk riso', group: 'bold', fontHref: 'https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;600;800&family=Space+Mono:wght@400;700&display=swap', light: ['#f6f1e4', '#fffcf4', '#3d5588', '#a8195f'], dark: ['#161518', '#1f1e22', '#c3d1f6', '#ffbfd6']},
  {id: 'tablica', name: 'Tablica', group: 'bold', fontHref: 'https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600&family=Red+Hat+Mono:wght@400;500&display=swap', light: ['#edf0ee', '#fbfcfb', '#1f4a37', '#1c4597'], dark: ['#1b2520', '#222e28', '#f2f4ec', '#f6e9b5']},
  {id: 'brutal', name: 'Gruba kreska', group: 'bold', fontHref: 'https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;700;800&family=Martian+Mono:wght@400;600&display=swap', light: ['#f3eee3', '#ffffff', '#111111', '#0026c9'], dark: ['#151413', '#1f1d1b', '#fff0b3', '#cdd2ff']},
  {id: 'fosfor', name: 'Fosfor', group: 'bold', fontHref: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap', light: ['#f1f1eb', '#fbfbf7', '#1d6b37', '#121612'], dark: ['#0f130f', '#161c17', '#cdf9c0', '#e8f0e9']},
];
