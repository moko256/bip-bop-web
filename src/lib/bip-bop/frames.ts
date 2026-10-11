/** Frames in one second of the Bip-Bop picture. */
export const BIP_BOP_FPS = 60;

/** Seconds spanned by {@link BIP_BOP_MAX_FRAME} at {@link BIP_BOP_FPS}. */
export const BIP_BOP_LENGTH_SECONDS = 10;

/** Last frame index. Ten seconds at {@link BIP_BOP_FPS}. */
export const BIP_BOP_MAX_FRAME = BIP_BOP_FPS * BIP_BOP_LENGTH_SECONDS;
