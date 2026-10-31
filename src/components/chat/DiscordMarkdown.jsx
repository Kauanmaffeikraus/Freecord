import React, { useState, memo } from "react";
import { Copy, Check } from "lucide-react";

const Spoiler = memo(({ children }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      className={`discord-spoiler ${revealed ? "revealed" : "hidden"}`}
      onClick={(e) => {
        e.stopPropagation();
        setRevealed((prev) => !prev);
      }}
      title={revealed ? "Clique para ocultar spoiler" : "Clique para revelar spoiler"}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setRevealed((prev) => !prev);
        }
      }}
    >
      {children}
    </span>
  );
});

const CodeBlock = memo(({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="discord-code-block-container">
      <div className="discord-code-header">
        <span className="discord-code-lang">{language || "code"}</span>
        <button
          type="button"
          className="discord-code-copy-btn"
          onClick={handleCopy}
          title="Copiar código"
        >
          {copied ? <Check size={13} color="#57f287" /> : <Copy size={13} />}
          <span>{copied ? "Copiado!" : "Copiar"}</span>
        </button>
      </div>
      <pre className="discord-code-block">
        <code>{code}</code>
      </pre>
    </div>
  );
});

// Inline Tokenizer: parses bold, italic, underline, strike, inline code, spoilers, links, and mentions
function parseInline(text, keyPrefix = "") {
  if (!text) return null;

  // Regex patterns in precedence order
  // 1: Spoilers: ||...||
  // 2: Inline code: `...`
  // 3: Bold + Italic: ***...***
  // 4: Bold: **...**
  // 5: Underline + Italic: ___...___
  // 6: Underline: __...__
  // 7: Italic: *...* or _..._
  // 8: Strikethrough: ~~...~~
  // 9: Markdown link: [text](url)
  // 10: Auto URL: https?://...
  // 11: Mentions: @... or #...
  const tokenRegex =
    /(\|\|[\s\S]+?\|\|)|(`[^`\n]+?`)|(\*\*\*[\s\S]+?\*\*\*)|(\*\*[\s\S]+?\*\*)|(___[\s\S]+?___)|(__[\s\S]+?__)|(\*[^\s\*][\s\S]*?\*|_[^\s_][\s\S]*?_)|(~~[\s\S]+?~~)|(\[[^\]]+\]\((?:https?:\/\/[^\s\)]+)\))|(https?:\/\/[^\s<]+[^<.,:;"')\]\s])|(@[a-zA-Z0-9_\-\u00C0-\u017F]+|#[a-zA-Z0-9_\-\u00C0-\u017F]+)/g;

  const elements = [];
  let lastIndex = 0;
  let match;
  let tokenIdx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }

    const raw = match[0];
    const key = `${keyPrefix}_${tokenIdx++}`;

    if (raw.startsWith("||") && raw.endsWith("||")) {
      const inner = raw.slice(2, -2);
      elements.push(<Spoiler key={key}>{parseInline(inner, `${key}_sp`)}</Spoiler>);
    } else if (raw.startsWith("`") && raw.endsWith("`")) {
      const inner = raw.slice(1, -1);
      elements.push(
        <code key={key} className="discord-inline-code">
          {inner}
        </code>
      );
    } else if (raw.startsWith("***") && raw.endsWith("***")) {
      const inner = raw.slice(3, -3);
      elements.push(
        <strong key={key}>
          <em>{parseInline(inner, `${key}_bi`)}</em>
        </strong>
      );
    } else if (raw.startsWith("**") && raw.endsWith("**")) {
      const inner = raw.slice(2, -2);
      elements.push(<strong key={key}>{parseInline(inner, `${key}_b`)}</strong>);
    } else if (raw.startsWith("___") && raw.endsWith("___")) {
      const inner = raw.slice(3, -3);
      elements.push(
        <u key={key}>
          <em>{parseInline(inner, `${key}_ui`)}</em>
        </u>
      );
    } else if (raw.startsWith("__") && raw.endsWith("__")) {
      const inner = raw.slice(2, -2);
      elements.push(<u key={key}>{parseInline(inner, `${key}_u`)}</u>);
    } else if (
      (raw.startsWith("*") && raw.endsWith("*")) ||
      (raw.startsWith("_") && raw.endsWith("_"))
    ) {
      const inner = raw.slice(1, -1);
      elements.push(<em key={key}>{parseInline(inner, `${key}_i`)}</em>);
    } else if (raw.startsWith("~~") && raw.endsWith("~~")) {
      const inner = raw.slice(2, -2);
      elements.push(<s key={key}>{parseInline(inner, `${key}_s`)}</s>);
    } else if (raw.startsWith("[") && raw.includes("](") && raw.endsWith(")")) {
      const closeBracket = raw.indexOf("](");
      const label = raw.slice(1, closeBracket);
      const url = raw.slice(closeBracket + 2, -1);
      elements.push(
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="discord-link"
          onClick={(e) => e.stopPropagation()}
        >
          {label}
        </a>
      );
    } else if (raw.startsWith("http://") || raw.startsWith("https://")) {
      elements.push(
        <a
          key={key}
          href={raw}
          target="_blank"
          rel="noopener noreferrer"
          className="discord-link"
          onClick={(e) => e.stopPropagation()}
        >
          {raw}
        </a>
      );
    } else if (raw.startsWith("@") || raw.startsWith("#")) {
      elements.push(
        <span key={key} className="discord-mention">
          {raw}
        </span>
      );
    } else {
      elements.push(raw);
    }

    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements.length === 1 ? elements[0] : elements;
}

// Block Tokenizer: parses code blocks, quotes, headers, lists, paragraphs
export const DiscordMarkdown = memo(({ content }) => {
  if (!content) return null;

  const lines = String(content).split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Multi-line code block: ```[lang]
    if (line.trimStart().startsWith("```")) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push(
        <CodeBlock key={`block_${blocks.length}`} code={codeLines.join("\n")} language={lang} />
      );
      i++;
      continue;
    }

    // Multi-line blockquote: >>>
    if (line.trimStart().startsWith(">>>")) {
      const quoteLines = [line.trimStart().slice(3).trimStart()];
      i++;
      while (i < lines.length) {
        quoteLines.push(lines[i]);
        i++;
      }
      blocks.push(
        <blockquote key={`block_${blocks.length}`} className="discord-quote">
          {quoteLines.map((ql, qIdx) => (
            <div key={`ql_${qIdx}`}>
              {parseInline(ql, `q_${blocks.length}_${qIdx}`) || <br />}
            </div>
          ))}
        </blockquote>
      );
      continue;
    }

    // Single-line blockquote: >
    if (line.trimStart().startsWith(">")) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trimStart().startsWith(">")) {
        quoteLines.push(lines[i].trimStart().slice(1).trimStart());
        i++;
      }
      blocks.push(
        <blockquote key={`block_${blocks.length}`} className="discord-quote">
          {quoteLines.map((ql, qIdx) => (
            <div key={`ql_${qIdx}`}>
              {parseInline(ql, `q_${blocks.length}_${qIdx}`) || <br />}
            </div>
          ))}
        </blockquote>
      );
      continue;
    }

    // Headers: #, ##, ###
    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={`block_${blocks.length}`} className="discord-h1">
          {parseInline(line.slice(2), `h1_${blocks.length}`)}
        </h1>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`block_${blocks.length}`} className="discord-h2">
          {parseInline(line.slice(3), `h2_${blocks.length}`)}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={`block_${blocks.length}`} className="discord-h3">
          {parseInline(line.slice(4), `h3_${blocks.length}`)}
        </h3>
      );
      i++;
      continue;
    }

    // Unordered Lists: - item or * item
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const listItems = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        listItems.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <ul key={`block_${blocks.length}`} className="discord-list">
          {listItems.map((item, lIdx) => (
            <li key={`li_${lIdx}`}>{parseInline(item, `li_${blocks.length}_${lIdx}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Normal paragraph / line
    blocks.push(
      <div key={`block_${blocks.length}`} className="discord-text-line">
        {parseInline(line, `line_${blocks.length}`) || <br />}
      </div>
    );
    i++;
  }

  return <div className="discord-markdown">{blocks}</div>;
});

export default DiscordMarkdown;
