import React from "react";

function CardContent({ content }) {
  if (!content) return null;
  // We render the raw content with the dollar signs.
  // The script we inject later will find and replace them.
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}

export default CardContent;
