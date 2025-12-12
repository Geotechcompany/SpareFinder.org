import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const parseAIResponse = (markdown: string): string => {
  // Utility to convert URLs, emails, and markdown formatting to HTML
  const convertLinksToHtml = (text: string): string => {
    // Convert markdown bold **text** to HTML bold
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-gray-900 dark:text-gray-100">$1</strong>');
    
    // Convert markdown italic *text* to HTML italic (but avoid conflicting with bold)
    text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="italic text-gray-800 dark:text-gray-200">$1</em>');
    
    // Convert markdown links [text](url) to HTML links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-400 underline">$1</a>');
    
    // Convert bare URLs to clickable links
    text = text.replace(/(^|[\s\[\(])((https?:\/\/[^\s\)\],]+))/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-400 underline break-words">$2</a>');
    
    // Convert www.domain.com to clickable links
    text = text.replace(/(^|[\s\[\(])(www\.[^\s\)\],]+)/g, '$1<a href="http://$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-400 underline break-words">$2</a>');
    
    // Convert email addresses to clickable mailto links
    text = text.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1" class="text-blue-500 hover:text-blue-400 underline">$1</a>');
    
    // Convert markdown inline code `code` to HTML code
    text = text.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
    
    return text;
  };

  // Utility to escape HTML while preserving our converted links and formatting
  const escapeHtmlButPreserveLinks = (unsafe: string): string => {
    // First convert links and formatting
    let safe = convertLinksToHtml(unsafe);
    
    // Then escape other HTML characters, but preserve our generated HTML tags
    const htmlPlaceholders: string[] = [];
    
    // Replace HTML tags with placeholders
    safe = safe.replace(/<(a [^>]*>.*?<\/a|strong [^>]*>.*?<\/strong|em [^>]*>.*?<\/em|code [^>]*>.*?<\/code)>/g, (match) => {
      const placeholder = `__HTML_PLACEHOLDER_${htmlPlaceholders.length}__`;
      htmlPlaceholders.push(match);
      return placeholder;
    });
    
    // Escape HTML characters
    safe = safe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
    
    // Restore HTML tags
    htmlPlaceholders.forEach((html, index) => {
      safe = safe.replace(`__HTML_PLACEHOLDER_${index}__`, html);
    });
    
    return safe;
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
      htmlTable += `<th>${escapeHtmlButPreserveLinks(header)}</th>`;
    });
    htmlTable += '</thead></tr>';

    // Table Body
    htmlTable += '<tbody>';
    data.forEach(row => {
      htmlTable += '<tr>';
      row.forEach(cell => {
        htmlTable += `<td>${escapeHtmlButPreserveLinks(cell)}</td>`;
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

    // Remove sections we don't want to render
    const normalized = cleanTitle.toLowerCase();
    if (normalized.includes('actionable next steps')) {
      return '';
    }

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
                <strong>${escapeHtmlButPreserveLinks(label)}:</strong> 
                <span>${escapeHtmlButPreserveLinks(value)}</span>
              </div>
            `;
          })
          .join('');

        return `
          <section class="part-id">
            <h2>${escapeHtmlButPreserveLinks(title)}</h2>
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
              .map(line => `<li>${escapeHtmlButPreserveLinks(line.replace(/^-\s*/, '').trim())}</li>`)
              .join('');
          }

          if (para.includes('Differences from Similar Parts:')) {
            differences = para.replace('Differences from Similar Parts:', '')
              .split('\n')
              .filter(line => line.trim().startsWith('- '))
              .map(line => `<li>${escapeHtmlButPreserveLinks(line.replace(/^-\s*/, '').trim())}</li>`)
              .join('');
          }
        });

        return `
          <section class="tech-desc">
            <h2>${escapeHtmlButPreserveLinks(title)}</h2>
            <p>${escapeHtmlButPreserveLinks(mainDescription)}</p>
            
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
            <h2>${escapeHtmlButPreserveLinks(title)}</h2>
            ${tableHtml}
          </section>
        `;

      case '🌍': // Where to Buy - Special handling for supplier information
        const supplierContent = sectionContent
          .split('\n')
          .map(line => {
            if (line.trim().startsWith('- ')) {
              return `<div class="supplier-line">${escapeHtmlButPreserveLinks(line.replace(/^-\s*/, '').trim())}</div>`;
            }
            return escapeHtmlButPreserveLinks(line);
          })
          .join('<br>');

        return `
          <section class="where-to-buy">
            <h2>${escapeHtmlButPreserveLinks(title)}</h2>
            <div class="supplier-content">
              ${supplierContent}
            </div>
          </section>
        `;

      default: // Generic section
        // Special handling for Market Chart Data to render responsive charts using pure HTML/CSS
        if (/market\s*chart/i.test(cleanTitle) || /market\s*insights/i.test(cleanTitle)) {
          // Prefer parsing inside fenced code block if provided
          const fencedMatch = sectionContent.match(/```[\s\S]*?```/m);
          const contentForParsing = fencedMatch
            ? fencedMatch[0].replace(/```/g, "").trim()
            : sectionContent;

          // Extract Price Trend (supports: "Price Trend (USD)" lines like: 2023: $550)
          const priceBlockMatch = contentForParsing.match(/Price\s*Trend[^\n]*\n([\s\S]*?)(?:\n\n|$)/i);
          const priceLines = (priceBlockMatch?.[1] || '')
            .split(/\n+/)
            .map(l => l.trim())
            .filter(l => /\d{4}\s*:\s*\$?\d+/i.test(l));
          const priceTrend = priceLines
            .map(l => {
              const m = l.match(/(\d{4})\s*:\s*\$?([\d,.]+)/);
              if (!m) return null as any;
              return { year: m[1], price: Number(m[2].replace(/,/g, '')) };
            })
            .filter(Boolean) as { year: string; price: number }[];

          // Extract Supplier Distribution ("Region: 60%")
          const distBlockMatch = contentForParsing.match(/Supplier\s*Distribution[^\n]*\n([\s\S]*?)(?:\n\n|$)/i);
          const distLines = (distBlockMatch?.[1] || '')
            .split(/\n+/)
            .map(l => l.trim())
            .filter(l => /:\s*\d+%/.test(l));
          const distribution = distLines
            .map(l => {
              const m = l.match(/([^:]+):\s*(\d+)%/);
              if (!m) return null as any;
              return { name: m[1].trim(), value: Number(m[2]) };
            })
            .filter(Boolean) as { name: string; value: number }[];

          const maxPrice = priceTrend.length ? Math.max(...priceTrend.map(p => p.price)) : 0;

          const priceChartHtml = priceTrend.length
            ? `
              <div class="w-full overflow-x-auto">
                <div class="grid grid-cols-12 gap-2 text-xs text-gray-400 mb-2">
                  ${priceTrend
                    .map(p => `<span class="col-span-3 sm:col-span-2">${escapeHtmlButPreserveLinks(p.year)}</span>`)
                    .join('')}
                </div>
                <div class="flex items-end gap-2 h-28 sm:h-32" role="img" aria-label="Price Trend Chart">
                  ${priceTrend
                    .map(p => {
                      const h = maxPrice ? Math.max(8, Math.round((p.price / maxPrice) * 100)) : 8;
                      return `<div class="flex-1 min-w-[28px] sm:min-w-[36px] bg-purple-500/20 border border-purple-400/40 rounded-t-md relative" style="height:${h}%">
                        <span class="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-gray-300">$${p.price.toLocaleString()}</span>
                      </div>`;
                    })
                    .join('')}
                </div>
              </div>
            `
            : '';

          const distBarsHtml = distribution.length
            ? `
              <div class="space-y-2">
                ${distribution
                  .map(d => `
                    <div class="w-full">
                      <div class="flex justify-between text-xs text-gray-300 mb-1">
                        <span>${escapeHtmlButPreserveLinks(d.name)}</span>
                        <span>${d.value}%</span>
                      </div>
                      <div class="w-full h-2.5 bg-gray-700/70 rounded">
                        <div class="h-2.5 rounded bg-gradient-to-r from-purple-500 to-blue-500" style="width:${Math.min(
                          100,
                          d.value
                        )}%"></div>
                      </div>
                    </div>
                  `)
                  .join('')}
              </div>
            `
            : '';

          const anyContent = priceChartHtml || distBarsHtml;
          if (anyContent) {
            return `
              <section class="market-charts">
                <h2>${escapeHtmlButPreserveLinks(title || 'Market Chart Data')}</h2>
                <div class="grid gap-6">
                  ${priceChartHtml ? `<div><h3 class="text-sm text-gray-300 mb-2">Price Trend (USD)</h3>${priceChartHtml}</div>` : ''}
                  ${distBarsHtml ? `<div><h3 class="text-sm text-gray-300 mb-2">Supplier Distribution</h3>${distBarsHtml}
                    <div class="flex flex-wrap gap-3 mt-3">
                      ${distribution
                        .map((d, i) => `
                          <div class="relative">
                            <svg width="140" height="140" viewBox="0 0 36 36" class="block">
                              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#374151" stroke-width="3"></circle>
                              <circle cx="18" cy="18" r="15.915" fill="none" stroke="url(#grad-${i})" stroke-width="3" stroke-dasharray="${d.value}, 100" stroke-linecap="round" transform="rotate(-90 18 18)"></circle>
                              <defs>
                                <linearGradient id="grad-${i}" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stop-color="#8b5cf6"/>
                                  <stop offset="100%" stop-color="#06b6d4"/>
                                </linearGradient>
                              </defs>
                              <text x="18" y="20.5" text-anchor="middle" class="fill-gray-200" font-size="6">${d.value}%</text>
                            </svg>
                            <div class="text-center text-xs text-gray-300 mt-1">${escapeHtmlButPreserveLinks(d.name)}</div>
                          </div>
                        `)
                        .join('')}
                    </div>
                  </div>` : ''}
                </div>
              </section>
            `;
          }
        }

        // Convert line breaks and basic formatting for generic sections
        const processedContent = sectionContent
          .split('\n')
          .map(line => {
            if (line.trim().startsWith('- ')) {
              return `<li>${escapeHtmlButPreserveLinks(line.replace(/^-\s*/, '').trim())}</li>`;
            }
            return escapeHtmlButPreserveLinks(line.trim());
          })
          .join('<br>');

        return `
          <section class="generic-section">
            <h2>${escapeHtmlButPreserveLinks(cleanTitle)}</h2>
            <div class="section-content">
              ${processedContent}
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
  // Enhanced regex to handle various markdown heading formats
  const sectionRegex = /^(#+\s*[^\n]+)\n((?:(?!^#+\s*[^\n]+)[\s\S])*)/gm;
  const sections: { title: string; content: string; emoji?: string; level?: number }[] = [];

  let match;
  while ((match = sectionRegex.exec(markdown)) !== null) {
    const [, sectionTitle, sectionContent] = match;
    
    // Extract heading level
    const levelMatch = sectionTitle.match(/^(#+)/);
    const level = levelMatch ? levelMatch[1].length : 1;
    
    const cleanTitle = sectionTitle.replace(/^#+\s*/, '').trim();
    
    // Enhanced emoji extraction - now supports more emojis
    const emojiMatch = cleanTitle.match(/^([🔧📊🚗💰🌍📈📤🛞📘🔍⚙️🎯📋💡🔗📞📧🏷️📦⭐🔄📝🎨🔧]+)/);
    const emoji = emojiMatch ? emojiMatch[1] : undefined;
    
    // Clean title by removing emoji and extra spaces
    const title = cleanTitle.replace(/^[🔧📊🚗💰🌍📈📤🛞📘🔍⚙️🎯📋💡🔗📞📧🏷️📦⭐🔄📝🎨🔧]+\s*/, '').trim();

    // Skip empty sections
    if (!title && !sectionContent.trim()) continue;

    sections.push({
      title: title || 'Additional Information',
      content: sectionContent.trim(),
      emoji,
      level
    });
  }

  // If no sections found with headers, treat entire content as one section
  if (sections.length === 0 && markdown.trim()) {
    sections.push({
      title: 'Analysis Results',
      content: markdown.trim(),
      emoji: '📋'
    });
  }

  return sections;
};

interface MarkdownCardProps {
  title: string; 
  content: string; 
  emoji?: string;
  className?: string;
  level?: number;
}

export const MarkdownCard: React.FC<MarkdownCardProps> = (props) => {
  const { 
    title, 
    content, 
    emoji, 
    className = '',
    level = 1
  } = props;

  // Enhanced emoji mapping with more Manufacturing and technical emojis
  const getEmojiIcon = React.useCallback((emoji?: string) => {
    const emojiMap: { [key: string]: string } = {
      '🛞': '🛞', // Part Identification
      '📘': '📘', // Technical Description  
      '📊': '📊', // Technical Data Sheet
      '🔧': '🔧', // Technical Specifications
      '🚗': '🚗', // Compatible Vehicles
      '💰': '💰', // Pricing & Availability
      '🌍': '🌍', // Where to Buy
      '📈': '📈', // Confidence Score
      '📤': '📤', // Additional Instructions
      '🔍': '🔍', // Analysis
      '⚙️': '⚙️', // Mechanical Parts
      '🎯': '🎯', // Accuracy/Targeting
      '📋': '📋', // General Information
      '💡': '💡', // Tips/Suggestions
      '🔗': '🔗', // Links
      '📞': '📞', // Contact
      '📧': '📧', // Email
      '🏷️': '🏷️', // Labels/Tags
      '📦': '📦', // Products
      '⭐': '⭐', // Rating/Quality
      '🔄': '🔄', // Process/Workflow
      '📝': '📝', // Documentation
      '🎨': '🎨' // Design/Styling
    };
    return emojiMap[emoji || ''] || '📋';
  }, []);

  // Get section-specific styling based on content type
  const getSectionStyling = React.useCallback((title: string, emoji?: string) => {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('technical') || lowerTitle.includes('specification') || emoji === '🔧' || emoji === '📊') {
      return 'bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30';
    }
    if (lowerTitle.includes('pricing') || lowerTitle.includes('cost') || emoji === '💰') {
      return 'bg-gradient-to-br from-yellow-900/20 to-amber-900/20 border-yellow-500/30';
    }
    if (lowerTitle.includes('vehicle') || lowerTitle.includes('compatible') || emoji === '🚗') {
      return 'bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-500/30';
    }
    if (lowerTitle.includes('where') || lowerTitle.includes('buy') || emoji === '🌍') {
      return 'bg-gradient-to-br from-purple-900/20 to-violet-900/20 border-purple-500/30';
    }
    return 'bg-gray-800/50 border-gray-700/50';
  }, []);

  // State for expanded content
  const [isExpanded, setIsExpanded] = React.useState(false);
  const contentLength = content.length;
  const shouldShowMore = contentLength > 1000; // Show expand for content longer than 1000 chars
  const displayContent = shouldShowMore && !isExpanded ? content.substring(0, 1000) + '...' : content;

  return React.createElement('div', {
    className: `
      ${getSectionStyling(title, emoji)}
      text-white 
      p-6 
      rounded-xl 
      border 
      shadow-md 
      mb-4 
      transition-all 
      duration-300 
      hover:shadow-lg 
      hover:border-opacity-60
      w-full
      ${className}
    `.trim()
  }, [
    React.createElement('div', { 
      key: 'header',
      className: 'flex items-center justify-between mb-4 pb-3 border-b border-current border-opacity-20' 
    }, [
      React.createElement('div', {
        key: 'header-content',
        className: 'flex items-center'
      }, [
        React.createElement('span', { 
          key: 'emoji', 
          className: 'text-2xl mr-3 filter drop-shadow-sm' 
        }, getEmojiIcon(emoji)),
        React.createElement(`h${Math.min(level + 1, 6)}`, { 
          key: 'title', 
          className: `text-xl font-bold text-gray-100 ${level === 1 ? 'text-2xl' : level === 2 ? 'text-xl' : 'text-lg'}` 
        }, title)
      ]),
      shouldShowMore && React.createElement('button', {
        key: 'expand-button',
        onClick: () => setIsExpanded(!isExpanded),
        className: 'text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 hover:text-white transition-colors',
      }, isExpanded ? 'Show Less' : 'Show More')
    ]),
    React.createElement('div', { 
      key: 'content',
      className: 'prose prose-invert max-w-none prose-sm overflow-visible'
    }, [
      React.createElement(ReactMarkdown, {
        key: 'markdown',
        remarkPlugins: [remarkGfm],
        components: {
          // Enhanced heading styling
          h1: ({node, ...props}) => React.createElement('h1', {
            className: 'text-2xl font-bold text-gray-100 mt-6 mb-4 border-b border-gray-600 pb-2',
            ...props
          }),
          h2: ({node, ...props}) => React.createElement('h2', {
            className: 'text-xl font-semibold text-gray-200 mt-5 mb-3',
            ...props
          }),
          h3: ({node, ...props}) => React.createElement('h3', {
            className: 'text-lg font-semibold text-gray-300 mt-4 mb-2',
            ...props
          }),
          
          // Enhanced paragraph styling
          p: ({node, ...props}) => React.createElement('p', {
            className: 'text-gray-300 leading-relaxed mb-3 overflow-visible',
            ...props
          }),
          
          // Enhanced list styling
          ul: ({node, ...props}) => React.createElement('ul', {
            className: 'list-disc list-inside text-gray-300 space-y-2 ml-4 overflow-visible',
            ...props
          }),
          ol: ({node, ...props}) => React.createElement('ol', {
            className: 'list-decimal list-inside text-gray-300 space-y-2 ml-4 overflow-visible',
            ...props
          }),
          li: ({node, ...props}) => React.createElement('li', {
            className: 'pl-2 marker:text-blue-400 leading-relaxed overflow-visible',
            ...props
          }),
          
          // Enhanced table styling with better overflow handling
          table: ({node, ...props}) => React.createElement('div', {
            className: 'overflow-x-auto my-4 rounded-lg border border-gray-600 shadow-lg w-full'
          }, [
            React.createElement('table', {
              className: 'w-full min-w-full border-collapse bg-gray-800/80 text-sm',
              ...props
            })
          ]),
          thead: ({node, ...props}) => React.createElement('thead', {
            className: 'bg-gray-700/80',
            ...props
          }),
          th: ({node, ...props}) => React.createElement('th', {
            className: 'border border-gray-600 bg-gray-700 p-3 text-left font-semibold text-gray-100 whitespace-nowrap',
            ...props
          }),
          td: ({node, ...props}) => React.createElement('td', {
            className: 'border border-gray-600 p-3 text-gray-300 break-words',
            ...props
          }),
          
          // Enhanced link styling
          a: ({node, href, children, ...props}) => React.createElement('a', {
            className: 'text-blue-400 hover:text-blue-300 underline decoration-blue-400/50 hover:decoration-blue-300 transition-colors break-words',
            href,
            target: href?.startsWith('http') ? '_blank' : undefined,
            rel: href?.startsWith('http') ? 'noopener noreferrer' : undefined,
            ...props
          }, children),
          
          // Enhanced code and pre styling
          code: ({node, inline, ...props}: any) => React.createElement('code', {
            className: inline 
              ? 'bg-gray-700 text-green-300 px-1.5 py-0.5 rounded text-sm font-mono break-words'
              : 'block bg-gray-900 text-green-300 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap',
            ...props
          }),
          pre: ({node, ...props}) => React.createElement('pre', {
            className: 'bg-gray-900 border border-gray-700 rounded-lg p-4 overflow-x-auto my-4 whitespace-pre-wrap',
            ...props
          }),
          
          // Enhanced blockquote styling
          blockquote: ({node, ...props}) => React.createElement('blockquote', {
            className: 'border-l-4 border-blue-500 pl-4 py-2 bg-gray-800/50 rounded-r-lg my-4 italic text-gray-400 overflow-visible',
            ...props
          }),
          
          // Enhanced strong/bold styling
          strong: ({node, ...props}) => React.createElement('strong', {
            className: 'font-bold text-white',
            ...props
          }),
          
          // Enhanced emphasis/italic styling
          em: ({node, ...props}) => React.createElement('em', {
            className: 'italic text-gray-200',
            ...props
          })
        }
      }, displayContent)
    ])
  ])
};