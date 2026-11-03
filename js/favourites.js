(function () {
  const KEY = 'songs-that-remind-me:favourites';
  const RECENT_KEY = 'songs-that-remind-me:recent';

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (error) { return []; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { /* localStorage can be unavailable in private contexts */ }
  }

  window.Favourites = {
    all: () => read(KEY),
    has: (id) => read(KEY).includes(id),
    toggle: (id) => {
      const current = read(KEY);
      const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current];
      write(KEY, next);
      window.dispatchEvent(new CustomEvent('favourites:changed', { detail: { ids: next, id, isFavourite: next.includes(id) } }));
      return next.includes(id);
    },
    recent: () => read(RECENT_KEY),
    addRecent: (id) => {
      const next = [id, ...read(RECENT_KEY).filter((item) => item !== id)].slice(0, 5);
      write(RECENT_KEY, next);
      window.dispatchEvent(new CustomEvent('recent:changed', { detail: { ids: next } }));
    }
  };
})();
