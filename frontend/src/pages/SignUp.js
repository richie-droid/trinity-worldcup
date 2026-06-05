import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

const EMOJI_GROUPS = [
  { label: 'Sports & Energy', emojis: ['⚽', '🏆', '🥅', '🎯', '🔥', '⚡', '💪', '🚀', '⭐', '👑', '🏅', '🎖️'] },
  { label: 'Animals', emojis: ['🦁', '🐯', '🦅', '🐉', '🦊', '🐺', '🦈', '🦝', '🐻', '🦌', '🐆', '🦏'] },
  { label: 'More', emojis: ['🌎', '🗡️', '🛡️', '⚔️', '🎲', '🃏', '🎰', '💎', '🏹', '🌊', '🌋', '🦋'] },
];

export default function SignUp() {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('⚽');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const user = await api.createUser(name.trim(), emoji);
      if (user.error) throw new Error(user.error);
      login(user);
      navigate('/draft');
    } catch (err) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.trophy}>🏆</div>
          <h1 style={styles.title}>WORLD CUP</h1>
          <h2 style={styles.subtitle}>DRAFT 2026</h2>
          <p style={styles.tagline}>Pick your teams. Follow the tournament. Win glory.</p>
        </div>

        {/* Form */}
        <div className="card animate-in" style={styles.card}>
          <h3 style={styles.formTitle}>Join the Draft</h3>

          <div style={styles.emojiPicker}>
            <label style={styles.label}>Choose your icon</label>
            {EMOJI_GROUPS.map(group => (
              <div key={group.label} style={{ marginBottom: 10 }}>
                <div style={styles.emojiGroupLabel}>{group.label}</div>
                <div style={styles.emojiGrid}>
                  {group.emojis.map(e => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      style={{
                        ...styles.emojiBtn,
                        ...(emoji === e ? styles.emojiBtnActive : {}),
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Your name</label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputEmoji}>{emoji}</span>
              <input
                style={styles.input}
                type="text"
                placeholder="Enter your name..."
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
                maxLength={30}
                autoFocus
              />
            </div>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!name.trim() || loading}
            style={{ width: '100%', marginTop: 8, fontSize: 16, padding: '14px' }}
          >
            {loading ? 'Joining...' : 'Enter the Draft Room →'}
          </button>
        </div>

        {/* Scoring info */}
        <div className="card animate-in" style={{ ...styles.card, marginTop: 16 }}>
          <h4 style={styles.scoringTitle}>📊 Scoring System</h4>
          <div style={styles.scoringGrid}>
            {[
              ['Group Win', '2 pts'], ['Group Draw', '1 pt'],
              ['Round of 32', '3 pts'], ['Round of 16', '4 pts'],
              ['Quarterfinal', '6 pts'], ['Semifinal', '8 pts'],
              ['3rd Place', '6 pts'], ['Win Final', '12 pts'],
            ].map(([label, pts]) => (
              <div key={label} style={styles.scoringItem}>
                <span style={styles.scoringLabel}>{label}</span>
                <span style={styles.scoringPts}>{pts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    background: 'radial-gradient(ellipse at top, #0d3d22 0%, #0a2e1a 40%, #1a1a2e 100%)',
  },
  container: { width: '100%', maxWidth: 480 },
  header: { textAlign: 'center', marginBottom: 32 },
  trophy: { fontSize: 56, marginBottom: 8, display: 'block' },
  title: {
    fontFamily: 'Bebas Neue, sans-serif',
    fontSize: 72,
    letterSpacing: 6,
    color: '#f5c518',
    lineHeight: 0.9,
    textShadow: '0 0 40px rgba(245,197,24,0.4)',
  },
  subtitle: {
    fontFamily: 'Bebas Neue, sans-serif',
    fontSize: 36,
    letterSpacing: 8,
    color: 'rgba(248,248,242,0.7)',
    marginBottom: 12,
  },
  tagline: { color: 'rgba(248,248,242,0.5)', fontSize: 14 },
  card: { marginTop: 0 },
  formTitle: {
    fontFamily: 'Bebas Neue, sans-serif',
    fontSize: 28,
    letterSpacing: 2,
    marginBottom: 20,
    color: '#f8f8f2',
  },
  emojiPicker: { marginBottom: 20 },
  emojiGroupLabel: {
    fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
    color: 'rgba(248,248,242,0.35)', marginBottom: 6,
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(248,248,242,0.5)',
    marginBottom: 8,
  },
  emojiGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  emojiBtn: {
    width: 42, height: 42,
    fontSize: 22, background: 'rgba(255,255,255,0.05)',
    border: '2px solid transparent', borderRadius: 8,
    cursor: 'pointer', transition: 'all 0.15s ease',
  },
  emojiBtnActive: {
    border: '2px solid #f5c518',
    background: 'rgba(245,197,24,0.1)',
  },
  field: { marginBottom: 20 },
  inputWrapper: {
    display: 'flex', alignItems: 'center',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, overflow: 'hidden',
    transition: 'border-color 0.15s',
  },
  inputEmoji: { padding: '0 12px', fontSize: 22 },
  input: {
    flex: 1, padding: '14px 12px 14px 0',
    background: 'transparent', border: 'none',
    color: '#f8f8f2', fontSize: 16,
  },
  error: { color: '#e63946', fontSize: 13, marginBottom: 8 },
  scoringTitle: {
    fontFamily: 'Bebas Neue, sans-serif',
    fontSize: 20, letterSpacing: 2, marginBottom: 16,
  },
  scoringGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
  },
  scoringItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 12px', background: 'rgba(255,255,255,0.03)',
    borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)',
  },
  scoringLabel: { fontSize: 12, color: 'rgba(248,248,242,0.6)' },
  scoringPts: {
    fontFamily: 'DM Mono, monospace',
    fontSize: 13, fontWeight: 600, color: '#f5c518',
  },
};
