/* 將可見英文詞組統一為一般字重，並在不同裝置提供合適的分頁閱讀方式。 */
(() => {
  const tokenPattern = /[A-Za-z](?:[A-Za-z0-9.&'’/＋+_—–-]*[A-Za-z0-9])?/g;
  const ignored = 'script,style,noscript,textarea,pre,code,svg,.en-regular,[data-no-en-regular]';
  const facingPageQuery = window.matchMedia('(min-width:700px) and (min-height:700px)');
  const mobilePageQuery = window.matchMedia('(max-width:699px), ((max-height:699px) and (pointer:coarse))');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pageTurnDuration = 680;
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
      items: [],
      currentIndex: 0,
      mode: 'single',
      controls: null,
      previousButton: null,
      nextButton: null,
      pageLabel: null,
      isTurning: false,
      swipe: null,
      gestureCleanup: null
    };
    return readingState;
  }

  function createLeaf(className, label) {
    const leaf = document.createElement('section');
    leaf.className = className;
    leaf.setAttribute('aria-label', label);
    return leaf;
  }

  function createSpread() {
    const spread = document.createElement('div');
    spread.className = 'reading-spread';
    spread.append(createLeaf('reading-leaf', '故事左頁'), createLeaf('reading-leaf', '故事右頁'));
    return spread;
  }

  function createMobilePage() {
    return createLeaf('mobile-reading-page', '故事內容');
  }

  function doesLeafOverflow(leaf) {
    return leaf.scrollHeight > leaf.clientHeight + 1;
  }

  function updatePageControls(state) {
    if (!state.controls) return;
    const total = state.items.length;
    state.previousButton.disabled = state.isTurning || state.currentIndex === 0;
    state.nextButton.disabled = state.isTurning || state.currentIndex >= total - 1;
    const unit = state.mode === 'facing' ? '攤' : '頁';
    const hint = state.mode === 'mobile' ? ' · 左右滑動翻頁' : '';
    state.pageLabel.textContent = `第 ${state.currentIndex + 1} / ${total} ${unit}${hint}`;
  }

  function showItem(state, index) {
    state.items.forEach((item, itemIndex) => {
      item.hidden = itemIndex !== index;
      item.classList.remove('is-turning-next-out', 'is-turning-next-in', 'is-turning-prev-out', 'is-turning-prev-in');
      item.setAttribute('aria-hidden', itemIndex === index ? 'false' : 'true');
    });
    state.currentIndex = index;
    updatePageControls(state);
  }

  function changeItem(state, nextIndex, direction) {
    if (state.isTurning || nextIndex < 0 || nextIndex >= state.items.length || nextIndex === state.currentIndex) return;

    const currentItem = state.items[state.currentIndex];
    const nextItem = state.items[nextIndex];
    const outClass = direction === 'next' ? 'is-turning-next-out' : 'is-turning-prev-out';
    const inClass = direction === 'next' ? 'is-turning-next-in' : 'is-turning-prev-in';
    const duration = reducedMotionQuery.matches ? 0 : pageTurnDuration;

    state.isTurning = true;
    updatePageControls(state);

    if (duration === 0) {
      showItem(state, nextIndex);
      state.isTurning = false;
      updatePageControls(state);
      return;
    }

    currentItem.classList.add(outClass);
    window.setTimeout(() => {
      currentItem.hidden = true;
      currentItem.classList.remove(outClass);
      currentItem.setAttribute('aria-hidden', 'true');
      nextItem.hidden = false;
      nextItem.setAttribute('aria-hidden', 'false');
      nextItem.classList.add(inClass);
      state.currentIndex = nextIndex;
      updatePageControls(state);

      window.setTimeout(() => {
        nextItem.classList.remove(inClass);
        state.isTurning = false;
        updatePageControls(state);
      }, duration * 0.48);
    }, duration * 0.52);
  }

  function createPageControls(state) {
    if (state.controls) return;

    const isMobile = state.mode === 'mobile';
    const controls = document.createElement('nav');
    controls.className = isMobile ? 'mobile-page-controls' : 'book-page-controls';
    controls.setAttribute('aria-label', isMobile ? '手機翻頁控制' : '書本翻頁控制');

    const previousButton = document.createElement('button');
    previousButton.type = 'button';
    previousButton.className = isMobile ? 'mobile-page-btn' : 'book-page-btn';
    previousButton.textContent = isMobile ? '←' : '← 上一攤';
    previousButton.setAttribute('aria-label', isMobile ? '上一頁' : '上一組書頁');
    previousButton.addEventListener('click', () => changeItem(state, state.currentIndex - 1, 'previous'));

    const pageLabel = document.createElement('span');
    pageLabel.className = isMobile ? 'mobile-page-label' : 'book-page-label';
    pageLabel.setAttribute('aria-live', 'polite');

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = isMobile ? 'mobile-page-btn mobile-page-btn-next' : 'book-page-btn book-page-btn-next';
    nextButton.textContent = isMobile ? '→' : '下一攤 →';
    nextButton.setAttribute('aria-label', isMobile ? '下一頁' : '下一組書頁');
    nextButton.addEventListener('click', () => changeItem(state, state.currentIndex + 1, 'next'));

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

  function clearMobileGestures(state) {
    if (!state.gestureCleanup) return;
    state.gestureCleanup();
    state.gestureCleanup = null;
    state.swipe = null;
  }

  function bindMobileGestures(state) {
    clearMobileGestures(state);
    const surface = state.content;
    const threshold = 52;

    const onPointerDown = event => {
      if (event.pointerType !== 'touch' || !event.isPrimary) return;
      state.swipe = { x: event.clientX, y: event.clientY };
    };

    const onPointerUp = event => {
      if (!state.swipe || event.pointerType !== 'touch') return;
      const deltaX = event.clientX - state.swipe.x;
      const deltaY = event.clientY - state.swipe.y;
      state.swipe = null;
      if (Math.abs(deltaX) < threshold || Math.abs(deltaX) <= Math.abs(deltaY) * 1.35) return;
      if (deltaX < 0) changeItem(state, state.currentIndex + 1, 'next');
      else changeItem(state, state.currentIndex - 1, 'previous');
    };

    const onPointerCancel = () => { state.swipe = null; };
    surface.addEventListener('pointerdown', onPointerDown, { passive: true });
    surface.addEventListener('pointerup', onPointerUp, { passive: true });
    surface.addEventListener('pointercancel', onPointerCancel, { passive: true });
    state.gestureCleanup = () => {
      surface.removeEventListener('pointerdown', onPointerDown);
      surface.removeEventListener('pointerup', onPointerUp);
      surface.removeEventListener('pointercancel', onPointerCancel);
    };
  }

  function resetContent(state) {
    state.content.classList.remove('facing-pages', 'mobile-pages');
    state.content.replaceChildren();
    state.items = [];
    state.currentIndex = 0;
    state.isTurning = false;
    clearMobileGestures(state);
    removePageControls(state);
  }

  function renderFacingPages(forceReflow = false) {
    const state = getReadingState();
    if (!state || (state.mode === 'facing' && !forceReflow)) return;

    resetContent(state);
    state.content.classList.add('facing-pages');

    let nodeIndex = 0;
    while (nodeIndex < state.nodes.length) {
      const spread = createSpread();
      const leaves = Array.from(spread.children);
      state.content.append(spread);
      state.items.push(spread);

      for (const leaf of leaves) {
        while (nodeIndex < state.nodes.length) {
          const node = state.nodes[nodeIndex];
          leaf.append(node);
          if (doesLeafOverflow(leaf) && leaf.children.length > 1) {
            leaf.removeChild(node);
            break;
          }
          nodeIndex += 1;
        }
      }
    }

    state.mode = 'facing';
    createPageControls(state);
    showItem(state, 0);
  }

  function renderMobilePages(forceReflow = false) {
    const state = getReadingState();
    if (!state || (state.mode === 'mobile' && !forceReflow)) return;

    resetContent(state);
    state.content.classList.add('mobile-pages');

    let nodeIndex = 0;
    while (nodeIndex < state.nodes.length) {
      const page = createMobilePage();
      state.content.append(page);
      state.items.push(page);

      while (nodeIndex < state.nodes.length) {
        const node = state.nodes[nodeIndex];
        page.append(node);
        if (doesLeafOverflow(page) && page.children.length > 1) {
          page.removeChild(node);
          break;
        }
        nodeIndex += 1;
      }
    }

    state.mode = 'mobile';
    createPageControls(state);
    bindMobileGestures(state);
    showItem(state, 0);
  }

  function renderSingleColumn() {
    const state = getReadingState();
    if (!state || state.mode === 'single') return;
    resetContent(state);
    state.content.replaceChildren(...state.nodes);
    state.mode = 'single';
  }

  function updateReadingLayout(forceReflow = false) {
    if (facingPageQuery.matches) renderFacingPages(forceReflow);
    else if (mobilePageQuery.matches) renderMobilePages(forceReflow);
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
    if (!state || state.mode !== 'facing' || state.isTurning || isEditable) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      changeItem(state, state.currentIndex - 1, 'previous');
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      changeItem(state, state.currentIndex + 1, 'next');
    }
  }

  function initialize() {
    decorateEnglishText();
    updateReadingLayout();
    facingPageQuery.addEventListener('change', () => updateReadingLayout(true));
    mobilePageQuery.addEventListener('change', () => updateReadingLayout(true));
    window.addEventListener('resize', scheduleReadingLayout, { passive: true });
    document.addEventListener('keydown', handleBookKeys);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
