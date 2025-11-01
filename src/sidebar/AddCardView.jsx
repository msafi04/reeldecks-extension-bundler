import React, { useState, useEffect, useRef } from "react";

import { logger } from "../utils/extension";
import { useNotifier } from "../context/NotificationContext";

// Helper to get video time
const getCurrentVideoTime = () => {
  const player = document.querySelector(".html5-main-video");
  return player ? Math.floor(player.currentTime) : 0;
};

// Helper to format time
const formatTimeForDisplay = (totalSeconds) => {
  if (totalSeconds < 0 || isNaN(totalSeconds)) totalSeconds = 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

function AddCardView({
  onCardSave,
  onCancel,
  isContinuousMode,
  currentDeckId,
}) {
  const notify = useNotifier();

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [timestamp, setTimestamp] = useState(0);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState(null);

  const [saveState, setSaveState] = useState("idle"); // 'idle', 'saving', 'saved'
  const [recentlyAdded, setRecentlyAdded] = useState([]);

  const [isAskingAI, setIsAskingAI] = useState(false);

  const intervalRef = useRef(null);

  // Live timestamp capture
  useEffect(() => {
    const player = document.querySelector(".html5-main-video");
    if (!player) return;

    // Function to start updating the timestamp
    const startTimestampUpdater = () => {
      stopTimestampUpdater(); // Ensure no multiple intervals are running
      intervalRef.current = setInterval(() => {
        setTimestamp(getCurrentVideoTime());
      }, 1000); // Update every second
    };

    // Function to stop the interval
    const stopTimestampUpdater = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Set initial timestamp
    setTimestamp(getCurrentVideoTime());

    // Add listeners to the video player
    player.addEventListener("play", startTimestampUpdater);
    player.addEventListener("pause", stopTimestampUpdater);

    // If video is already playing when component mounts, start the updater
    if (!player.paused) {
      startTimestampUpdater();
    }

    // --- Cleanup Function ---
    // This is crucial. It runs when the component is unmounted (e.g., user clicks Cancel/Save).
    return () => {
      stopTimestampUpdater(); // Stop the interval
      if (player) {
        // Remove the listeners to prevent memory leaks
        player.removeEventListener("play", startTimestampUpdater);
        player.removeEventListener("pause", stopTimestampUpdater);
      }
    };
  }, []);

  const handleSave = async () => {
    if (!front.trim() && !back.trim()) {
      alert("At least one field is required.");
      return;
    }
    setSaveState("saving");

    const newCard = {
      front,
      back,
      timestamp,
      isUserGenerated: true,
      screenShotUrl: screenshotDataUrl,
    };
    try {
      // onCardSave is now an async function that returns the result
      const success = await onCardSave(newCard);
      if (success) {
        setSaveState("saved");

        // If in continuous mode, update the "recently added" list
        if (isContinuousMode) {
          setRecentlyAdded((prev) => [newCard.front, ...prev].slice(0, 5)); // Add to top, limit to 5
          // Clear the form for the next card
          setFront("");
          setBack("");
          setScreenshotDataUrl(null);
        }
      } else {
        // Handle case where parent function returns false (error)
        setSaveState("idle");
      }
    } catch (error) {
      // This is for unexpected errors
      setSaveState("idle");
    }

    // Reset button text after a moment
    setTimeout(() => setSaveState("idle"), 1500);
  };

  const handleCaptureScreenshot = () => {
    const video = document.querySelector(".html5-main-video");
    if (!video || video.readyState < 2) {
      logger.error("Video element not found or not ready for capture.");
      alert("Video is not ready to capture a screenshot.");
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      const aspectRatio = video.videoHeight / video.videoWidth;
      const maxWidth = 480;

      canvas.width = Math.min(video.videoWidth, maxWidth);
      canvas.height = canvas.width * aspectRatio;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setScreenshotDataUrl(dataUrl);
    } catch (error) {
      logger.error("Error capturing screenshot (CORS or other issue):", error);
      alert("Could not capture screenshot. The video may be protected.");
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshotDataUrl(null);
  };

  const handleAskAiForAnswer = async () => {
    const minLength = 10;
    const frontText = front.trim();

    if (frontText.length === 0) {
      notify.error("Please enter a question in the 'Front' field first.");
      return;
    }

    if (frontText.length < minLength) {
      notify.error(
        `Please enter a more specific question (at least ${minLength} characters).`
      );
      return;
    }

    setIsAskingAI(true);
    notify.info("Asking AI for an answer...", 1000);

    try {
      const videoId = new URLSearchParams(window.location.search).get("v");

      const payload = {
        deckId: currentDeckId,
        videoId: videoId,
        timestamp: timestamp,
        cardFront: frontText,
      };

      // We'll add the background script handler in the next step.
      // For now, let's mock the response.
      logger.log("Sending AI Assist payload:", payload);
      // const response = await chrome.runtime.sendMessage({ action: "aiAssistAnswer", payload });

      // MOCK RESPONSE FOR TESTING:
      await new Promise((res) => setTimeout(res, 2000)); // Simulate network delay
      const response = {
        isRelevant: false,
        suggestedBack: "The AI-generated answer text.",
      };
      // END MOCK

      if (response.error) throw new Error(response.error);

      if (response.isRelevant) {
        setBack(response.suggestedBack);
        notify.success("AI answer generated!");
      } else {
        setBack("");
        // Show a different, more informative notification.
        notify.info("The AI couldn't find a direct answer in the video.", 4000); // Show for 4s
      }
    } catch (err) {
      logger.error("AI Assist failed:", err);
      notify.error(err.message || "An unknown error occurred.");
    } finally {
      setIsAskingAI(false);
    }
  };

  const getButtonText = () => {
    if (saveState === "saving") return "Saving...";
    if (saveState === "saved") return "Saved ✓";
    return "Save Card";
  };

  return (
    <div id="ytf-add-card-state">
      <h4>Add a Custom Card</h4>
      <div className="ytf-add-card-scroll-area">
        <div className="ytf-form-group">
          <label htmlFor="ytf-custom-card-front">Front</label>
          <textarea
            id="ytf-custom-card-front"
            rows="5"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Enter question..."
          ></textarea>
        </div>
        <div className="ytf-form-group">
          <label htmlFor="ytf-custom-card-back">Back / Note</label>
          {/*<div className="ytf-form-label-group">
            <label htmlFor="ytf-custom-card-back">Back / Note</label>
            <button
              className="ytf-ai-assist-btn"
              onClick={handleAskAiForAnswer}
              disabled={!front.trim() || isAskingAI}
              title="Generate answer with AI"
            >
              {isAskingAI ? (
                <div className="ytf-small-spinner"></div>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="#FF0000"
                      d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25z"
                    />
                    <path
                      fill="#FF0000"
                      d="M19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25z"
                    />
                    <path
                      fill="#FF0000"
                      d="M11.5 9.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12z"
                    />
                  </svg>
                  <span>Ask AI</span>
                </>
              )}
            </button>
          </div> */}
          <textarea
            id="ytf-custom-card-back"
            rows="5"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Enter answer'..."
          ></textarea>
        </div>
        <div className="ytf-form-group">
          <label>Timestamp (auto-captured)</label>
          <input
            type="text"
            id="ytf-custom-card-timestamp"
            readOnly
            value={formatTimeForDisplay(timestamp)}
          />
        </div>
        {/* --- ADD SCREENSHOT UI --- */}
        <div className="ytf-form-group">
          <label>Screenshot</label>
          {screenshotDataUrl ? (
            <div
              id="ytf-screenshot-preview-container"
              className="ytf-screenshot-preview"
            >
              <div className="ytf-screenshot-img-wrapper">
                <img
                  id="ytf-screenshot-preview-img"
                  src={screenshotDataUrl}
                  alt="Screenshot Preview"
                />
                <div className="ytf-screenshot-actions">
                  <button
                    id="ytf-recapture-btn"
                    className="ytf-icon-btn ytf-screenshot-btn"
                    title="Recapture"
                    onClick={handleCaptureScreenshot}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                  </button>
                  <button
                    id="ytf-remove-screenshot-btn"
                    className="ytf-icon-btn ytf-screenshot-btn"
                    title="Remove"
                    onClick={handleRemoveScreenshot}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              id="ytf-screenshot-placeholder"
              className="ytf-screenshot-placeholder"
            >
              <button
                id="ytf-add-screenshot-btn"
                className="ytf-secondary-action-btn"
                onClick={handleCaptureScreenshot}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <span>Add Screenshot</span>
              </button>
            </div>
          )}
        </div>
        {/* Add recentlt added for continuus mode */}
        {isContinuousMode && recentlyAdded?.length > 0 && (
          <div className="ytf-recently-added-container">
            <h5 className="ytf-recently-added-title">Recently Added</h5>
            <div id="ytf-recently-added-list">
              {recentlyAdded?.map((cardFront, index) => (
                <div
                  key={index}
                  className="ytf-recently-added-item"
                  title={cardFront}
                >
                  {cardFront}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="ytf-form-actions">
        <button
          id="ytf-form-secondary-btn"
          className="ytf-secondary-action-btn"
          onClick={onCancel}
        >
          {isContinuousMode ? "Done" : "Cancel"}
        </button>
        <button
          id="ytf-save-card-btn"
          className="ytf-primary-action-btn"
          onClick={handleSave}
          disabled={saveState === "saving" || isAskingAI}
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  );
}

export default AddCardView;
