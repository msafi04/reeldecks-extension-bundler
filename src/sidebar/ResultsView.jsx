import React, { useState, useEffect } from "react";

import ExportDropdown from "./ExportDropdown";
import CardContent from "./CardContent";

import { redirectToWebApp, logger } from "../utils/extension";

const seekVideoTo = (seconds) => {
  const player = document.querySelector(".html5-main-video");
  if (player) {
    player.currentTime = seconds;
    if (player.paused) {
      player.play();
    }
    window.focus();
  } else {
    logger.warn("Could not find YouTube player element.");
    const videoId = new URLSearchParams(window.location.search).get("v");
    const fallbackUrl = `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`;
    window.open(fallbackUrl, "_blank");
  }
};

// A simple component for a single card
function StudyCard({ cardData, isCurrent, isNext }) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset flip state if the card is no longer the current one
  // This prevents a card from staying flipped in the background
  useEffect(() => {
    if (!isCurrent) {
      setIsFlipped(false);
    }
  }, [isCurrent]);

  useEffect(() => {
    // When the cards are displayed, send a message to the background
    // to tell it to come and render the math.
    logger.log("ResultsView mounted, requesting KaTeX render.");
    chrome.runtime.sendMessage({ action: "executeKaTeXRender" });
  }, [cardData]);

  const style = {};
  if (isCurrent) {
    style.opacity = 1;
    style.zIndex = 10;
    style.transform = isFlipped ? "rotateY(180deg)" : "";
  } else if (isNext) {
    style.opacity = 0.7;
    style.zIndex = 9;
    style.transform = "scale(0.95) translateY(15px)";
  } else {
    style.opacity = 0;
    style.zIndex = 8;
    style.transform = "scale(0.9) translateY(30px)";
  }

  return (
    <div
      className="ytf-study-card"
      style={style}
      onClick={() => isCurrent && setIsFlipped(!isFlipped)}
    >
      <div className="ytf-card-inner">
        <div className="ytf-card-front">
          <div className="ytf-card-content-wrapper">
            <div className="ytf-card-content">
              <CardContent content={cardData.front} />
            </div>
          </div>
        </div>
        <div className="ytf-card-back">
          <div className="ytf-card-content-wrapper">
            <div className="ytf-card-content">
              <CardContent content={cardData.back} />
            </div>
          </div>
          {cardData?.timestamp !== undefined && (
            <a
              className="ytf-timestamp-link"
              title="Go to this moment in the video"
              onClick={(e) => {
                e.stopPropagation();
                seekVideoTo(cardData.timestamp);
              }}
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
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="12 6 12 12 16 14"></polygon>
              </svg>
              <span>
                {new Date(cardData.timestamp * 1000)
                  .toISOString()
                  .substr(14, 5)}
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultsView({
  cards,
  onBack,
  onRegenerate,
  onAddCard,
  currentCardIndex,
  setCurrentCardIndex,
  isUserLoggedIn,
  isNotionConnected,
  currentDeckData,
  isProUser,
}) {
  const goToNext = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  const goToPrev = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  const handlePrimaryActionClick = () => {
    if (isUserLoggedIn) {
      // Logged-in user wants to edit this deck
      redirectToWebApp({ deckIdToEdit: currentDeckData._id });
    } else {
      // Anonymous user wants to claim this deck by signing up
      redirectToWebApp({ deckToClaim: currentDeckData._id });
    }
  };
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
                title="Re-generate Cards"
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
            {onAddCard && (
              <button
                id="ytf-add-card-btn"
                class="ytf-icon-btn"
                title="Add Custom Card"
                onClick={() => onAddCard(currentCardIndex)}
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
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            )}
          </div>
        </div>
        <div id="ytf-card-counter" className="ytf-card-counter">
          {currentCardIndex + 1} / {cards.length}
        </div>
      </div>

      <div id="ytf-card-deck-container">
        {cards?.map((card, index) => (
          <StudyCard
            key={index}
            cardData={card}
            isCurrent={index === currentCardIndex}
            isNext={index === currentCardIndex + 1}
          />
        ))}
      </div>

      <div id="ytf-study-nav" className="ytf-study-nav">
        <button
          id="ytf-prev-btn"
          className="ytf-icon-btn ytf-nav-btn"
          title="Prev"
          onClick={goToPrev}
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
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button
          id="ytf-flip-btn"
          className="ytf-icon-btn ytf-nav-btn"
          title="Flip Card"
          onClick={() => {
            // A bit of a trick to force re-render on the current card to flip it
            const cardComponent = document.querySelector(
              `.ytf-study-card[style*="opacity: 1"]`
            );
            if (cardComponent) cardComponent.click();
          }}
        >
          <svg
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
          >
            <path d="M18 4h-5V1h-2v3H6c-1.105 0-2 .895-2 2v12c0 1.105.895 2 2 2h5v3h2v-3h5c1.105 0 2-.895 2-2V6c0-1.105-.895-2-2-2zM6 18V6h5v12H6z"></path>
          </svg>
        </button>
        <button
          id="ytf-next-btn"
          className="ytf-icon-btn ytf-nav-btn"
          title="Next"
          onClick={goToNext}
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
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      <div className="ytf-actions-section">
        <button
          id="ytf-save-webapp-btn"
          className="ytf-primary-action-btn"
          onClick={handlePrimaryActionClick}
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
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>
            {isUserLoggedIn ? (
              <span>Edit in Web App</span>
            ) : (
              <span>Sign Up to Save Deck</span>
            )}
          </span>
        </button>
        {isUserLoggedIn && (
          <ExportDropdown
            isUserLoggedIn={isUserLoggedIn}
            isProUser={isProUser}
            isNotionConnected={isNotionConnected}
            currentDeckData={currentDeckData}
          />
        )}
      </div>
    </div>
  );
}

export default ResultsView;
