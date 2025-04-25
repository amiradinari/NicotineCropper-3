import { Area } from "react-easy-crop/types";

// Create a circular crop of the image using the provided crop area
export const createCircleCrop = (
  imageSrc: string,
  croppedAreaPixels: Area,
  canvas: HTMLCanvasElement
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    
    image.onload = () => {
      // Set canvas size to be a square based on the crop width
      const size = Math.min(croppedAreaPixels.width, croppedAreaPixels.height);
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      
      // Create circular clip
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      
      // Draw the image with the crop position
      ctx.drawImage(
        image,
        croppedAreaPixels.x, // source x
        croppedAreaPixels.y, // source y
        croppedAreaPixels.width, // source width
        croppedAreaPixels.height, // source height
        0, // dest x
        0, // dest y
        size, // dest width
        size // dest height
      );
      
      resolve();
    };
    
    image.onerror = () => {
      reject(new Error("Failed to load image"));
    };
    
    image.src = imageSrc;
  });
};

// Create a blob from a data URL
export const dataURLtoBlob = (dataURL: string): Blob => {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
};
