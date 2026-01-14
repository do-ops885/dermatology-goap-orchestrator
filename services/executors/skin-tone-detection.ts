export function detectSkinTone(imageData: ImageData): {
  fitzpatrick: string;
  monkScale: string;
  confidence: number;
  itaEstimate: number;
} {
  if (imageData.width === 0 || imageData.height === 0) {
    throw new Error('Invalid image data provided');
  }

  let totalL = 0;
  let pixelCount = 0;
  
  for (let y = 0; y < imageData.height; y += 10) {
    for (let x = 0; x < imageData.width; x += 10) {
      const idx = (y * imageData.width + x) * 4;
      const r = imageData.data[idx];
      const g = imageData.data[idx + 1];
      const b = imageData.data[idx + 2];
      
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      totalL += l;
      pixelCount++;
    }
  }

  const avgL = pixelCount > 0 ? totalL / pixelCount : 0;
  const ita = Math.atan2(avgL - 115, 160) * (180 / Math.PI);
  const normalizedITA = Math.max(0, Math.min(90, -ita + 90));

  let fitzpatrick: string;
  let monkScale: string;
  let confidence: number;

  if (normalizedITA > 55) {
    fitzpatrick = 'I';
    monkScale = 'F1';
    confidence = 0.95;
  } else if (normalizedITA > 41) {
    fitzpatrick = 'II';
    monkScale = 'F2';
    confidence = 0.92;
  } else if (normalizedITA > 28) {
    fitzpatrick = 'III';
    monkScale = 'F3';
    confidence = 0.88;
  } else if (normalizedITA > 19) {
    fitzpatrick = 'IV';
    monkScale = 'F5';
    confidence = 0.85;
  } else if (normalizedITA > 10) {
    fitzpatrick = 'V';
    monkScale = 'F7';
    confidence = 0.80;
  } else {
    fitzpatrick = 'VI';
    monkScale = 'F10';
    confidence = 0.75;
  }

  if (avgL < 60 || avgL > 200) {
    confidence *= 0.7;
  }

  return {
    fitzpatrick,
    monkScale,
    confidence: Math.round(confidence * 100) / 100,
    itaEstimate: Math.round(normalizedITA)
  };
}
