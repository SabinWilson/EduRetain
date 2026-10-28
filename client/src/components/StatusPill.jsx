import React from 'react';

/**
 * StatusPill component adapted directly from RentMate
 * Displays colored pills for rental/intervention status or student risk level
 */
export default function StatusPill({ status, label, score, size = 'md' }) {
  const rawStatus = (status || label || 'Active').toString().trim();
  const lower = rawStatus.toLowerCase();

  let variantClass = 'rm-pill-default';
  let dotColor = '#64748B';
  let displayText = rawStatus;

  if (lower.includes('high') || lower === 'rejected' || lower === 'declined' || lower === 'critical' || lower === 'failed') {
    variantClass = 'rm-pill-danger';
    dotColor = '#E11D48';
    displayText = rawStatus.includes('Risk') ? rawStatus : `${rawStatus}`;
  } else if (lower.includes('med') || lower === 'pending' || lower.includes('progress') || lower === 'warning') {
    variantClass = 'rm-pill-warning';
    dotColor = '#D97706';
    displayText = rawStatus.includes('Risk') ? rawStatus : `${rawStatus}`;
  } else if (lower.includes('low') || lower === 'approved' || lower === 'completed' || lower === 'active' || lower === 'resolved') {
    variantClass = 'rm-pill-success';
    dotColor = '#00A896';
    displayText = rawStatus.includes('Risk') ? rawStatus : `${rawStatus}`;
  }

  const scoreFormatted = score !== undefined && score !== null ? Math.round(Number(score) * (Number(score) <= 1 ? 100 : 1)) : null;

  return (
    <span className={`rm-pill ${variantClass} rm-pill-${size}`}>
      <span className="rm-pill-dot" style={{ backgroundColor: dotColor }} />
      <span className="rm-pill-text">{displayText}</span>
      {scoreFormatted !== null && (
        <span className="rm-pill-score">({scoreFormatted}%)</span>
      )}
    </span>
  );
}
