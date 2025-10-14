import React from "react";

const SkeletonItem = () => (
  <div
    className="ytf-deck-item"
    style={{ backgroundColor: "#fff", border: "1px solid transparent" }}
  >
    <div className="ytf-deck-item-main">
      <div className="rd-skeleton rd-skeleton-title"></div>
      <div
        className="rd-skeleton rd-skeleton-text"
        style={{ width: "50%" }}
      ></div>
    </div>
    {/* <div className="rd-skeleton rd-skeleton-text" style={{ width: '60px', height: '24px', borderRadius: '20px' }}></div> */}
  </div>
);

function DeckListSkeleton() {
  return (
    <div id="ytf-deck-selection-state">
      <h4 style={{ marginBottom: "15px", textAlign: "left", flexShrink: 0 }}>
        Loading your decks...
      </h4>
      <div id="ytf-deck-list" className="ytf-deck-list-container">
        {/* Render a few placeholder items */}
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </div>
    </div>
  );
}

export default DeckListSkeleton;
