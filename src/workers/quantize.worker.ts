import { quantizeImage } from '../utils/quantize';

const ctx = self as unknown as Worker;

ctx.onmessage = (e: MessageEvent) => {
  const { imageData, maxColors } = e.data;
  const result = quantizeImage(imageData, maxColors);
  ctx.postMessage(result, [result.indices.buffer]);
};
