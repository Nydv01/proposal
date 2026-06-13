/**
 * Admin Panel Script.
 * Handles Authorization checks, form binding, value injection,
 * and saving modified parameters back to localStorage.
 */

import { ContentLoader } from './content-loader.js';

const ADMIN_PASSWORD_HASH = 'lovekanak'; // Simple security gate password

const loginGate = document.getElementById('login-gate');
const loginForm = document.getElementById('login-form');
const adminPasswordInput = document.getElementById('admin-password');
const loginError = document.getElementById('login-error');

const adminPanel = document.getElementById('admin-panel');
const editorForm = document.getElementById('editor-form');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');

let contentLoader = null;
let activeData = null;

// Simple Authorization checking sequence
function checkAuth() {
  const isAuth = sessionStorage.getItem('admin_authorized') === 'true';
  if (isAuth) {
    revealDashboard();
  }
}

async function revealDashboard() {
  loginGate.classList.add('hidden');
  adminPanel.classList.remove('hidden');

  contentLoader = new ContentLoader();
  activeData = await contentLoader.load();

  if (activeData) {
    populateForm(activeData);
  }
}

// Map content.json properties directly onto input name coordinates
function populateForm(data) {
  // Hero Salutation
  document.getElementById('hero-welcome').value = data.hero?.welcome || '';
  document.getElementById('hero-name').value = data.hero?.name || '';
  document.getElementById('hero-subtitle').value = data.hero?.subtitle || '';

  // Poem Content
  document.getElementById('poem-title').value = data.poem?.title || '';
  document.getElementById('poem-author').value = data.poem?.author || '';
  document.getElementById('poem-lines').value = data.poem?.lines ? data.poem.lines.join('\n') : '';

  // Proposal climax
  document.getElementById('prop-intro').value = data.proposal?.introText || '';
  document.getElementById('prop-question').value = data.proposal?.question || '';
  document.getElementById('prop-yes').value = data.proposal?.yesText || '';
  document.getElementById('prop-no').value = data.proposal?.noText || '';

  // Response copies
  document.getElementById('prop-yes-title').value = data.proposal?.celebrationTitle || '';
  document.getElementById('prop-yes-text').value = data.proposal?.celebrationText || '';
  document.getElementById('prop-no-title').value = data.proposal?.declineTitle || '';
  document.getElementById('prop-no-text').value = data.proposal?.declineText || '';
}

// Bind save actions
function saveChanges() {
  if (!activeData) return;

  // Extract changes back into memory variables
  activeData.hero.welcome = document.getElementById('hero-welcome').value;
  activeData.hero.name = document.getElementById('hero-name').value;
  activeData.hero.subtitle = document.getElementById('hero-subtitle').value;

  activeData.poem.title = document.getElementById('poem-title').value;
  activeData.poem.author = document.getElementById('poem-author').value;
  // Parse lines back into standard JSON array formats
  activeData.poem.lines = document.getElementById('poem-lines').value.split('\n').filter(l => l.trim() !== '');

  activeData.proposal.introText = document.getElementById('prop-intro').value;
  activeData.proposal.question = document.getElementById('prop-question').value;
  activeData.proposal.yesText = document.getElementById('prop-yes').value;
  activeData.proposal.noText = document.getElementById('prop-no').value;

  activeData.proposal.celebrationTitle = document.getElementById('prop-yes-title').value;
  activeData.proposal.celebrationText = document.getElementById('prop-yes-text').value;
  activeData.proposal.declineTitle = document.getElementById('prop-no-title').value;
  activeData.proposal.declineText = document.getElementById('prop-no-text').value;

  // Save changes locally
  contentLoader.saveToLocal(activeData);
  alert("Proposal parameters updated successfully! 🎉 Feel free to refresh the main screen to see changes.");
}

function resetDefaults() {
  if (confirm("Are you sure you want to reset all customized values back to the default JSON parameters?")) {
    contentLoader.resetLocal();
    window.location.reload();
  }
}

// Event Bindings
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (adminPasswordInput.value === ADMIN_PASSWORD_HASH) {
    sessionStorage.setItem('admin_authorized', 'true');
    revealDashboard();
  } else {
    loginError.classList.remove('hidden');
  }
});

saveBtn.addEventListener('click', saveChanges);
resetBtn.addEventListener('click', resetDefaults);

// Self Bootstrapping
checkAuth();
