import React, { useState, useEffect } from "react";

import Sidebar from "./sidebar/Sidebar";
import { logger, parseJwtPayload } from "./utils/extension";

import { NotificationProvider } from "./context/NotificationContext";

// https://github.com/msafi04/reeldecks-extension-bundler.git

function App() {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const [currentView, setCurrentView] = useState("loading"); // 'loading', 'initial', 'results', etc.
  const [videoMetadata, setVideoMetadata] = useState(null);

  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [existingDecks, setExistingDecks] = useState([]);

  const [hasInitialized, setHasInitialized] = useState(false);
  const [isProUser, setIsProUser] = useState(false);
  const [isNotionConnected, setIsNotionConnected] = useState(false);

  const [loadingContext, setLoadingContext] = useState("initial"); // 'initial', 'decks', 'cards', 'form

  const closeAndResetSidebar = () => {
    logger.log("Closing sidebar and resetting all state.");
    setIsSidebarVisible(false);
    setHasInitialized(false);
    setVideoMetadata(null);
    setExistingDecks([]);
    setCurrentView("loading");
  };

  // useEffect(() => {
  //   // Process any queued messages from before React mounted
  //   if (window.__reeldecksToggleQueue?.length) {
  //     window.__reeldecksToggleQueue.forEach((msg) => {
  //       // Handle the toggle
  //       setIsSidebarVisible((prevIsVisible) => {
  //         if (prevIsVisible === true) {
  //           closeAndResetSidebar();
  //           return false;
  //         } else {
  //           return true;
  //         }
  //       });
  //     });
  //     window.__reeldecksToggleQueue = [];
  //   }

  //   // Set up listener for future messages
  //   const messageListener = (request, sender, sendResponse) => {
  //     if (request.action === "toggle_sidebar") {
  //       setIsSidebarVisible((prevIsVisible) => {
  //         // If we are about to CLOSE the sidebar, reset the initialized flag
  //         if (prevIsVisible === true) {
  //           closeAndResetSidebar();
  //           return false;
  //         } else {
  //           return true;
  //         }
  //       });
  //       sendResponse({ status: "toggled" });
  //     }
  //     return true;
  //   };

  //   chrome.runtime.onMessage.addListener(messageListener);
  //   return () => chrome.runtime.onMessage.removeListener(messageListener);
  // }, [closeAndResetSidebar]);

  // ---  Effect to listen for external state changes ---
  useEffect(() => {
    const statusChangeListener = (request, sender, sendResponse) => {
      // Listen for the specific message from the background script
      if (request.action === "userStatusChanged") {
        logger.log(
          "User status changed externally (e.g., login/logout from web app). Triggering re-initialization."
        );

        // --- THE KEY ---
        // We simply reset the 'hasInitialized' flag.
        // This will cause the main data-loading useEffect to run again on the next render.
        setHasInitialized(false);

        // Acknowledge the message
        sendResponse({ status: "acknowledged" });
      }
    };

    chrome.runtime.onMessage.addListener(statusChangeListener);

    return () => {
      chrome.runtime.onMessage.removeListener(statusChangeListener);
    };
  }, []);

  useEffect(() => {
    // Only run this logic when the sidebar becomes visible
    if (!isSidebarVisible || hasInitialized) return;
    const initialize = async () => {
      try {
        setCurrentView("loading");
        const videoId = new URLSearchParams(window.location.search).get("v");

        // 1. ALWAYS check auth status first
        const { authToken, hasUsedFreebie, isRegisteredUser } =
          await chrome.storage.local.get([
            "authToken",
            "hasUsedFreebie",
            "isRegisteredUser",
          ]);
        const loggedIn = !!authToken;
        setIsUserLoggedIn(loggedIn);
        setHasInitialized(true);
        logger.log("User is logged in:", loggedIn);

        // 2. ROUTE based on auth status
        if (loggedIn && authToken) {
          const payload = parseJwtPayload(authToken);
          setIsProUser(
            payload?.user?.subscriptionStatus === "active" ? true : false
          );
          setIsNotionConnected(payload?.user?.isNotionConnected || false);
          logger.log(`User is Pro: ${isProUser}`);

          // --- LOGGED-IN USER FLOW ---
          setLoadingContext("decks");
          setCurrentView("loading");

          logger.log("Checking for existing decks...");
          const deckResponse = await chrome.runtime.sendMessage({
            action: "checkDeckExists",
            videoId: videoId,
          });

          if (deckResponse.error) throw new Error(deckResponse.error);

          const decks = deckResponse?.decks || [];
          setExistingDecks(decks);
          if (decks.length > 0) {
            // If decks exist, show the selection list.
            // We'll build this view next. For now, let's log it.
            logger.log("Decks found, switching to deck selection view.");
            setCurrentView("deckSelection");
          } else {
            // If no decks, show the choice to generate or create manually.
            logger.log("No decks found, showing initial choice view.");
            setCurrentView("initialChoice");
          }
        } else {
          setIsProUser(false);
          // --- ANONYMOUS USER FLOW ---
          logger.log(
            "User is not logged in. Determining anonymous user state..."
          );

          if (!authToken && isRegisteredUser && hasUsedFreebie) {
            // CASE 1: Registered user who is logged out.
            logger.log(
              "State: Registered but logged out. Showing login prompt."
            );
            setCurrentView("login");
          } else if (!authToken && !isRegisteredUser && hasUsedFreebie) {
            // CASE 2: Anonymous user who has used their one freebie.
            logger.log("State: Anonymous freebie used. Showing signup wall.");
            setCurrentView("signup"); // <-- Route to the existing signup view
          } else {
            // CASE 3: True anonymous user (first time) or registered user who hasn't used a freebie yet.
            logger.log(
              "State: New anonymous user. Fetching metadata for generation."
            );
            setLoadingContext("metadata");
            setCurrentView("loading");
            const metaResponse = await chrome.runtime.sendMessage({
              action: "getVideoMetadata",
              videoId: videoId,
            });
            if (metaResponse.error) throw new Error(metaResponse.error);

            setVideoMetadata(metaResponse);
            setCurrentView("initial");
          }
        }
      } catch (err) {
        logger.error("Initialization failed:", err);
        setCurrentView("error");
        setHasInitialized(false);
      }
    };

    initialize();
  }, [isSidebarVisible, hasInitialized]);

  // Listens for messages from the background script (runs only once)
  useEffect(() => {
    const messageListener = (request, sender, sendResponse) => {
      if (request.action === "toggle_sidebar") {
        // setIsSidebarVisible((prev) => !prev);
        setIsSidebarVisible((prevIsVisible) => {
          // If we are about to CLOSE the sidebar, reset the initialized flag
          if (prevIsVisible === true) {
            closeAndResetSidebar();
            return false;
          } else {
            return true;
          }
        });
        sendResponse({ status: "toggled" });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [closeAndResetSidebar]);

  // Sends a status update TO the background script whenever visibility changes.
  useEffect(() => {
    console.log(
      `Sidebar visibility changed to: ${isSidebarVisible}. Sending update.`
    );

    chrome.runtime.sendMessage({
      action: "sidebar_status",
      status: isSidebarVisible ? "opened" : "closed",
    });
  }, [isSidebarVisible]);

  // OBSERVER EFFECT
  useEffect(() => {
    let currentHref = document.location.href;

    const observer = new MutationObserver(() => {
      if (currentHref !== document.location.href) {
        logger.log(
          "URL has changed. Old:",
          currentHref,
          "New:",
          document.location.href
        );
        closeAndResetSidebar();
        currentHref = document.location.href;
      }
    });

    // Start observing the body for any changes in its children
    observer.observe(document.body, { childList: true, subtree: true });

    // Cleanup function to disconnect the observer when the component unmounts
    return () => observer.disconnect();
  }, []);

  // --- Effect to listen for post-auth completion signals NOTION_AUTH_COMPLETE from web-app via background.js---
  useEffect(() => {
    const postAuthListener = (request, sender, sendResponse) => {
      if (request.type === "NOTION_AUTH_COMPLETE") {
        logger.log(
          "Notion auth complete signal received. Triggering token refresh."
        );
        handleSessionRefresh();
        sendResponse({ status: "acknowledged" });
      }
    };

    chrome.runtime.onMessage.addListener(postAuthListener);
    return () => chrome.runtime.onMessage.removeListener(postAuthListener);
  }, []);

  const handleLogout = () => {
    logger.log("User logging out...");
    // 1. Clear the tokens from Chrome storage
    chrome.storage.local.remove(["authToken", "refreshToken"], () => {
      // 2. Update the application's internal state
      setIsUserLoggedIn(false);
      setCurrentView("login");

      // 3. Reset the view to the anonymous user flow
      // We can re-use our "initialization" logic, but force it for anonymous users
      setHasInitialized(false); // This will cause the main useEffect to re-run
    });
  };

  const handleSessionRefresh = async () => {
    logger.log("Attempting session refresh...");
    try {
      const response = await chrome.runtime.sendMessage({
        action: "refreshAuthToken",
      });
      if (response.error)
        throw new Error(`Failed to refresh session: ${response.error}`);

      const { authToken } = await chrome.storage.local.get("authToken");

      const payload = parseJwtPayload(authToken);
      // --- UPDATE STATE WITH FRESH DATA ---
      if (payload) {
        setIsUserLoggedIn(true);
        setIsProUser(payload?.user?.subscriptionStatus === "active");
        setIsNotionConnected(payload?.user?.isNotionConnected || false);
        logger.log(
          "Session refreshed. isNotionConnected:",
          payload?.user?.isNotionConnected
        );

        // --- CHECK FOR PENDING ACTION Anki export after Notion OAuth ---
        const { postAuthAction } = await chrome.storage.local.get(
          "postAuthAction"
        );
        if (
          postAuthAction?.type === "EXPORT_NOTION" &&
          postAuthAction?.deckId &&
          payload?.user?.isNotionConnected
        ) {
          logger.log("Pending Notion export found. Executing now.");
          // We can directly call the background script from here.
          alert(
            "Notion connected! We'll now complete your export automatically."
          );

          alert(
            "Notion connected! We'll now complete your export automatically."
          );

          await chrome.runtime.sendMessage({
            action: "exportDeckToNotion",
            deckId: postAuthAction?.deckId,
          });
          // CRITICAL: Clean up the action so it doesn't run again.
          await chrome.storage.local.remove("postAuthAction");
        }
      }
    } catch (err) {
      logger.error("Surgical session refresh failed:", err);
      // Fallback to the full re-init if the surgical approach fails
      setHasInitialized(false);
    }
  };

  const handleRetry = () => {
    setHasInitialized(false);
  };

  return (
    <NotificationProvider>
      {isSidebarVisible ? (
        <Sidebar
          isProUser={isProUser}
          currentView={currentView}
          setCurrentView={setCurrentView}
          videoMetadata={videoMetadata}
          setVideoMetadata={setVideoMetadata}
          isUserLoggedIn={isUserLoggedIn}
          isNotionConnected={isNotionConnected}
          existingDecks={existingDecks}
          setExistingDecks={setExistingDecks}
          onClose={closeAndResetSidebar}
          onLogout={handleLogout}
          onRetry={handleRetry}
          loadingContext={loadingContext}
          setLoadingContext={setLoadingContext}
        />
      ) : null}
    </NotificationProvider>
  );
}

export default App;
