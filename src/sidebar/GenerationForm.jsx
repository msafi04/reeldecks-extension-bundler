import React, { useState } from "react";
import Slider from "rc-slider";

import { getOrCreateAnonymousId, logger } from "../utils/extension";

// Helper function to format seconds into MM:SS
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function GenerationForm({
  videoMetadata,
  onGenerate,
  isUserLoggedIn,
  onBack,
  existingDeckId,
}) {
  const [cardType, setCardType] = useState(
    videoMetadata?.contentTypeOptions?.suggested?.[0]?.value || "summary"
  );
  const [cardQuantity, setCardQuantity] = useState("10");
  const [cardTone, setCardTone] = useState("standard");
  const [timeRange, setTimeRange] = useState([0, videoMetadata.duration]);

  const handleGenerateClick = async () => {
    const videoId = new URLSearchParams(window.location.search).get("v");

    const anonymousUserId = await getOrCreateAnonymousId();

    const generationOptions = {
      selectionType: "slider",
      selectionData: { start: timeRange[0], end: timeRange[1] },
    };

    const payload = {
      videoId: videoId,
      cardType: cardType || "manual",
      quantity: cardQuantity,
      tone: cardTone,
      generationOptions: generationOptions,
      videoCategory: videoMetadata.category,
      transcriptEligibility: videoMetadata.transcriptEligibility,
      categoryTokens: videoMetadata.categoryTokens,
      initialStatus: "saved",
      anonymousUserId: anonymousUserId,
      existingDeckId: existingDeckId,
    };

    // Call the function passed down from the parent component
    onGenerate(payload);
  };

  return (
    <div id="ytf-initial-state">
      <div className="ytf-view-header">
        {isUserLoggedIn && (
          <button
            id="ytf-back-to-decks-btn"
            class="ytf-icon-btn"
            title="Back to Decks"
            onClick={onBack}
          >
            <svg
              xmlns="http://www.w.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
        )}
        <h4>Generate flashcards from this video.</h4>
      </div>

      <div className="ytf-options-container">
        {/* Content Type Dropdown */}
        <div className="ytf-option-group">
          <label htmlFor="ytf-card-type">Content Type</label>
          <div className="ytf-select-wrapper">
            <select
              id="ytf-card-type"
              value={cardType}
              onChange={(e) => setCardType(e.target.value)}
            >
              {videoMetadata?.contentTypeOptions?.suggested?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
              {/* Optional: Add a divider and the "other" options */}
            </select>
          </div>
        </div>

        {/* Card Quantity */}
        <div className="ytf-option-group">
          <label>Max Number of Cards</label>
          <div
            id="ytf-card-quantity-selector"
            className="ytf-segmented-control"
          >
            <input
              type="radio"
              id="qty-5"
              name="card-quantity"
              value="5"
              checked={cardQuantity === "5"}
              onChange={(e) => setCardQuantity(e.target.value)}
            />
            <label htmlFor="qty-5">5</label>
            <input
              type="radio"
              id="qty-10"
              name="card-quantity"
              value="10"
              checked={cardQuantity === "10"}
              onChange={(e) => setCardQuantity(e.target.value)}
            />
            <label htmlFor="qty-10">10</label>
            <input
              type="radio"
              id="qty-15"
              name="card-quantity"
              value="15"
              checked={cardQuantity === "15"}
              onChange={(e) => setCardQuantity(e.target.value)}
            />
            <label htmlFor="qty-15">15</label>
          </div>
        </div>

        {/* Tone */}
        <div className="ytf-option-group">
          <label htmlFor="ytf-card-tone">Language / Tone</label>
          <div className="ytf-select-wrapper">
            <select
              id="ytf-card-tone"
              value={cardTone}
              onChange={(e) => setCardTone(e.target.value)}
            >
              <option value="standard">Standard</option>
              <option value="simple">Simple English</option>
              <option value="eli5">Explain Like I'm 5</option>
              <option value="academic">Academic / Formal</option>
            </select>
          </div>
        </div>

        {/* Timestamp Slider */}
        <div className="ytf-option-group" id="ytf-timestamp-container">
          <label>Select Video Segment</label>
          <div className="ytf-slider-container">
            <Slider
              range
              min={0}
              max={videoMetadata.duration}
              value={timeRange}
              onChange={(newRange) => setTimeRange(newRange)}
              tipFormatter={(value) => formatTime(value)}
            />
          </div>
          <div className="ytf-slider-labels">
            <span>{formatTime(timeRange[0])}</span>
            <span>{formatTime(timeRange[1])}</span>
          </div>
        </div>
      </div>

      {/* We'll add the info box back in later */}
      <div id="ytf-generation-info" className="ytf-info-box"></div>

      <button className="ytf-generate-btn" onClick={handleGenerateClick}>
        Generate Flashcards
      </button>
    </div>
  );
}

export default GenerationForm;
