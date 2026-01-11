export async function verifyImage(file: File): Promise<{ valid: boolean; hash: string; error?: string }> {
  const JPEG_SIGNATURES = [
    [0xFF, 0xD8, 0xFF, 0xDB],
    [0xFF, 0xD8, 0xFF, 0xE0],
    [0xFF, 0xD8, 0xFF, 0xE1],
    [0xFF, 0xD8, 0xFF, 0xEE]
  ];
  
  const PNG_SIGNATURES = [0x89, 0x50, 0x4E, 0x47];
  const WEBP_SIGNATURES = [0x52, 0x49, 0x46, 0x46];

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, hash: '', error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' };
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  const checkSignature = (sig: number[]): boolean => {
    return sig.every((val, idx) => bytes[idx] === val);
  };

  const isValid = file.type === 'image/jpeg' 
    ? JPEG_SIGNATURES.some(checkSignature)
    : file.type === 'image/png'
    ? checkSignature(PNG_SIGNATURES)
    : checkSignature(WEBP_SIGNATURES);

  if (!isValid) {
    return { valid: false, hash: '', error: 'Invalid file signature. File may be corrupted.' };
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return { valid: true, hash: hashHex };
}
