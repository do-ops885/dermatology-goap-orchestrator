const MAX_SIZE = 800;

export const optimizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
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
        resolve(dataUrl.split(',')[1]);
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

export const loadImageElement = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      resolve(img);
    };
    img.onerror = (err) => {
      reject(new Error(err instanceof Error ? err.message : 'Image load failed'));
    };
  });
};

export const calculateImageHash = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};
