/**
 * pageCarousel.js
 * 
 * Multi-Page Thumbnail Strip & Page Switcher.
 */

import { docState } from '../state/documentState.js';

export class PageCarousel {
  constructor(containerEl, onAddPageRequested) {
    this.container = containerEl;
    this.onAddPageRequested = onAddPageRequested;
    this.init();
  }

  init() {
    docState.subscribe(() => this.render());
    this.render();
  }

  render() {
    const { pages, currentPageIndex } = docState;

    if (pages.length <= 1) {
      // Hide strip if only 0 or 1 page to keep UI hyper-minimal Apple aesthetic
      this.container.style.display = 'none';
      return;
    }

    this.container.style.display = 'flex';
    this.container.innerHTML = '';

    pages.forEach((page, index) => {
      const card = document.createElement('div');
      card.className = `thumbnail-card ${index === currentPageIndex ? 'active' : ''}`;
      card.innerHTML = `
        <img src="${page.thumbnailUrl}" alt="Page ${index + 1}" />
        <span class="thumbnail-number">${index + 1}</span>
      `;

      card.addEventListener('click', () => {
        docState.setCurrentPageIndex(index);
      });

      this.container.appendChild(card);
    });

    // Add "+" Card at the end of the carousel
    const addCard = document.createElement('button');
    addCard.className = 'add-page-btn';
    addCard.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span>Add</span>
    `;

    addCard.addEventListener('click', () => {
      if (this.onAddPageRequested) this.onAddPageRequested();
    });

    this.container.appendChild(addCard);
  }
}
