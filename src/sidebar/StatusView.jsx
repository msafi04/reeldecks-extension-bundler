import React from "react";
import "./StatusView.css"; // We'll create this

function StatusView({ icon, title, message, onRetry }) {
  return (
    <div className="ytf-status-view">
      <div className="ytf-status-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="ytf-secondary-action-btn" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}

export default StatusView;
