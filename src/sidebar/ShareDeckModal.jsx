import React, { useState } from "react"; // Import useContext

import { useNotifier } from "../context/NotificationContext";
import { logger } from "../utils/extension";

function ShareModal({ deck, onClose }) {
  const notify = useNotifier();

  const [isPublic, setIsPublic] = useState(deck?.isPublic || false);
  const [isLoading, setIsLoading] = useState(false);

  const shareableLink = `${import.meta.env.VITE_FRONTEND_URL}/view/${deck._id}`;

  const handleMakePublic = async () => {
    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        action: "makeDeckPublic",
        payload: { deckId: deck._id },
      });

      setIsLoading(false);

      if (response && response.success) {
        setIsPublic(true);
        navigator.clipboard.writeText(shareableLink);
        // Use your success notification function
        notify.success("Link Copied!");
      } else {
        notify.error(response.error || "Failed to share deck.");
      }
    } catch (error) {
      logger.log(`Error in ShareDeckModal: ${error}`);
      notify.error("Failed to share deck. Please try again.");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    // Use your success notification function
    notify.success("Link Copied!");
  };

  return (
    <div className="ytf-modal-overlay" onClick={onClose}>
      <div className="ytf-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="ytf-modal-header">
          <h3>Share Deck</h3>
          <button onClick={onClose} className="ytf-modal-close-btn">
            &times;
          </button>
        </div>
        <div className="ytf-modal-body">
          {!isPublic ? (
            <>
              <p>
                Make this deck public to get a shareable link. Anyone with the
                link will be able to view it.
              </p>
              <button
                className="ytf-primary-action-btn"
                onClick={handleMakePublic}
                disabled={isLoading}
              >
                {isLoading ? "Making Public..." : "Make Public & Get Link"}
              </button>
            </>
          ) : (
            <>
              <p>Anyone with this link can view your deck:</p>
              <div className="ytf-share-link-container">
                <input type="text" readOnly value={shareableLink} />
                <button onClick={handleCopyLink}>Copy</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShareModal;
