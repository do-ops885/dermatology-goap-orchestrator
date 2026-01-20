/**
 * Image Processing Utilities
 *
 * Contains utility functions for image optimization, hashing, and validation.
 * These functions are extracted from useClinicalAnalysis.ts to comply with
 * the 700 LOC limit per file.
 */

/**
 * Optimizes an image file by resizing it to a maximum dimension and
 * converting it to a base64-encoded string.
 *
 * @param file - The image file to optimize
 * @returns Promise<string> - Base64-encoded image data without the data URL prefix
 */
export const optimizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL(
          file.type === 'image/png' ? 'image/png' : 'image/jpeg',
          0.85,
        );
        const base64Part = dataUrl.split(',')[1];
        if (base64Part === undefined || base64Part === null || base64Part === '') {
          reject(new Error('Failed to extract base64 data from data URL'));
          return;
        }
        resolve(base64Part);
      };
      img.onerror = (err) => {
        reject(new Error(err instanceof Error ? err.message : 'Image load failed'));
      };
    };
    reader.onerror = (err) => {
      reject(new Error(err instanceof Error ? err.message : 'File read failed'));
    };
  });
};

/**
 * Calculates the SHA-256 hash of an image file.
 *
 * @param file - The file to hash
 * @returns Promise<string> - Hexadecimal string representation of the SHA-256 hash
 */
export const calculateImageHash = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Validates the magic bytes of an image file to ensure it has a valid signature.
 * Supports JPEG, PNG, and WebP formats.
 *
 * @param file - The file to validate
 * @returns Promise<boolean> - True if the file has a valid image signature, false otherwise
 */
export const validateImageSignature = async (file: File): Promise<boolean> => {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // JPEG signature: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  // PNG signature: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  // WebP signature: 52 49 46 46 (RIFF followed by WEBP)
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return true;
  return false;
};
