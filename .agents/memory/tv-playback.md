---
name: TV playback support
description: Casting behavior and browser limitations for Zenkatu's direct video and embedded players.
---

Use Google Cast for direct MP4/HLS sources, with the browser's Remote Playback API and Safari AirPlay picker as fallbacks. Third-party cross-origin iframe players are controlled by their provider, so rely on the provider's cast controls rather than trying to control the iframe from Zenkatu.

**Why:** direct media URLs can be handed to a TV receiver, while browser same-origin protections prevent Zenkatu from controlling playback inside an external iframe.

**How to apply:** when adding player formats or TV controls, keep direct-media and provider-embed behavior separate and make unsupported cases clear to the viewer.
