export type RGB = [number, number, number];

function medianCut(colors: RGB[], maxColors: number): RGB[] {
  if (colors.length <= maxColors) return colors;

  interface Bucket {
    colors: RGB[];
  }

  let buckets: Bucket[] = [{ colors }];

  while (buckets.length < maxColors) {
    let maxRange = -1;
    let maxBucketIndex = -1;
    let maxChannel: 0 | 1 | 2 = 0;

    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i];
      if (b.colors.length <= 1) continue;
      const min = [255, 255, 255];
      const max = [0, 0, 0];
      for (const c of b.colors) {
        for (let ch = 0; ch < 3; ch++) {
          min[ch] = Math.min(min[ch], c[ch]);
          max[ch] = Math.max(max[ch], c[ch]);
        }
      }
      for (let ch = 0; ch < 3; ch++) {
        const range = max[ch] - min[ch];
        if (range > maxRange) {
          maxRange = range;
          maxBucketIndex = i;
          maxChannel = ch as 0 | 1 | 2;
        }
      }
    }

    if (maxBucketIndex === -1) break;

    const bucket = buckets[maxBucketIndex];
    bucket.colors.sort((a, b) => a[maxChannel] - b[maxChannel]);
    const mid = Math.floor(bucket.colors.length / 2);
    buckets.splice(maxBucketIndex, 1,
      { colors: bucket.colors.slice(0, mid) },
      { colors: bucket.colors.slice(mid) }
    );
  }

  return buckets.map((b) => {
    const n = b.colors.length;
    if (n === 0) return [0, 0, 0] as RGB;
    let r = 0, g = 0, bb = 0;
    for (const c of b.colors) {
      r += c[0];
      g += c[1];
      bb += c[2];
    }
    return [Math.round(r / n), Math.round(g / n), Math.round(bb / n)] as RGB;
  });
}

export function quantizeImage(
  imageData: ImageData,
  maxColors: number
): { palette: RGB[]; indices: Uint16Array } {
  const data = imageData.data;
  const pixelCount = data.length / 4;
  const colors: RGB[] = [];

  for (let i = 0; i < pixelCount; i++) {
    const o = i * 4;
    colors.push([data[o], data[o + 1], data[o + 2]]);
  }

  const palette = medianCut(colors, maxColors);
  const indices = new Uint16Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const c = colors[i];
    let best = 0;
    let bestDist = Infinity;
    for (let p = 0; p < palette.length; p++) {
      const pc = palette[p];
      const d = (c[0] - pc[0]) ** 2 + (c[1] - pc[1]) ** 2 + (c[2] - pc[2]) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    indices[i] = best;
  }

  return { palette, indices };
}

export function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
