/**
 * Lightweight markdown renderer for agent responses.
 * Handles: headers, bold, italic, bullet/numbered lists, tables, code blocks.
 * No external dependencies.
 */
export default function SimpleMarkdown({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={elements.length} className="bg-gray-100 rounded p-3 text-xs font-mono overflow-x-auto my-2">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Table (lines starting with |)
    if (line.trim().startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines
        .filter(l => !/^\|[\s-:|]+\|$/.test(l.trim())) // skip separator rows
        .map(l => l.split('|').slice(1, -1).map(c => c.trim()));

      if (rows.length > 0) {
        elements.push(
          <div key={elements.length} className="overflow-x-auto my-2">
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr>
                  {rows[0].map((cell, ci) => (
                    <th key={ci} className="text-left px-2 py-1.5 border-b border-gray-200 font-semibold bg-gray-50">
                      {inline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2 py-1.5 border-b border-gray-100">
                        {inline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(<h4 key={elements.length} className="font-semibold text-sm mt-3 mb-1">{inline(line.slice(4))}</h4>);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={elements.length} className="font-semibold text-sm mt-3 mb-1">{inline(line.slice(3))}</h3>);
      i++; continue;
    }
    if (line.startsWith('# ')) {
      elements.push(<h2 key={elements.length} className="font-bold text-base mt-3 mb-1">{inline(line.slice(2))}</h2>);
      i++; continue;
    }

    // Bullet list
    if (/^[\s]*[-*]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[\s]*[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[-*]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={elements.length} className="list-disc list-inside space-y-0.5 my-1">
          {items.map((item, idx) => <li key={idx}>{inline(item)}</li>)}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={elements.length} className="list-decimal list-inside space-y-0.5 my-1">
          {items.map((item, idx) => <li key={idx}>{inline(item)}</li>)}
        </ol>
      );
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++; continue;
    }

    // Regular paragraph
    elements.push(<p key={elements.length} className="my-1">{inline(line)}</p>);
    i++;
  }

  return <div className="space-y-0.5 leading-relaxed">{elements}</div>;
}

/** Render inline formatting: **bold**, *italic*, `code` */
function inline(text) {
  if (!text) return text;
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2]) parts.push(<strong key={match.index}>{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={match.index}>{match[3]}</em>);
    else if (match[4]) parts.push(<code key={match.index} className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{match[4]}</code>);
    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}
