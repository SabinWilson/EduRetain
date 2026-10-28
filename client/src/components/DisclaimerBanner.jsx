import React from 'react';
import { Info } from 'lucide-react';

const DisclaimerBanner = ({ className = '' }) => {
  return (
    <div
      className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-sky-50/80 border border-sky-200/70 text-sky-900 text-xs ${className}`}
    >
      <Info className="w-4 h-4 text-sky-600 shrink-0" />
      <span>
        <strong>Decision Support Advisory:</strong> AI risk probabilities and SHAP factor attributions are predictive indicators designed to support, not replace, faculty and mentor professional judgment.
      </span>
    </div>
  );
};

export default DisclaimerBanner;
