import React, { useState, useEffect, useRef } from "react";
import { logger } from "../utils/extension";

import { useNotifier } from "../context/NotificationContext";

function ExportDropdown({
  isUserLoggedIn,
  isProUser,
  currentDeckData,
  isNotionConnected,
  setIsShareModalOpen,
}) {
  const notify = useNotifier();

  const [isOpen, setIsOpen] = useState(false);
  const [exportState, setExportState] = useState("idle"); // idle, exporting

  const dropdownRef = useRef(null);

  // This effect handles closing the dropdown if the user clicks outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const exportAsTxt = () => {
    setIsOpen(false);
    logger.log("Exporting as TXT (client-side)");
    const cards = currentDeckData?.cards || [];
    if (cards.length === 0) return;

    try {
      let textContent = "";
      cards.forEach((card, index) => {
        textContent += `Card ${index + 1}\n`;
        textContent += `Front: ${card.front}\n`;
        textContent += `Back: ${card.back}\n`;
        textContent += `Source: https://www.youtube.com/watch?v=${currentDeckData?.youtubeVideoId}&t=${card.timestamp}s\n`;
        textContent += `--------------------\n\n`;
      });

      const blob = new Blob([textContent], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `flashcards_${currentDeckData._id}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notify.success("Card exported as txt successfully!");
    } catch (error) {
      console.error("TXT export failed:", error);
      notify.error(`Failed to export as TXT.`);
    }
  };

  const exportAsCsv = () => {
    setIsOpen(false);
    logger.log("Exporting as CSV (client-side)");
    const cards = currentDeckData?.cards || [];
    if (cards.length === 0) return;
    try {
      // Add headers and escape commas/quotes in data
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Front,Back,Source\n"; // CSV Header

      cards.forEach((card) => {
        const front = `"${card.front.replace(/"/g, '""')}"`;
        const back = `"${card.back.replace(/"/g, '""')}"`;
        const timestampLink = `https://www.youtube.com/watch?v=${currentDeckData?.youtubeVideoId}&t=${card.timestamp}s\n`;
        csvContent += `${front},${back},${timestampLink}\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `flashcards_${currentDeckData._id}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notify.success("Card exported as csv successfully!");
    } catch (error) {
      console.error("CSV export failed:", error);
      notify.error(`Failed to export as CSV.`);
    }
  };

  const exportAsAnki = async () => {
    setIsOpen(false);
    setExportState("exporting");
    try {
      const response = await chrome.runtime.sendMessage({
        action: "exportForAnki",
        format: "anki",
        deckId: currentDeckData._id,
      });

      if (response.error) throw new Error(response.error);

      if (response.success) {
        // The download has started! Show a confirmation to the user.
        logger.log("Download initiated successfully!");
        notify.success(`Download initiated successfully`);
      } else {
        // The background script caught an error. Show it to the user.
        logger.error("Anki export failed:", response.error);
        notify.error(`Anki export failed. Please try again.`);
      }
    } catch (error) {
      logger.error("Failed to export for Anki:", error);
      notify.error(`Anki export failed. Please try again.`);
    } finally {
      setExportState("idle");
    }
  };

  const handleNotionExport = async () => {
    setIsOpen(false);
    if (isNotionConnected) {
      // Happy Path: User is already connected.
      executeNotionExport();
    } else {
      // Just-in-Time Flow: User needs to connect.
      startNotionConnectionFlow();
    }
  };

  const executeNotionExport = async () => {
    setExportState("exporting");
    try {
      const response = await chrome.runtime.sendMessage({
        action: "exportDeckToNotion",
        deckId: currentDeckData._id,
      });
      if (response.error) throw new Error(response.error);

      if (response.notionUrl) {
        window.open(response.notionUrl, "_blank");
      } else {
        notify.error(`Notion export failed. Please try again.`);
        throw new Error("Export completed, but no Notion URL was returned.");
      }
    } catch (err) {
      notify.error(`Notion export failed. Please try again.`);
    } finally {
      setTimeout(() => setExportState("idle"), 1000);
    }
  };

  const startNotionConnectionFlow = async () => {
    setIsOpen(false);
    const userConfirmation = confirm(
      "To export to Notion, you need to connect your account first.\n\nA new tab will open for authorization. Click OK to continue."
    );
    if (!userConfirmation) return;

    try {
      // 1. Save the user's intent to storage.
      await chrome.storage.local.set({
        postAuthAction: { type: "EXPORT_NOTION", deckId: currentDeckData._id },
      });

      logger.log("User intent to export Notion saved.");

      // 2. Ask the background script to start the auth process.
      const response = await chrome.runtime.sendMessage({
        action: "startNotionAuth",
        returnTo: "/auth/extension-auth-success",
      });

      if (response.error) throw new Error(response.error);
      // Background script will open the auth tab.
    } catch (err) {
      alert(`Could not start the Notion connection process: ${err.message}`);
      notify.error(
        `Could not start the Notion connection process. Please try again.`
      );
      await chrome.storage.local.remove("postAuthAction"); // Clean up on failure
    }
  };

  const getButtonContent = () => {
    if (exportState === "exporting") {
      return <div className="ytf-button-spinner"></div>;
    }
    return (
      <div className="ytf-button-content">
        {/* <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
          <polyline points="16 6 12 2 8 6"></polyline>
          <line x1="12" y1="2" x2="12" y2="15"></line>
        </svg> */}
        <svg
          className="ytf-chevron-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        <span>More Actions</span>
        {/* <svg
          className="ytf-chevron-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg> */}
      </div>
    );
  };

  return (
    <div
      id="ytf-export-actions"
      className="ytf-export-actions"
      ref={dropdownRef}
    >
      <button
        id="ytf-export-dropdown-btn"
        className={`ytf-secondary-action-btn ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        disabled={exportState === "exporting"}
      >
        {getButtonContent()}
      </button>

      {!isOpen ? null : (
        <div id="ytf-export-dropdown-menu" className="ytf-dropdown-menu">
          {/* Free Option */}
          <button
            className="ytf-dropdown-item"
            data-format="txt"
            onClick={exportAsTxt}
          >
            <svg
              width="18"
              height="18"
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
            <span>Export As Text (.txt)</span>
          </button>
          {/* Pro Options */}
          <button
            className="ytf-dropdown-item"
            data-format="csv"
            disabled={!isProUser}
            onClick={exportAsCsv}
          >
            <svg
              width="18"
              height="18"
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
              <line x1="10" y1="9" x2="8" y2="9"></line>
              <line x1="12" y1="20" x2="12" y2="11"></line>
            </svg>
            <span>Export As CSV</span>
            {!isProUser && <span className="ytf-pro-lock">🔒</span>}
          </button>
          <button
            className="ytf-dropdown-item"
            data-format="anki"
            disabled={!isProUser}
            onClick={exportAsAnki}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 50 50"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M37.38,2H12.84C9.66,2,7,4.85,7,8v7.26c10.89,1.54,25.87,5.9,36,13.65V7.62C43,4.54,40.46,2,37.38,2z M38.93,13.68 c-0.06,0.38-0.34,0.68-0.7,0.79l-3,0.88l-0.97,2.98c-0.12,0.36-0.44,0.62-0.81,0.67c-0.05,0.01-0.1,0.01-0.14,0.01 c-0.33,0-0.64-0.16-0.83-0.43L30.71,16l-3.12-0.01c-0.38,0-0.73-0.22-0.9-0.56c-0.16-0.34-0.12-0.75,0.11-1.05l1.91-2.48 l-0.96-2.97C27.63,8.57,27.73,8.17,28,7.9c0.28-0.26,0.68-0.35,1.04-0.22l2.94,1.05l2.53-1.83c0.31-0.23,0.72-0.25,1.06-0.07 C35.9,7,36.11,7.36,36.1,7.74l-0.09,3.12l2.53,1.85C38.84,12.93,39,13.31,38.93,13.68z M7,17.27V42c0,1.86,0.92,3.39,2.09,4.41 C10.27,47.42,11.68,48,13,48h24.38c3.08,0,5.62-2.54,5.62-5.62V31.47C33.86,23.88,18.79,18.99,7,17.27z M30.71,31.57l-3.33,4.14 l1.52,5.09c0.16,0.55,0,1.13-0.42,1.51c-0.42,0.39-1.01,0.5-1.54,0.3l-4.96-1.89l-4.38,3.02C17.35,43.91,17.05,44,16.76,44 c-0.25,0-0.5-0.06-0.72-0.19c-0.5-0.28-0.79-0.8-0.77-1.37l0.27-5.31l-4.22-3.23c-0.45-0.34-0.67-0.9-0.56-1.46s0.52-1,1.07-1.15 l5.13-1.39l1.77-5.01c0.19-0.54,0.66-0.92,1.22-0.98c0.57-0.07,1.11,0.18,1.43,0.66l2.9,4.45l5.31,0.13 c0.57,0.02,1.08,0.35,1.32,0.86C31.14,30.53,31.07,31.13,30.71,31.57z" />
            </svg>
            <span>Export As Anki</span>
            {!isProUser && <span className="ytf-pro-lock">🔒</span>}
          </button>
          <button
            className="ytf-dropdown-item"
            data-format="notion"
            disabled={!isProUser}
            onClick={handleNotionExport}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 50 50"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M44.62 13.13c-.23-.21-.52-.33-.83-.33-.02 0-.05.01-.08.01l-29.86 1.92c-.63.04-1.13.58-1.13 1.21v28.75c0 .34.14.65.38.88.25.23.57.35.91.33l29.86-1.93C44.51 43.93 45 43.4 45 42.76V14.02C45 13.68 44.87 13.36 44.62 13.13zM38.11 20.92c-.6.19-.79.2-.79.2v17.24c-1.02.55-1.86.81-2.74.81-1.07 0-1.68-.24-2.5-1.5-1.74-2.69-7.41-11.81-7.41-11.81v11.45l2.23.47c0 0-.06 1.3-2.01 1.45-1.71.13-5.44.32-5.44.32 0-.47.1-1.12.84-1.31.35-.09 1.4-.37 1.4-.37V22.42h-2.24c0-1.03.3-1.83 1.38-1.91l5.79-.33 7.73 11.92V21.49l-2.24-.19c0-.93.9-1.5 1.67-1.58l5.04-.28C38.82 20.09 38.79 20.7 38.11 20.92zM4.98 8.54l5.74 5.74v29.54L5.6 37.66c-.41-.58-.62-1.25-.62-1.96V8.54zM42.72 10.91l-29.06 1.83c-.99.07-1.95-.3-2.65-.99L6.24 6.97l27.19-1.89c.81-.07 1.62.17 2.28.66L42.72 10.91z"></path>
            </svg>
            <span>Export To Notion</span>
            {!isProUser && <span className="ytf-pro-lock">🔒</span>}
          </button>
          <div className="ytf-dropdown-divider"></div>
          {/* Share Deck Button */}
          <button
            className="ytf-dropdown-item"
            data-format="notion"
            disabled={!isProUser}
            onClick={() => setIsShareModalOpen(true)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11 6C12.6569 6 14 4.65685 14 3C14 1.34315 12.6569 0 11 0C9.34315 0 8 1.34315 8 3C8 3.22371 8.02449 3.44169 8.07092 3.65143L4.86861 5.65287C4.35599 5.24423 3.70652 5 3 5C1.34315 5 0 6.34315 0 8C0 9.65685 1.34315 11 3 11C3.70652 11 4.35599 10.7558 4.86861 10.3471L8.07092 12.3486C8.02449 12.5583 8 12.7763 8 13C8 14.6569 9.34315 16 11 16C12.6569 16 14 14.6569 14 13C14 11.3431 12.6569 10 11 10C10.2935 10 9.644 10.2442 9.13139 10.6529L5.92908 8.65143C5.97551 8.44169 6 8.22371 6 8C6 7.77629 5.97551 7.55831 5.92908 7.34857L9.13139 5.34713C9.644 5.75577 10.2935 6 11 6Z"
                fill="#000000"
              />
            </svg>
            <span>Share Deck</span>
            {!isProUser && <span className="ytf-pro-lock">🔒</span>}
          </button>
        </div>
      )}
    </div>
  );
}

export default ExportDropdown;
