# Orbitrush Mechanics

Orbitrush is an endless space run that scrolls upward on a portrait screen.

## Control and movement

- The player is an orb that spins along the orbit lines of planets.
- Each run starts inside a launcher at the bottom of the screen whose angle slowly sweeps left and right. The first tap launches the orb at the angle the launcher is currently showing; you do not start out orbiting a planet.
- Holding the screen or the `Space` key keeps latch active; the player locks onto a planet once it enters that planet's valid orbit band.
- When the key is released, the player launches tangentially in its current direction of motion.
- The orb's outgoing tangent direction is always shown with four short dots, including in the launcher. The actual latch tolerance band is only visible while the Developer Helper UI is open.
- While holding, a very faint latch tone plays; when you attach to a planet the tone shifts slightly. A thin, dashed energy tether is drawn between the attached orb and the planet's center.
- For a first-time player the control summary is shown first on a tutorial card dismissed only with the **Got it** button; game input does not start while the card is open. After acknowledging it, without a full-screen overlay, a **Tap to launch** hint appears above the launcher, and after the first launch a **Hold as you approach** hint appears. After the first successful latch the tutorial is completed and permanently hidden.
- As the combo grows, both the orbital spin speed and the flight speed between planets increase. The player cannot re-attach to the planet it just left without first locking onto another planet.
- As the run progresses, planets shrink, the distance between planet rows grows with the highest tempo the run has reached, and the camera smoothly pulls back. This preserves flight time and route-reading space even at high speed.

## Planet types

Special planets are not generated in the first section; they unlock in order as the run progresses and appear increasingly often.

- **Fast planet:** Spins the player about `35%` faster than normal.
- **Moving planet:** Swings left-right or up-down along a dashed, pre-visible track. While in orbit the player is carried along with the planet; on release it takes a small share of momentum from the planet's movement.
- **Reverse planet:** Reverses the natural spin direction at the moment of locking on.
- **Unstable planet:** Its orbit radius regularly contracts and expands; the player and crystals follow the active orbit.
- **Fragile planet:** Holds for about three quarters of a turn. When time runs out it shatters and automatically launches the player in its current tangent direction. This forced launch disables latch; to lock on again the player must release and press once more.
- Special planets give a higher latch score than normal planets according to their risk. Their types can be read in advance from the symbol at their center and their own color/movement.

## Asteroid belt

- Asteroid belts do not appear at the first planets; they start showing between planet rows after the player has learned the basic rhythm.
- Each belt is generated at the midpoint of the route drawn from the previous planet row to one of the targets, with a wide safe corridor marked at its real on-screen width.
- For demo balance the count and size of asteroids in belts are low, and the collision area is also a bit more forgiving than the visible shape. This way asteroids create a routing decision but do not needlessly block the correct launch angle.
- Asteroids spin in place but their positions are fixed, so the route gets harder but does not randomly close off at the last moment.
- Touching an asteroid during flight ends the run. So the player cannot skip through asteroids at high speed, the collision is checked along the entire movement line between frames.

## Perfect and Safe Latch

- If the first latch attempt is made shortly before being caught, it becomes a **Perfect Latch**.
- Holding too early, or releasing and pressing again during flight, becomes a **Safe Latch**.
- Perfect Latch increases the combo; Safe Latch locks on safely but resets the combo.
- Each planet produces score and combo only on its first successful latch; the first latch consumes the planet's combo core. Re-attaching to a spent planet allows movement but gives no score, does not increase, reset, or refresh the combo timer. The active core is shown by a glowing, dashed energy seal at the planet's center and disappears on the first latch.
- If a Safe Latch breaks an active combo above the `x5` level, a low, short, descending failure tone is added beneath the normal lock sound.

## Combo and rewards

- The combo is time-based; if the timer runs out the combo resets, but the run does not end.
- A high combo strengthens movement speed, score, sounds, and visual effects.
- The combo thresholds are named `x5 IGNITION`, `x10 OVERDRIVE`, and `x15 SUPERNOVA`. Each threshold strengthens the orb's corona, trail length, particles, on-screen stars, and audio layers.
- Every Perfect Latch at `x10` and above produces a short slow-down of time and a special audio hit. A stronger slow-motion is used at the `x10` and `x15` thresholds. The Perfect time window and combo timer keep being measured in real time; slow-motion does not extend these timers.
- The player starts a run with one life and earns an extra life at each `x10` combo tier reached. Extra lives are not removed by a Safe Latch or by the combo timer running out.
- On supporting phones, distinct vibration patterns play for release, Safe/Perfect Latch, thresholds, crystal pickup, shattering, and death. If haptics are not supported the game runs normally and silently.

## Crystals and skins

- Crystals on planet orbits both increase the run score and are added to the permanent crystal wallet the moment they are collected.
- Each crystal collected during an active combo adds `0.25` seconds to the combo timer by default; the remaining time cannot exceed the total combo duration. Collecting a crystal does not start a combo on its own. This bonus can be changed between `0-1` seconds in the developer settings.
- The wallet, owned skins, and equipped skin are stored in `localStorage` as a single versioned player profile.
- The **Skins** shop on the ready and death screens has five cosmetic orbs: the free `ION CORE`; then `SOLAR FLARE` (◆35), `VOID BLOOM` (◆90), `PRISM SHIFT` (◆220), and `EVENT HORIZON` (◆500).
- Skins change the core, corona, accretion ring, and trail effects; they do not change the player radius, hitbox, or gameplay strength.

## Death and world

- Hitting a planet or asteroid, or leaving the visible area of the pulled-back camera, triggers death.
- If the player has an extra life, one life is spent, the combo resets, and the orb is automatically placed back into the orbit of the planet it last latched onto; the score and the crystals collected in that run are kept. Dying on the last life ends the run.
- Planets are generated randomly within rules and in most cases offer the player more than one route.
