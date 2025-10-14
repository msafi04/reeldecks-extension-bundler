import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

const svg = new SVG({
  fontCache: "none",
  scale: 0.9, // Scale down math slightly
  minScale: 0.5, // Allow more scaling
  mtextInheritFont: true,
});

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({ packages: AllPackages });
const html = mathjax.document("", { InputJax: tex, OutputJax: svg });

export function renderMath(text) {
  // Replace inline math $...$ and display math $$...$$
  return text.replace(
    /\$\$([\s\S]+?)\$\$|\$(.+?)\$/g,
    (match, display, inline) => {
      const math = display || inline;
      const node = html.convert(math, {
        display: !!display,
        em: 16,
        ex: 8,
        containerWidth: 80 * 16,
      });
      return adaptor.outerHTML(node);
    }
  );
}
