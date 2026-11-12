(function () {
  const songs = window.SONGS;
  const moods = window.MOODS;
  const state = { query: '', language: 'all', mood: 'all', currentSong: null };
  const featured = songs.find((song) => song.id === 'until-i-found-you') || songs[0];
  let welcomeSequenceStarted = false;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
  }

  function moodFor(song) { return moods.find((mood) => mood.id === song.mood) || moods[0]; }
  function songById(id) { return songs.find((song) => song.id === id); }
  function artworkClass(song) { return `art-${song.art || 'sunrise'}`; }

  function renderMoods() {
    $('#mood-grid').innerHTML = moods.map((mood) => {
      const count = songs.filter((song) => song.mood === mood.id).length;
      return `<article class="mood-card ${mood.className}" data-mood="${mood.id}" tabindex="0" role="button" aria-label="Explore ${mood.title}">
        <div class="mood-top"><span class="mood-icon">${mood.icon}</span><span class="mood-number">${mood.number}</span></div>
        <h3>${mood.title}</h3><p>${mood.description}</p><span class="mood-count">${count} songs ↗</span>
      </article>`;
    }).join('');
  }

  function songCard(song) {
    const mood = moodFor(song);
    const favourite = Favourites.has(song.id);
    return `<article class="song-card" data-song-id="${song.id}">
      <div class="song-art album-art ${artworkClass(song)}"><span class="art-title">${escapeHtml(song.title.split(' ').slice(0, 2).join(' '))}<br /><em>${escapeHtml(song.title.split(' ').slice(2, 5).join(' '))}</em></span><span class="art-footer">${song.language === 'hindi' ? 'हिंदी' : 'English'} · ${song.duration}</span></div>
      <div class="song-card-copy"><h3>${escapeHtml(song.title)}</h3><p>${escapeHtml(song.artist)}</p><div class="song-meta"><span class="mood-label">${mood.title}</span><span>•</span><span>${song.language}</span></div></div>
      <div class="song-card-actions"><button class="song-play" type="button" data-action="play" aria-label="Play ${escapeHtml(song.title)}">▶</button><button class="song-favourite ${favourite ? 'is-favourite' : ''}" type="button" data-action="favourite" aria-label="${favourite ? 'Remove from' : 'Add to'} favourites">${favourite ? '♥' : '♡'}</button></div>
    </article>`;
  }

  function matches(song) {
    const query = state.query.trim().toLowerCase();
    const queryMatch = !query || `${song.title} ${song.artist}`.toLowerCase().includes(query);
    const languageMatch = state.language === 'all' || (state.language === 'favourites' ? Favourites.has(song.id) : song.language === state.language);
    const moodMatch = state.mood === 'all' || song.mood === state.mood;
    return queryMatch && languageMatch && moodMatch;
  }

  function renderSongs() {
    const filtered = songs.filter(matches);
    $('#song-grid').innerHTML = filtered.map(songCard).join('');
    $('#empty-state').hidden = filtered.length !== 0;
    const active = $('#active-filter');
    if (state.mood !== 'all') {
      const mood = moodFor({ mood: state.mood });
      active.hidden = false;
      active.innerHTML = `Showing <strong>${mood.title}</strong><button type="button" data-action="clear-mood">× clear</button>`;
    } else { active.hidden = true; active.innerHTML = ''; }
  }

  function miniSong(song, action = 'play') {
    return `<div class="mini-song"><div class="mini-song-art album-art ${artworkClass(song)}"></div><div class="mini-song-copy"><strong>${escapeHtml(song.title)}</strong><span>${escapeHtml(song.artist)}</span></div><button type="button" data-action="${action}" data-song-id="${song.id}" aria-label="Open ${escapeHtml(song.title)}">${action === 'favourite' ? '♥' : '▶'}</button></div>`;
  }

  function renderPersonalLists() {
    const favourites = Favourites.all().map(songById).filter(Boolean);
    const recent = Favourites.recent().map(songById).filter(Boolean);
    $('#favourite-count').textContent = `${favourites.length} song${favourites.length === 1 ? '' : 's'}`;
    $('#favourites-list').innerHTML = favourites.length ? favourites.slice(0, 4).map((song) => miniSong(song)).join('') : '<p class="list-placeholder">Tap the heart on any song to keep it here.</p>';
    $('#recent-list').innerHTML = recent.length ? recent.slice(0, 4).map((song) => miniSong(song)).join('') : '<p class="list-placeholder">Your listening trail will appear here.</p>';
  }

  function setFilters() {
    $$('.filter-chip').forEach((chip) => chip.classList.toggle('is-active', chip.dataset.language === state.language));
  }

  function openModal(song, autoplay = false) {
    if (!song) return;
    state.currentSong = song;
    const modal = $('#song-modal');
    $('[data-modal-title]').textContent = song.title;
    $('[data-modal-artist]').textContent = song.artist;
    $('[data-modal-note]').innerHTML = song.note ? escapeHtml(song.note) : 'Your note will live here. Add it in <code>js/songs.js</code> when you are ready.';
    const youtubeLink = $('[data-youtube-link]');
    youtubeLink.href = `https://www.youtube.com/watch?v=${encodeURIComponent(song.videoId)}`;
    youtubeLink.hidden = true;
    const art = $('[data-modal-art]');
    art.className = `modal-art album-art ${artworkClass(song)}`;
    art.innerHTML = `<span class="modal-art-number">${String(songs.indexOf(song) + 1).padStart(2, '0')}</span><span class="modal-art-title">${escapeHtml(song.title)}</span>`;
    $('[data-action="modal-favourite"]').textContent = Favourites.has(song.id) ? '♥' : '♡';
    if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', '');
    MusicPlayer.setModalVisible(true);
    MusicPlayer.load(song, songs.indexOf(song));
    updateYouTubeState(song);
    if (autoplay) MusicPlayer.play(song, songs.indexOf(song));
  }

  function updateYouTubeState(song) {
    const placeholder = $('[data-youtube-placeholder]');
    const localAudio = $('[data-local-audio-shell]');
    const hasLocalAudio = Boolean(song.audioSrc);
    localAudio.hidden = !hasLocalAudio;
    placeholder.hidden = Boolean(song.videoId) || hasLocalAudio;
    $('[data-youtube-link]').hidden = hasLocalAudio || !song.videoId;
  }

  function closeModal() { const modal = $('#song-modal'); if (typeof modal.close === 'function') modal.close(); else modal.removeAttribute('open'); MusicPlayer.setModalVisible(false); }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  function celebrateHeart(origin) {
    const layer = origin.closest('dialog')?.querySelector('[data-celebration-layer]') || $('[data-celebration-layer]');
    if (!layer || !origin) return;
    const rect = origin.getBoundingClientRect();
    const symbols = ['♡', '♥', '✦', '✧', '♡', '•'];
    symbols.forEach((symbol, index) => {
      const particle = document.createElement('span');
      particle.className = 'heart-particle';
      particle.textContent = symbol;
      particle.style.setProperty('--start-x', `${rect.left + rect.width / 2}px`);
      particle.style.setProperty('--start-y', `${rect.top + rect.height / 2}px`);
      particle.style.setProperty('--drift-x', `${(index - 2.5) * 25 + (index % 2 ? 8 : -8)}px`);
      particle.style.setProperty('--drift-y', `${-42 - (index % 3) * 18}px`);
      particle.style.setProperty('--rotation', `${(index - 2.5) * 26}deg`);
      particle.style.setProperty('--particle-delay', `${index * 35}ms`);
      particle.style.setProperty('--particle-size', `${13 + (index % 3) * 4}px`);
      particle.style.setProperty('--particle-color', index % 2 ? '#d97998' : '#b96782');
      layer.appendChild(particle);
      window.setTimeout(() => particle.remove(), 1450);
    });
  }

  function syncPlayer(song = state.currentSong, playing = false, status = 'Ready when you are') {
    if (!song) return;
    state.currentSong = song;
    $('[data-player-title]').textContent = song.title;
    $('[data-player-artist]').textContent = song.artist;
    $('[data-player-status]').textContent = status;
    $('[data-player-art]').className = `player-art album-art ${artworkClass(song)}`;
    $('[data-player-art]').innerHTML = '<span class="player-art-mark">J</span>';
    $('#player-bar').classList.toggle('is-playing', playing);
    $('[data-player="play"]').innerHTML = playing ? '<span>Ⅱ</span>' : '<span>▶</span>';
  }

  function startWelcomeSequence() {
    if (welcomeSequenceStarted) return;
    welcomeSequenceStarted = true;
    const readyDialog = $('[data-ready-dialog]');
    const roseSequence = $('[data-jyoti-rose]');
    const bouquet = $('[data-welcome-bouquet]');
    const openingNote = $('[data-opening-note]');
    readyDialog.classList.add('is-dismissed');
    window.setTimeout(() => {
      readyDialog.hidden = true;
      roseSequence.hidden = false;
      roseSequence.classList.add('is-visible');
      MusicPlayer.play(featured, songs.indexOf(featured));
    }, 520);
    window.setTimeout(() => {
      roseSequence.classList.add('is-dismissed');
      window.setTimeout(() => {
        roseSequence.hidden = true;
        bouquet.hidden = false;
        bouquet.classList.add('is-visible');
        window.setTimeout(() => {
          bouquet.classList.add('is-dismissed');
          window.setTimeout(() => {
            bouquet.hidden = true;
            openingNote.hidden = false;
            openingNote.classList.add('is-visible');
          }, 620);
        }, 3150);
      }, 620);
    }, 10520);
  }

  function enterExperience() {
    const app = $('#app-shell');
    const openingNote = $('[data-opening-note]');
    if (openingNote) {
      openingNote.classList.add('is-dismissed');
      openingNote.setAttribute('aria-hidden', 'true');
      window.setTimeout(() => { openingNote.hidden = true; }, 560);
    }
    app.classList.remove('is-locked');
    $('#player-bar').hidden = false;
    MusicPlayer.play(featured, songs.indexOf(featured));
    window.setTimeout(() => {
      $('[data-jyoti-video]')?.play().catch(() => {});
      $('#dashboard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function randomSong() {
    const song = songs[Math.floor(Math.random() * songs.length)];
    openModal(song, false);
    showToast(`A little surprise: ${song.title}`);
  }

  function handleAction(action, song, origin) {
    if (action === 'ready') return startWelcomeSequence();
    if (action === 'enter') return enterExperience();
    if (action === 'surprise') return randomSong();
    if (action === 'show-all') { state.language = 'all'; state.mood = 'all'; setFilters(); renderSongs(); return $('#library').scrollIntoView({ behavior: 'smooth' }); }
    if (action === 'clear-mood') { state.mood = 'all'; renderSongs(); return; }
    if (action === 'close-modal') return closeModal();
    if (action === 'current-details') return openModal(state.currentSong, false);
    if (!song) return;
    if (action === 'play' || action === 'play-featured' || action === 'modal-play') return openModal(song, true);
    if (action === 'details-featured') return openModal(song, false);
    if (action === 'favourite' || action === 'modal-favourite') {
      const isFavourite = Favourites.toggle(song.id);
      if (isFavourite) celebrateHeart(origin);
      if (action === 'modal-favourite') $('[data-action="modal-favourite"]').textContent = isFavourite ? '♥' : '♡';
      renderSongs(); renderPersonalLists();
      showToast(isFavourite ? 'Saved to your favourites' : 'Removed from your favourites');
    }
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const actionElement = event.target.closest('[data-action]');
      const moodElement = event.target.closest('[data-mood]');
      const filterElement = event.target.closest('[data-language]');
      const songElement = event.target.closest('[data-song-id]');
      if (actionElement) {
        const id = actionElement.dataset.songId || songElement?.dataset.songId || (actionElement.dataset.action.includes('featured') ? featured.id : state.currentSong?.id);
        handleAction(actionElement.dataset.action, songById(id), actionElement);
      } else if (moodElement) {
        state.mood = moodElement.dataset.mood; renderSongs(); $('#library').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (filterElement) {
        state.language = filterElement.dataset.language; setFilters(); renderSongs();
      }
    });
    $('#mood-grid').addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') event.target.click(); });
    $('#song-search').addEventListener('input', (event) => { state.query = event.target.value; renderSongs(); });
    $('[data-player="play"]').addEventListener('click', () => MusicPlayer.toggle());
    $('[data-player="prev"]').addEventListener('click', () => MusicPlayer.previous());
    $('[data-player="next"]').addEventListener('click', () => MusicPlayer.next());
    $('.theme-toggle').addEventListener('click', () => {
      document.body.classList.toggle('night-mode');
      const night = document.body.classList.contains('night-mode');
      localStorage.setItem('songs-that-remind-me:night', String(night));
      $('.theme-icon').textContent = night ? '☀' : '☾';
    });
    $('#song-modal').addEventListener('click', (event) => { if (event.target === $('#song-modal')) closeModal(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
  }

  function init() {
    renderMoods(); renderSongs(); renderPersonalLists(); bindEvents();
    if (localStorage.getItem('songs-that-remind-me:night') === 'true') { document.body.classList.add('night-mode'); $('.theme-icon').textContent = '☀'; }
    $('[data-featured-title]').textContent = featured.title;
    $('[data-featured-artist]').textContent = featured.artist;
    $('[data-featured-note]').textContent = featured.note;
    const featuredArt = $('[data-featured-art]');
    featuredArt.className = `featured-art album-art ${artworkClass(featured)}`;
    featuredArt.innerHTML = `<img class="featured-image" data-featured-image src="https://i.ytimg.com/vi/${encodeURIComponent(featured.videoId)}/hqdefault.jpg" alt="${escapeHtml(featured.title)} artwork" referrerpolicy="no-referrer" /><span class="art-orbit orbit-one"></span><span class="art-orbit orbit-two"></span><span class="art-sun"></span><span class="art-title">until I<br /><em>found you</em></span><span class="art-footer">J · ${String(songs.indexOf(featured) + 1).padStart(2, '0')}</span>`;
    document.addEventListener('click', (event) => { if (event.target.closest('[data-action="play-featured"], [data-action="details-featured"]')) return; });
    window.addEventListener('favourites:changed', () => { renderSongs(); renderPersonalLists(); if (state.currentSong) $('[data-action="modal-favourite"]').textContent = Favourites.has(state.currentSong.id) ? '♥' : '♡'; });
    window.addEventListener('recent:changed', renderPersonalLists);
    window.addEventListener('player:change', (event) => syncPlayer(event.detail.song, event.detail.playing, event.detail.playing ? 'Playing now' : 'Ready when you are'));
    window.addEventListener('player:status', (event) => syncPlayer(state.currentSong, event.detail.playing, event.detail.status));
    window.addEventListener('player:need-id', (event) => { showToast(`Add a real YouTube ID for “${event.detail.song.title}” in js/songs.js`); openModal(event.detail.song, false); });
    window.addEventListener('player:need-song', () => showToast('Choose a song first, then press play.'));
    window.addEventListener('toast:show', (event) => showToast(event.detail));
    window.addEventListener('player:error', () => {
      const youtubeLink = $('[data-youtube-link]');
      if (youtubeLink && state.currentSong) {
        youtubeLink.href = `https://www.youtube.com/watch?v=${encodeURIComponent(state.currentSong.videoId)}`;
        youtubeLink.hidden = false;
      }
    });
    MusicPlayer.load(featured, songs.indexOf(featured));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
