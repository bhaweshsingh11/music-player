# Songs That Remind Me of You

A soft-romantic, responsive music experience dedicated to Jyoti. It is built with semantic HTML, modular CSS, and vanilla JavaScript.

## Run locally

Serve this folder with VS Code Live Server before testing YouTube playback. Do not double-click `index.html`, because YouTube requires an `http://` or `https://` page origin. No build step or package installation is required.

## Add YouTube playback

Open `js/songs.js` to change any `videoId`. Each song now has a verified 11-character YouTube video ID. For example, `https://www.youtube.com/watch?v=VIDEO_ID` uses `VIDEO_ID`.

Playback begins only after a visitor clicks a control. If a song has no ID yet, the song detail view shows a friendly setup message instead of a broken embed.

## Edit personal notes

Each song object in `js/songs.js` includes a `note` field. Replace the empty string with your own message. The `Why This Song?` section will display it automatically.

## Project layout

```text
Songs-That-Remind-Me/
  index.html
  css/
    style.css
    responsive.css
    animations.css
  js/
    songs.js
    moods.js
    favourites.js
    navigation.js
    player.js
    app.js
  assets/
    README.md
```

All 20 titles supplied in the brief are included, with mood tags, language filters, favourites, recents, search, and a persistent player shell.
