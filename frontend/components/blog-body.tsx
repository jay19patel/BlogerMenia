import hljs from "highlight.js";

import { CodeBlock } from "@/components/code-block";
import { Linebreaks } from "@/components/linebreaks";
import { RawSvg } from "@/components/raw-svg";
import { isStructured, renderLegacyContent } from "@/lib/blog";
import { firstOf } from "@/lib/format";
import type { Blog, BlogSection } from "@/lib/types";

/**
 * `blog/_blog_body.html` — renders a structured post block by block, falling
 * back to the legacy single `content` field for older posts.
 */

function highlight(code: string, language: string) {
  const known = hljs.getLanguage(language) ? language : "plaintext";
  return hljs.highlight(code, { language: known, ignoreIllegals: true }).value;
}

/**
 * `article` renders the interactive page; `print` renders the plainer variant
 * `blog/pdf_template.html` produces, where highlight.js never runs.
 */
export type BlogBodyVariant = "article" | "print";

function SectionBody({ section, variant }: { section: BlogSection; variant: BlogBodyVariant }) {
  switch (section.type) {
    case "text":
      return <Linebreaks text={section.content ?? ""} />;

    case "note":
      return (
        <blockquote>
          <Linebreaks text={section.content ?? ""} />
        </blockquote>
      );

    case "code": {
      const language = section.language || "plaintext";
      const code = section.content ?? "";
      if (variant === "print") {
        return (
          <pre>
            <code className={`language-${language}`}>{code}</code>
          </pre>
        );
      }
      return <CodeBlock language={language} plainCode={code} highlightedHtml={highlight(code, language)} />;
    }

    case "bullets":
      return (
        <ul>
          {(section.items ?? []).map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );

    case "table":
      return (
        /* A wide table must scroll in its own box rather than making the whole
           page scroll sideways on a phone. */
        <div className="my-6 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <table>
          {section.headers && section.headers.length > 0 && (
            <thead>
              <tr>
                {section.headers.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {(section.rows ?? []).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      );

    case "youtube":
      return (
        <figure>
          <div
            className="relative w-full max-w-3xl mx-auto rounded-2xl overflow-hidden shadow-xs border border-slate-200"
            style={{ paddingTop: "56.25%" }}
          >
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${section.videoId ?? ""}`}
              title={firstOf(section.videoTitle, section.title)}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {section.description && <figcaption>{section.description}</figcaption>}
        </figure>
      );

    case "links":
      return (
        <ul className="not-prose space-y-2 list-none pl-0">
          {(section.links ?? []).map((link, index) => (
            <li key={index}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 font-medium hover:underline"
              >
                {link.text ? link.text : link.url}
              </a>
              {link.description && <span className="text-slate-400 text-sm"> — {link.description}</span>}
            </li>
          ))}
        </ul>
      );

    case "image": {
      const src = section.imageUrl || section.attachment;
      const alt = firstOf(section.description, section.title);
      return (
        <figure className="my-8 flex flex-col items-center text-center">
          {src && (
            // eslint-disable-next-line @next/next/no-img-element -- matches the original figure markup.
            <img
              className="max-h-[500px] w-auto object-contain rounded-2xl border border-slate-200 shadow-xs"
              src={src}
              alt={alt}
            />
          )}
          {section.description && (
            <figcaption className="text-sm text-slate-500 mt-3">{section.description}</figcaption>
          )}
        </figure>
      );
    }

    case "flowchart":
      return (
        <div className="border border-slate-200 bg-slate-50/50 rounded-2xl p-6 shadow-xs my-6">
          <ol className="space-y-3 my-0!">
            {(section.steps ?? []).map((step, index) => (
              <li key={index}>
                <span className="font-semibold text-slate-900">{step.title}</span>
                {step.description && <span className="text-slate-500"> — {step.description}</span>}
                {step.branches && step.branches.length > 0 && (
                  <ul className="mt-1">
                    {step.branches.map((branch, branchIndex) => (
                      <li key={branchIndex} className="text-sm text-slate-500">
                        ↳ {branch.title}
                        {branch.description ? `: ${branch.description}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </div>
      );

    case "excalidraw": {
      const caption = firstOf(section.caption, section.description);
      return (
        <figure className="my-8 flex flex-col items-center text-center">
          {section.svgData ? (
            <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 shadow-xs bg-white p-4 sm:p-6 flex justify-center [&>svg]:max-w-full [&>svg]:h-auto">
              <RawSvg html={section.svgData} />
            </div>
          ) : section.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- matches the original figure markup.
            <img
              className="max-h-[500px] w-auto object-contain rounded-2xl border border-slate-200 shadow-xs"
              src={section.imageUrl}
              alt={firstOf(section.caption, section.title)}
            />
          ) : null}
          {caption && <figcaption className="text-sm text-slate-500 mt-3 font-medium">{caption}</figcaption>}
        </figure>
      );
    }

    default:
      return <Linebreaks text={section.content ?? ""} />;
  }
}

export function BlogBody({ blog, variant = "article" }: { blog: Blog; variant?: BlogBodyVariant }) {
  if (!isStructured(blog)) {
    // Legacy post: a single rich-text body. Django trusts it with `|safe`;
    // we sanitise before injecting since the field can hold arbitrary HTML.
    return <div dangerouslySetInnerHTML={{ __html: renderLegacyContent(blog.content).html }} />;
  }

  return (
    <>
      {blog.introduction && (
        <div className="mb-2">
          <Linebreaks text={blog.introduction} />
        </div>
      )}

      {blog.sections.map((section, index) => (
        <section key={index} className="mb-2">
          {section.title && <h2 id={`section-${index}`}>{section.title}</h2>}
          <SectionBody section={section} variant={variant} />
        </section>
      ))}

      {blog.conclusion && (
        <>
          <h2 id="section-conclusion">Conclusion</h2>
          <div>
            <Linebreaks text={blog.conclusion} />
          </div>
        </>
      )}
    </>
  );
}
