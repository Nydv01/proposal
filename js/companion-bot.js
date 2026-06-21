/**
 * ─────────────────────────────────────────────────────────────
 *  CompanionBot — Emotionally Intelligent Chat Companion
 *  For the Nitin → Kanak Proposal Website
 * ─────────────────────────────────────────────────────────────
 *  A warm, loving chat presence that lives inside the story.
 *  100 % client-side · zero API calls · keyword intent detection
 *  GSAP-powered animations · glassmorphism chat UI
 * ─────────────────────────────────────────────────────────────
 */

import gsap from 'gsap';

/* ── story context the bot carries in its heart ────────────── */
const STORY = Object.freeze({
  her: 'Kanak',
  him: 'Nitin',
  friendsSince: 'September 2023',
  datingSince: '14 February 2024',
  meetingIn: '2 months',
  coffeeStory: 'Nitin spilled coffee the day they first crossed paths — Kanak laughed, and his heart quietly chose her.',
  valentines: 'Nitin nervously asked Kanak to be his girlfriend on Valentine\'s Day 2024 — she said yes, and the whole world burst into colour.',
  promise: 'To cherish her always, for all of time.',
});

/* ── restrained, story-aware response library ─────────────── */
const RESPONSES = Object.freeze({
  GREETING: [
    `Hello, Kanak. I know the memories Nitin placed here. Take your time with them; I can stay beside you while you look.`,
    `Welcome, Kanak. This is a quiet record of what Nitin notices, remembers, and hopes for.`,
    `You made it. There is no right pace for this story, so pause wherever something feels important.`,
  ],
  MISSING_NITIN: [
    `Missing someone can make time feel unusually heavy. Nitin is counting the distance too, and he is carrying you through his ordinary days.`,
    `${STORY.meetingIn} can feel long from inside the wait. You do not have to pretend it is easy for the love to be real.`,
    `He built this partly because distance leaves so much unsaid. Consider this one way of keeping the conversation close.`,
  ],
  FEELING_SAD: [
    `You do not need to brighten the room for anyone right now. Breathe, take the moment as it is, and reach for someone you trust if you need them.`,
    `Nitin loves the whole of you, not only the easy or smiling parts. A difficult day does not make you less worthy of care.`,
    `I can offer words, but real support matters more. If the sadness feels too heavy, please tell Nitin or someone close to you plainly.`,
  ],
  FEELING_HAPPY: [
    `Hold onto that feeling. Nitin would be very glad to know this made you smile.`,
    `Joy suits this chapter. There are more small details waiting ahead.`,
    `That is the response he hoped for: not spectacle, just a real feeling reaching you.`,
  ],
  PRAISE_KANAK: [
    `Nitin's admiration is not only about how you look. He notices your resilience, your mind, your humour, and the care you give people.`,
    `Beautiful, yes. But the deeper answer is that he sees you as singular: someone whose presence changed the texture of his life.`,
    `The mirror chapter says it best. You are not a reflection waiting for approval; you are the whole portrait.`,
  ],
  LOVE_QUESTIONS: [
    `He loves you in the details: the memories he keeps, the future he imagines, and the effort he is willing to make when life is not cinematic.`,
    `Why you? Because an ordinary September became a before and after once you were in it.`,
    `The page can make a claim. The real proof will always be how he listens, repairs, shows up, and keeps choosing you.`,
  ],
  MEMORY_RECALL: [
    `It began in ${STORY.friendsSince}: a coffee spill, your laugh, and a moment that looked small until it did not.`,
    `${STORY.datingSince} is the date the feeling finally became a promise spoken aloud.`,
    `The archive holds the landmarks, but Nitin's favourite memories are often the unphotographed ones: late conversations, private jokes, and your voice at the end of a long day.`,
  ],
  ENCOURAGEMENT: [
    `Take the next honest step, not every step at once. Nitin believes in your strength, and you are allowed to ask for help.`,
    `Nerves do not mean you are unready. They often mean the moment matters.`,
    `You have rebuilt yourself before. Move gently, but do not forget what you are capable of.`,
  ],
  WEBSITE_REACTIONS: [
    `He wanted the craft to feel worthy of the feeling, but the feeling is still the point.`,
    `Keep going when you are ready. The next chapter changes the pace.`,
    `The light, movement, and sound are all variations on one sentence: you matter to him.`,
  ],
  GOODNIGHT: [
    `Goodnight, Kanak. The story will wait here without asking anything from you.`,
    `Rest well. Tomorrow is one day closer to the distance becoming a doorway.`,
    `Leave the screen when you need to. Nitin's care is not confined to it.`,
  ],
  SWEET_NOTHINGS: [
    `A quiet reminder: you are deeply considered here.`,
    `Nitin still thinks your laugh can change the temperature of a room.`,
    `You are loved in ways both dramatic and wonderfully ordinary.`,
  ],
  COMFORT: [
    `Pause here. Put both feet on the floor and take one slow breath. You do not have to explain the feeling immediately.`,
    `Being moved can be tender and overwhelming at once. Let the moment be complicated.`,
    `When you are ready, tell Nitin what reached you. He would rather hear the honest version than the polished one.`,
  ],
  FUTURE_TALK: [
    `The final chapter holds a question. It is meant as an invitation to imagine, not pressure to perform.`,
    `Nitin's picture of forever is mostly made of ordinary things: shared mornings, repaired misunderstandings, familiar laughter, and growing older on the same side.`,
    `The unwritten chapters matter because both of you get to author them.`,
  ],
  PLAYFUL: [
    `For the record, the coffee spill remains excellent evidence that Nitin has never been especially composed around you.`,
    `He rehearsed important words and still managed to sound nervous. You seem to have that effect on him.`,
    `Your shared humour is one of the least cinematic and most valuable parts of this story.`,
  ],
  DEFAULT: [
    `I am listening. Tell me a little more.`,
    `There may not be a perfect response, but the feeling is still worth naming.`,
    `You can keep exploring, or stay here for a while. Neither choice is wrong.`,
  ],
});

/* ── proactive messages (appear without user input) ────────── */
const PROACTIVE = [
  `Take your time. The experience is designed to leave room between the words.`,
  `A small reminder from Nitin's side of the screen: you are thought of often.`,
  `The next chapter will wait until you are ready for it.`,
  `Some of the most important details here are deliberately quiet.`,
];

/* ── scene-aware greetings ─────────────────────────────────── */
const SCENE_TIPS = {
  mind: `This opening is about the thought Nitin kept returning to before either of you called it love.`,
  heart: `The heart chapter is less about intensity than certainty: the moment searching stopped.`,
  story: `These dates are landmarks. The real story lives in what changed between them.`,
  poem: `Scroll gently here. Nitin wanted the letter to arrive one line at a time.`,
  mirror: `This chapter places Kanak's old words beside the woman Nitin sees now.`,
  memories: `Drag the archive to turn it. Select a frame when one asks you to stay.`,
  song: `The score clears as the story becomes more certain.`,
  forever: `The final question is yours to answer at your own pace.`,
};

/* ── intent detection keywords ─────────────────────────────── */
const INTENTS = [
  { key: 'GREETING', patterns: [/^hi$/i, /^hey$/i, /^hello$/i, /^hola$/i, /^namaste/i, /^hii+/i, /good\s?morning/i, /good\s?evening/i, /^yo$/i, /greetings/i, /hey there/i] },
  { key: 'MISSING_NITIN', patterns: [/miss\s?(him|nitin|you)/i, /i\s?miss/i, /want\s?to\s?see\s?him/i, /far\s?away/i, /long\s?distance/i, /when.*meet/i, /distance/i] },
  { key: 'FEELING_SAD', patterns: [/sad/i, /low/i, /lonely/i, /alone/i, /depress/i, /down/i, /not\s?okay/i, /upset/i, /hurt/i, /pain/i, /tired/i, /crying/i, /tear/i] },
  { key: 'FEELING_HAPPY', patterns: [/happy/i, /love\s?this/i, /beautiful/i, /amazing/i, /wonderful/i, /blessed/i, /grateful/i, /joy/i, /smile/i, /yay/i, /awesome/i] },
  { key: 'PRAISE_KANAK', patterns: [/am\s?i\s?(pretty|beautiful|enough|special|cute)/i, /what.*think.*me/i, /how.*look/i, /do\s?you\s?like\s?me/i, /tell.*about\s?me/i, /pretty/i, /beautiful/i, /cute/i] },
  { key: 'LOVE_QUESTIONS', patterns: [/does\s?he\s?love/i, /why.*love\s?me/i, /how\s?much.*love/i, /love\s?me/i, /really\s?love/i, /true\s?love/i, /do you love/i] },
  { key: 'MEMORY_RECALL', patterns: [/remember/i, /our\s?story/i, /how.*start/i, /first\s?met/i, /september/i, /valentine/i, /coffee/i, /tell.*about/i, /beginning/i, /memories/i] },
  { key: 'ENCOURAGEMENT', patterns: [/scared/i, /nervous/i, /worried/i, /anxious/i, /afraid/i, /can'?t\s?do/i, /not\s?sure/i, /doubt/i, /insecure/i] },
  { key: 'WEBSITE_REACTIONS', patterns: [/wow/i, /omg/i, /oh\s?my/i, /incredible/i, /insane/i, /stunning/i, /this\s?is.*great/i, /so\s?(cool|good|nice)/i, /cool/i, /love the/i] },
  { key: 'GOODNIGHT', patterns: [/good\s?night/i, /bye/i, /leaving/i, /gotta\s?go/i, /see\s?you/i, /sleep/i, /night\s?night/i, /gtg/i, /later/i] },
  { key: 'COMFORT', patterns: [/cry/i, /tears/i, /emotional/i, /overwhelm/i, /sobbing/i, /weep/i, /touched/i, /heart.*full/i] },
  { key: 'FUTURE_TALK', patterns: [/future/i, /forever/i, /always/i, /marr/i, /together/i, /grow\s?old/i, /kids/i, /one\s?day/i, /someday/i, /wife/i, /propose/i, /proposal/i] },
  { key: 'PLAYFUL', patterns: [/haha/i, /lol/i, /funny/i, /joke/i, /😂/i, /🤣/i, /lmao/i, /rofl/i, /silly/i, /tease/i, /😄/i, /giggle/i] },
];

/* ── CSS injected once ─────────────────────────────────────── */
const BOT_CSS = `
  .cb-toggle{position:fixed;bottom:24px;right:24px;z-index:9999;width:56px;height:56px;border-radius:50%;border:none;
    background:linear-gradient(135deg,#f4b8c1,#e8839e);color:#fff;font-size:24px;cursor:pointer;
    box-shadow:0 0 18px rgba(232,131,158,.45);display:flex;align-items:center;justify-content:center;transition:transform .2s}
  .cb-toggle:hover{transform:scale(1.1)}
  .cb-toggle .cb-pulse{position:absolute;inset:0;border-radius:50%;background:rgba(232,131,158,.35);animation:cbPulse 2s ease-out infinite}
  @keyframes cbPulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.8);opacity:0}}

  .cb-panel{position:fixed;bottom:90px;right:24px;z-index:9998;width:340px;border-radius:18px;overflow:hidden;
    display:flex;flex-direction:column;
    background:rgba(20,10,35,.72);backdrop-filter:blur(18px) saturate(1.4);-webkit-backdrop-filter:blur(18px) saturate(1.4);
    border:1px solid rgba(255,255,255,.12);box-shadow:0 12px 48px rgba(0,0,0,.5);transform-origin:bottom right}

  .cb-header{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08)}
  .cb-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#f4b8c1,#e8839e);
    display:flex;align-items:center;justify-content:center;font-size:18px;position:relative;flex-shrink:0}
  .cb-avatar::after{content:'';position:absolute;bottom:1px;right:1px;width:10px;height:10px;border-radius:50%;
    background:#a8d8cb;border:2px solid rgba(20,10,35,.72);animation:cbOnline 2s ease infinite}
  @keyframes cbOnline{0%,100%{opacity:1}50%{opacity:.4}}
  .cb-header-text{flex:1}
  .cb-header-title{font-size:14px;font-weight:600;color:#f9fafb}
  .cb-header-sub{font-size:11px;color:rgba(255,255,255,.5)}
  .cb-close{background:none;border:none;color:rgba(255,255,255,.45);font-size:18px;cursor:pointer;padding:4px}
  .cb-close:hover{color:#fff}

  .cb-log{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px;
    max-height:250px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.1) transparent}
  .cb-log::-webkit-scrollbar{width:4px}
  .cb-log::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:4px}

  .cb-msg{max-width:82%;padding:10px 14px;border-radius:16px;font-size:13px;line-height:1.55;word-break:break-word}
  .cb-msg.bot{align-self:flex-start;background:rgba(232,131,158,.18);color:#fef5ef;border-bottom-left-radius:4px}
  .cb-msg.user{align-self:flex-end;background:rgba(168,216,203,.2);color:#fef5ef;border-bottom-right-radius:4px}

  .cb-typing{align-self:flex-start;display:flex;gap:5px;padding:10px 16px;background:rgba(232,131,158,.12);border-radius:16px;border-bottom-left-radius:4px}
  .cb-typing span{width:7px;height:7px;border-radius:50%;background:#e8839e;animation:cbDot 1.2s ease infinite}
  .cb-typing span:nth-child(2){animation-delay:.2s}
  .cb-typing span:nth-child(3){animation-delay:.4s}
  @keyframes cbDot{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-6px);opacity:1}}

  .cb-input-row{display:flex;gap:8px;padding:12px 14px;border-top:1px solid rgba(255,255,255,.08)}
  .cb-input{flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:24px;
    padding:8px 16px;color:#f9fafb;font-size:13px;outline:none;transition:border-color .2s}
  .cb-input::placeholder{color:rgba(255,255,255,.3)}
  .cb-input:focus{border-color:rgba(232,131,158,.5)}
  .cb-send{background:linear-gradient(135deg,#f4b8c1,#e8839e);border:none;width:36px;height:36px;border-radius:50%;
    color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .2s}
  .cb-send:hover{opacity:.85}
`;

/* ══════════════════════════════════════════════════════════════
 *  CompanionBot — main exported class
 * ══════════════════════════════════════════════════════════════ */
export class CompanionBot {

  /**
   * @param {Object}      opts
   * @param {Function}    [opts.onMessage]   – called with { from, text } on every message
   * @param {Function}    [opts.onTyping]    – called with boolean (typing state)
   * @param {HTMLElement} [opts.containerEl] – parent for DOM injection (default: document.body)
   */
  constructor(opts = {}) {
    this.onMessage = opts.onMessage || null;
    this.onTyping = opts.onTyping || null;
    this.containerEl = opts.containerEl || document.body;

    /* state */
    this._open = false;
    this._scene = 'hero';
    this._history = [];          // { from, text, ts }
    this._lastCategory = null;       // avoid repeating same category twice
    this._usedIdx = {};          // track used indices per category
    this._proactiveTimer = null;

    /* DOM refs (populated in createDOM) */
    this._root = null;
    this._toggle = null;
    this._panel = null;
    this._log = null;
    this._input = null;
    this._typingEl = null;
  }

  /* ── public API ─────────────────────────────────────────── */

  /** Initialise the bot: inject styles, build DOM, show welcome message. */
  init() {
    this._injectCSS();
    this._createDOM();
    this._bindEvents();
    /* welcome after a brief pause */
    setTimeout(() => this._botReply('GREETING'), 800);
    /* proactive messages every 60-90 s */
    this._scheduleProactive();
  }

  /** Process a user message. */
  handleUserMessage(text) {
    if (!text || !text.trim()) return;
    const clean = text.trim();
    this._addMessage('user', clean);
    const category = this._detectIntent(clean);
    /* simulate natural typing delay */
    const delay = Math.min(1200 + clean.length * 18, 2800);
    this._showTyping(true);
    setTimeout(() => {
      this._showTyping(false);
      this._botReply(category);
    }, delay);
  }

  /** Tell the bot which scene/section the user is viewing. */
  setCurrentScene(sceneName) {
    const prev = this._scene;
    this._scene = sceneName;
    /* if scene changed and chat is open, drop a contextual tip */
    if (prev !== sceneName && this._open && SCENE_TIPS[sceneName]) {
      setTimeout(() => this._addMessage('bot', SCENE_TIPS[sceneName]), 600);
    }
  }

  /** Get a random proactive sweet message (useful externally). */
  getProactiveMessage() {
    return PROACTIVE[Math.floor(Math.random() * PROACTIVE.length)];
  }

  /** Tear everything down. */
  destroy() {
    clearInterval(this._proactiveTimer);
    if (this._root && this._root.parentNode) {
      this._root.parentNode.removeChild(this._root);
    }
    const style = document.getElementById('cb-styles');
    if (style) style.remove();
  }

  /* ── intent detection ───────────────────────────────────── */

  /**
   * Simple keyword / regex intent classifier.
   * Returns the best-match category key.
   */
  _detectIntent(text) {
    for (const { key, patterns } of INTENTS) {
      if (patterns.some(p => p.test(text))) return key;
    }
    /* fallback: crude sentiment boost */
    if (/❤|💕|💖|💗|🥰|😍|💘|💞/.test(text)) return 'SWEET_NOTHINGS';
    return 'DEFAULT';
  }

  /* ── response selection (avoids repeats) ────────────────── */

  _pickResponse(category) {
    const pool = RESPONSES[category] || RESPONSES.DEFAULT;
    if (!this._usedIdx[category]) this._usedIdx[category] = new Set();
    const used = this._usedIdx[category];
    /* reset if we've exhausted the pool */
    if (used.size >= pool.length) used.clear();
    let idx;
    do { idx = Math.floor(Math.random() * pool.length); } while (used.has(idx));
    used.add(idx);
    return pool[idx];
  }

  _botReply(category) {
    const text = this._pickResponse(category);
    this._lastCategory = category;
    this._addMessage('bot', text);
  }

  /* ── DOM creation ───────────────────────────────────────── */

  _injectCSS() {
    if (document.getElementById('cb-styles')) return;
    const el = document.createElement('style');
    el.id = 'cb-styles';
    el.textContent = BOT_CSS;
    document.head.appendChild(el);
  }

  /** Build the entire chat UI and append to containerEl. */
  _createDOM() {
    /* wrapper */
    const root = document.createElement('div');
    root.className = 'cb-root';

    /* ── toggle button ── */
    const toggle = document.createElement('button');
    toggle.className = 'cb-toggle';
    toggle.setAttribute('aria-label', 'Open companion chat');
    toggle.innerHTML = '<span class="cb-pulse"></span><span aria-hidden="true">N/K</span>';

    /* ── panel ── */
    const panel = document.createElement('div');
    panel.className = 'cb-panel';
    panel.style.display = 'none';

    /* header */
    const header = document.createElement('div');
    header.className = 'cb-header';
    header.innerHTML = `
      <div class="cb-avatar">N</div>
      <div class="cb-header-text">
        <div class="cb-header-title">A note from ${STORY.him}'s side</div>
        <div class="cb-header-sub">A quiet guide through the story</div>
      </div>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'cb-close';
    closeBtn.setAttribute('aria-label', 'Close chat');
    closeBtn.textContent = '✕';
    header.appendChild(closeBtn);

    /* message log */
    const log = document.createElement('div');
    log.className = 'cb-log';

    /* typing indicator (hidden by default) */
    const typing = document.createElement('div');
    typing.className = 'cb-typing';
    typing.style.display = 'none';
    typing.innerHTML = '<span></span><span></span><span></span>';

    /* input row */
    const inputRow = document.createElement('div');
    inputRow.className = 'cb-input-row';
    const input = document.createElement('input');
    input.className = 'cb-input';
    input.type = 'text';
    input.placeholder = 'Say what is on your mind...';
    input.setAttribute('aria-label', 'Chat message');
    const sendBtn = document.createElement('button');
    sendBtn.className = 'cb-send';
    sendBtn.setAttribute('aria-label', 'Send message');
    sendBtn.textContent = '→';
    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);

    /* assemble panel */
    panel.appendChild(header);
    panel.appendChild(log);
    panel.appendChild(typing);
    panel.appendChild(inputRow);

    /* assemble root */
    root.appendChild(toggle);
    root.appendChild(panel);
    this.containerEl.appendChild(root);

    /* store refs */
    this._root = root;
    this._toggle = toggle;
    this._panel = panel;
    this._log = log;
    this._input = input;
    this._typingEl = typing;
    this._closeBtn = closeBtn;
    this._sendBtn = sendBtn;
  }

  /* ── event binding ──────────────────────────────────────── */

  _bindEvents() {
    /* toggle open/close */
    this._toggle.addEventListener('click', () => this._togglePanel());
    this._closeBtn.addEventListener('click', () => this._togglePanel(false));

    /* send on enter / click */
    this._sendBtn.addEventListener('click', () => this._submitInput());
    this._input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this._submitInput(); }
    });
  }

  _submitInput() {
    const val = this._input.value;
    this._input.value = '';
    this.handleUserMessage(val);
  }

  /* ── panel open / close (GSAP) ──────────────────────────── */

  _togglePanel(forceState) {
    const next = forceState !== undefined ? forceState : !this._open;
    this._open = next;


    if (next) {
      this._panel.style.display = 'flex';
      gsap.fromTo(this._panel,
        { opacity: 0, scale: 0.85, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.4)' });
      this._input.focus();
    } else {
      gsap.to(this._panel,
        {
          opacity: 0, scale: 0.85, y: 20, duration: 0.25, ease: 'power2.in',
          onComplete: () => { this._panel.style.display = 'none'; }
        });
    }
  }

  /* ── message rendering ──────────────────────────────────── */

  /**
   * Append a message bubble to the chat log.
   * @param {'bot'|'user'} from
   * @param {string}        text
   */
  _addMessage(from, text) {
    const bubble = document.createElement('div');
    bubble.className = `cb-msg ${from}`;
    bubble.textContent = text;

    this._log.appendChild(bubble);
    this._scrollToBottom();

    /* animate in with GSAP */
    gsap.from(bubble, { opacity: 0, y: 12, duration: 0.35, ease: 'power2.out' });

    /* record history */
    const record = { from, text, ts: Date.now() };
    this._history.push(record);

    /* external callback */
    if (this.onMessage) this.onMessage(record);
  }

  /* ── typing indicator ───────────────────────────────────── */

  _showTyping(show) {
    this._typingEl.style.display = show ? 'flex' : 'none';
    if (show) this._scrollToBottom();
    if (this.onTyping) this.onTyping(show);
  }

  /* ── helpers ────────────────────────────────────────────── */

  _scrollToBottom() {
    requestAnimationFrame(() => {
      this._log.scrollTop = this._log.scrollHeight;
    });
  }

  /** Schedule periodic proactive messages (60-90 s). */
  _scheduleProactive() {
    const fire = () => {
      if (this._open && this._history.length > 0) {
        const msg = this.getProactiveMessage();
        this._addMessage('bot', msg);
      }
    };
    this._proactiveTimer = setInterval(fire, 60_000 + Math.random() * 30_000);
  }
}
