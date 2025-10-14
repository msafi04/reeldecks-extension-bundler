import React, { useEffect, useRef } from "react";

import { renderMath } from "../utils/mathRenderer";

function CardContent({ content }) {
  const contentRef = useRef(null);

  useEffect(() => {
    if (content && contentRef.current) {
      const renderedHTML = renderMath(content);
      contentRef.current.innerHTML = renderedHTML;
    }
  }, [content]);

  if (!content) return null;

  return <div ref={contentRef} />;
}

export default CardContent;
