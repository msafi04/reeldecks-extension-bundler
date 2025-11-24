import React from "react";

function InfographicResultView({ imageUrl, onExpand, onBack, onRegenerate }) {
  return (
    <div id="ytf-results-state">
      <div className="ytf-study-header">
        <div className="ytf-study-header-actions">
          <div className="ytf-study-header-actions-left">
            <button
              id="ytf-back-btn"
              className="ytf-icon-btn"
              title="Back"
              onClick={onBack}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
          </div>
          <div className="ytf-study-header-actions-right">
            {onRegenerate && (
              <button
                id="ytf-regenerate-btn"
                className="ytf-icon-btn"
                title="Re-generate Infographic"
                onClick={onRegenerate}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
      <div
        className="ytf-infographic-preview-container"
        onClick={onExpand}
        title="Click to expand"
      >
        <img
          src={imageUrl}
          alt="Generated Infographic Preview"
          className="ytf-infographic-preview-image"
        />
        <div className="ytf-infographic-expand-overlay">
          <span>Click to Expand</span>
        </div>
      </div>

      <div className="ytf-actions-section">
        <button className="ytf-primary-action-btn" onClick={onExpand}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
          <span>View & Download</span>
        </button>
      </div>
    </div>
  );
}

export default InfographicResultView;
