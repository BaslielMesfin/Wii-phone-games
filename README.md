# APEX / POCKET

A local-party kart racer: the laptop shows the race, and up to four phones act as controllers. This is an implementation checkpoint to continue on your Windows PC, not a browser-verified final release.

## Start on Windows

1. Install **Node.js 20 or newer** from https://nodejs.org if you do not already have it.
2. Extract the entire project ZIP into a folder. Do not open `index.html` directly.
3. Double-click **START-GAME.bat**. Keep the terminal window open.
4. The launcher opens **http://localhost:4173**. If the browser does not open automatically, open that address yourself.
5. Click **Solo test drive**, choose a track and car, then **Lights out. Let’s go.**

No `npm install` is needed. Three.js, QR generation, fonts, and all game artwork are included. Solo keyboard play does not require internet access.

Keyboard: **W / Up** = gas; **S / Down / Space** = brake; **A D / Left Right** = steer; **R** = reset car; **Esc** = pause. Hold gas and brake while turning to drift; release the brake to convert a charged drift into a boost. Drive over the colored strips for a track boost.

On macOS or Linux, use `node server.mjs` and open http://localhost:4173. To use another port: `node server.mjs --port 4174`.

## Included

- Two closed-loop 3D circuits: **Coastal Circuit** and **Neon Harbor**.
- Three procedural car models and handling classes: **Club**, **Zip**, and **GT**.
- Three-lap races, AI rivals, countdown, positions, speed display, lap gates, collisions, track boundaries, and reset.
- Drift charging, earned boosts, and track boost strips.
- Split-screen layouts for one, two, three, or four human drivers. Three players get a fourth-panel circuit overview.
- Track selection, car selection, ready checks, room capacity checks, pause, results, rematches, sound toggle, and local best-lap storage.
- Phone pairing code, QR invite, landscape red-left brake / green-right gas, held multi-touch pedals, tilt calibration, sensitivity, invert steering, touch-steering fallback, reconnect logic, and stale-input braking.
- A dependency-free Node static server and Windows launcher.

## Phone multiplayer: code included, real-device verification pending

**Internet is required for pairing** through the public PeerJS signaling service. The PeerJS client is loaded from a pinned CDN URL in `index.html`. When the network allows it, phone inputs travel directly to the laptop over WebRTC data channels. There is no dedicated game backend or bundled TURN relay; some isolated Wi-Fi networks, VPNs, or firewall configurations may prevent pairing. All game simulation runs on the laptop.

### Try touch steering on your local Wi-Fi

1. Put your laptop and phones on the same Wi-Fi. Avoid guest networks with client isolation.
2. Run `START-GAME.bat`. If Windows Firewall prompts, allow Node on your **private network**.
3. On the laptop, choose **Create a race**. Wait for the pairing service to open a room.
4. Scan the QR code with each phone camera. The local server supplies your LAN address automatically; the QR must not point to `localhost` on a phone. If your laptop has several network adapters, open the game on the laptop using the correct `Phone / LAN` address printed by the server before creating the QR.
5. Enter a name, rotate to landscape, choose **Touch arrows (fallback)**, choose a car, and tap **I’m ready**.
6. Start the race on the laptop. Disable the laptop keyboard driver if you want all four slots available to phones. One keyboard driver plus three phones is also supported.

### Tilt steering needs trusted HTTPS

Browsers block motion sensors on an ordinary `http://192.168...` phone page. This version detects insecure connections and selects touch steering. A trusted HTTPS deployment or a trusted local HTTPS setup is the next PC task before checking tilt controls.

The server accepts certificates you already have:

```sh
node server.mjs --cert path/to/cert.pem --key path/to/key.pem
```

The certificate must cover the address used by the phone and be trusted on that phone. A random self-signed certificate is not a reliable cross-device solution. Do not commit private keys. Alternatively, host the static project on an HTTPS static hosting service.

Once HTTPS is working: enable motion permission, hold the phone in a comfortable landscape position, tap **Calibrate**, and check the steering gauge. Use **Invert steering** if your phone's orientation produces the opposite direction. Some browsers need motion permission in their site settings. Keep phones unlocked and the laptop tab visible.

## Validation completed here

Run these without installing dependencies:

```sh
npm test
npm run check
```

Fifteen tests pass. They cover all six track/car combinations completing three valid laps under AI control, closed circuits, 3D car construction, braking, drift boost charging and release, checkpoint enforcement, track boundaries/reset, collisions, and results ordering. All application JavaScript passes syntax checks.

**Browser rendering, real-phone motion, live WebRTC pairing, split-screen performance, and cross-browser/device compatibility have not been verified.** This workspace blocked local server binding and Chromium launch. Passing simulation tests does not establish that these browser/device paths work correctly.

## Continue on the PC

1. Run the keyboard game and inspect both circuits, car models, UI sizing, and frame rate.
2. Check race countdown, pause/resume, results/rematch, and changing tracks repeatedly.
3. Verify one phone over LAN touch steering, then two, three, and four players.
4. Enable trusted HTTPS and check Android motion direction, calibration, pedal multi-touch, and disconnect/reconnect braking.
5. Check an iPhone, both landscape orientations, permission refusal, and screen wake behavior.
6. Tune handling and AI difficulty based on actual driving feedback. Current AI is intentionally straightforward; it is not difficulty-balanced.
7. Publish the HTTPS version when ready. The source repository is https://github.com/BaslielMesfin/Wii-phone-games.

## Project layout

`src/host.js` owns menus, race state, split-screen HUD, and results. `src/world.js` builds the 3D scenes, tracks, cars, and cameras. `src/physics.js` handles simulation and AI. `src/network.js` handles room and controller connections. `src/phone.js` implements the phone controls. `src/style.css` contains desktop and phone layouts. `vendor/` includes the local engine, QR library, fonts, and their licenses.

`npm run package` builds `dist/` for static hosting. The output excludes tests, server code, and local publishing metadata. Any static HTTPS host can serve it. Keep the relative directory structure intact.

Third-party licenses are in `vendor/`. PeerJS is loaded from jsDelivr and distributed under its upstream MIT license. No analytics, accounts, or payment systems are included.

## Open this project locally in Codex

This chat was operating in a Linux cloud workspace. Opening the chat on a Windows PC does not move its files or execution environment onto that PC.

In PowerShell on your PC:

```powershell
git clone https://github.com/BaslielMesfin/Wii-phone-games.git
cd Wii-phone-games
node server.mjs
```

Open the cloned folder as a local project in the Codex desktop app or VS Code with the Codex extension, and start a local task there. If you use Codex CLI, run `codex` from that folder. Ask it to read `HANDOFF.md`, start the game, verify both tracks in a browser, and finish the phone pairing/HTTPS/device checks. Node.js 20 or newer is required; npm dependency installation is not.
