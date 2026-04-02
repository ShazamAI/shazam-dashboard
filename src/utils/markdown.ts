/**
 * Very simple markdown renderer for task output.
 * Handles: headers, bold, italic, code blocks, inline code, links, lists.
 */
export function renderMarkdown(text: string): string {
  if (!text) return '';

  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Code blocks (triple backtick)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="md-h2">$1</h2>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="md-li">$1</li>')
    .replace(/^\* (.+)$/gm, '<li class="md-li">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="md-li-num">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="md-p">')
    .replace(/\n/g, '<br/>');

  return `<div class="md-content"><p class="md-p">${html}</p></div>`;
}
