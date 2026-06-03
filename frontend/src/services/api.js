const API = process.env.REACT_APP_API_URL || '/api';

const get = (path) => fetch(`${API}${path}`).then(r => r.json());
const post = (path, body) => fetch(`${API}${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}).then(r => r.json());

export const api = {
  // Users
  createUser: (name, emoji) => post('/users', { name, emoji }),
  getUsers: () => get('/users'),
  getUser: (id) => get(`/users/${id}`),

  // Teams
  getTeams: () => get('/teams'),

  // Scoreboard
  getLeaderboard: () => get('/scoreboard/leaderboard'),
  getMatches: () => get('/scoreboard/matches'),
  getUpcoming: () => get('/scoreboard/upcoming'),
  getUserPoints: (userId) => get(`/scoreboard/points/${userId}`),
  syncScores: () => post('/scoreboard/sync', {}),
  resetDraft: (userId) => post('/users/reset', { userId }),
};

// Country code to flag emoji mapping
const flagMap = {
  MEX: '🇲🇽', USA: '🇺🇸', CAN: '🇨🇦', BRA: '🇧🇷', ARG: '🇦🇷',
  FRA: '🇫🇷', ENG: '🇬🇧', GER: '🇩🇪', ESP: '🇪🇸', POR: '🇵🇹',
  NED: '🇳🇱', BEL: '🇧🇪', CRO: '🇭🇷', DEN: '🇩🇰', SUI: '🇨🇭',
  AUT: '🇦🇹', NOR: '🇳🇴', SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', JPN: '🇯🇵', KOR: '🇰🇷',
  MAR: '🇲🇦', SEN: '🇸🇳', NGA: '🇳🇬', EGY: '🇪🇬', RSA: '🇿🇦',
  CMR: '🇨🇲', CPV: '🇨🇻', ALG: '🇩🇿', COL: '🇨🇴', URU: '🇺🇾',
  ECU: '🇪🇨', CHI: '🇨🇱', PAR: '🇵🇾', PER: '🇵🇪', PAN: '🇵🇦',
  QAT: '🇶🇦', AUS: '🇦🇺', NZL: '🇳🇿', IRQ: '🇮🇶', JOR: '🇯🇴',
  CIV: '🇨🇮', BIH: '🇧🇦', TUR: '🇹🇷', UEFA: '🏴',
};

export const getFlag = (countryCode) => flagMap[countryCode] || '🏳️';

export const POT_COLORS = {
  1: '#f5c518',
  2: '#2ec4b6',
  3: '#e63946',
  4: '#6b6b8a',
};

export const ROUND_LABELS = {
  group: 'Group Stage',
  round32: 'Round of 32',
  round16: 'Round of 16',
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  third_place: 'Third Place',
  final: 'Final',
};

export const POINTS_TABLE = {
  group: { win: 2, draw: 1 },
  round32: { win: 3 },
  round16: { win: 4 },
  quarterfinal: { win: 6 },
  semifinal: { win: 8 },
  third_place: { win: 6 },
  final: { win: 12 },
};
