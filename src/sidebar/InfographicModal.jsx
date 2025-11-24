import React, { useState } from "react";
import Portal from "./Portal";

function InfographicModal({ imageUrl, onClose }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return; // Prevent multiple clicks

    setDownloading(true);
    try {
      // 1. Fetch the image data from the cross-origin URL
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      // 2. Convert the response into a Blob (a file-like object)
      const blob = await response.blob();

      // 3. Create a temporary, local URL for the Blob
      const localUrl = URL.createObjectURL(blob);

      // 4. Use the <a> tag trick with the local URL, which respects the 'download' attribute
      const link = document.createElement("a");
      link.href = localUrl;
      link.download = `ReelDecks-Infographic-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 5. Clean up the temporary URL
      URL.revokeObjectURL(localUrl);
    } catch (error) {
      console.error("Download failed:", error);
      alert(
        "Could not download the image. Please try opening it in a new tab and saving from there."
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(imageUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Portal>
      <div className="ytf-info-modal-overlay" onClick={onClose}>
        <div
          className="ytf-info-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="ytf-info-modal-header">
            <h4>Infographic Preview</h4>
            <div className="ytf-info-modal-header-actions">
              <button
                className="ytf-info-modal-icon-btn"
                title="Close"
                onClick={onClose}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <div className="ytf-info-modal-body">
            <img
              src={imageUrl}
              alt="Generated Infographic"
              className="ytf-info-modal-image"
            />
          </div>

          <div className="ytf-info-modal-actions">
            <button className="ytf-info-modal-btn" onClick={handleOpenInNewTab}>
              <svg
                xmlns="http://www.w.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              <span>Open in New Tab</span>
            </button>
            <button
              className="ytf-info-modal-btn primary"
              onClick={handleDownload}
            >
              <svg
                xmlns="http://www.w.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>{downloading ? "Downloading..." : "Download PNG"}</span>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// Updated the export
export default InfographicModal;
