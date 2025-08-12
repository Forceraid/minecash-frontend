# MineCash Sound System

This directory contains sound effects for the MineCash casino games.

## Required Sound Files

The following sound files should be added to this directory for the complete sound experience:

### Betting Sounds
- `bet_placed.mp3` - Sound played when a bet is successfully placed
- `bet_failed.mp3` - Sound played when a bet fails

### Game State Sounds
- `game_start.mp3` - Sound played when the game starts (rocket launches)
- `game_crash.mp3` - Sound played when the rocket crashes
- `game_waiting.mp3` - Sound played during waiting phase

### Multiplier Sounds
- `multiplier_tick.mp3` - Sound played for each multiplier tick
- `multiplier_high.mp3` - Sound played for high multipliers

### Cashout Sounds
- `cashout_success.mp3` - Sound played when cashout is successful
- `cashout_failed.mp3` - Sound played when cashout fails

### UI Sounds
- `button_click.mp3` - Sound played when buttons are clicked
- `notification.mp3` - Sound played for notifications

### Ambient Sounds
- `rocket_engine.mp3` - Looping rocket engine sound during gameplay
- `casino_ambient.mp3` - Looping casino ambient background sound

## Sound File Requirements

- Format: MP3 (recommended) or WAV
- Sample Rate: 44.1kHz
- Bit Depth: 16-bit
- Duration: Keep UI sounds short (0.1-0.5 seconds)
- File Size: Keep under 100KB for UI sounds, under 500KB for longer sounds

## Fallback System

If sound files are not available, the system will use Web Audio API to generate synthetic sounds:
- Multiplier ticks use sine wave tones
- Crash sounds use sawtooth wave tones
- Button clicks use short sine wave bursts

## Volume Control

The sound system supports:
- Master volume control (0-100%)
- Individual sound volume levels
- Enable/disable sound system
- Per-sound volume overrides

## Browser Compatibility

The sound system works with:
- Modern browsers with Web Audio API support
- Fallback to HTML5 Audio for older browsers
- Graceful degradation when audio is not supported
