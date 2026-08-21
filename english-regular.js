/* 將可見英文詞組統一為一般字重，不影響中文排版或互動。 */
(() => {
  const tokenPattern = /[A-Za-z](?:[A-Za-z0-9.&'’/＋+_—–-]*[A-Za-z0-9])?/g;
  const ignored = 'script,style,noscript,textarea,pre,code,svg,.en-regular,[data-no-en-regular]';

  function decorateEnglishText() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !/[A-Za-z]/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || parent.closest(ignored)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach(node => {
      const text = node.nodeValue;
      tokenPattern.lastIndex = 0;
      let match;
      let cursor = 0;
      const fragment = document.createDocumentFragment();
      let changed = false;

      while ((match = tokenPattern.exec(text)) !== null) {
        changed = true;
        if (match.index > cursor) fragment.append(document.createTextNode(text.slice(cursor, match.index)));
        const span = document.createElement('span');
        span.className = 'en-regular';
        span.textContent = match[0];
        fragment.append(span);
        cursor = match.index + match[0].length;
      }

      if (!changed) return;
      if (cursor < text.length) fragment.append(document.createTextNode(text.slice(cursor)));
      node.replaceWith(fragment);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', decorateEnglishText, { once: true });
  } else {
    decorateEnglishText();
  }
})();
