# APEX / POCKET

A split-screen kart racer: the laptop displays the race and up to four phones become steering wheels. Two circuits, three car classes, three laps, drifting and boosts. No weapons, accounts, or npm installation.

## Play on Windows

Install **Node.js 20 or newer**, clone or extract the whole project, and choose a launcher:

- **START-GAME.bat** — offline keyboard racing, or phone touch controls over local Wi-Fi.
- **START-PHONE-HTTPS.bat** — phone tilt controls through a temporary trusted HTTPS address. Requires internet and Windows OpenSSH Client, included on most Windows PCs. No extra download or account is required.

Keep the launcher's terminal open. Closing it ends the game/link. Do not double-click `index.html`.

Keyboard: **W / Up** gas; **S / Down / Space** brake; **A D / Left Right** steer; **R** reset; **Esc** pause. Hold gas and brake while turning to charge a drift, then release brake to boost. Colored strips on the circuit also boost your car.

## Phone tilt: recommended setup

1. Double-click **START-PHONE-HTTPS.bat**. The laptop browser opens the printed HTTPS address. Use that address rather than `localhost` for this session.
2. Choose **Create a race**, then scan the lobby QR on each phone. Each phone must open the same address/server as the laptop; room codes identify a room on that server.
3. Enter a driver name, rotate to landscape, and choose Club, Zip, or GT.
4. Tap **Enable tilt steering** and grant motion permission if requested. Hold the phone comfortably and tap **Calibrate**. Tilt both ways to check the gauge. Adjust sensitivity or invert if needed.
5. Tap **I'm ready** on every phone, then start the race on the laptop.

Red left half = brake; green right half = gas. Hold both while steering to drift. **Touch arrows** remain available when motion permission is unavailable. Keep the laptop tab visible and every phone unlocked. Opening controller settings, losing focus, stale motion, or stale inputs releases the accelerator; disconnected controllers brake on the host.

Turn the landscape phone like a steering wheel: lower its right end to steer right, and lower its left end to steer left. Tipping the screen toward/away should not change steering. The setup panel includes a live LEFT–RIGHT preview so you can check direction before the race. Keep the screen slightly upright; a phone lying completely flat cannot measure wheel rotation from gravity. Calibration uses your current grip, and flipping landscape orientation recenters steering automatically. Gas held during the countdown begins accelerating at GO.

Four phones can race together. To mix keyboard and phones, enable the laptop driver and connect up to three phones. A fifth controller is rejected. Reconnecting the same phone retains its seat; after reconnecting in the lobby, mark it ready again. Remove disconnected seats using the × beside their names.

The HTTPS launcher uses an outbound SSH connection to [localhost.run](https://localhost.run/docs/http-tunnels/), which supplies TLS certificates. It starts the game on `127.0.0.1:4174` and opens that local laptop address; the QR points phones to the current trusted HTTPS address. If the tunnel disconnects, the laptop stays running and the launcher reconnects. The lobby temporarily hides the expired QR and refreshes it when a new address is ready. Rescan the current QR if your phone says **No tunnel**; old bookmarks may have expired. Remove old disconnected seats before rejoining if necessary. A race pauses when the phone link is lost.

The launcher does not change router settings or install certificates. Anyone who has the invite can join; room codes are invitations, not an authentication system. Stop the launcher with Ctrl+C when finished. Free addresses expire/change and the service has no guaranteed availability. This is a play-session link, not permanent hosting.

If `ssh.exe` is missing, install **OpenSSH Client** in Windows Optional features. If your network blocks SSH, use another network or provide trusted TLS certificates as described below. If port 4174 is occupied, set `APEX_HTTPS_PORT` before starting `node scripts/https.mjs`.

## Local Wi-Fi without internet

1. Run **START-GAME.bat** and choose **Create a race**.
2. Put laptop and phones on the same Wi-Fi. Avoid guest networks with client isolation. If Windows Firewall asks, allow Node on your private network.
3. Scan the QR. It uses the laptop's LAN address, not the phone's `localhost`.
4. Use **Touch arrows** for steering. Ordinary `http://192.168...` addresses cannot access phone motion sensors.

If multiple network adapters are present, open the correct **Phone / LAN** address printed in the terminal on the laptop before creating the room. Local multiplayer connects directly through the included WebSocket relay; it does not need PeerJS signaling, internet, STUN, or TURN.

## Circuits and cars

| Circuit | Character |
| --- | --- |
| Coastal Circuit | Wide seaside bends; beginner friendly |
| Neon Harbor | Dockside hairpins and neon gates |

| Car | Handling |
| --- | --- |
| Club | Balanced speed, acceleration, and grip |
| Zip | Strong acceleration and cornering |
| GT | Highest top speed |

Includes AI rivals, ordered lap gates, collisions, boundary containment, car reset, countdown, pause, results, rematch, best laps, sound controls, QR invitations, and 1–4 camera layouts. Three drivers get a circuit overview in the fourth panel.

## Validation

```sh
npm test
npm run check
```

31 automated tests cover all six track/car combinations completing three valid laps, car construction, braking, drift boost, lap gates, boundaries/reset, collisions, standings, HTTP-safe reconnect tokens, tilt math in both landscape orientations and different grip inclinations, calibration/inversion, browser sensor getters, independent pedal pointers, countdown holds, steering correction/counter-steering latency and center-noise rejection, four-controller relay capacity, message isolation, Origin checks, reconnect identity, stale-input braking, and tunnel address renewal/chunk parsing.

On Windows, browser inspection confirmed both circuits and all three models in four-player split-screen, four independent controller pages joining/readying, phone pedal input reaching the host, keyboard acceleration/braking, pause, and changing tracks. Browser controllers simulate phones; they are not four physical devices.

The HTTPS launcher served the game and accepted a browser controller. A separate live WSS check sent inputs from four controllers through the public tunnel and received telemetry back on all four. The launcher uses IPv4; earlier connection attempts on this network dropped/timed out. Internet and tunnel service stability remain external dependencies.

The user confirmed corrected tilt direction on a physical phone in landscape. Steering response has since been tuned: one short sensor filter, 16 ms input sends, and faster human steering response. A 60 Hz simulation reaches 80% of a turn in about 67 ms before network/rendering delay. **The updated feel, the other landscape orientation, additional Android/iPhone permission behavior, simultaneous finger multi-touch, screen wake behavior, and sustained four-phone performance still need physical verification.** Mathematical/simulated checks do not certify those device-specific behaviors. AI difficulty has not been balanced through extended player testing.

## Command line / certificates

```sh
node server.mjs
node server.mjs --port 4175
node scripts/https.mjs
node server.mjs --cert path/to/cert.pem --key path/to/key.pem
```

Certificates must cover the address used by phones and be trusted on them. Do not commit keys. The server only serves browser assets and its config/relay endpoints; repository files and `.tools` are excluded from public HTTP access.

## Source and packaging

`src/host.js` controls menus, races, HUDs and results. `world.js` builds scenes and cameras. `physics.js` owns simulation and AI. `network.js` owns driver sessions; `lan.js` adapts the local WebSocket transport; `scripts/relay.mjs` forwards room messages. `phone.js` handles pedals and permissions; `motion.js` contains testable tilt math.

`npm run package` produces `dist/` for static hosting. Static hosting retains the earlier PeerJS transport and needs internet/CDN signaling; it does not include the local relay or HTTPS launcher. The recommended PC setup uses the Node server. Three.js, QR generation, fonts, and the ws 8.22.0 server library are vendored with their licenses. PeerJS is loaded only for static-host fallback. The Windows SSH client and localhost.run are external runtime/service dependencies for the HTTPS launcher.

Source: https://github.com/BaslielMesfin/Wii-phone-games
