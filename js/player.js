(function () {
  let currentSong = null;
  let currentIndex = 0;
  let player = null;
  let apiReady = Boolean(window.YT && window.YT.Player);
  let pending = null;
  let modalVisible = false;
  const localAudio = document.getElementById('local-audio');

  function emit(type, detail) {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }

  function embedUrl(song, autoplay) {
    const params = new URLSearchParams({ enablejsapi: '1', playsinline: '1', rel: '0' });
    if (autoplay) params.set('autoplay', '1');
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      params.set('origin', window.location.origin);
    }
    return `https://www.youtube.com/embed/${encodeURIComponent(song.videoId)}?${params.toString()}`;
  }

  function ensureEmbed(song, autoplay) {
    const container = document.getElementById('youtube-player');
    if (!container || !song?.videoId) return;
    let frame = document.getElementById('youtube-player-frame');
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = 'youtube-player-frame';
      frame.width = '100%';
      frame.height = '150';
      frame.title = song.title;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true;
      container.replaceChildren(frame);
    }
    if (frame.dataset.videoId !== song.videoId || (autoplay && frame.dataset.autoplay !== 'true')) {
      frame.dataset.videoId = song.videoId;
      frame.dataset.autoplay = autoplay ? 'true' : 'false';
      frame.src = embedUrl(song, autoplay);
    }
  }

  function destroyYoutube() {
    if (player && typeof player.destroy === 'function') player.destroy();
    player = null;
    pending = null;
    const container = document.getElementById('youtube-player');
    if (container) container.replaceChildren();
  }

  function loadApi() {
    if (apiReady || document.querySelector('script[data-youtube-api]')) return;
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.dataset.youtubeApi = 'true';
    document.head.appendChild(script);
    window.onYouTubeIframeAPIReady = function () {
      apiReady = true;
      if (pending) {
        const queued = pending;
        pending = null;
        createOrLoad(queued.song, queued.autoplay);
      }
    };
  }

  function createOrLoad(song, autoplay) {
    if (!song || !song.videoId || !apiReady) return;
    if (!player) {
      ensureEmbed(song, autoplay);
      player = new window.YT.Player('youtube-player-frame', {
        events: {
          onReady: (event) => { if (autoplay) event.target.playVideo(); },
          onStateChange: (event) => {
            const playing = event.data === window.YT.PlayerState.PLAYING;
            const paused = event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED;
            if (playing) emit('player:status', { playing: true, status: 'Playing now' });
            if (paused) emit('player:status', { playing: false, status: event.data === window.YT.PlayerState.ENDED ? 'Finished' : 'Paused' });
          },
          onError: (event) => emit('player:error', { code: event.data, message: event.data === 153 ? 'YouTube needs a web address. Open this project through VS Code Live Server, not by double-clicking index.html.' : 'This upload cannot play inside the website. Use the YouTube fallback link below.' })
        }
      });
      return;
    }
    if (autoplay) player.loadVideoById(song.videoId);
    else player.cueVideoById(song.videoId);
  }

  function setSong(song, index, autoplay) {
    currentSong = song;
    currentIndex = typeof index === 'number' ? index : window.SONGS.findIndex((item) => item.id === song.id);
    emit('player:change', { song, index: currentIndex, playing: Boolean(autoplay) });

    if (song.audioSrc) {
      destroyYoutube();
      if (localAudio) {
        localAudio.src = encodeURI(song.audioSrc);
        localAudio.load();
        if (autoplay) localAudio.play().catch(() => emit('toast:show', 'Click Play to start the song.'));
      }
      return;
    }

    if (!song.videoId) {
      destroyYoutube();
      return;
    }
    ensureEmbed(song, autoplay);
    loadApi();
    if (!apiReady) { pending = { song, autoplay }; return; }
    createOrLoad(song, autoplay);
  }

  window.MusicPlayer = {
    load: (song, index) => setSong(song, index, false),
    play: (song, index) => {
      if (song && (!currentSong || song.id !== currentSong.id)) setSong(song, index, true);
      else if (currentSong && currentSong.audioSrc && localAudio) localAudio.play().catch(() => emit('toast:show', 'Click Play to start the song.'));
      else if (currentSong && currentSong.videoId && player && typeof player.playVideo === 'function') player.playVideo();
      else if (currentSong && !currentSong.videoId) emit('player:need-id', { song: currentSong });
    },
    toggle: () => {
      if (!currentSong) return emit('player:need-song');
      if (currentSong.audioSrc && localAudio) {
        if (localAudio.paused) localAudio.play().catch(() => emit('toast:show', 'Click Play to start the song.'));
        else localAudio.pause();
        return;
      }
      if (!currentSong.videoId) return emit('player:need-id', { song: currentSong });
      if (player && typeof player.getPlayerState === 'function' && player.getPlayerState() === window.YT.PlayerState.PLAYING) player.pauseVideo();
      else if (player) player.playVideo();
      else setSong(currentSong, currentIndex, true);
    },
    previous: () => {
      if (!window.SONGS.length) return;
      const nextIndex = (currentIndex - 1 + window.SONGS.length) % window.SONGS.length;
      setSong(window.SONGS[nextIndex], nextIndex, true);
    },
    next: () => {
      if (!window.SONGS.length) return;
      const nextIndex = (currentIndex + 1) % window.SONGS.length;
      setSong(window.SONGS[nextIndex], nextIndex, true);
    },
    current: () => currentSong,
    setModalVisible: (visible) => { modalVisible = visible; }
  };

  window.addEventListener('player:change', (event) => {
    if (event.detail.song && event.detail.playing) Favourites.addRecent(event.detail.song.id);
  });
  window.addEventListener('player:error', (event) => emit('toast:show', event.detail.message));

  localAudio?.addEventListener('play', () => emit('player:status', { playing: true, status: 'Playing now' }));
  localAudio?.addEventListener('pause', () => emit('player:status', { playing: false, status: 'Paused' }));
  localAudio?.addEventListener('ended', () => { emit('player:status', { playing: false, status: 'Finished' }); window.MusicPlayer?.next(); });
  localAudio?.addEventListener('error', () => emit('player:error', { message: 'The local audio file could not be loaded. Check the filename in js/songs.js.' }));
})();
