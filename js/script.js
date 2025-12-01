/* ==========================================================================
   CONFIGURATION
   ========================================================================== */

const CONFIG = {
  // Nav button hover effect
  nav: {
    hoverDelay: 150,           // ms - delay before hover expansion
    leaveDelay: 300,           // ms - delay before collapse on mouse leave
    hoverGrowth: 1.8,          // multiplier - hover grows to 180% of initial width
    activeShrink: 0.8,         // multiplier - active shrinks to 80% when another is hovered
  },
  
  // Column resizing
  columns: {
    minWidth: 0.15,            // vw - minimum column width (15vw)
    maxWidth: 0.60,            // vw - maximum column width (60vw)
    resizeDebounce: 150,       // ms - debounce delay for resize reset
  },
  
  // Layout
  layout: {
    heightDebounce: 80,        // ms - debounce delay for layout height update
  },
  
  // Scrollbars
  scrollbars: {
    theme: 'os-theme-dark',
    autoHide: 'leave',
    autoHideDelay: 400,
  },
};

/* ==========================================================================
   UTILITIES
   ========================================================================== */

// Small debounced helper
function debounce(fn, wait) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => { fn(...args); t = null; }, wait);
  };
}

/**
 * updateLayoutHeight - sets .layout height to remaining viewport height
 * after subtracting the nav height.
 */
function updateLayoutHeight() {
  const nav = document.getElementById('siteNav');
  const layout = document.getElementById('siteLayout');
  if (!nav || !layout) return;

  const navHeight = nav.offsetHeight;
  const remaining = Math.max(0, window.innerHeight - navHeight);
  layout.style.height = remaining + 'px';
}

/**
 * Debounced Hover Effect for Nav Buttons
 * - Buttons with data-hover-width expand on hover
 * - The spacer button (.nav__btn--spacer) shrinks to accommodate
 */
function initNavHoverEffect() {
  const hoverableRows = document.querySelectorAll('.nav__row--hoverable');
  
  hoverableRows.forEach(row => {
    const buttons = row.querySelectorAll('.nav__btn[data-hover-width]');
    const spacer = row.querySelector('.nav__btn--spacer');
    
    if (!spacer) return;
    
    // Store initial widths for each button (all buttons are in collapsed state)
    buttons.forEach(btn => {
      const initialWidth = btn.offsetWidth;
      btn.dataset.initialWidth = initialWidth + 'px';
      btn.style.width = initialWidth + 'px';
    });
    
    let hoverTimeout = null;
    let leaveTimeout = null;
    let currentHoveredBtn = null;
    let lockedBtn = null;
    
    function expandButton(btn) {
      // Do nothing if button is locked
      if (btn.classList.contains('is-locked')) return;

      // Clear any pending leave timeout
      if (leaveTimeout) {
        clearTimeout(leaveTimeout);
        leaveTimeout = null;
      }
      
      // Don't change hover state if HTMX is processing on this button
      if (btn.dataset.htmxLoading === 'true') {
        return;
      }
      
      // Shrink the locked button if hovering a different one
      if (lockedBtn && lockedBtn !== btn) {
        // Don't shrink if the locked button is processing HTMX
        if (lockedBtn.dataset.htmxLoading !== 'true') {
          const vwValue = parseFloat(lockedBtn.dataset.hoverWidth);
          const fullWidthPx = (vwValue / 100) * window.innerWidth;
          const shrunkWidth = fullWidthPx * CONFIG.nav.activeShrink;
          lockedBtn.style.width = shrunkWidth + 'px';
        }
      }
      
      // Remove active state from previously hovered button (unless it's locked)
      if (currentHoveredBtn && currentHoveredBtn !== btn && currentHoveredBtn !== lockedBtn) {
        currentHoveredBtn.classList.remove('is-hover-active');
        currentHoveredBtn.style.width = currentHoveredBtn.dataset.initialWidth;
      }
      
      currentHoveredBtn = btn;
      
      // Grow on hover
      const initialWidth = parseFloat(btn.dataset.initialWidth);
      const hoverWidth = initialWidth * CONFIG.nav.hoverGrowth;
      
      btn.classList.add('is-hover-active');
      btn.style.width = hoverWidth + 'px';
    }
    
    function collapseButton() {
      // Collapse hovered button if it's not locked and not loading
      if (currentHoveredBtn && currentHoveredBtn !== lockedBtn && 
          currentHoveredBtn.dataset.htmxLoading !== 'true') {
        currentHoveredBtn.classList.remove('is-hover-active');
        currentHoveredBtn.style.width = currentHoveredBtn.dataset.initialWidth;
        currentHoveredBtn = null;
      }
      
      // Restore locked button to expanded state (if not loading)
      if (lockedBtn && lockedBtn.dataset.htmxLoading !== 'true') {
        lockedBtn.style.width = lockedBtn.dataset.hoverWidth;
      }
    }
    
    function lockButton(btn) {
      // If clicking the already locked button, do nothing
      if (lockedBtn === btn) {
        return;
      }
      
      // Unlock previous button
      if (lockedBtn) {
        lockedBtn.classList.remove('is-locked');
        lockedBtn.classList.remove('is-hover-active');
        lockedBtn.style.width = lockedBtn.dataset.initialWidth;
      }
      
      // Lock the new button
      lockedBtn = btn;
      btn.classList.add('is-locked');
      btn.classList.add('is-hover-active');
      btn.style.width = btn.dataset.hoverWidth;
    }
    
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        // Clear any pending leave timeout
        if (leaveTimeout) {
          clearTimeout(leaveTimeout);
          leaveTimeout = null;
        }
        
        // Clear any pending hover timeout
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
        }
        
        // Debounce the hover expansion
        hoverTimeout = setTimeout(() => {
          expandButton(btn);
        }, CONFIG.nav.hoverDelay);
      });
      
      btn.addEventListener('mouseleave', () => {
        // Clear any pending hover timeout
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
          hoverTimeout = null;
        }
      });
      
      // Click to lock the button expanded
      btn.addEventListener('click', (e) => {
        // For HTMX buttons, we need to lock immediately and prevent
        // any hover state changes during the HTMX request
        lockButton(btn);
        
        // If this button has HTMX attributes, mark it as loading to prevent
        // hover state changes during the request
        if (btn.hasAttribute('hx-get') || btn.hasAttribute('hx-post')) {
          btn.dataset.htmxLoading = 'true';
        }
      });
    });
    
    // When leaving the entire row, collapse after delay
    row.addEventListener('mouseleave', () => {
      // Clear any pending hover timeout
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }
      
      // Debounce the collapse
      leaveTimeout = setTimeout(() => {
        collapseButton();
      }, CONFIG.nav.leaveDelay);
    });
    
    // Cancel collapse if re-entering the row
    row.addEventListener('mouseenter', () => {
      if (leaveTimeout) {
        clearTimeout(leaveTimeout);
        leaveTimeout = null;
      }
    });
    
    // Handle preselected button - activate it as if it was clicked
    const preselected = row.querySelector('.nav__btn.preselected');
    if (preselected) {
      preselected.classList.remove('preselected');
      lockButton(preselected);
    }
  });
}

/**
 * Column Resizing via Draggable Dividers
 */
function initColumnResize() {
  const layout = document.getElementById('siteLayout');
  if (!layout) return;

  const dividers = layout.querySelectorAll('.layout__divider');
  const columns = layout.querySelectorAll('.layout__col');

  let isDragging = false;
  let currentDivider = null;
  let leftCol = null;
  let rightCol = null;
  let startX = 0;
  let leftStartWidth = 0;
  let rightStartWidth = 0;

  // Get visible columns (respects media query hiding)
  function getVisibleColumns() {
    return Array.from(columns).filter(col => {
      return getComputedStyle(col).display !== 'none';
    });
  }

  // Get visible dividers
  function getVisibleDividers() {
    return Array.from(dividers).filter(div => {
      return getComputedStyle(div).display !== 'none';
    });
  }

  function onMouseDown(e) {
    e.preventDefault();
    
    const divider = e.target.closest('.layout__divider');
    if (!divider) return;

    const visibleCols = getVisibleColumns();
    const visibleDividers = getVisibleDividers();
    const dividerIndex = visibleDividers.indexOf(divider);

    if (dividerIndex === -1) return;

    // The divider sits between column[dividerIndex] and column[dividerIndex + 1]
    leftCol = visibleCols[dividerIndex];
    rightCol = visibleCols[dividerIndex + 1];

    if (!leftCol || !rightCol) return;

    isDragging = true;
    currentDivider = divider;
    startX = e.clientX;
    leftStartWidth = leftCol.offsetWidth;
    rightStartWidth = rightCol.offsetWidth;

    document.body.classList.add('is-resizing');
    divider.classList.add('is-dragging');

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e) {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const minWidth = window.innerWidth * CONFIG.columns.minWidth;
    const maxWidth = window.innerWidth * CONFIG.columns.maxWidth;

    let newLeftWidth = leftStartWidth + dx;
    let newRightWidth = rightStartWidth - dx;

    // Enforce minimum widths
    if (newLeftWidth < minWidth) {
      newLeftWidth = minWidth;
      newRightWidth = leftStartWidth + rightStartWidth - minWidth;
    }
    if (newRightWidth < minWidth) {
      newRightWidth = minWidth;
      newLeftWidth = leftStartWidth + rightStartWidth - minWidth;
    }
    
    // Enforce maximum widths
    if (newLeftWidth > maxWidth) {
      newLeftWidth = maxWidth;
      newRightWidth = leftStartWidth + rightStartWidth - maxWidth;
    }
    if (newRightWidth > maxWidth) {
      newRightWidth = maxWidth;
      newLeftWidth = leftStartWidth + rightStartWidth - maxWidth;
    }

    // Apply pixel widths and disable flex growth
    leftCol.style.flex = '0 0 auto';
    leftCol.style.width = newLeftWidth + 'px';
    
    rightCol.style.flex = '0 0 auto';
    rightCol.style.width = newRightWidth + 'px';
  }

  function onMouseUp() {
    if (!isDragging) return;

    isDragging = false;
    document.body.classList.remove('is-resizing');
    if (currentDivider) {
      currentDivider.classList.remove('is-dragging');
    }
    currentDivider = null;
    leftCol = null;
    rightCol = null;

    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  // Attach mousedown to each divider
  dividers.forEach(divider => {
    divider.addEventListener('mousedown', onMouseDown);
  });

  // Touch support
  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const syntheticEvent = {
      preventDefault: () => e.preventDefault(),
      target: e.target,
      clientX: touch.clientX
    };
    onMouseDown(syntheticEvent);
  }

  function onTouchMove(e) {
    if (!isDragging) return;
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    onMouseMove({ clientX: touch.clientX });
  }

  function onTouchEnd() {
    onMouseUp();
  }

  dividers.forEach(divider => {
    divider.addEventListener('touchstart', onTouchStart, { passive: false });
  });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);

  // Reset column widths on window resize to let them reflow naturally
  window.addEventListener('resize', debounce(() => {
    columns.forEach(col => {
      col.style.flex = '';
      col.style.width = '';
    });
  }, CONFIG.columns.resizeDebounce));
}

/**
 * Initialize OverlayScrollbars on all content columns
 */
function initOverlayScrollbars() {
  const { OverlayScrollbars } = OverlayScrollbarsGlobal;
  const columns = document.querySelectorAll('.layout__col:not(.no-scroll)');
  
  columns.forEach(col => {
    OverlayScrollbars(col, {
      scrollbars: {
        theme: CONFIG.scrollbars.theme,
        autoHide: CONFIG.scrollbars.autoHide,
        autoHideDelay: CONFIG.scrollbars.autoHideDelay
      }
    });
  });
}

/**
 * Reinitialize components that need to be set up after HTMX swaps
 * (Column resize and scrollbars work on the .layout element which gets replaced)
 */
function reinitAfterSwap() {
  updateLayoutHeight();
  initColumnResize();
  initOverlayScrollbars();
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  updateLayoutHeight();
  initColumnResize();
  initOverlayScrollbars();
  initNavHoverEffect();
});

// Reinitialize after HTMX swaps content
document.body.addEventListener('htmx:afterSettle', (event) => {
  // Only reinit if the layout was swapped
  if (event.detail.target.classList.contains('layout') || 
      event.detail.target.closest('.layout')) {
    reinitAfterSwap();
  }
});

// Clear HTMX loading state from nav buttons after request completes
document.body.addEventListener('htmx:afterRequest', (event) => {
  const btn = event.detail.elt;
  if (btn && btn.classList.contains('nav__btn')) {
    delete btn.dataset.htmxLoading;
  }
});

window.addEventListener('resize', debounce(updateLayoutHeight, CONFIG.layout.heightDebounce));