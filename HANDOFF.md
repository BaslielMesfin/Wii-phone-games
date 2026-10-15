# APEX Pocket — Windows continuation

Repository cloned locally on 2026-10-15. Node v22.18.0 and Git are installed. The user authorized finishing the game, browser testing, HTTPS phone tilt, multiplayer up to four players, and pushing changes to BaslielMesfin/Wii-phone-games.

## Implemented and checked

- Direct same-origin WebSocket pairing through the Node server, with vendored MIT ws 8.22.0. No npm installation or external signaling is required for local play. Static builds retain PeerJS fallback via lazy import.
- Up to four phones, or keyboard plus three phones. Host validates input and profiles, retains reconnect identity, and brakes stale/disconnected controllers. Relay limits message size and peers, prevents cross-room forwarding, validates Origin, and heartbeats dead sockets.
- START-PHONE-HTTPS.bat invokes scripts/https.mjs. It uses the installed Windows SSH client and localhost.run to create a temporary trusted public HTTPS address. No binary download or local CA installation. It starts a loopback-only server on port 4174 and prints/opens the public URL. Ctrl+C shuts down both processes. Host keys are isolated in ignored .tools/known_hosts. It does not use the user's SSH keys or config.
- Motion math extracted and tested for both landscape orientations, calibration, inversion, invalid sensor samples, and full-steering limits. Missing motion data stops acceleration. Settings/blur/visibility release controls. Reconnect resets ready UI; live telemetry restores connection status.
- Fixed negative frame delta briefly displaying a 4-second countdown; stale connections cannot change the reconnected driver's profile; old connection timers cannot close a replacement connection. Simultaneous touch arrows retain the still-held direction.
- Server now only serves browser assets and its endpoints. Git metadata, tooling, keys, and source/server scripts are not publicly served.

19 tests pass; npm run check passes. Tests include all six track/car combinations finishing three legitimate laps, relay four-phone capacity/fifth rejection, routing isolation, Origin rejection, reconnect identity, stale-input braking, and tilt math.

## Browser evidence

The Codex in-app browser rendered both Coastal Circuit and Neon Harbor with Club, Zip, and GT in four-camera split-screen. Four independent controller tabs joined/readying on the LAN endpoint, car selections reached the lobby, and pedal input affected speed telemetry. Keyboard acceleration reached 28 km/h, braking returned to 0, pause and return-to-lobby worked, and tracks switched. These are simulated controllers in browser tabs, not four physical phones. Background tab throttling can mark simulated controllers stale, as expected.

The live HTTPS game rendered and accepted a browser controller. A separate public WSS probe then verified four controllers sending inputs and receiving telemetry through the tunnel. Launcher now forces IPv4; initial attempts on this connection dropped/timed out, so do not promise uninterrupted external service availability. Public addresses are ephemeral; don't reuse old QA URLs.

## Remaining device gate

Do not call this verified on Android/iPhone without actual devices. User must check sensor direction on their phone, both landscape orientations, browser motion permission, simultaneous finger pedals, wake lock behavior, and sustained four-phone frame rate/latency. Touch steering fallback is available. AI difficulty is functional but not extensively player-balanced.

HTTPS service URLs are temporary. Open the current launcher's HTTPS URL on the laptop before creating the room so the QR uses that same origin. Phones must use the same server URL; room codes are scoped to a server. No permanent deployment is claimed. If SSH is blocked, try another network or trusted manual TLS. Static hosting uses a different PeerJS path and was not revalidated here.
