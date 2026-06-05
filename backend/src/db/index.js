const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        emoji VARCHAR(10) DEFAULT '⚽',
        is_commissioner BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS teams (
        id VARCHAR(20) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        country_code VARCHAR(5),
        group_name VARCHAR(5),
        logo_url TEXT,
        pot INTEGER DEFAULT 4,
        eliminated BOOLEAN DEFAULT FALSE,
        current_round VARCHAR(30) DEFAULT 'group'
      );

      CREATE TABLE IF NOT EXISTS draft_picks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        team_id VARCHAR(20) REFERENCES teams(id),
        pick_number INTEGER NOT NULL,
        round_number INTEGER NOT NULL,
        picked_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(team_id),
        UNIQUE(pick_number)
      );

      CREATE TABLE IF NOT EXISTS draft_state (
        id INTEGER PRIMARY KEY DEFAULT 1,
        status VARCHAR(20) DEFAULT 'waiting',
        current_pick INTEGER DEFAULT 1,
        total_picks INTEGER DEFAULT 0,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        draft_order JSONB DEFAULT '[]'
      );

      INSERT INTO draft_state (id, status) VALUES (1, 'waiting')
      ON CONFLICT (id) DO NOTHING;

      CREATE TABLE IF NOT EXISTS matches (
        id VARCHAR(50) PRIMARY KEY,
        home_team_id VARCHAR(20),
        away_team_id VARCHAR(20),
        home_score INTEGER,
        away_score INTEGER,
        status VARCHAR(20) DEFAULT 'scheduled',
        match_date TIMESTAMPTZ,
        round VARCHAR(30) DEFAULT 'group',
        group_name VARCHAR(5),
        venue TEXT,
        last_updated TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS points_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        team_id VARCHAR(20) REFERENCES teams(id),
        match_id VARCHAR(50) REFERENCES matches(id),
        points INTEGER NOT NULL,
        reason VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, match_id, team_id)
      );

      ALTER TABLE teams ADD COLUMN IF NOT EXISTS fifa_rank INTEGER;
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS odds VARCHAR(15);
      ALTER TABLE draft_state ADD COLUMN IF NOT EXISTS pending_order JSONB DEFAULT '[]';
    `);
    console.log('Database initialized');
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
