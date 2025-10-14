import React from "react";
import ReactDOM from "react-dom/client";

import App from "../App";

import "../sidebar/Sidebar.css"; // Your main styles
import "rc-slider/assets/index.css"; // For the slider

console.log("ReelDecks DEV: Content script loaded and ready.");

// Create a container for our React app
const rootElement = document.createElement("div");
rootElement.id = "reeldecks-react-root";
document.body.appendChild(rootElement);

// Render our main App component into the root
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
