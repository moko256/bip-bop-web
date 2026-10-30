/**
 * `VideoEncoderConfig.contentHint` for the Bip-Bop picture.
 * The picture is flat fields, sharp edges, and text, which is exactly the
 * content `text` describes in mst-content-hint: encoders may switch to
 * screen-content tools for it. Measured in Chromium at `high` quality with
 * the same quantizer, this shrank VP9 by about 41–56% and AV1 by about
 * 10–21% at unchanged PSNR; bitrate-controlled codecs (AVC, VP8) kept
 * their target size and gained slightly in PSNR instead.
 * Encoders that do not know the hint ignore it.
 */
export const VIDEO_CONTENT_HINT = 'text';

/**
 * Seconds between forced key frames (`keyFrameInterval` in mediabunny).
 * Mediabunny defaults to 2s. A key frame here costs several times a delta
 * frame, but the frame that replaces a skipped key frame is itself a large
 * delta (the picture has drifted over the 2s cycle and the 1-frame tone
 * trace may be on it), so lengthening the interval only saves a few
 * percent in total. 10s captures most of that — about 3% at 20s in
 * Chromium, on top of {@link VIDEO_CONTENT_HINT} — while keeping a seek
 * at most 10s of decoding away from a key frame. It is also a whole
 * number of 2s background cycles, so every key frame lands on the same
 * phase of the picture.
 */
export const VIDEO_KEY_FRAME_INTERVAL_SECONDS = 10;
