import React, { useState, useEffect, useRef, useMemo } from "react";

import ExportDropdown from "./ExportDropdown";
import CardContent from "./CardContent";

import { redirectToWebApp, logger } from "../utils/extension";
import { themeOptions } from "../utils/options";
import { useNotifier } from "../context/NotificationContext";

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
function StudyCard({
  cardData,
  isCurrent,
  isNext,
  isPrev,
  isFlipped,
  cardStyle,
  isInFocusMode,
  toggleFocusMode,
}) {
  const notify = useNotifier();

  const [positionStyle, setPositionStyle] = useState({});
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    const newStyle = {};
    if (isCurrent) {
      newStyle.opacity = 1;
      newStyle.zIndex = 10;
      newStyle.transform = isFlipped ? "rotateY(180deg)" : "";
      newStyle.pointerEvents = "auto";
    } else if (isNext) {
      newStyle.opacity = 0.9;
      newStyle.zIndex = 5;
      newStyle.transform = "scale(0.95) translateY(15px)";
      newStyle.pointerEvents = "none";
    } else if (isPrev) {
      newStyle.opacity = 0.9;
      newStyle.zIndex = 5; 
      newStyle.transform = "scale(0.95) translateY(15px)";
      newStyle.pointerEvents = "none";
    } else {
      newStyle.opacity = 0;
      newStyle.zIndex = 1;
      newStyle.transform = "scale(0.85) translateY(45px)";
      newStyle.pointerEvents = "none";
      newStyle.display = "none";
    }
    setPositionStyle(newStyle);
  }, [isCurrent, isNext, isPrev, isFlipped]);

  useEffect(() => {
    if (!isCurrent) {
      setShowImage(false);
    }
  }, [isCurrent]);

  const handleDoubleClickCopy = (e) => {
    // Stop the event from bubbling up, just in case.
    e.stopPropagation();

    // Get the clean text content from the DOM element that was double-clicked.
    const textToCopy = e.currentTarget.innerText;

    if (textToCopy && textToCopy.trim().length > 0) {
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          // Success! Show a toast notification.
          notify.success("Copied to clipboard!");
        })
        .catch((err) => {
          // Handle potential errors (e.g., if browser permissions change).
          notify.error("Could not copy text.");
          logger.error("Clipboard write failed:", err);
        });
    }
  };

  return (
    <div
      className="ytf-study-card"
      style={positionStyle}
      // onClick={() => isCurrent && setIsFlipped((prev) => !prev)}
    >
      <div className="ytf-card-inner">
        <div className="ytf-card-front" style={cardStyle}>
          <div className="ytf-card-content-wrapper">
            <div
              className="ytf-card-content"
              onDoubleClick={handleDoubleClickCopy}
            >
              {/* <div dangerouslySetInnerHTML={{ __html: cardData.front }} /> */}
              <CardContent content={cardData.front} />
            </div>
            {isCurrent && (
              <div className="ytf-card-actions">
                <button
                  className="ytf-focus-btn"
                  title={isInFocusMode ? "Collapse" : "Expand"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFocusMode();
                  }}
                >
                  {isInFocusMode ? (
                    // Collapse Icon
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                    </svg>
                  ) : (
                    // Expand Icon
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="ytf-card-back" style={cardStyle}>
          {showImage ? (
            <img
              className="ytf-card-screenshot-display"
              src={cardData.screenShotUrl}
              alt="Card Screenshot"
            />
          ) : (
            <div className="ytf-card-content-wrapper">
              <div
                className="ytf-card-content"
                onDoubleClick={handleDoubleClickCopy}
              >
                {/* <div dangerouslySetInnerHTML={{ __html: cardData.back }} /> */}
                <CardContent content={cardData.back} />
              </div>
            </div>
          )}
          <div className="ytf-card-back-footer">
            <div className="footer-col left"></div>
            <div className="footer-col center">
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
            <div className="footer-col right">
              {/* Image Toggle Button (only if screenshot exists) */}
              {cardData.screenShotUrl && (
                <button
                  className="ytf-image-toggle-btn"
                  title={showImage ? "Show Text" : "Show Screenshot"}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent the card from flipping
                    setShowImage((prev) => !prev);
                  }}
                >
                  {showImage ? (
                    // "Show Text" Icon
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  ) : (
                    // "Show Image" Icon
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                      ></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultsView({
  cards,
  currentDeckData,
  onBack,
  onRegenerate,
  onAddCard,
  currentCardIndex,
  setCurrentCardIndex,
  isUserLoggedIn,
  isNotionConnected,
  isProUser,
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isInFocusMode, setIsInFocusMode] = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // A single ref to hold all state for an interaction.
    const interaction = {
      isInteracting: false, // Are we currently dragging/clicking?
      startX: 0,
      currentX: 0,
    };
    let currentCardElement = null;

    const handleInteractionStart = (e) => {
      // --- THE GOLDEN RULE ---
      // If the interaction starts on a selectable or clickable element, ignore it completely.
      // This lets text selection and link clicks work naturally.
      if (e.target.closest(".ytf-card-content, a, button")) {
        return;
      }

      // If we're here, it's a valid interaction with the card body.
      e.preventDefault(); // Prevent default browser drag behavior.

      interaction.isInteracting = true;
      interaction.startX = e.pageX || e.touches?.[0].pageX;
      interaction.currentX = 0;

      currentCardElement = container.querySelector(
        '.ytf-study-card[style*="opacity: 1"]'
      );
      if (currentCardElement) {
        currentCardElement.classList.add("dragging");
      }

      // Add listeners to the document to track movement anywhere on the page.
      document.addEventListener("mousemove", handleInteractionMove);
      document.addEventListener("touchmove", handleInteractionMove);
      document.addEventListener("mouseup", handleInteractionEnd);
      document.addEventListener("touchend", handleInteractionEnd);
    };

    const handleInteractionMove = (e) => {
      if (!interaction.isInteracting || !currentCardElement) return;

      const x = e.pageX || e.touches?.[0].pageX;
      interaction.currentX = x - interaction.startX;

      // Apply visual transform directly for performance.
      currentCardElement.style.transition = "none";
      currentCardElement.style.transform = `translateX(${
        interaction.currentX
      }px) rotate(${interaction.currentX / 20}deg)`;
    };

    const handleInteractionEnd = () => {
      if (!interaction.isInteracting) return;

      // Clean up the global listeners IMMEDIATELY.
      document.removeEventListener("mousemove", handleInteractionMove);
      document.removeEventListener("touchmove", handleInteractionMove);
      document.removeEventListener("mouseup", handleInteractionEnd);
      document.removeEventListener("touchend", handleInteractionEnd);

      const dragDistance = Math.abs(interaction.currentX);
      const swipeThreshold = 80;
      const clickThreshold = 5;

      // --- DECIDE THE INTENT ---
      if (dragDistance > swipeThreshold) {
        // It was a SWIPE.
        if (interaction.currentX < 0) {
          setCurrentCardIndex((prev) => Math.min(prev + 1, cards.length - 1));
        } else {
          setCurrentCardIndex((prev) => Math.max(prev - 1, 0));
        }
      } else if (dragDistance < clickThreshold) {
        // It was a CLICK.
        setIsFlipped((prev) => !prev);
      }
      // If it was a short drag (between the thresholds), we do nothing.

      // Reset styles and state.
      if (currentCardElement) {
        currentCardElement.classList.remove("dragging");
        currentCardElement.style.transition = "";
        currentCardElement.style.transform = "";
      }
      interaction.isInteracting = false;
    };

    // Attach the starting listener.
    container.addEventListener("mousedown", handleInteractionStart);
    container.addEventListener("touchstart", handleInteractionStart, {
      passive: true,
    });

    // Cleanup function to remove all listeners when the component unmounts.
    return () => {
      container.removeEventListener("mousedown", handleInteractionStart);
      container.removeEventListener("touchstart", handleInteractionStart);
      document.removeEventListener("mousemove", handleInteractionMove);
      document.removeEventListener("touchmove", handleInteractionMove);
      document.removeEventListener("mouseup", handleInteractionEnd);
      document.removeEventListener("touchend", handleInteractionEnd);
    };
  }, [cards, setCurrentCardIndex]);

  // Reset flip state when the card changes
  useEffect(() => {
    setIsFlipped(false);
  }, [currentCardIndex]);

  const cardStyle = useMemo(() => {
    const themeId = currentDeckData?.deckTheme;
    const theme = themeOptions.find((t) => t.id === themeId);

    if (!theme) {
      // Return a default style if no theme is found
      return { backgroundColor: "#FFFFFF", color: "#111827" };
    }

    if (theme.type === "solid") {
      return { backgroundColor: theme.colors[0], color: theme.colors[1] };
    } else if (theme.type === "gradient") {
      return {
        background: `linear-gradient(45deg, ${theme.colors[0]}, ${theme.colors[1]})`,
        color: theme.textColor,
      };
    } else if (theme.type === "icon") {
      return { backgroundColor: theme.colors[0], color: "#111827" };
    } else if (theme.type === "pattern") {
      return {
        background: `linear-gradient(45deg, ${theme.colors[0]}, ${theme.colors[1]})`,
        color: theme.textColor,
      };
    }

    // Fallback default style
    return { backgroundColor: "#FFFFFF", color: theme.textColor };
  }, [currentDeckData?.deckTheme]);

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

  const toggleFocusMode = () => {
    setIsInFocusMode((prev) => !prev);
  };
  return (
    <div id="ytf-results-state">
      {!isInFocusMode && (
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
      )}

      <div
        id="ytf-card-deck-container"
        ref={containerRef}
        className={isInFocusMode ? "is-focused" : ""}
      >
        {cards?.map((card, index) => (
          <StudyCard
            key={index}
            cardData={card}
            isCurrent={index === currentCardIndex}
            isNext={index === currentCardIndex + 1}
            isPrev={index === currentCardIndex - 1}
            isFlipped={index === currentCardIndex && isFlipped}
            cardStyle={cardStyle}
            isInFocusMode={isInFocusMode}
            toggleFocusMode={toggleFocusMode}
          />
        ))}
      </div>
      {!isInFocusMode && (
        <>
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
              onClick={() => setIsFlipped((prev) => !prev)}
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
        </>
      )}
    </div>
  );
}

export default ResultsView;
