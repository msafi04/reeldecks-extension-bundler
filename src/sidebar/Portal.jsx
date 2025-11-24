import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

function Portal({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after the component mounts.
    // It ensures the portal target element exists before we try to use it.
    setMounted(true);
  }, []);

  // Use createPortal to render the children into the modal root
  // The 'document.getElementById' call now targets the new div we created in content.js
  return mounted
    ? createPortal(children, document.getElementById("reeldecks-modal-root"))
    : null;
}

export default Portal;
