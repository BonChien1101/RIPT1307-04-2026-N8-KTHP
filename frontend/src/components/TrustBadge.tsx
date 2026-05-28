import React from 'react';
import { Progress, Tag, Tooltip } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';

interface TrustBadgeProps {
  score: number;
  rank?: 'bronze' | 'silver' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  showLabel?: boolean;
}

const rankConfig = {
  gold: {
    label: 'Gold',
    emoji: '🥇',
    color: '#b8860b',
    bg: 'linear-gradient(135deg, rgba(255,215,0,0.20), rgba(184,134,11,0.12))',
    border: 'rgba(255,215,0,0.35)',
    stroke: '#ffd700',
    shadow: 'rgba(255,215,0,0.25)',
  },
  silver: {
    label: 'Silver',
    emoji: '🥈',
    color: '#7a7a8a',
    bg: 'linear-gradient(135deg, rgba(168,169,173,0.18), rgba(122,122,138,0.10))',
    border: 'rgba(168,169,173,0.30)',
    stroke: '#a8a9ad',
    shadow: 'rgba(168,169,173,0.20)',
  },
  bronze: {
    label: 'Bronze',
    emoji: '🥉',
    color: '#cd7f32',
    bg: 'linear-gradient(135deg, rgba(205,127,50,0.18), rgba(139,107,49,0.10))',
    border: 'rgba(205,127,50,0.28)',
    stroke: '#cd7f32',
    shadow: 'rgba(205,127,50,0.18)',
  },
};

const sizeConfig = {
  sm: { fontSize: 12, padding: '4px 10px', emojiSize: 14, borderRadius: 999 },
  md: { fontSize: 13, padding: '6px 14px', emojiSize: 18, borderRadius: 12 },
  lg: { fontSize: 15, padding: '10px 18px', emojiSize: 24, borderRadius: 14 },
};

const TrustBadge: React.FC<TrustBadgeProps> = ({
  score,
  rank,
  size = 'md',
  showScore = false,
  showLabel = true,
}) => {
  // Compute rank from score if not provided
  const computedRank: 'bronze' | 'silver' | 'gold' =
    rank || (score >= 80 ? 'gold' : score >= 50 ? 'silver' : 'bronze');

  const cfg = rankConfig[computedRank];
  const sz = sizeConfig[size];

  return (
    <Tooltip
      title={
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700 }}>Điểm uy tín: {score}/100</div>
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
            {computedRank === 'gold'
              ? '🎉 Ưu tiên duyệt tự động!'
              : computedRank === 'silver'
              ? '✅ Ưu tiên xét duyệt'
              : 'Duyệt thông thường'}
          </div>
        </div>
      }
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: sz.padding,
          borderRadius: sz.borderRadius,
          background: cfg.bg,
          border: `1.5px solid ${cfg.border}`,
          boxShadow: `0 4px 12px ${cfg.shadow}`,
          cursor: 'default',
          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05) translateY(-2px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 20px ${cfg.shadow}`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = '';
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 12px ${cfg.shadow}`;
        }}
      >
        <span style={{ fontSize: sz.emojiSize, lineHeight: 1 }}>
          {cfg.emoji}
        </span>

        {showLabel && (
          <span
            style={{
              fontWeight: 800,
              fontSize: sz.fontSize,
              color: cfg.color,
              letterSpacing: '0.02em',
            }}
          >
            {cfg.label}
          </span>
        )}

        {showScore && (
          <span
            style={{
              fontSize: sz.fontSize - 1,
              color: cfg.color,
              fontWeight: 600,
              opacity: 0.85,
            }}
          >
            {score}đ
          </span>
        )}
      </div>
    </Tooltip>
  );
};

export default TrustBadge;
