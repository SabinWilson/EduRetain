import React from 'react';
import StatusPill from './StatusPill';

const RiskBadge = ({ level, score, showScore = true, size = 'md' }) => {
  const normLevel = level || 'Low';
  const label = normLevel.includes('Risk') ? normLevel : `${normLevel} Risk`;

  return (
    <StatusPill
      status={normLevel}
      label={label}
      score={showScore ? score : null}
      size={size}
    />
  );
};

export default RiskBadge;
