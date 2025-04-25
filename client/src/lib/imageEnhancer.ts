/**
 * Image Enhancement Utilities for Text Extraction
 * This file contains functions to improve text visibility in images before OCR
 */

/**
 * Enhances an image for better text detection by applying various filters.
 * 
 * @param imageData The source image data URL
 * @param options Enhancement options
 * @returns A Promise that resolves to an enhanced image data URL
 */
export async function enhanceImageForTextRecognition(
  imageData: string,
  options: {
    contrast?: number;  // 1.0 is normal, 2.0 is twice the contrast
    brightness?: number; // 0 is normal, positive values brighten, negative darken
    sharpen?: boolean; // Whether to apply sharpening
    grayscale?: boolean; // Convert to grayscale
    binarize?: boolean; // Convert to black and white
    threshold?: number; // Threshold for binarization (0-255)
    despeckle?: boolean; // Remove noise
  } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create an image element from the data URL
    const img = new Image();
    img.onload = () => {
      try {
        // Create a canvas to apply the enhancements
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw the original image
        ctx.drawImage(img, 0, 0);
        
        // Apply grayscale if requested
        if (options.grayscale) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = avg; // red
            data[i + 1] = avg; // green
            data[i + 2] = avg; // blue
          }
          
          ctx.putImageData(imageData, 0, 0);
        }
        
        // Apply contrast and brightness adjustments
        if (options.contrast !== undefined || options.brightness !== undefined) {
          const contrast = options.contrast !== undefined ? options.contrast : 1.0;
          const brightness = options.brightness !== undefined ? options.brightness : 0;
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            // Apply contrast (multiply)
            data[i] = Math.min(255, Math.max(0, ((data[i] - 128) * contrast) + 128 + brightness));
            data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - 128) * contrast) + 128 + brightness));
            data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - 128) * contrast) + 128 + brightness));
          }
          
          ctx.putImageData(imageData, 0, 0);
        }
        
        // Apply sharpening
        if (options.sharpen) {
          // Sharpening using a convolution filter
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const sharpenedData = applySharpenFilter(imageData);
          ctx.putImageData(sharpenedData, 0, 0);
        }
        
        // Apply binarization (convert to black and white)
        if (options.binarize) {
          const threshold = options.threshold !== undefined ? options.threshold : 128;
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            // Calculate grayscale value
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            
            // Apply threshold
            const val = avg > threshold ? 255 : 0;
            
            data[i] = val;     // Red
            data[i + 1] = val; // Green
            data[i + 2] = val; // Blue
          }
          
          ctx.putImageData(imageData, 0, 0);
        }
        
        // Apply despeckling (noise reduction)
        if (options.despeckle) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const denoisedData = applyMedianFilter(imageData);
          ctx.putImageData(denoisedData, 0, 0);
        }
        
        // Return the enhanced image as a data URL
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (err) {
        reject(err);
      }
    };
    
    img.onerror = (err) => {
      reject(new Error('Failed to load image for enhancement'));
    };
    
    img.src = imageData;
  });
}

/**
 * Applies a sharpening filter to an image
 */
function applySharpenFilter(imageData: ImageData): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const buffer = new Uint8ClampedArray(data);
  const sharpenKernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];

  // Skip the edge pixels
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const offset = (y * width + x) * 4;
      
      for (let c = 0; c < 3; c++) {
        let val = 0;
        
        // Apply convolution
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            val += data[idx] * sharpenKernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        
        buffer[offset + c] = Math.min(255, Math.max(0, val));
      }
    }
  }
  
  return new ImageData(buffer, width, height);
}

/**
 * Applies a median filter to reduce noise
 */
function applyMedianFilter(imageData: ImageData): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const buffer = new Uint8ClampedArray(data);
  
  // Skip the edge pixels
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const offset = (y * width + x) * 4;
      
      for (let c = 0; c < 3; c++) {
        const values = [];
        
        // Collect values from the 3x3 neighborhood
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            values.push(data[idx]);
          }
        }
        
        // Sort and find median
        values.sort((a, b) => a - b);
        buffer[offset + c] = values[4]; // Middle value (4) in a sorted 9-element array
      }
    }
  }
  
  return new ImageData(buffer, width, height);
}

/**
 * Creates multiple versions of an image with different enhancement settings
 * for better OCR accuracy
 * 
 * @param imageData The source image data URL
 * @returns An array of enhanced image variants
 */
export async function createEnhancedImageVariants(imageData: string): Promise<string[]> {
  const variants = [];
  
  try {
    // Original image
    variants.push(imageData);
    
    // Grayscale with increased contrast
    variants.push(await enhanceImageForTextRecognition(imageData, {
      grayscale: true,
      contrast: 1.5
    }));
    
    // Sharpened grayscale
    variants.push(await enhanceImageForTextRecognition(imageData, {
      grayscale: true,
      sharpen: true,
      contrast: 1.2
    }));
    
    // Binarized (black and white)
    variants.push(await enhanceImageForTextRecognition(imageData, {
      grayscale: true,
      binarize: true,
      threshold: 128
    }));
    
    // Despeckled high contrast
    variants.push(await enhanceImageForTextRecognition(imageData, {
      grayscale: true,
      despeckle: true,
      contrast: 1.7,
      brightness: 10
    }));
    
    // Dark text optimization
    variants.push(await enhanceImageForTextRecognition(imageData, {
      grayscale: true,
      contrast: 2.0,
      brightness: -10
    }));
    
    // Light text optimization
    variants.push(await enhanceImageForTextRecognition(imageData, {
      grayscale: true,
      contrast: 2.0,
      brightness: 30,
      binarize: true,
      threshold: 180
    }));
    
    // Special for small text - very high contrast and sharp
    variants.push(await enhanceImageForTextRecognition(imageData, {
      grayscale: true,
      sharpen: true,
      contrast: 2.5,
      brightness: 0,
      despeckle: true
    }));
    
    // Small dark text on light background - common in product packaging
    variants.push(await enhanceImageForTextRecognition(imageData, {
      grayscale: true,
      contrast: 3.0,
      brightness: -5,
      sharpen: true,
      binarize: true,
      threshold: 100 // Lower threshold to preserve small dark text
    }));
    
    // Small light text on dark background - also common in packaging
    variants.push(await enhanceImageForTextRecognition(imageData, {
      grayscale: true,
      contrast: 3.0,
      brightness: 15,
      sharpen: true,
      binarize: true,
      threshold: 150 // Higher threshold to preserve small light text
    }));
    
    // Edge-enhanced for text boundaries
    variants.push(await enhanceImageForTextRecognition(imageData, {
      grayscale: true,
      sharpen: true,
      contrast: 2.2,
      brightness: 0,
      binarize: false
    }));
    
  } catch (error) {
    console.error("Error creating image variants:", error);
    // Return at least the original image if enhancement fails
    return [imageData];
  }
  
  return variants;
}