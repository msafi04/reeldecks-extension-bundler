import React, { useState, useEffect } from "react";

import GenerationForm from "./GenerationForm";
import ResultsView from "./ResultsView";
import AddCardView from "./AddCardView";

import { logger, formatDate, redirectToWebApp } from "../utils/extension";
import { contentTypeLabels } from "../utils/options";

function Sidebar({
  isProUser,
  currentView,
  setCurrentView,
  videoMetadata,
  setVideoMetadata,
  onClose,
  isUserLoggedIn,
  isNotionConnected,
  existingDecks,
  setExistingDecks,
  onLogout,
}) {
  const [flashcardData, setFlashcardData] = useState([]);
  const [isAiDeck, setIsAiDeck] = useState(false);
  const [currentDeckData, setCurrentDeckData] = useState(null);

  const [cardInsertionIndex, setCardInsertionIndex] = useState(0);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  const [isContinuousAddMode, setIsContinuousAddMode] = useState(false);

  // Reset index when decks change
  useEffect(() => {
    setCurrentCardIndex(0);
  }, [flashcardData]);

  const handleGenerate = (payload) => {
    logger.log("Starting generation with payload:");
    setCurrentView("loading"); // Show spinner while generating

    chrome.runtime
      .sendMessage({ action: "generateFlashcards", payload: payload })
      .then((response) => {
        if (response.error) {
          throw new Error(response.error);
        }
        if (response.deck && response.deck.cards?.length > 0) {
          logger.log("Generation successful, received cards");
          setFlashcardData(response.deck.cards);
          setIsAiDeck(true);
          if (response.isAnonymousUser && !isUserLoggedIn) {
            chrome.storage.local.set({ hasUsedFreebie: true });
            logger.log("First free generation used. Flag set.");
          }
          setCurrentView("results");
        } else {
          // Handle the case where no cards were generated
          throw new Error(
            "The AI could not generate flashcards for this selection. Please try again."
          );
        }
      })
      .catch((err) => {
        logger.error("Flashcard generation failed:", err);
        alert(`Error: ${err.message}`);
        setCurrentView("initial");
      });
  };

  const showDeckSelectionView = async () => {
    logger.log("Navigating to Deck Selection, fetching fresh list...");
    setCurrentView("loading");
    try {
      const videoId = new URLSearchParams(window.location.search).get("v");
      const deckResponse = await chrome.runtime.sendMessage({
        action: "checkDeckExists",
        videoId: videoId,
      });
      if (deckResponse.error) throw new Error(deckResponse.error);

      const decks = deckResponse?.decks || [];
      setExistingDecks(decks);

      if (decks.length > 0) {
        setCurrentView("deckSelection");
      } else {
        // If user created a deck and then deleted it, they should see the choice screen again.
        setCurrentView("initialChoice");
      }
    } catch (err) {
      logger.error("Failed to fetch deck list:", err);
      // Fallback to the choice screen on error
      setCurrentView("initialChoice");
    }
  };

  const handleBackToInitial = () => {
    if (!isUserLoggedIn) {
      logger.log("Anonymous user going back. Switching to signup view.");
      setCurrentView("signup");
    } else {
      showDeckSelectionView();
    }
  };

  const handleRegenerate = () => {
    logger.log("Regenerating... going back to initial form.");
    navigateToGenerationForm();
  };

  const handleLoadDeck = async (deckId) => {
    logger.log(`Loading deck with ID: ${deckId}`);
    setCurrentView("loading");
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getDeckById",
        deckId: deckId,
      });

      if (response.error) throw new Error(response.error);

      logger.log("Full deck data received");
      setCurrentDeckData(response);
      setFlashcardData(response.cards);
      // Determine if we should show the regenerate button
      setIsAiDeck(response.generatedFrom !== "manual");
      setCurrentView("results");
    } catch (err) {
      logger.error("Failed to load deck:", err);
      alert(`Error: ${err.message}`);
      setCurrentView("deckSelection"); // Go back to list on error
    }
  };

  const handleGoToGenerate = async () => {
    // In the logged-in flow, we haven't fetched it yet.
    setCurrentDeckData(null);
    navigateToGenerationForm();
  };

  const handleManualCreate = async () => {
    logger.log("Starting manual deck creation flow...");
    setCurrentView("loading");
    try {
      const videoId = new URLSearchParams(window.location.search).get("v");
      const videoTitle =
        document.querySelector("h1.ytd-watch-metadata")?.textContent.trim() ||
        "";

      const newDeck = await chrome.runtime.sendMessage({
        action: "createManualDeck",
        videoId: videoId,
        videoTitle: videoTitle,
        requestFrom: "extension",
      });
      if (newDeck.error) throw new Error(newDeck.error);

      logger.log("Manual deck created:", newDeck);
      setCurrentDeckData(newDeck);
      setFlashcardData([]);
      setIsContinuousAddMode(true);
      setCurrentView("addCard");
    } catch (err) {
      logger.error("Failed to create manual deck:", err);
      alert(`Could not create a new deck: ${err.message}`);
      setCurrentView("initialChoice"); // Go back on error
    }
  };

  const handleAddCustomCard = async (currentIndex) => {
    const insertionIndex = currentIndex + 1;
    logger.log(
      `Navigating to Add Card view. Will insert at index: ${insertionIndex}`
    );
    setCardInsertionIndex(insertionIndex);
    setIsContinuousAddMode(false);
    setCurrentView("addCard");
  };

  const handleSaveNewCard = async (newCard) => {
    logger.log("Saving new card.");

    const insertionIndex = isContinuousAddMode
      ? flashcardData.length
      : cardInsertionIndex;

    const payload = {
      newCard: newCard,
      index: insertionIndex,
      deckId: currentDeckData._id,
    };

    logger.log(payload);

    try {
      const response = await chrome.runtime.sendMessage({
        action: "addCardToDeck",
        payload: payload,
      });

      if (response.error) throw new Error(response.error);

      logger.log("Card saved successfully, new deck received:", response);
      setFlashcardData(response.cards);
      setCurrentDeckData((prev) => ({ ...prev, cards: response.cards }));

      // If NOT in continuous mode, navigate back to results
      if (!isContinuousAddMode) {
        setCurrentCardIndex(insertionIndex);
        setCurrentView("results");
      }

      return true;
    } catch (err) {
      logger.error("Failed to save card:", err);
      alert(`Error saving card: ${err.message}`);
      return false;
    }
  };

  const navigateToGenerationForm = async () => {
    if (!videoMetadata) {
      logger.log(
        "Metadata not present, fetching before showing generation form..."
      );
      setCurrentView("loading");
      try {
        const videoId = new URLSearchParams(window.location.search).get("v");
        const metaResponse = await chrome.runtime.sendMessage({
          action: "getVideoMetadata",
          videoId: videoId,
        });
        if (metaResponse.error) throw new Error(metaResponse.error);

        setVideoMetadata(metaResponse);
      } catch (err) {
        logger.error("Failed to fetch metadata for generation:", err);
        alert("Could not load video data. Please try again.");
        setCurrentView(
          existingDecks.length > 0 ? "deckSelection" : "initialChoice"
        );
        return;
      }
    }
    setCurrentView("initial");
  };

  const renderContent = () => {
    switch (currentView) {
      case "loading":
        return (
          <div id="ytf-loading-state">
            <div className="ytf-loader"></div>
            <p id="ytf-loading-text" className="ytf-loading-text">
              Loading...
            </p>
          </div>
        );
      case "initial":
        return videoMetadata ? (
          <GenerationForm
            videoMetadata={videoMetadata}
            onGenerate={handleGenerate}
            isUserLoggedIn={isUserLoggedIn}
            onBack={handleBackToInitial}
            existingDeckId={currentDeckData ? currentDeckData._id : null}
          />
        ) : (
          <div id="ytf-loading-state">
            <div className="ytf-loader"></div>
            <p className="ytf-loading-text">Fetching video details...</p>
          </div>
        );
      case "initialChoice":
        return (
          <div id="ytf-initial-choice-state">
            <h3>How would you like to start?</h3>
            <div class="ytf-choice-container">
              <button
                id="ytf-generate-ai-btn"
                class="ytf-choice-btn"
                onClick={handleGoToGenerate}
              >
                ✨<span>Generate with AI</span>
                <small>Let our AI create a deck for you.</small>
              </button>
              <button
                id="ytf-create-manual-btn"
                class="ytf-choice-btn"
                onClick={handleManualCreate}
              >
                ✍️
                <span>Create My Own Deck</span>
                <small>Start with a blank deck and add your own notes.</small>
              </button>
            </div>
          </div>
        );
      case "deckSelection":
        return (
          <div id="ytf-deck-selection-state">
            <h4>You have existing decks for this video.</h4>
            <div id="ytf-deck-list" class="ytf-deck-list-container">
              {existingDecks?.map((deck) => {
                const friendlyLabel =
                  contentTypeLabels[deck.cardType] ||
                  deck.cardType ||
                  contentTypeLabels.default;
                return (
                  <button
                    key={deck._id}
                    className="ytf-deck-item"
                    onClick={() => handleLoadDeck(deck._id)}
                  >
                    <div className="ytf-deck-item-main">
                      <span className="ytf-deck-item-title">
                        {friendlyLabel || "Manual Deck"}
                      </span>
                      <span className="ytf-deck-item-date">
                        Created on {formatDate(deck.createdAt)}
                      </span>
                    </div>
                    <span className="ytf-deck-item-info">
                      {deck.quantity} cards
                    </span>
                  </button>
                );
              })}
            </div>

            <div class="ytf-deck-selection-actions">
              <button
                id="ytf-deck-selection-create-manual"
                class="ytf-secondary-action-btn"
                onClick={handleManualCreate}
              >
                ✍️ Create My Own
              </button>
              <button
                id="ytf-deck-selection-generate-ai"
                class="ytf-primary-action-btn"
                onClick={handleGoToGenerate}
              >
                ✨ Generate with AI
              </button>
            </div>
          </div>
        );
      case "results":
        return (
          <ResultsView
            isProUser={isProUser}
            cards={flashcardData}
            onBack={handleBackToInitial}
            onRegenerate={isUserLoggedIn && isAiDeck ? handleRegenerate : null}
            onAddCard={isUserLoggedIn ? handleAddCustomCard : null}
            isUserLoggedIn={isUserLoggedIn}
            isNotionConnected={isNotionConnected}
            currentCardIndex={currentCardIndex}
            setCurrentCardIndex={setCurrentCardIndex}
            currentDeckData={currentDeckData}
          />
        );
      case "addCard":
        return (
          <AddCardView
            onCardSave={handleSaveNewCard}
            onCancel={() => setCurrentView("results")}
            isContinuousMode={isContinuousAddMode}
          />
        );
      case "signup":
        return (
          <div id="ytf-signup-state">
            <div className="ytf-signup-content">
              <img
                id="ytf-signup-logo"
                src={chrome.runtime.getURL("icons/icon128.png")}
                alt="ReelDecks Logo"
                className="ytf-signup-logo"
              />
              <h3>🚀 Your First Deck Was Created!</h3>
              <p>Sign up for a free account to:</p>
              <ul>
                <li>
                  ✅ Get <strong>20 Credits</strong> per month
                </li>
                <li>
                  ✅ Process upto <strong>10 mins</strong> of video/deck
                </li>
                <li>✅ Access to standard card types</li>
                <li>✅ Create upto 3 own decks</li>
                <li>✅ Interactive flashcard viewer</li>
              </ul>
              <button
                id="ytf-signup-btn"
                className="ytf-primary-action-btn"
                onClick={() => redirectToWebApp({ isRegister: true })}
              >
                <span>Sign Up for Free</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </button>
              <div className="ytf-login-prompt">
                <span>Already have an account?</span>
                <button
                  id="ytf-login-link-btn"
                  className="ytf-text-link-btn"
                  onClick={() => redirectToWebApp({ isLogin: true })}
                >
                  <span>Log In</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      case "login":
        return (
          <div id="ytf-login-state">
            <div className="ytf-signup-content">
              {" "}
              {/* Re-using the same nice styling */}
              <img
                id="ytf-login-logo"
                src={chrome.runtime.getURL("icons/icon128.png")}
                alt="ReelDecks Logo"
                className="ytf-signup-logo"
              />
              <h3>Welcome Back!</h3>
              <p>Log in to access your decks.</p>
              <button
                id="ytf-login-btn"
                className="ytf-primary-action-btn"
                onClick={() => redirectToWebApp({ isLogin: true })}
              >
                <span>Log In to Your Account</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </button>
              <div className="ytf-login-prompt">
                <span>Don't have an account?</span>
                <button
                  id="ytf-signup-link-btn"
                  className="ytf-text-link-btn"
                  onClick={() => redirectToWebApp({ isRegister: true })}
                >
                  <span>Sign Up</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      case "error":
        return <div>Error loading data. Please try again.</div>;

      default:
        return <div>Welcome!</div>;
    }
  };
  return (
    <div id="yt-flashcards-sidebar" className="ytf-sidebar-open">
      <div className="ytf-sidebar-header">
        {/* <h3 id="ytf-app-title">✨ ReelDecks</h3> */}
        <h3 id="ytf-app-title" className="ytf-app-title-container">
          <img
            id="ytf-header-logo"
            src={chrome.runtime.getURL("icons/icon32.png")}
            alt="ReelDecks Logo"
          />
          <span>ReelDecks</span>
        </h3>
        <div className="ytf-header-spacer"></div>
        {/* Logout Button (shown when logged in, hidden by default) */}
        {isUserLoggedIn && (
          <button
            id="ytf-logout-btn"
            className="ytf-header-icon-btn"
            title="Logout"
            onClick={onLogout}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        )}
        <button
          className="ytf-close-btn ytf-header-icon-btn"
          title="Close"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className="ytf-sidebar-content">{renderContent()}</div>
    </div>
  );
}

export default Sidebar;
