# SolaDroid

SolaDroid is a browser action game about boarding hostile machines and turning their strengths against one another.

You begin aboard the stricken RMS Ceres as Influence Device 001, a quick but fragile machine. Clear each deck by fighting its hostile units or transferring into a stronger chassis, then reach the lift before your borrowed body breaks down.

The game is written in plain HTML, CSS and JavaScript. It uses Canvas for the game world and Web Audio for its sound, with no dependencies or build step.

## Playing

There are three decks to secure. Each chassis has different movement, armour, weapon and stability ratings. Approach another unit to inspect its capabilities, then commit to a circuit duel if you want to take control of it.

The field guide introduces the controls during your first game. The radar marks hostiles and objectives, while ship terminals contain recovered log entries.

| Control | Keyboard | Gamepad |
| --- | --- | --- |
| Move | WASD or arrow keys | Left stick |
| Aim | Last movement direction | Right stick |
| Fire | Space | A |
| Interact or transfer | E | X |
| Pause | P or Escape | Start |

## Getting started

You need a modern browser. Serve the files from the project directory with any static web server; Python's built-in server is enough:

```bash
git clone git@github.com:ohnotnow/soladroid.git
cd soladroid
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) and press Enter to begin.

## Checks

There is no compilation step or automated test suite. The JavaScript can be syntax-checked with Node.js:

```bash
node --check game.js
```

## About

SolaDroid is a personal, unofficial homage to Andrew Braybrook's 1985 game [*Paradroid*](https://en.wikipedia.org/wiki/Paradroid). It does not use the original game's code, graphics or audio, and is not affiliated with its creators or rights holders.

Created by [ohnotnow](https://github.com/ohnotnow) in collaboration with OpenAI Codex.

## Contributing

Fork or clone the repository, make your changes, and run the syntax check above. Keep the project dependency-free unless a change genuinely requires otherwise.

## Licence

SolaDroid is released under the [MIT License](LICENSE).
