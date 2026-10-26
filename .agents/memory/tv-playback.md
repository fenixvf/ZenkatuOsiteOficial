---
name: TV playback support
description: Casting behavior and browser limitations for Zenkatu's direct video and embedded players.
---

Use Google Cast for direct MP4/HLS sources, with the browser's Remote Playback API and Safari AirPlay picker as fallbacks. Third-party cross-origin iframe players are controlled by their provider, so rely on the provider's cast controls rather than trying to control the iframe from Zenkatu.

After `CastContext.requestSession()` resolves, retrieve the active session with `getCurrentSession()` and verify it exists before calling `loadMedia`; do not treat the resolved value as the session.

**Why:** selecting a TV can succeed while the local session value is still null, leaving the receiver connected but idle when `loadMedia` is called on it.

**How to apply:** retrieve and validate the session before loading media. Keep direct-media and provider-embed behavior separate because browser same-origin protections prevent Zenkatu from controlling playback inside third-party iframes.
