
/**
 * Resizes and optimizes an image file.
 * @param file The original image file.
 * @param maxWidth The maximum width allowed (default 1920px).
 * @param quality The JPEG quality (0 to 1, default 0.8).
 * @returns A Promise resolving to the optimized File/Blob.
 */
export async function optimizeImage(
    file: File,
    maxWidth: number = 1920,
    quality: number = 0.8
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(img.src);

            let width = img.width;
            let height = img.height;

            // Calculate new dimensions
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Image compression failed'));
                    }
                },
                'image/jpeg',
                quality
            );
        };
        img.onerror = (err) => reject(err);
    });
}
