import React, { useState, useEffect } from "react";
import Slider from "rc-slider";

// --- HELPER DATA FOR OUR CARDS ---
// (This can be moved to a separate file later if needed)

const themeOptions = [
  {
    id: "minimal",
    title: "Minimal Neutral",
    description:
      "Clean, neutral look with lots of white space and a single accent color.",
    colors: ["#FFFFFF", "#333333", "#CCCCCC", "#00BFFF"],
  },
  {
    id: "dark",
    title: "Dark Tech",
    description:
      "Dark, UI-like dashboard aesthetic with neon accents and subtle grids.",
    colors: ["#1A1A1A", "#00FFFF", "#3366FF", "#222222"],
  },
  {
    id: "sketch",
    title: "Hand-Drawn / Sketch",
    description: "Sketchy, notebook feel with imperfect lines and doodles.",
    colors: ["#F5F5DC", "#333333", "#808080", "#FFD700"],
  },
];

const styleOptions = [
  {
    id: "general",
    title: "General Infographic",
    description:
      "Single-page overview with key sections arranged as cards or blocks.",
  },
  {
    id: "flowchart",
    title: "Flowchart",
    description:
      "Process-focused diagram showing steps and decision points in sequence.",
  },
  {
    id: "whiteboard",
    title: "Whiteboard",
    description:
      "A brainstorm on a whiteboard, with clusters of notes and arrows.",
  },
  {
    id: "mindmap",
    title: "Mind Map",
    description: "Central topic with branched subtopics and sub-points.",
  },
  {
    id: "roadmap",
    title: "Roadmap",
    description: "Time or phase-based path showing milestones and progress.",
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description:
      "KPI-style layout with stat tiles and simple charts to highlight key numbers.",
  },
];

// Reusable Card Component
const OptionCard = ({ title, description, isSelected, onClick, children }) => (
  <div
    className={`ytf-option-card ${isSelected ? "selected" : ""}`}
    onClick={onClick}
  >
    <div className="ytf-option-card-header">
      <span>{title}</span>
      {isSelected && <span className="ytf-checkmark-icon">✓</span>}
    </div>
    <p className="ytf-option-card-description">{description}</p>
    {children}
  </div>
);

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

const INFOGRAPHIC_CREDITS_PER_MINUTE = 5;

function InfographicWizard({
  videoMetadata,
  onGenerate,
  onBack,
  isUserLoggedIn,
}) {
  const [selectedTheme, setSelectedTheme] = useState("minimal");
  const [selectedStyle, setSelectedStyle] = useState("general");
  const [language, setLanguage] = useState("en-US");
  const [timeRange, setTimeRange] = useState([0, videoMetadata.duration]);

  const [infoMessage, setInfoMessage] = useState("");
  const [isGenerateDisabled, setIsGenerateDisabled] = useState(false);
  const [infoBoxClass, setInfoBoxClass] = useState("ytf-info-box");

  const handleCreateClick = () => {
    const payload = {
      videoId: new URLSearchParams(window.location.search).get("v"),
      theme: selectedTheme,
      style: selectedStyle,
      language: language,
      timeRange: { start: timeRange[0], end: timeRange[1] },
      categoryTokens: videoMetadata.categoryTokens,
      videoCategory: videoMetadata.category,
      requestFrom: "extension",
    };
    onGenerate(payload);
  };

  // Credit calculation effect (no changes needed here)
  useEffect(() => {
    const selectedDuration = timeRange[1] - timeRange[0];
    if (videoMetadata.limitations) {
      const { userPlanVideoLengthLimit, userCreditBalance } =
        videoMetadata.limitations;
      if (selectedDuration > userPlanVideoLengthLimit) {
        setInfoMessage(
          `Selection is too long. Your plan's limit is ${
            userPlanVideoLengthLimit / 60
          } minutes.`
        );
        setInfoBoxClass("ytf-info-box warning");
        setIsGenerateDisabled(true);
        return;
      }
      const estimatedCost = Math.ceil(
        (selectedDuration / 60) * INFOGRAPHIC_CREDITS_PER_MINUTE
      );
      if (estimatedCost > userCreditBalance) {
        setInfoMessage(
          `This will cost ${estimatedCost} credits, but you only have ${userCreditBalance}.`
        );
        setInfoBoxClass("ytf-info-box warning");
        setIsGenerateDisabled(true);
        return;
      }
      setInfoMessage(`This will cost ≈ ${estimatedCost} credits.`);
      setInfoBoxClass("ytf-info-box info");
      setIsGenerateDisabled(false);
    }
  }, [timeRange, videoMetadata]);

  return (
    <div id="ytf-infographic-wizard-state">
      <div className="ytf-view-header">
        {isUserLoggedIn && (
          <button
            className="ytf-icon-btn"
            title="Back to Decks"
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
        )}
        <h4>Create an Infographic</h4>
      </div>

      <div className="ytf-options-container">
        {/* --- STEP 1: CHOOSE THEME --- */}
        <div className="ytf-option-group">
          <label>1. Choose a Theme</label>
          <div className="ytf-options-scroller">
            {themeOptions.map((theme) => (
              <OptionCard
                key={theme.id}
                title={theme.title}
                description={theme.description}
                isSelected={selectedTheme === theme.id}
                onClick={() => setSelectedTheme(theme.id)}
              >
                <div className="ytf-theme-swatches">
                  {theme.colors.map((color) => (
                    <div
                      key={color}
                      className="ytf-theme-swatch"
                      style={{ backgroundColor: color }}
                    ></div>
                  ))}
                </div>
              </OptionCard>
            ))}
          </div>
        </div>

        {/* --- STEP 2: SELECT INFOGRAPHIC STYLE --- */}
        <div className="ytf-option-group">
          <label>2. Select Infographic Style</label>
          <div className="ytf-options-scroller">
            {styleOptions.map((style) => (
              <OptionCard
                key={style.id}
                title={style.title}
                description={style.description}
                isSelected={selectedStyle === style.id}
                onClick={() => setSelectedStyle(style.id)}
              />
            ))}
          </div>
        </div>

        {/* --- OTHER OPTIONS (Slider & Language) --- */}
        <div className="ytf-option-group" id="ytf-timestamp-container">
          <label>3. Select Video Segment</label>
          <div className="ytf-slider-container">
            <Slider
              range
              min={0}
              max={videoMetadata.duration}
              value={timeRange}
              onChange={setTimeRange}
              tipFormatter={formatTime}
            />
          </div>
          <div className="ytf-slider-labels">
            <span>{formatTime(timeRange[0])}</span>
            <span>{formatTime(timeRange[1])}</span>
          </div>
        </div>

        <div className="ytf-option-group">
          <label htmlFor="ytf-info-language">4. Language</label>
          <div className="ytf-select-wrapper">
            <select
              id="ytf-info-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en-US">English</option>
              <option value="es-MX">Spanish</option>
              <option value="ja-JP">Japanese</option>
              <option value="zh-CN">Chinese</option>
              {/* <option value="hi-IN">Hindi</option> */}
            </select>
          </div>
        </div>
      </div>

      {infoMessage && (
        <div id="ytf-generation-info" className={infoBoxClass}>
          {infoMessage}
        </div>
      )}
      <button
        className="ytf-generate-btn"
        onClick={handleCreateClick}
        disabled={isGenerateDisabled}
      >
        Create My Infographic
      </button>
    </div>
  );
}

export default InfographicWizard;
