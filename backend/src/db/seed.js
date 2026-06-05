const teams = [
  // Group A
  { id: 'mex', name: 'Mexico', country_code: 'MEX', group_name: 'A', pot: 1, fifa_rank: 18, odds: '+6000' },
  { id: 'rsa', name: 'South Africa', country_code: 'RSA', group_name: 'A', pot: 3, fifa_rank: 60, odds: '+50000' },
  { id: 'kor', name: 'South Korea', country_code: 'KOR', group_name: 'A', pot: 2, fifa_rank: 25, odds: '+8000' },
  { id: 'cze', name: 'Czechia', country_code: 'CZE', group_name: 'A', pot: 4, fifa_rank: 34, odds: '+20000' },

  // Group B
  { id: 'can', name: 'Canada', country_code: 'CAN', group_name: 'B', pot: 1, fifa_rank: 52, odds: '+15000' },
  { id: 'bih', name: 'Bosnia & Herzegovina', country_code: 'BIH', group_name: 'B', pot: 4, fifa_rank: 65, odds: '+30000' },
  { id: 'qat', name: 'Qatar', country_code: 'QAT', group_name: 'B', pot: 3, fifa_rank: 68, odds: '+50000' },
  { id: 'sui', name: 'Switzerland', country_code: 'SUI', group_name: 'B', pot: 2, fifa_rank: 22, odds: '+5000' },

  // Group C
  { id: 'bra', name: 'Brazil', country_code: 'BRA', group_name: 'C', pot: 1, fifa_rank: 5, odds: '+500' },
  { id: 'mor', name: 'Morocco', country_code: 'MAR', group_name: 'C', pot: 2, fifa_rank: 14, odds: '+2800' },
  { id: 'hai', name: 'Haiti', country_code: 'HTI', group_name: 'C', pot: 4, fifa_rank: 83, odds: '+100000' },
  { id: 'sco', name: 'Scotland', country_code: 'SCO', group_name: 'C', pot: 3, fifa_rank: 32, odds: '+12000' },

  // Group D
  { id: 'usa', name: 'United States', country_code: 'USA', group_name: 'D', pot: 1, fifa_rank: 13, odds: '+3000' },
  { id: 'par', name: 'Paraguay', country_code: 'PAR', group_name: 'D', pot: 3, fifa_rank: 60, odds: '+20000' },
  { id: 'aus', name: 'Australia', country_code: 'AUS', group_name: 'D', pot: 2, fifa_rank: 25, odds: '+15000' },
  { id: 'tur', name: 'Türkiye', country_code: 'TUR', group_name: 'D', pot: 4, fifa_rank: 28, odds: '+7000' },

  // Group E
  { id: 'ger', name: 'Germany', country_code: 'GER', group_name: 'E', pot: 1, fifa_rank: 9, odds: '+800' },
  { id: 'cur', name: 'Curaçao', country_code: 'CUW', group_name: 'E', pot: 4, fifa_rank: 82, odds: '+100000' },
  { id: 'civ', name: 'Ivory Coast', country_code: 'CIV', group_name: 'E', pot: 3, fifa_rank: 55, odds: '+20000' },
  { id: 'ecu', name: 'Ecuador', country_code: 'ECU', group_name: 'E', pot: 2, fifa_rank: 38, odds: '+12000' },

  // Group F
  { id: 'ned', name: 'Netherlands', country_code: 'NED', group_name: 'F', pot: 1, fifa_rank: 7, odds: '+1200' },
  { id: 'jpn', name: 'Japan', country_code: 'JPN', group_name: 'F', pot: 2, fifa_rank: 17, odds: '+5000' },
  { id: 'swe', name: 'Sweden', country_code: 'SWE', group_name: 'F', pot: 4, fifa_rank: 26, odds: '+6000' },
  { id: 'tun', name: 'Tunisia', country_code: 'TUN', group_name: 'F', pot: 3, fifa_rank: 31, odds: '+15000' },

  // Group G
  { id: 'bel', name: 'Belgium', country_code: 'BEL', group_name: 'G', pot: 1, fifa_rank: 8, odds: '+3200' },
  { id: 'egy', name: 'Egypt', country_code: 'EGY', group_name: 'G', pot: 3, fifa_rank: 40, odds: '+18000' },
  { id: 'irn', name: 'Iran', country_code: 'IRN', group_name: 'G', pot: 2, fifa_rank: 23, odds: '+8000' },
  { id: 'nzl', name: 'New Zealand', country_code: 'NZL', group_name: 'G', pot: 4, fifa_rank: 95, odds: '+75000' },

  // Group H
  { id: 'esp', name: 'Spain', country_code: 'ESP', group_name: 'H', pot: 1, fifa_rank: 3, odds: '+550' },
  { id: 'cpv', name: 'Cape Verde', country_code: 'CPV', group_name: 'H', pot: 4, fifa_rank: 65, odds: '+40000' },
  { id: 'ksa', name: 'Saudi Arabia', country_code: 'KSA', group_name: 'H', pot: 3, fifa_rank: 56, odds: '+25000' },
  { id: 'uru', name: 'Uruguay', country_code: 'URU', group_name: 'H', pot: 2, fifa_rank: 20, odds: '+3500' },

  // Group I
  { id: 'fra', name: 'France', country_code: 'FRA', group_name: 'I', pot: 1, fifa_rank: 2, odds: '+425' },
  { id: 'sco2', name: 'Senegal', country_code: 'SEN', group_name: 'I', pot: 2, fifa_rank: 34, odds: '+12000' },
  { id: 'irq', name: 'Iraq', country_code: 'IRQ', group_name: 'I', pot: 4, fifa_rank: 63, odds: '+50000' },
  { id: 'nor', name: 'Norway', country_code: 'NOR', group_name: 'I', pot: 3, fifa_rank: 29, odds: '+8500' },

  // Group J
  { id: 'arg', name: 'Argentina', country_code: 'ARG', group_name: 'J', pot: 1, fifa_rank: 1, odds: '+350' },
  { id: 'alg', name: 'Algeria', country_code: 'ALG', group_name: 'J', pot: 3, fifa_rank: 35, odds: '+15000' },
  { id: 'aut', name: 'Austria', country_code: 'AUT', group_name: 'J', pot: 2, fifa_rank: 23, odds: '+5500' },
  { id: 'jor', name: 'Jordan', country_code: 'JOR', group_name: 'J', pot: 4, fifa_rank: 72, odds: '+75000' },

  // Group K
  { id: 'por', name: 'Portugal', country_code: 'POR', group_name: 'K', pot: 1, fifa_rank: 6, odds: '+900' },
  { id: 'cod', name: 'DR Congo', country_code: 'COD', group_name: 'K', pot: 4, fifa_rank: 57, odds: '+30000' },
  { id: 'uzb', name: 'Uzbekistan', country_code: 'UZB', group_name: 'K', pot: 3, fifa_rank: 61, odds: '+40000' },
  { id: 'col', name: 'Colombia', country_code: 'COL', group_name: 'K', pot: 2, fifa_rank: 19, odds: '+3500' },

  // Group L
  { id: 'eng', name: 'England', country_code: 'ENG', group_name: 'L', pot: 1, fifa_rank: 4, odds: '+600' },
  { id: 'cro', name: 'Croatia', country_code: 'CRO', group_name: 'L', pot: 2, fifa_rank: 10, odds: '+4000' },
  { id: 'gha', name: 'Ghana', country_code: 'GHA', group_name: 'L', pot: 3, fifa_rank: 66, odds: '+35000' },
  { id: 'pan', name: 'Panama', country_code: 'PAN', group_name: 'L', pot: 4, fifa_rank: 80, odds: '+30000' },
];

// Teams that were placeholders or didn't qualify — remove from DB
const removedTeamIds = [
  'uefapd', 'uefapb', 'uefapc', 'uefapa', 'icpa', // play-off placeholders
  'cam', 'chl', 'prt2', 'nig', 'den',              // didn't qualify
];

const seedTeams = async (pool) => {
  const client = await pool.connect();
  try {
    // Remove placeholder / non-qualified teams (safe — cascades if no picks reference them)
    for (const id of removedTeamIds) {
      await client.query(`DELETE FROM teams WHERE id = $1`, [id]);
    }

    for (const team of teams) {
      await client.query(`
        INSERT INTO teams (id, name, country_code, group_name, pot, fifa_rank, odds)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          country_code = EXCLUDED.country_code,
          group_name = EXCLUDED.group_name,
          pot = EXCLUDED.pot,
          fifa_rank = EXCLUDED.fifa_rank,
          odds = EXCLUDED.odds
      `, [team.id, team.name, team.country_code, team.group_name, team.pot, team.fifa_rank ?? null, team.odds ?? null]);
    }
    console.log(`Seeded ${teams.length} teams`);
  } finally {
    client.release();
  }
};

module.exports = { seedTeams, teams };
