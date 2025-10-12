const devMode = import.meta.env.VITE_DEV_MODE === "true";
const backendUrl = import.meta.env.VITE_BACKEND_URL;
const LOG_PREFIX = "[ReelDecksBG]";

// Dev Logger
const logger = {
  log: (...args) => devMode && console.log(LOG_PREFIX, ...args),
  warn: (...args) => devMode && console.warn(LOG_PREFIX, ...args),
  error: (...args) => devMode && console.error(LOG_PREFIX, ...args),
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

console.log(
  `Background script loaded. Mode: ${
    devMode ? "Development" : "Production"
  }. API: ${backendUrl}`
);

async function authenticatedFetch(
  endpoint,
  options = {},
  responseType = "json"
) {
  // 1. Get the current tokens from storage
  let { authToken, refreshToken } = await chrome.storage.local.get([
    "authToken",
    "refreshToken",
  ]);

  if (!authToken) {
    throw new Error("Not authenticated. Please log in.");
  }

  // 2. Prepare headers for the initial request
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
    Authorization: `Bearer ${authToken}`,
  };

  // 3. Make the FIRST attempt
  let response = await fetch(`${backendUrl}${endpoint}`, {
    ...options,
    headers,
  });

  // 4. CHECK if the token was expired (401/403 are common for this)
  if (response.status === 401 || response.status === 403) {
    logger.log("Access Token expired or invalid. Attempting to refresh...");

    if (!refreshToken) {
      // If there's no way to refresh, it's a hard logout.
      await chrome.storage.local.clear();
      throw new Error("Your session has expired. Please log in again.");
    }

    // --- AUTOMATIC REFRESH LOGIC ---
    try {
      const refreshResponse = await fetch(
        `${backendUrl}/auth/refresh-extension-token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: refreshToken }),
        }
      );

      if (!refreshResponse.ok) {
        // If the refresh token itself is bad, it's a hard logout.
        throw new Error("Refresh token is invalid or expired.");
      }

      const { accessToken: newAccessToken } = await refreshResponse.json();

      // Update storage with the new access token
      await chrome.storage.local.set({ authToken: newAccessToken });
      logger.log("Token refreshed successfully. Retrying original request...");

      // --- AUTOMATIC RETRY of the ORIGINAL request ---
      headers["Authorization"] = `Bearer ${newAccessToken}`; // Update headers with the new token
      response = await fetch(`${backendUrl}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (refreshError) {
      logger.error("Could not refresh token. Logging out.", refreshError);
      await chrome.storage.local.clear(); // Log the user out completely
      throw new Error("Your session has fully expired. Please log in again.");
    }
  }

  // 5. FINAL CHECK and return
  // This will be for either the original successful response or the retried response
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `API error: ${response.status}`);
  }

  // Use the new `responseType` parameter to decide how to parse the body
  switch (responseType) {
    case "blob":
      const blob = await response.blob();
      return blob;

    case "json":
    default:
      // This is the default behavior, same as before.
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        return data;
      } else {
        // Handle 204 No Content or other non-JSON success responses
        return { success: true, status: response.status };
      }
  }
}
// Function to handle enabling/disabling the extension icon
function updateActionState(tabId, url) {
  if (url && url.includes("youtube.com/watch")) {
    chrome.action.enable(tabId);
  } else {
    chrome.action.disable(tabId);
  }
}

// Add listeners for tab updates and activations
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url) {
    updateActionState(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url) {
      updateActionState(tab.id, tab.url);
    }
  });
});

// Handle the icon click
// chrome.action.onClicked.addListener(async (tab) => {
//   if (tab.url && tab.url.includes("youtube.com/watch")) {
//     logger.log("Icon clicked. Sending toggle command to content script...");

//     chrome.action.setIcon({
//       tabId: tab.id,
//       path: {
//         16: chrome.runtime.getURL("icons/icon16-pending.png"),
//         32: chrome.runtime.getURL("icons/icon32-pending.png"),
//       },
//     });
//     (async () => {
//       try {
//         // The content script is already injected by the manifest.
//         // We just need to send it a message.
//         await chrome.tabs.sendMessage(tab.id, {
//           action: "toggle_sidebar",
//         });
//       } catch (error) {
//         logger.error(
//           "Could not send message to content script. It might not be ready.",
//           error
//         );
//         // Reset the icon on failure
//         await chrome.action.setIcon({
//           tabId: tab.id,
//           path: {
//             16: chrome.runtime.getURL("icons/icon16.png"),
//             32: chrome.runtime.getURL("icons/icon32.png"),
//           },
//         });
//       }
//     })();
//   }
// });
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || !tab.url.includes("youtube.com/watch")) {
    return;
  }

  logger.log("Icon clicked. Attempting to send toggle command...");

  // Set to pending immediately for instant feedback
  await chrome.action.setIcon({
    tabId: tab.id,
    path: {
      16: chrome.runtime.getURL("icons/icon16-pending.png"),
      32: chrome.runtime.getURL("icons/icon32-pending.png"),
    },
  });

  const sendMessageToTab = async (tabId) => {
    return chrome.tabs.sendMessage(tabId, {
      action: "toggle_sidebar",
    });
  };

  try {
    // First attempt
    await sendMessageToTab(tab.id);
    logger.log("Message sent successfully on first try.");
  } catch (error) {
    // This is our race condition!
    if (error.message.includes("Receiving end does not exist")) {
      logger.warn("Content script not ready. Retrying in a moment...");

      // Wait a fraction of a second
      await delay(250);

      try {
        // Second attempt
        await sendMessageToTab(tab.id);
        logger.log("Message sent successfully on second try.");
      } catch (retryError) {
        logger.error(
          "Failed to send message on retry. The content script may have failed to load.",
          retryError
        );
        alert(
          "ReelDecks isn't ready yet. Please wait a moment for the page to finish loading and try again."
        );
        // On failure, reset the icon back to normal
        await chrome.action.setIcon({
          tabId: tab.id,
          path: {
            16: chrome.runtime.getURL("icons/icon16.png"),
            32: chrome.runtime.getURL("icons/icon32.png"),
          },
        });
      }
    } else {
      // Handle other potential errors
      logger.error("An unexpected error occurred when sending message:", error);
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Listen for a confirmation message from the content script
  if (request.action === "sidebar_status") {
    (async () => {
      logger.log("Received sidebar status:", request.status);
      // When the content script confirms it's open or closed,
      // reset the icon back to its normal state.
      if (sender.tab?.id) {
        try {
          await chrome.action.setIcon({
            tabId: sender.tab.id,
            path: {
              16: chrome.runtime.getURL("icons/icon16.png"),
              32: chrome.runtime.getURL("icons/icon32.png"),
            },
          });
          logger.log("Icon reset successfully for tab:", sender.tab.id);
        } catch (error) {
          // This will catch errors if the tab was closed, etc.
          console.error("Failed to set icon:", error);
        }
      }
      return;
    })();
  }
  // Check if the message is the one we're interested in
  if (request.action === "generateFlashcards") {
    logger.log("Background script received 'generateFlashcards' message.");

    // Use an async function to handle the fetch call
    (async () => {
      try {
        const { authToken } = await chrome.storage.local.get("authToken");

        let result;

        if (authToken) {
          result = await authenticatedFetch("/generate/new", {
            method: "POST",
            body: JSON.stringify(request.payload),
          });
        } else {
          logger.log("No auth token found, sending anonymous request.");
          const response = await fetch(`${backendUrl}/generate/new`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(request.payload),
          });

          result = await response.json();

          if (!response.ok) {
            // If server responds with an error, create an error object to send back
            throw new Error(data.message || `Server error: ${response.status}`);
          }
        }

        // Send a success response back to the content script
        sendResponse(result);
      } catch (error) {
        logger.error("Background script fetch error:", error);
        // Send an error response back to the content script
        sendResponse({ error: error.message });
      }
    })();

    // Return true to indicate that we will be sending a response asynchronously.
    // This is CRUCIAL for the message channel to stay open.
    return true;
  } else if (request.action === "getVideoMetadata") {
    logger.log("BG: Received 'getVideoMetadata' for videoId:", request.videoId);

    (async () => {
      try {
        const { authToken } = await chrome.storage.local.get("authToken");

        let data;

        if (authToken) {
          // --- AUTHENTICATED PATH ---
          logger.log(
            "Auth token found, using authenticatedFetch for meta-data."
          );

          // 1. Construct the endpoint, including the optional query parameter
          let endpoint = `/generate/youtube-meta/${request.videoId}`;
          if (request.deckId) {
            endpoint += `?deckId=${request.deckId}`;
            logger.log(`BG: Appending known deckId: ${request.deckId}`);
          }

          // 2. Call the smart wrapper.
          // It automatically handles the auth header, token refresh, and JSON parsing.
          data = await authenticatedFetch(endpoint, { method: "GET" });
        } else {
          // --- ANONYMOUS PATH ---
          // This path does not change, as it doesn't use authentication.
          logger.log(
            "No auth token found, sending anonymous request for meta-data."
          );
          const apiUrl = `${backendUrl}/generate/meta-anonymous/${request.videoId}`;

          const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.message || `Server error: ${response.status}`
            );
          }
          data = await response.json();
        }

        // Send the final, successful data back to the content script
        sendResponse(data);
      } catch (error) {
        logger.error("Background getVideoMetadata error:", error);
        // Send an error response back to the content script
        sendResponse({ error: error.message });
      }
    })();
    return true;
  } else if (request.action === "checkDeckExists") {
    logger.log(
      "Background script received 'checkDeckExists' for videoId:",
      request.videoId
    );

    (async () => {
      try {
        const result = await authenticatedFetch(
          `/decks/check/${request.videoId}`,
          { method: "GET" }
        );

        sendResponse(result);
      } catch (error) {
        logger.error("Background script checkDeckExists error:", error);
        sendResponse({ error: error.message });
      }
    })();

    return true;
  } else if (request.action === "getDeckById") {
    logger.log(
      "Background script received 'getDeckById' for deckId:",
      request.deckId
    );

    (async () => {
      try {
        const result = await authenticatedFetch(
          `/decks/detail/userId/${request.deckId}`,
          { method: "GET" }
        );

        sendResponse(result);
      } catch (error) {
        logger.error("Background script getDeckById error:", error);
        sendResponse({ error: error.message });
      }
    })();

    return true;
  } else if (request.action === "addCardToDeck") {
    logger.log(
      "Background script received 'addCardToDeck' for deckId:",
      request.deckId
    );

    (async () => {
      try {
        const result = await authenticatedFetch("/decks/deck/add-card", {
          method: "PATCH",
          body: JSON.stringify(request.payload),
        });

        sendResponse(result);
      } catch (error) {
        logger.error("Background script addCardToDeck error:", error);
        sendResponse({ error: error.message });
      }
    })();

    return true;
  } else if (request.action === "createManualDeck") {
    logger.log(
      "Background script received 'createManualDeck' for videoId:",
      request.videoId
    );

    (async () => {
      try {
        const result = await authenticatedFetch("/decks/deck/create-manual", {
          method: "POST",
          body: JSON.stringify({
            videoId: request.videoId,
            videoTitle: request.videoTitle,
            requestFrom: request.requestFrom,
          }),
        });

        sendResponse(result);
      } catch (error) {
        logger.error("Background script createManualDeck error:", error);
        sendResponse({ error: error.message });
      }
    })();

    return true;
  } else if (request.action === "exportForAnki") {
    logger.log(
      "Background script received 'exportForAnki' for deckId:",
      request.deckId
    );

    (async () => {
      try {
        const blob = await authenticatedFetch(
          "/decks/deck/export",
          {
            method: "POST",
            body: JSON.stringify({
              deckId: request.deckId,
              format: "anki",
            }),
          },
          "blob"
        );

        // Convert blob to data URL
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            // Replace the MIME type in the data URL
            const result = reader.result.replace(
              /^data:application\/zip/,
              "data:application/octet-stream"
            );
            resolve(result);
          };
          reader.readAsDataURL(blob);
        });

        chrome.downloads.download({
          url: dataUrl,
          filename: `Anki_${request.deckId}.apkg`,
          saveAs: false, // Optional: prompts user for save location
        });

        sendResponse({ success: true, message: "Download initiated." });
      } catch (error) {
        logger.error("Background script exportForAnki error:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  } else if (request.action === "exportDeckToNotion") {
    logger.log(
      "Background script received 'exportDeckToNotion' deckId:",
      request.deckId
    );

    (async () => {
      try {
        const result = await authenticatedFetch("/decks/deck/export", {
          method: "POST",
          body: JSON.stringify({ deckId: request.deckId, format: "notion" }),
        });

        sendResponse(result);
      } catch (error) {
        logger.error("Background script exportToNotion error:", error);
        sendResponse({ error: error.message });
      }
    })();
    return true;
  } else if (request.action === "startNotionAuth") {
    (async () => {
      try {
        const result = await authenticatedFetch("/notion/oauth-url", {
          method: "POST",
          body: JSON.stringify({
            returnTo: request.returnTo,
          }),
        });

        sendResponse(result);

        if (result.authUrl) {
          // Open the Notion authorization page in a new tab
          chrome.tabs.create({ url: result.authUrl });
          sendResponse({ success: true });
        } else {
          throw new Error("Failed to get Notion auth URL.");
        }
      } catch (error) {
        logger.error("Error starting Notion auth:", error);
        sendResponse({ error: error.message });
      }
    })();
    return true;
  } else if (request.action === "refreshAuthToken") {
    (async () => {
      try {
        logger.log("Background script: Re-issuing auth token...");

        const result = await authenticatedFetch(
          "/auth/reissue-extension-token",
          { method: "POST" }
        );

        if (result.accessToken) {
          await chrome.storage.local.set({ authToken: result.accessToken });
          sendResponse({ success: true });
        } else {
          sendResponse({ error: error.message });
        }
      } catch (error) {
        logger.error("Error re-issuing auth token:", error);
        sendResponse({ error: error.message });
      }
    })();
    return true;
  } else if (request.action === "executeKaTeXRender") {
    logger.log("Background received 'executeKaTeXRender' message.");
    const tabId = sender.tab.id;

    (async () => {
      try {
        const checkResults = await chrome.scripting.executeScript({
          target: { tabId },
          world: "MAIN",
          func: () => typeof window.renderMathInElement === "function",
        });

        if (!checkResults[0].result) {
          logger.log("BG: KaTeX auto-render not found. Injecting libraries...");
          // Inject BOTH katex.min.js and auto-render.min.js
          await chrome.scripting.executeScript({
            target: { tabId },
            files: [
              "vendor/katex/katex.min.js",
              "vendor/katex/contrib/auto-render.min.js",
            ],
            world: "MAIN",
          });
        }

        logger.log(
          "BG: KaTeX is ready. Triggering auto-render on the container..."
        );

        // STEP 2: Call the auto-render function on our specific sidebar container
        await chrome.scripting.executeScript({
          target: { tabId },
          world: "MAIN",
          func: () => {
            const renderTarget = document.getElementById(
              "reeldecks-react-root"
            );
            if (renderTarget && typeof renderMathInElement === "function") {
              // This function correctly finds the delimiters and replaces ONLY the math,
              // avoiding the extra <span> wrapper issue.
              renderMathInElement(renderTarget, {
                delimiters: [
                  { left: "$$", right: "$$", display: true },
                  { left: "$", right: "$", display: false },
                  { left: "\\[", right: "\\]", display: true },
                  { left: "\\(", right: "\\)", display: false },
                ],
                throwOnError: false,
              });
            } else {
              logger.error(
                "KaTeX: Could not find target element or render function."
              );
            }
          },
        });

        sendResponse({ status: "success" });
      } catch (err) {
        logger.error("Failed to execute KaTeX script:", err);
        sendResponse({ status: "failure", error: err.message });
      }
    })();
    return true;
  }
});

// A small listener to confirm the background script is running when installed/updated
chrome.runtime.onInstalled.addListener(() => {
  logger.log("ReelDecks background script installed.");
});

// This listener is specifically for messages coming from external websites
// that are listed in manifest.json's "externally_connectable".
chrome.runtime.onMessageExternal.addListener(function (
  request,
  sender,
  sendResponse
) {
  // We can check sender.origin to be extra sure the message is from our website
  logger.log(`External message received from origin: ${sender.origin}`);

  // Check for the specific action and token
  if (
    (request.action === "userLoggedIn" && request.token, request.refreshToken)
  ) {
    logger.log(
      "Received login token from web app. Storing it in chrome.storage.local."
    );

    // Store the token that your backend provided
    chrome.storage.local.set(
      {
        authToken: request.token,
        refreshToken: request.refreshToken,
        isRegisteredUser: true,
        hasUsedFreebie: true,
      },
      () => {
        if (chrome.runtime.lastError) {
          logger.error("Error storing token:", chrome.runtime.lastError);
          sendResponse({
            status: "error",
            message: chrome.runtime.lastError.message,
          });
        } else {
          logger.log("Token stored successfully.");
          // --- Notify all tabs for sidebar that's open and user logged in---
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
              chrome.tabs
                .sendMessage(tab.id, { action: "userStatusChanged" })
                .catch((err) => {});
            });
          });
          // You could update the extension icon here to show a "logged in" state
          sendResponse({
            status: "success",
            message: "Token received and stored.",
          });
        }
      }
    );

    // Return true to indicate you will send a response asynchronously.
    return true;
  }
  // receiving notion connect signal from web-app
  if (request.action === "notionStatus") {
    if (request.type === "NOTION_AUTH_SUCCESS") {
      logger.log("Notion auth success message received from web app.");

      // Find the active YouTube tab where the sidebar is likely open
      chrome.tabs.query({ url: "*://*.youtube.com/watch*" }, (tabs) => {
        if (tabs.length > 0) {
          // Send a message to the content script in that tab to complete the flow
          chrome.tabs.sendMessage(
            tabs[0].id,
            { type: "NOTION_AUTH_COMPLETE" },
            (response) => {
              if (chrome.runtime.lastError) {
                logger.warn(
                  "Could not send message to content script. It might be closed.",
                  chrome.runtime.lastError.message
                );
              } else {
                logger.log(
                  "Successfully notified content script of Notion auth completion."
                );
              }
            }
          );
        } else {
          logger.warn("No active YouTube tab found to notify.");
        }
      });
      // Acknowledge the message from the web app
      sendResponse({ status: "acknowledged" });
    }
    // Return true to indicate you will send a response asynchronously.
    return true;
  }
});
