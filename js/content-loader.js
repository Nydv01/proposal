/**
 * Dynamic content loader for the Kanak Proposal cinematic rebuild.
 * Fetches data from content.json and handles rendering/updating elements in the DOM.
 */

export class ContentLoader {
  constructor() {
    this.data = null;
  }

  async load() {
    try {
      // In a real staging environment, we might read from localStorage first if changes were made in admin
      const localData = localStorage.getItem('proposal_custom_content');
      if (localData) {
        // Automatically clear out outdated local configurations containing old track names
        if (localData.includes('track-01.mp3') || !localData.includes('tum-ho-toh.mp3')) {
          localStorage.removeItem('proposal_custom_content');
        } else {
          this.data = JSON.parse(localData);
          return this.data;
        }
      }

      const response = await fetch('/content.json');
      this.data = await response.json();
      return this.data;
    } catch (error) {
      console.error('Failed to load proposal content:', error);
      return null;
    }
  }

  saveToLocal(newData) {
    this.data = newData;
    localStorage.setItem('proposal_custom_content', JSON.stringify(newData));
  }

  resetLocal() {
    localStorage.removeItem('proposal_custom_content');
  }

  applyMeta() {
    if (!this.data || !this.data.meta) return;
    document.title = this.data.meta.title || 'Nitin & Kanak — A Private Love Film';

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = this.data.meta.description || '';
  }

  applyDOM() {
    if (!this.data) return;

    this.applyMeta();

    // 1. Hero
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle && this.data.hero) {
      heroTitle.innerHTML = `<span>${this.data.hero.welcome || 'Welcome,'}</span> <span>${this.data.hero.name || 'Kanak'}</span>`;
    }
    const heroSubtitle = document.querySelector('.hero-subtitle');
    if (heroSubtitle && this.data.hero) {
      heroSubtitle.textContent = this.data.hero.subtitle || '';
    }
    const mindLabel = document.getElementById('hero-mind-label');
    if (mindLabel && this.data.hero?.mindLabel) {
      mindLabel.textContent = this.data.hero.mindLabel;
    }

    // 2. Poem
    const poemTitle = document.querySelector('#scene-poem .poem-title');
    if (poemTitle && this.data.poem) {
      poemTitle.innerHTML = this.data.poem.title || 'A Poem From My Heart';
    }
    const poemContainer = document.querySelector('.poem-container');
    if (poemContainer && this.data.poem) {
      let poemHTML = '';
      if (this.data.poem.lines && Array.isArray(this.data.poem.lines)) {
        this.data.poem.lines.forEach(line => {
          poemHTML += `<p class="poem-line">${line}</p>`;
        });
      }
      poemHTML += `<p class="poem-line poem-signature">With all my love, ${this.data.poem.author || 'Nitin'} ❤️</p>`;
      poemContainer.innerHTML = poemHTML;
    }

    // 3. Story Section
    const storyMilestones = document.querySelectorAll('#scene-story .story-milestone');
    if (storyMilestones.length && Array.isArray(this.data.story?.milestones)) {
      storyMilestones.forEach((milestone, index) => {
        const item = this.data.story.milestones[index];
        if (!item) return;
        const date = milestone.querySelector('.milestone-date');
        const title = milestone.querySelector('h3');
        const copy = milestone.querySelector('p');
        if (date) date.textContent = item.date || '';
        if (title) title.textContent = item.title || '';
        if (copy) copy.textContent = item.content || '';
        if (item.mood) milestone.dataset.mood = item.mood;
      });
    }

    // 4. Gallery Section
    const galleryTitle = document.querySelector('#scene-memories .scene-title');
    if (galleryTitle && this.data.gallery) {
      galleryTitle.innerHTML = this.data.gallery.title || 'The Gallery of Us';
    }
    const gallerySubtitle = document.querySelector('#scene-memories .scene-subtitle');
    if (gallerySubtitle && this.data.gallery) {
      gallerySubtitle.textContent = this.data.gallery.subtitle || '';
    }
    const scrapbookContainer = document.getElementById('scrapbook-container');
    if (scrapbookContainer && this.data.gallery && Array.isArray(this.data.gallery.items)) {
      let scrapbookHTML = '';
      const rotations = ['-3deg', '4deg', '-2deg', '5deg', '-4deg', '2deg'];
      const marginTops = ['0rem', '2rem', '0rem', '-1rem', '1.5rem', '0rem'];

      this.data.gallery.items.forEach((item, index) => {
        const rot = rotations[index % rotations.length];
        const marginTop = marginTops[index % marginTops.length];

        // Stagger alignments dynamically to construct a winding river pathway
        let alignClass = 'river-capsule-center';
        if (index % 3 === 0) alignClass = 'river-capsule-left';
        else if (index % 3 === 1) alignClass = 'river-capsule-right';

        let tapeHTML = '';
        if (index % 3 === 0) {
          tapeHTML = '<div class="tape tape-top"></div>';
        } else if (index % 3 === 1) {
          tapeHTML = '<div class="tape tape-corner-tr"></div><div class="tape tape-corner-bl"></div>';
        } else {
          tapeHTML = '<div class="tape tape-corner-tl"></div>';
        }

        scrapbookHTML += `
          <div class="scrapbook-polaroid interactive ${alignClass}" data-index="${index}" style="--rot: ${rot}; margin-top: ${marginTop};">
            ${tapeHTML}
            <div class="polaroid-photo">
              <img src="${item.image}" alt="${item.caption}" loading="lazy" />
            </div>
            <p class="polaroid-caption">${item.caption}</p>
          </div>
        `;
      });
      scrapbookContainer.innerHTML = scrapbookHTML;
    }

    // 5. Proposal Section
    const proposalQuestion = document.querySelector('#proposal-question');
    if (proposalQuestion && this.data.proposal) {
      proposalQuestion.textContent = this.data.proposal.question || 'Will you marry me, Kanak?';
    }
    const acceptBtn = document.querySelector('#accept-btn');
    if (acceptBtn && this.data.proposal) {
      acceptBtn.textContent = this.data.proposal.yesText || 'Yes. With all my heart.';
    }
    const declineBtn = document.querySelector('#decline-btn');
    if (declineBtn && this.data.proposal) {
      declineBtn.textContent = this.data.proposal.noText || 'I need a moment.';
    }

    // Celebration response
    const celebration = document.querySelector('#celebration');
    if (celebration && this.data.proposal) {
      celebration.innerHTML = `
        <div class="celebration-burst" aria-hidden="true"></div>
        <h2 class="celebration-title">${this.data.proposal.celebrationTitle || 'Then let forever begin.'}</h2>
        <p class="celebration-text">${this.data.proposal.celebrationText || "Thank you for choosing this life with me, Kanak."}</p>
        <div class="heart-rain" aria-hidden="true"></div>
      `;
    }

    // Decline response
    const gentleDecline = document.querySelector('#gentle-decline');
    if (gentleDecline && this.data.proposal) {
      gentleDecline.innerHTML = `
        <h2>${this.data.proposal.declineTitle || 'Take all the time you need.'}</h2>
        <p>${this.data.proposal.declineText || 'This question is an invitation, never a demand.'}</p>
        <button id="reconsider-btn" aria-label="Return to the beginning">Return to the beginning</button>
      `;
    }

    // 6. Mirror Section
    const mirrorTitle = document.querySelector('#scene-mirror .mirror-title');
    if (mirrorTitle && this.data.mirror) {
      mirrorTitle.innerHTML = this.data.mirror.title || 'Envenomed';
    }
    const mirrorSubtitle = document.querySelector('#scene-mirror .mirror-subtitle');
    if (mirrorSubtitle && this.data.mirror) {
      mirrorSubtitle.textContent = this.data.mirror.subtitle || '';
    }
    const mirrorByline = document.querySelector('#scene-mirror .mirror-byline');
    if (mirrorByline && this.data.mirror) {
      mirrorByline.innerHTML = `by <span class="text-glow-rose">${this.data.mirror.byline || 'Kanak'}</span>`;
    }

    const pastLabel = document.querySelector('#scene-mirror .mirror-past .mirror-side-label');
    if (pastLabel && this.data.mirror?.past) {
      // Maintain the internal pulsing indicator span/after
      pastLabel.innerHTML = this.data.mirror.past.label || 'Her Words — Then';
    }
    const nowLabel = document.querySelector('#scene-mirror .mirror-now .mirror-side-label');
    if (nowLabel && this.data.mirror?.now) {
      nowLabel.innerHTML = this.data.mirror.now.label || 'My Reflection — Now';
    }

    // Populate past poem
    const pastContainer = document.querySelector('#scene-mirror .mirror-past .mirror-poem-scroll');
    if (pastContainer && this.data.mirror?.past?.lines) {
      let pastHTML = '';
      this.data.mirror.past.lines.forEach(line => {
        if (line.text.trim() === '') {
          pastHTML += '<div class="ev-break"></div>';
        } else {
          let className = 'ev-line';
          if (line.type === 'stanza-start') className += ' ev-stanza-start';
          if (line.type === 'refrain') className += ' ev-refrain';
          if (line.type === 'highlight') className += ' ev-highlight';
          if (line.type === 'final') className += ' ev-final';
          pastHTML += `<p class="${className}">${line.text}</p>`;
        }
      });
      pastContainer.innerHTML = pastHTML;
    }

    // Populate now poem
    const nowContainer = document.querySelector('#scene-mirror .mirror-now .mirror-poem-scroll');
    if (nowContainer && this.data.mirror?.now?.lines) {
      let nowHTML = '';
      this.data.mirror.now.lines.forEach(line => {
        if (line.text.trim() === '') {
          nowHTML += '<div class="ev-break"></div>';
        } else {
          let className = 'ev-line';
          if (line.type === 'stanza-start') className += ' ev-stanza-start';
          if (line.type === 'refrain') className += ' ev-refrain';
          if (line.type === 'highlight') className += ' ev-highlight';
          if (line.type === 'final') className += ' ev-final';
          if (line.type === 'signature') className += ' ev-signature';
          nowHTML += `<p class="${className}">${line.text}</p>`;
        }
      });
      nowContainer.innerHTML = nowHTML;
    }
  }
}
