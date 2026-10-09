// Length of an MP3 file, read from its frame headers. The export measures each voice here, on the server,
// because Chrome inside the render sandbox sometimes reports an MP3's length as Infinity.
const RATES = [44100, 48000, 32000];
const KBPS_V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const KBPS_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];

export function mp3Seconds(buf: Uint8Array): number | undefined {
  let i = 0;
  // Skip an ID3v2 tag (its size is stored as four 7-bit bytes).
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33 && buf.length > 10) {
    i = 10 + ((buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9]) + (buf[5] & 0x10 ? 10 : 0);
  }
  let seconds = 0;
  let frames = 0;
  while (i + 4 <= buf.length) {
    const [b0, b1, b2] = [buf[i], buf[i + 1], buf[i + 2]];
    const version = (b1 >> 3) & 3; // 0 = MPEG 2.5, 2 = MPEG 2, 3 = MPEG 1
    const layer = (b1 >> 1) & 3; // 1 = Layer III
    const kbpsIndex = b2 >> 4;
    const rateIndex = (b2 >> 2) & 3;
    if (b0 !== 0xff || (b1 & 0xe0) !== 0xe0 || version === 1 || layer !== 1 || kbpsIndex === 0 || kbpsIndex === 15 || rateIndex === 3) {
      i++;
      continue;
    }
    const v1 = version === 3;
    const rate = RATES[rateIndex] / (v1 ? 1 : version === 2 ? 2 : 4);
    const samples = v1 ? 1152 : 576;
    const size = Math.floor(((samples / 8) * (v1 ? KBPS_V1 : KBPS_V2)[kbpsIndex] * 1000) / rate) + ((b2 >> 1) & 1);
    seconds += samples / rate;
    frames++;
    i += size;
  }
  return frames ? Math.round(seconds * 1000) / 1000 : undefined;
}
