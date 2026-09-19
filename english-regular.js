/* 將可見英文詞組統一為一般字重，並在平板／桌面建立連續順序的攤開對頁。 */
(() => {
  const tokenPattern = /[A-Za-z](?:[A-Za-z0-9.&'’/＋+_—–-]*[A-Za-z0-9])?/g;
  const ignored = 'script,style,noscript,textarea,pre,code,svg,.en-regular,[data-no-en-regular]';
  const facingPageQuery = window.matchMedia('(min-width:700px) and (min-height:700px)');
  let readingState = null;
  let resizeFrame = null;

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

  function getReadingState() {
    if (readingState) return readingState;
    const content = document.getElementById('readingContent');
    if (!content) return null;
    readingState = {
      content,
      nodes: Array.from(content.children),
      isFacingPages: false
    };
    return readingState;
  }

  function createLeaf() {
    const leaf = document.createElement('section');
    leaf.className = 'reading-leaf';
    leaf.setAttribute('aria-label', '故事內容');
    return leaf;
  }

  function createSpread() {
    const spread = document.createElement('div');
    spread.className = 'reading-spread';
    spread.append(createLeaf(), createLeaf());
    return spread;
  }

  function doesLeafOverflow(leaf) {
    return leaf.scrollHeight > leaf.clientHeight + 1;
  }

  function renderFacingPages(forceReflow = false) {
    const state = getReadingState();
    if (!state || (state.isFacingPages && !forceReflow)) return;

    const { content, nodes } = state;
    content.classList.add('facing-pages');
    content.replaceChildren();

    let nodeIndex = 0;
    while (nodeIndex < nodes.length) {
      const spread = createSpread();
      const leaves = Array.from(spread.children);
      content.append(spread);

      for (const leaf of leaves) {
        while (nodeIndex < nodes.length) {
          const node = nodes[nodeIndex];
          leaf.append(node);
          if (doesLeafOverflow(leaf) && leaf.children.length > 1) {
            leaf.removeChild(node);
            break;
          }
          nodeIndex += 1;
        }
      }
    }

    state.isFacingPages = true;
  }

  function renderSingleColumn() {
    const state = getReadingState();
    if (!state || !state.isFacingPages) return;
    state.content.classList.remove('facing-pages');
    state.content.replaceChildren(...state.nodes);
    state.isFacingPages = false;
  }

  function updateReadingLayout(forceReflow = false) {
    if (facingPageQuery.matches) renderFacingPages(forceReflow);
    else renderSingleColumn();
  }

  function scheduleReadingLayout() {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => updateReadingLayout(true));
  }

  function initialize() {
    decorateEnglishText();
    updateReadingLayout();
    facingPageQuery.addEventListener('change', () => updateReadingLayout(true));
    window.addEventListener('resize', scheduleReadingLayout, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
