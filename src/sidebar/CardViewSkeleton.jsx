import React from "react";

function CardViewSkeleton() {
  return (
    <div id="ytf-results-state">
      <div className="ytf-study-header">
        <div className="ytf-study-header-actions">
          <div
            className="rd-skeleton"
            style={{ width: "40px", height: "40px", borderRadius: "50%" }}
          ></div>
          <div
            className="rd-skeleton"
            style={{ width: "40px", height: "40px", borderRadius: "50%" }}
          ></div>
        </div>
        <div
          className="rd-skeleton rd-skeleton-text"
          style={{ width: "80px", marginTop: "12px" }}
        ></div>
      </div>
      <div id="ytf-card-deck-container">
        {/* Just one placeholder card is needed */}
        <div className="rd-skeleton rd-skeleton-card"></div>
      </div>
      {/* <div id="ytf-study-nav" className="ytf-study-nav">
        <div
          className="rd-skeleton"
          style={{ width: "40px", height: "40px", borderRadius: "50%" }}
        ></div>
        <div
          className="rd-skeleton"
          style={{ width: "50px", height: "50px", borderRadius: "50%" }}
        ></div>
        <div
          className="rd-skeleton"
          style={{ width: "40px", height: "40px", borderRadius: "50%" }}
        ></div>
      </div> */}
    </div>
  );
}

export default CardViewSkeleton;
