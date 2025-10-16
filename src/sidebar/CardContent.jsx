import React, { useEffect, useRef } from "react";
import { renderToString } from "react-dom/server";

import { marked } from "marked";

import { renderMath } from "../utils/mathRenderer";

function CardContent({ content }) {
  const contentRef = useRef(null);

  useEffect(() => {
    if (content && contentRef.current) {
      // Step 1: Protect math expressions
      const mathPlaceholders = [];
      const protectedContent = content.replace(
        /\$\$[\s\S]+?\$\$|\$.+?\$/g,
        (match) => {
          const placeholder = `MATH_PLACEHOLDER_${mathPlaceholders.length}_MATH`;
          mathPlaceholders.push(match);
          return placeholder;
        }
      );

      // Step 2: Render markdown (simple string operation)
      const markdownHtml = marked.parse(protectedContent);

      // Step 3: Restore math expressions
      let restoredHtml = markdownHtml;
      mathPlaceholders.forEach((math, index) => {
        restoredHtml = restoredHtml.replace(
          `MATH_PLACEHOLDER_${index}_MATH`,
          math
        );
      });

      // Step 4: Render math
      const finalHtml = renderMath(restoredHtml);
      contentRef.current.innerHTML = finalHtml;
    }
  }, [content]);

  if (!content) return null;

  return <div ref={contentRef} className="card-content-container" />;
}

export default CardContent;
