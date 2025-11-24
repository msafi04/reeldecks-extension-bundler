import React, { useState, useEffect } from "react";

// Default steps for infographic generation
const defaultSteps = [
  { text: "Analyzing Video Transcript...", duration: 5000 }, // 5 seconds
  { text: "Synthesizing Key Points...", duration: 8000 }, // 8 seconds
  { text: "Designing Layout & Visuals...", duration: 12000 }, // 12 seconds
  { text: "Generating Infographic...", duration: 25000 }, // 25 seconds (long part)
];

function InfographicLoadingView({
  title = "Generating, Please Wait...",
  steps = defaultSteps,
}) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // A function to advance to the next step
    const advanceStep = (stepIndex) => {
      if (stepIndex < steps.length - 1) {
        const nextStepIndex = stepIndex + 1;
        // Set a timeout to move to the next step after the current step's duration
        const timer = setTimeout(() => {
          setCurrentStep(nextStepIndex);
        }, steps[stepIndex].duration);

        // Cleanup the timer if the component unmounts
        return () => clearTimeout(timer);
      }
    };

    advanceStep(currentStep);
  }, [currentStep, steps]);

  return (
    <div className="ytf-loading-view">
      <h4 className="ytf-loading-title">{title}</h4>
      <p className="ytf-loading-subtitle">
        This may take up to a minute. Our AI is hard at work!
      </p>
      <ul className="ytf-progress-steps">
        {steps.map((step, index) => (
          <li
            key={index}
            className={`
              ytf-progress-step
              ${index === currentStep ? "active" : ""}
              ${index < currentStep ? "completed" : ""}
            `}
          >
            {step.text}
          </li>
        ))}
      </ul>
      <div className="ytf-animated-loader-bar"></div>
    </div>
  );
}

export default InfographicLoadingView;
