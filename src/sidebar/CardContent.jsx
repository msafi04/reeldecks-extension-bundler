import React, { useEffect, useRef } from "react";
import { renderToString } from "react-dom/server";

import Markdown from "markdown-to-jsx";

import { renderMath } from "../utils/mathRenderer";

const MarkdownRenderer = ({ content }) => (
  <Markdown
    options={{
      overrides: {
        a: { props: { target: "_blank", rel: "noopener noreferrer" } },
      },
    }}
  >
    {content}
  </Markdown>
);

function CardContent({ content }) {
  const contentRef = useRef(null);

  useEffect(() => {
    if (content && contentRef.current) {
      const markdownHtml = renderToString(
        <MarkdownRenderer content={content} />
      );
      console.log(markdownHtml);
      const finalHtml = renderMath(markdownHtml);
      contentRef.current.innerHTML = finalHtml;
      console.log(finalHtml);
    }
  }, [content]);

  if (!content) return null;

  return <div ref={contentRef} className="card-content-container" />;
}

export default CardContent;
