# Bip-Bop

Words for emitting a previewed picture as a page, a video file, or a fullscreen URL.

## Language

**OutputType**:
The one output form the user picks: page, mp4, webm, or fullscreen URL.
_Avoid_: format, destination

**OutputCategory**:
The kind fixed by an OutputType: page, video, or fullscreen URL. mp4 and webm are both video.
_Avoid_: output mode, media type

**Timeline**:
Media time of an exported video: the frame count divided by the frame rate.
_Avoid_: duration, runtime, play time

**Preview clock**:
Time since web preview playback started. The frame counter counts animation frames and does not set this clock.
_Avoid_: frame time, media time

**Cycle fraction**:
How far the picture is through the current second. Zero at the start of that second, approaching one at the end. A video takes it from the frame count modulo the frame rate. The web preview takes it from the preview clock modulo one second.
_Avoid_: coefficient, phase, progress

**Playback**:
The time position the user plays, pauses, and seeks in the page preview and the exported video.
_Avoid_: player, transport

**Bip**:
The sound at the start of each even second.
_Avoid_: beep

**Bop**:
The sound at the start of each odd second.
