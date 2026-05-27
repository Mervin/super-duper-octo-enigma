# Atomic Idle

Atomic Idle is a web-based incremental/idle game centered around merging atoms to create heavier elements.

## Features

- **Gather Quarks:** Manually click to gather Quarks or use the spacebar shortcut.
- **Synthesize Elements:** Turn your Quarks into Hydrogen, the base element.
- **Merge Upwards:** Merge lighter elements to create heavier, more advanced ones (Helium, Lithium, Beryllium, etc.).
- **Upgrades & Automation:**
  - **Quark Generators:** Automatically produce Quarks over time.
  - **H-Synthesizers:** Automatically convert Quarks into Hydrogen.
  - **Atom Processors:** Automate the merging of your elements.
- **Periodic Table Overview:** Keep track of your discovered elements in a stylized periodic table grid.
- **PWA Support:** Install the game as a Progressive Web App on mobile and desktop!

## The Prestige System (Cosmic Reset)

Once you reach a high enough mass of elements, you can trigger a **Cosmic Reset**.
This resets all your Quarks, Elements, and Upgrades, but in exchange, you gain **Background Radiation**.
Background Radiation acts as a permanent, global multiplier to all future Quark production. Accumulate it to reach even heavier elements much faster!

## How to run locally

Since there are no build steps, you can just serve the directory using any static file server.

For example, using Python 3:
```bash
python3 -m http.server 3000
```
Then navigate to `http://localhost:3000` in your web browser.
