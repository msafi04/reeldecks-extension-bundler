export async function getOrCreateAnonymousId() {
  let { uniqueGenId } = await chrome.storage.local.get("uniqueGenId");
  if (uniqueGenId) {
    return uniqueGenId;
  } else {
    // Use crypto.randomUUID() for a cryptographically strong, unique ID
    const newId = crypto.randomUUID();
    await chrome.storage.local.set({ uniqueGenId: newId });
    return newId;
  }
}

const devMode = import.meta.env.VITE_DEV_MODE === "true";
const LOG_PREFIX = "[ReelDecks Content]";

export const logger = {
  log: (...args) => {
    if (devMode) {
      console.log(LOG_PREFIX, ...args);
    }
  },
  warn: (...args) => {
    if (devMode) {
      console.warn(LOG_PREFIX, ...args);
    }
  },
  error: (...args) => {
    if (devMode) {
      console.error(LOG_PREFIX, ...args);
    }
  },
};

export function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  // Formats to a locale-friendly short date, e.g., "5/23/2024" in the US
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

const frontendUrl = import.meta.env.VITE_FRONTEND_URL;

export async function redirectToWebApp(options = {}) {
  const { isLogin, isRegister, deckIdToEdit, deckToClaim } = options;

  try {
    // We always need to know if the user is logged in
    const { authToken } = await chrome.storage.local.get("authToken");

    let targetUrl;

    if (isLogin) {
      targetUrl = `${frontendUrl}/login`;
    } else if (isRegister) {
      targetUrl = `${frontendUrl}/register`;
    } else if (deckIdToEdit && authToken) {
      // A logged-in user wants to edit a specific deck
      targetUrl = `${frontendUrl}/auth/decks/${deckIdToEdit}`;
    } else if (deckToClaim && !authToken) {
      // An anonymous user is "claiming" their generated deck by signing up
      const anonymousUserId = await getOrCreateAnonymousId();
      const url = new URL(`${frontendUrl}/register`);
      url.searchParams.set("claimDeckId", deckToClaim);
      url.searchParams.set("anonymousId", anonymousUserId);
      targetUrl = url.toString();
    } else if (authToken) {
      // A generic redirect for a logged-in user (e.g., go to dashboard)
      targetUrl = `${frontendUrl}/auth/decks`;
    } else {
      // Default fallback for an anonymous user is the registration page
      targetUrl = `${frontendUrl}/register`;
    }

    logger.log("Redirecting to web app:", targetUrl);
    window.open(targetUrl, "_blank");
  } catch (error) {
    logger.error(
      "Error determining redirect URL, falling back to main page:",
      error
    );
    window.open(frontendUrl, "_blank");
  }
}

export function parseJwtPayload(token) {
  try {
    // A JWT is split into three parts by dots. The payload is the second part.
    const base64Url = token.split(".")[1];
    // Base64URL is slightly different from standard Base64. We need to replace
    // URL-safe characters back to their standard Base64 equivalents.
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    // Decode the Base64 string into a binary string, then decode that binary
    // string as UTF-8 to correctly handle all characters (like names with accents).
    // The `atob` part is still used here, but its output is immediately processed correctly.
    // A more modern approach uses TextDecoder but is more verbose for this specific task.
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to parse JWT:", error);
    return null;
  }
}
