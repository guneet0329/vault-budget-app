export const lightColors = {
  bg: '#f4f6f5',
  surface: '#ffffff',
  surface2: '#eef1ef',
  teal: '#1a7f6e',
  tealLight: '#e8f4f1',
  tealMid: '#2aa88f',
  blue: '#1e4d8c',
  blueLight: '#e8eef8',
  green: '#2d7d3a',
  greenLight: '#e8f3e9',
  red: '#c0392b',
  redLight: '#fdecea',
  amber: '#d4820a',
  amberLight: '#fef3e2',
  purple: '#7b3f9e',
  purpleLight: '#f3eafa',
  text: '#1a2520',
  text2: '#4a5e57',
  text3: '#8a9e97',
  border: '#dde5e2',
  cardBorder: 'transparent',
};

export const darkColors = {
  bg: '#0f1a17',
  surface: '#1a2b26',
  surface2: '#243d37',
  teal: '#2aa88f',
  tealLight: '#1a3830',
  tealMid: '#2aa88f',
  blue: '#4a7fd4',
  blueLight: '#1a2a44',
  green: '#3da64e',
  greenLight: '#1a3320',
  red: '#e05545',
  redLight: '#3a1a18',
  amber: '#e8952a',
  amberLight: '#3a2a10',
  purple: '#a06ac8',
  purpleLight: '#2a1a3a',
  text: '#e8f4f1',
  text2: '#9abfb8',
  text3: '#5a8a80',
  border: '#2a4a42',
  cardBorder: '#2a4a42',
};

export const CHART_COLORS = [
  '#2aa88f','#4a7fd4','#3da64e','#a06ac8',
  '#e8952a','#e05545','#0d9ebe','#c87a3a',
];

export const PALETTE = [
  '#1a7f6e','#1e4d8c','#2d7d3a','#7b3f9e',
  '#c0392b','#d4820a','#0d7ebe','#8b4513',
];

export const EMOJIS = [
  // Food & drink
  '🍔','🛒','☕','🍕','🍜','🥗','🍱','🥤','🍷','🧃',
  // Home & utilities
  '🏠','🏡','💡','🔌','🛁','🪴','🛋️','🧹','🔧','🪣',
  // Transport
  '🚗','🚌','🚇','⛽','🛞','🚲','✈️','🚕','🛵','🚙',
  // Bills & finance
  '💳','🧾','🏦','💵','💰','📱','🌐','📞','🔐','💸',
  // Tech & subscriptions
  '💻','🎮','📺','🎵','📷','🖥️','⌨️','🎧','🔋','📡',
  // Health & wellness
  '💊','🏋️','🧘','🏥','🦷','👓','💉','🧴','🩺','🩹',
  // Clothing & personal
  '👗','👟','👠','🧥','👔','🎒','💍','💄','🪒','🧣',
  // Insurance & protection
  '🛡️','🔒','🚑','🚒','⚖️','📋','🗂️','📝','✅','🔑',
  // Education & work
  '📚','✏️','🎓','💼','🖊️','🗓️','📊','🏫','🔬','🧪',
  // Entertainment & lifestyle
  '🎬','🎁','🎯','🎨','🎭','🎪','🏖️','🏕️','🎸','🎤',
  // Family & nature
  '🐾','🐕','🐈','👶','🧒','🌱','🌻','🧸','❤️','🏡',
  // Sports
  '⚽','🏀','🧗','🏊','🎾','🏈','🏂','🤸','🥊','🏆',
];

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
];

export const TAGS = ['#work','#family','#health','#emergency','#fun','#food','#travel','#home','#subscriptions','#personal'];

export const QUICK_AMOUNTS = [5, 10, 20, 50, 100];

export const radius = { sm: 10, md: 14, lg: 18, full: 999 };

export const getShadow = (dark) => ({
  sm: {
    shadowColor: dark ? '#000' : '#1a2d25',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: dark ? 0.3 : 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: dark ? '#000' : '#1a2d25',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: dark ? 0.5 : 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
});
