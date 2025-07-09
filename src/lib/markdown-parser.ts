import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const parseAIResponse = (markdown: string): string => {
  // Utility to escape HTML to prevent XSS
  const escapeHtml = (unsafe: string): string => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Utility to convert markdown table to HTML table
  const markdownTableToHtml = (tableText: string): string => {
    const rows = tableText.trim().split('\n');
    const headers = rows[0].split('|').map(h => h.trim()).filter(Boolean);
    const alignments = rows[1].split('|').map(a => a.trim()).filter(Boolean);
    const data = rows.slice(2).map(row => 
      row.split('|').map(cell => cell.trim()).filter(Boolean)
    );

    let htmlTable = '<table class="technical-data-table">';
    
    // Table Header
    htmlTable += '<thead><tr>';
    headers.forEach(header => {
      htmlTable += `<th>${escapeHtml(header)}</th>`;
    });
    htmlTable += '</thead></tr>';

    // Table Body
    htmlTable += '<tbody>';
    data.forEach(row => {
      htmlTable += '<tr>';
      row.forEach(cell => {
        htmlTable += `<td>${escapeHtml(cell)}</td>`;
      });
      htmlTable += '</tr>';
    });
    htmlTable += '</tbody></table>';

    return htmlTable;
  };

  // Main parsing function
  const parseSection = (sectionTitle: string, sectionContent: string): string => {
    const cleanTitle = sectionTitle.replace(/^#+\s*/, '').trim();
    const emoji = cleanTitle.match(/^([^\s]+)/)?.[1] || '';
    const title = cleanTitle.replace(/^[^\s]+\s*/, '').trim();

    // Section-specific parsing
    switch (emoji) {
      case '🛞': // Part Identification
        const bulletPoints = sectionContent
          .split('\n')
          .filter(line => line.trim().startsWith('- '))
          .map(line => {
            const [label, value] = line.replace(/^-\s*/, '').split(':').map(s => s.trim());
            return `
              <div class="part-id-item">
                <strong>${escapeHtml(label)}:</strong> 
                <span>${escapeHtml(value)}</span>
              </div>
            `;
          })
          .join('');

        return `
          <section class="part-id">
            <h2>${escapeHtml(title)}</h2>
            <div class="part-id-details">
              ${bulletPoints}
            </div>
          </section>
        `;

      case '📘': // Technical Description
        const paragraphs = sectionContent.split('\n\n');
        const mainDescription = paragraphs[0];
        
        let useCases = '';
        let differences = '';

        paragraphs.forEach(para => {
          if (para.includes('Common Use Cases:')) {
            useCases = para.replace('Common Use Cases:', '')
              .split('\n')
              .filter(line => line.trim().startsWith('- '))
              .map(line => `<li>${escapeHtml(line.replace(/^-\s*/, '').trim())}</li>`)
              .join('');
          }

          if (para.includes('Differences from Similar Parts:')) {
            differences = para.replace('Differences from Similar Parts:', '')
              .split('\n')
              .filter(line => line.trim().startsWith('- '))
              .map(line => `<li>${escapeHtml(line.replace(/^-\s*/, '').trim())}</li>`)
              .join('');
          }
        });

        return `
          <section class="tech-desc">
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(mainDescription)}</p>
            
            ${useCases ? `
              <h3>Common Use Cases</h3>
              <ul class="use-cases">
                ${useCases}
              </ul>
            ` : ''}
            
            ${differences ? `
              <h3>Differences from Similar Parts</h3>
              <ul class="part-differences">
                ${differences}
              </ul>
            ` : ''}
          </section>
        `;

      case '📊': // Technical Data Sheet
        const tableMatch = sectionContent.match(/\|.*\|/g);
        const tableHtml = tableMatch ? markdownTableToHtml(tableMatch.join('\n')) : '';

        return `
          <section class="data-sheet">
            <h2>${escapeHtml(title)}</h2>
            ${tableHtml}
          </section>
        `;

      default: // Generic section
        return `
          <section class="generic-section">
            <h2>${escapeHtml(cleanTitle)}</h2>
            <div class="section-content">
              ${escapeHtml(sectionContent)}
            </div>
          </section>
        `;
    }
  };

  // Split the entire markdown into sections
  const sectionRegex = /^(#+\s*[^\n]+)\n((?:(?!^#+\s*[^\n]+)[\s\S])*)/gm;
  let match;
  let parsedSections = '';

  while ((match = sectionRegex.exec(markdown)) !== null) {
    const [, sectionTitle, sectionContent] = match;
    parsedSections += parseSection(sectionTitle, sectionContent.trim());
  }

  return parsedSections;
};

// Optional: Add a type for better TypeScript integration
export type ParsedAIResponse = {
  html: string;
  sections: string[];
}; 

export const parseMarkdownSections = (markdown: string) => {
  const sectionRegex = /^(#+\s*[^\n]+)\n((?:(?!^#+\s*[^\n]+)[\s\S])*)/gm;
  const sections: { title: string; content: string; emoji?: string }[] = [];

  let match;
  while ((match = sectionRegex.exec(markdown)) !== null) {
    const [, sectionTitle, sectionContent] = match;
    const cleanTitle = sectionTitle.replace(/^#+\s*/, '').trim();
    const emoji = cleanTitle.match(/^([^\s]+)/)?.[1];
    const title = cleanTitle.replace(/^[^\s]+\s*/, '').trim();

    sections.push({
      title,
      content: sectionContent.trim(),
      emoji
    });
  }

  return sections;
};

interface MarkdownCardProps {
  title: string; 
  content: string; 
  emoji?: string;
  className?: string;
}

export const MarkdownCard: React.FC<MarkdownCardProps> = (props) => {
  const { 
    title, 
    content, 
    emoji, 
    className = '' 
  } = props;

  const getEmojiIcon = React.useCallback((emoji?: string) => {
    const emojiMap: { [key: string]: string } = {
      '🛞': '🛞',
      '📘': '📘',
      '📊': '📊',
    };
    return emojiMap[emoji || ''] || '📝';
  }, []);

  return React.createElement('div', {
    className: `
      bg-gray-800 
      text-white 
      p-6 
      rounded-xl 
      border 
      border-gray-700 
      shadow-md 
      mb-4 
      transition-all 
      duration-300 
      hover:shadow-lg 
      ${className}
    `.trim()
  }, [
    React.createElement('div', { 
      key: 'header',
      className: 'flex items-center mb-4 pb-3 border-b border-gray-700' 
    }, [
      React.createElement('span', { 
        key: 'emoji', 
        className: 'text-2xl mr-3' 
      }, getEmojiIcon(emoji)),
      React.createElement('h2', { 
        key: 'title', 
        className: 'text-xl font-bold text-gray-200' 
      }, title)
    ]),
    React.createElement('div', { 
      key: 'content',
      className: 'prose prose-invert max-w-none' 
    }, [
      React.createElement(ReactMarkdown, {
        key: 'markdown',
        remarkPlugins: [remarkGfm],
        components: {
          h3: ({node, ...props}) => React.createElement('h3', {
            className: 'text-lg font-semibold text-gray-300 mt-4 mb-2',
            ...props
          }),
          ul: ({node, ...props}) => React.createElement('ul', {
            className: 'list-disc list-inside text-gray-300 space-y-2',
            ...props
          }),
          li: ({node, ...props}) => React.createElement('li', {
            className: 'pl-2 marker:text-blue-400',
            ...props
          }),
          table: ({node, ...props}) => React.createElement('div', {
            className: 'overflow-x-auto'
          }, [
            React.createElement('table', {
              className: 'w-full border-collapse border border-gray-700 text-sm',
              ...props
            })
          ]),
          th: ({node, ...props}) => React.createElement('th', {
            className: 'border border-gray-700 bg-gray-900 p-2 text-left',
            ...props
          }),
          td: ({node, ...props}) => React.createElement('td', {
            className: 'border border-gray-700 p-2',
            ...props
          })
        }
      }, content)
    ])
  ])
};