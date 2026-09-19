/* 將可見英文詞組統一為一般字重，並在平板／桌面建立可翻閱的連續攤開對頁。 */
(() => {
  const tokenPattern = /[A-Za-z](?:[A-Za-z0-9.&'’/＋+_—–-]*[A-Za-z0-9])?/g;
  const ignored = 'script,style,noscript,textarea,pre,code,svg,.en-regular,[data-no-en-regular]';
  const facingPageQuery = window.matchMedia('(min-width:700px) and (min-height:700px)');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pageTurnDuration = 420;
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
      spreads: [],
      currentIndex: 0,
      controls: null,
      previousButton: null,
      nextButton: null,
      pageLabel: null,
      isFacingPages: false,
      isTurning: false
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

  function updatePageControls(state) {
    if (!state.controls) return;
    const total = state.spreads.length;
    state.previousButton.disabled = state.isTurning || state.currentIndex === 0;
    state.nextButton.disabled = state.isTurning || state.currentIndex >= total - 1;
    state.pageLabel.textContent = `第 ${state.currentIndex + 1} / ${total} 攤`;
  }

  function showSpread(state, index) {
    state.spreads.forEach((spread, spreadIndex) => {
      spread.hidden = spreadIndex !== index;
      spread.classList.remove('is-turning-next-out', 'is-turning-next-in', 'is-turning-prev-out', 'is-turning-prev-in');
      spread.setAttribute('aria-hidden', spreadIndex === index ? 'false' : 'true');
    });
    state.currentIndex = index;
    updatePageControls(state);
  }

  function changeSpread(state, nextIndex, direction) {
    if (state.isTurning || nextIndex < 0 || nextIndex >= state.spreads.length || nextIndex === state.currentIndex) return;

    const currentSpread = state.spreads[state.currentIndex];
    const nextSpread = state.spreads[nextIndex];
    const outClass = direction === 'next' ? 'is-turning-next-out' : 'is-turning-prev-out';
    const inClass = direction === 'next' ? 'is-turning-next-in' : 'is-turning-prev-in';
    const duration = reducedMotionQuery.matches ? 0 : pageTurnDuration;

    state.isTurning = true;
    updatePageControls(state);

    if (duration === 0) {
      showSpread(state, nextIndex);
      state.isTurning = false;
      updatePageControls(state);
      return;
    }

    currentSpread.classList.add(outClass);
    window.setTimeout(() => {
      currentSpread.hidden = true;
      currentSpread.classList.remove(outClass);
      currentSpread.setAttribute('aria-hidden', 'true');
      nextSpread.hidden = false;
      nextSpread.setAttribute('aria-hidden', 'false');
      nextSpread.classList.add(inClass);
      state.currentIndex = nextIndex;
      updatePageControls(state);

      window.setTimeout(() => {
        nextSpread.classList.remove(inClass);
        state.isTurning = false;
        updatePageControls(state);
      }, duration * 0.48);
    }, duration * 0.52);
  }

  function createPageControls(state) {
    if (state.controls) return;

    const controls = document.createElement('nav');
    controls.className = 'book-page-controls';
    controls.setAttribute('aria-label', '書本翻頁控制');

    const previousButton = document.createElement('button');
    previousButton.type = 'button';
    previousButton.className = 'book-page-btn';
    previousButton.textContent = '← 上一攤';
    previousButton.setAttribute('aria-label', '上一組書頁');
    previousButton.addEventListener('click', () => changeSpread(state, state.currentIndex - 1, 'previous'));

    const pageLabel = document.createElement('span');
    pageLabel.className = 'book-page-label';
    pageLabel.setAttribute('aria-live', 'polite');

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'book-page-btn book-page-btn-next';
    nextButton.textContent = '下一攤 →';
    nextButton.setAttribute('aria-label', '下一組書頁');
    nextButton.addEventListener('click', () => changeSpread(state, state.currentIndex + 1, 'next'));

    controls.append(previousButton, pageLabel, nextButton);
    state.content.insertAdjacentElement('beforebegin', controls);
    state.controls = controls;
    state.previousButton = previousButton;
    state.nextButton = nextButton;
    state.pageLabel = pageLabel;
  }

  function removePageControls(state) {
    if (!state.controls) return;
    state.controls.remove();
    state.controls = null;
    state.previousButton = null;
    state.nextButton = null;
    state.pageLabel = null;
  }

  function renderFacingPages(forceReflow = false) {
    const state = getReadingState();
    if (!state || (state.isFacingPages && !forceReflow)) return;

    const { content, nodes } = state;
    content.classList.add('facing-pages');
    content.replaceChildren();
    state.spreads = [];
    state.currentIndex = 0;
    state.isTurning = false;

    let nodeIndex = 0;
    while (nodeIndex < nodes.length) {
      const spread = createSpread();
      const leaves = Array.from(spread.children);
      content.append(spread);
      state.spreads.push(spread);

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
    createPageControls(state);
    showSpread(state, 0);
  }

  function renderSingleColumn() {
    const state = getReadingState();
    if (!state || !state.isFacingPages) return;
    state.content.classList.remove('facing-pages');
    state.content.replaceChildren(...state.nodes);
    state.spreads = [];
    state.currentIndex = 0;
    state.isTurning = false;
    state.isFacingPages = false;
    removePageControls(state);
  }

  function updateReadingLayout(forceReflow = false) {
    if (facingPageQuery.matches) renderFacingPages(forceReflow);
    else renderSingleColumn();
  }

  function scheduleReadingLayout() {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => updateReadingLayout(true));
  }

  function handleBookKeys(event) {
    const state = getReadingState();
    const target = event.target;
    const isEditable = target instanceof Element && target.matches('input, textarea, select, [contenteditable="true"]');
    if (!state || !state.isFacingPages || state.isTurning || isEditable) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      changeSpread(state, state.currentIndex - 1, 'previous');
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      changeSpread(state, state.currentIndex + 1, 'next');
    }
  }

  function initialize() {
    decorateEnglishText();
    updateReadingLayout();
    facingPageQuery.addEventListener('change', () => updateReadingLayout(true));
    window.addEventListener('resize', scheduleReadingLayout, { passive: true });
    document.addEventListener('keydown', handleBookKeys);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
