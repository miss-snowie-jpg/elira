import { useCallback } from "react";

export default function useMarkdown() {
  const renderInline = useCallback((text, keyPrefix = "") => {
    const parts = [];
    let remaining = text;
    let key = 0;

    const patterns = [
      {
        regex: /^\*\*(.+?)\*\*/,
        render: (match) => <strong key={`${keyPrefix}-bold-${key++}`}>{match[1]}</strong>,
      },
      {
        regex: /^__(.+?)__/,
        render: (match) => <strong key={`${keyPrefix}-bold-${key++}`}>{match[1]}</strong>,
      },
      {
        regex: /^\*(.+?)\*/,
        render: (match) => <em key={`${keyPrefix}-italic-${key++}`}>{match[1]}</em>,
      },
      {
        regex: /^_(.+?)_/,
        render: (match) => <em key={`${keyPrefix}-italic-${key++}`}>{match[1]}</em>,
      },
      {
        regex: /^`(.+?)`/,
        render: (match) => <code key={`${keyPrefix}-code-${key++}`}>{match[1]}</code>,
      },
      {
        regex: /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/,
        render: (match) => (
          <a
            key={`${keyPrefix}-link-${key++}`}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
          >
            {match[1]}
          </a>
        ),
      },
    ];

    while (remaining.length > 0) {
      let matched = false;

      for (const pattern of patterns) {
        const match = remaining.match(pattern.regex);

        if (match) {
          parts.push(pattern.render(match));
          remaining = remaining.slice(match[0].length);
          matched = true;
          break;
        }
      }

      if (!matched) {
        const nextSpecial = remaining.search(
          /(\*\*|__|\*|_|`|\[[^\]]+\]\(https?:\/\/)/
        );

        if (nextSpecial === -1) {
          parts.push(remaining);
          remaining = "";
        } else if (nextSpecial === 0) {
          parts.push(remaining[0]);
          remaining = remaining.slice(1);
        } else {
          parts.push(remaining.slice(0, nextSpecial));
          remaining = remaining.slice(nextSpecial);
        }
      }
    }

    return parts;
  }, []);

  const renderMarkdown = useCallback(
    (markdown) => {
      if (!markdown) return null;

      const lines = String(markdown).replace(/\r\n/g, "\n").split("\n");

      const elements = [];

      let listItems = [];
      let listType = null;

      let inCodeBlock = false;
      let codeLines = [];
      let codeLanguage = "";

      const closeList = () => {
        if (!listItems.length) return;

        if (listType === "ul") {
          elements.push(
            <ul key={`ul-${elements.length}`}>
              {listItems}
            </ul>
          );
        }

        if (listType === "ol") {
          elements.push(
            <ol key={`ol-${elements.length}`}>
              {listItems}
            </ol>
          );
        }

        listItems = [];
        listType = null;
      };

      const closeCodeBlock = () => {
        if (!inCodeBlock) return;

        elements.push(
          <pre key={`code-${elements.length}`}>
            <code className={codeLanguage ? `language-${codeLanguage}` : ""}>
              {codeLines.join("\n")}
            </code>
          </pre>
        );

        codeLines = [];
        codeLanguage = "";
        inCodeBlock = false;
      };

      lines.forEach((line, index) => {
        const trimmed = line.trim();

        // CODE BLOCK
        if (trimmed.startsWith("```")) {
          if (inCodeBlock) {
            closeCodeBlock();
          } else {
            closeList();

            inCodeBlock = true;
            codeLanguage = trimmed.slice(3).trim();
          }

          return;
        }

        if (inCodeBlock) {
          codeLines.push(line);
          return;
        }

        // EMPTY LINE
        if (!trimmed) {
          closeList();
          return;
        }

        // H1
        if (/^# /.test(trimmed)) {
          closeList();

          elements.push(
            <h1 key={`h1-${index}`}>
              {renderInline(trimmed.slice(2), `h1-${index}`)}
            </h1>
          );

          return;
        }

        // H2
        if (/^## /.test(trimmed)) {
          closeList();

          elements.push(
            <h2 key={`h2-${index}`}>
              {renderInline(trimmed.slice(3), `h2-${index}`)}
            </h2>
          );

          return;
        }

        // H3
        if (/^### /.test(trimmed)) {
          closeList();

          elements.push(
            <h3 key={`h3-${index}`}>
              {renderInline(trimmed.slice(4), `h3-${index}`)}
            </h3>
          );

          return;
        }

        // H4
        if (/^#### /.test(trimmed)) {
          closeList();

          elements.push(
            <h4 key={`h4-${index}`}>
              {renderInline(trimmed.slice(5), `h4-${index}`)}
            </h4>
          );

          return;
        }

        // H5
        if (/^##### /.test(trimmed)) {
          closeList();

          elements.push(
            <h5 key={`h5-${index}`}>
              {renderInline(trimmed.slice(6), `h5-${index}`)}
            </h5>
          );

          return;
        }

        // H6
        if (/^###### /.test(trimmed)) {
          closeList();

          elements.push(
            <h6 key={`h6-${index}`}>
              {renderInline(trimmed.slice(7), `h6-${index}`)}
            </h6>
          );

          return;
        }

        // HORIZONTAL RULE
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
          closeList();

          elements.push(<hr key={`hr-${index}`} />);

          return;
        }

        // BLOCKQUOTE
        if (/^> /.test(trimmed)) {
          closeList();

          elements.push(
            <blockquote key={`quote-${index}`}>
              {renderInline(trimmed.slice(2), `quote-${index}`)}
            </blockquote>
          );

          return;
        }

        // UNORDERED LIST
        const unorderedMatch = trimmed.match(/^[-*+] (.+)$/);

        if (unorderedMatch) {
          if (listType !== "ul") {
            closeList();
            listType = "ul";
          }

          listItems.push(
            <li key={`li-${index}`}>
              {renderInline(unorderedMatch[1], `li-${index}`)}
            </li>
          );

          return;
        }

        // ORDERED LIST
        const orderedMatch = trimmed.match(/^\d+\. (.+)$/);

        if (orderedMatch) {
          if (listType !== "ol") {
            closeList();
            listType = "ol";
          }

          listItems.push(
            <li key={`li-${index}`}>
              {renderInline(orderedMatch[1], `li-${index}`)}
            </li>
          );

          return;
        }

        // NORMAL PARAGRAPH
        closeList();

        elements.push(
          <p key={`p-${index}`}>
            {renderInline(trimmed, `p-${index}`)}
          </p>
        );
      });

      if (inCodeBlock) {
        closeCodeBlock();
      }

      closeList();

      return elements;
    },
    [renderInline]
  );

  return {
    render: renderMarkdown,
  };
}