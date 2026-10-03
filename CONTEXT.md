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
Time shared by the previewed picture and the exported video. One second is 60 frames. Length is 10 seconds.
_Avoid_: duration, runtime, play time

**Playback**:
The time position the user plays, pauses, and seeks in the page preview and the exported video.
_Avoid_: player, transport

**Bip**:
The sound at the start of each even second.
_Avoid_: beep

**Bop**:
The sound at the start of each odd second.
