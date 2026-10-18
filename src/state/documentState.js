/**
 * documentState.js
 * 
 * Central reactive state store for managing scanned document pages,
 * active editing modes, filter selections, and UI subscriptions.
 */

class DocumentState {
  constructor() {
    /** @type {Array<ScannedPage>} */
    this.pages = [];
    this.currentPageIndex = 0;
    this.isCropping = false;
    this.isExporting = false;
    this.isProcessing = false;
    this.processingMessage = '';
    
    /** @type {Set<Function>} */
    this.listeners = new Set();
  }

  /**
   * Subscribe to state change notifications.
   * @param {Function} callback 
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Broadcast state update to all subscribers.
   */
  notify() {
    for (const listener of this.listeners) {
      listener(this);
    }
  }

  /**
   * Adds a new scanned page to the document.
   * @param {ScannedPage} page 
   */
  addPage(page) {
    this.pages.push(page);
    this.currentPageIndex = this.pages.length - 1;
    this.notify();
  }

  /**
   * Returns the currently active page or null.
   * @returns {ScannedPage | null}
   */
  getCurrentPage() {
    if (this.pages.length === 0) return null;
    return this.pages[this.currentPageIndex] || null;
  }

  /**
   * Sets the active page index.
   * @param {number} index 
   */
  setCurrentPageIndex(index) {
    if (index >= 0 && index < this.pages.length) {
      this.currentPageIndex = index;
      this.notify();
    }
  }

  /**
   * Updates properties of the current page.
   * @param {Partial<ScannedPage>} updates 
   */
  updateCurrentPage(updates) {
    const page = this.getCurrentPage();
    if (!page) return;
    Object.assign(page, updates);
    this.notify();
  }

  /**
   * Rotates the current page by 90 degrees clockwise.
   */
  rotateCurrentPage() {
    const page = this.getCurrentPage();
    if (!page) return;
    page.rotation = ((page.rotation + 90) % 360);
    this.notify();
  }

  /**
   * Deletes a page by index.
   * @param {number} index 
   */
  deletePage(index) {
    if (index < 0 || index >= this.pages.length) return;
    this.pages.splice(index, 1);
    if (this.currentPageIndex >= this.pages.length) {
      this.currentPageIndex = Math.max(0, this.pages.length - 1);
    }
    this.notify();
  }

  /**
   * Reorders a page from one index to another.
   * @param {number} fromIndex 
   * @param {number} toIndex 
   */
  reorderPage(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const [moved] = this.pages.splice(fromIndex, 1);
    this.pages.splice(toIndex, 0, moved);
    this.currentPageIndex = toIndex;
    this.notify();
  }

  /**
   * Toggles 4-corner perspective crop mode.
   * @param {boolean} [value] 
   */
  setCropping(value) {
    this.isCropping = typeof value === 'boolean' ? value : !this.isCropping;
    this.notify();
  }

  /**
   * Toggles the PDF export sheet.
   * @param {boolean} [value] 
   */
  setExporting(value) {
    this.isExporting = typeof value === 'boolean' ? value : !this.isExporting;
    this.notify();
  }

  /**
   * Sets global processing overlay state.
   * @param {boolean} isBusy 
   * @param {string} [msg=''] 
   */
  setProcessing(isBusy, msg = '') {
    this.isProcessing = isBusy;
    this.processingMessage = msg;
    this.notify();
  }

  /**
   * Clears all pages.
   */
  clearAll() {
    this.pages = [];
    this.currentPageIndex = 0;
    this.isCropping = false;
    this.isExporting = false;
    this.notify();
  }
}

export const docState = new DocumentState();
