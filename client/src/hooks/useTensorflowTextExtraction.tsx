import { useState, useCallback, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import Tesseract from 'tesseract.js';
import { createEnhancedImageVariants } from '@/lib/imageEnhancer';

// Load TensorFlow models only once
let cocoModel: cocoSsd.ObjectDetection | null = null;

const loadModels = async () => {
  if (!cocoModel) {
    // Configure TensorFlow.js to use WebGL for faster inference
    await tf.setBackend('webgl');
    // Load the COCO-SSD model
    cocoModel = await cocoSsd.load({
      base: 'lite_mobilenet_v2' // Use the lightweight model version
    });
    console.log('TensorFlow models loaded successfully');
  }
  return cocoModel;
};

// Tesseract scheduler for efficient processing
const scheduler = Tesseract.createScheduler();
const MAX_WORKERS = 2;
let workersInitialized = false;

// Initialize workers for the scheduler
const initializeWorkers = async () => {
  if (workersInitialized) return;
  
  try {
    // Create workers and add them to the scheduler
    for (let i = 0; i < MAX_WORKERS; i++) {
      const worker = await Tesseract.createWorker();
      // The newer version of Tesseract.js doesn't require explicit loading and initialization
      await scheduler.addWorker(worker);
    }
    workersInitialized = true;
  } catch (err) {
    console.error('Failed to initialize Tesseract workers:', err);
  }
};

// Preload models on component mount
loadModels().catch(err => console.error('Failed to load TensorFlow models:', err));

export function useTensorflowTextExtraction() {
  const [extractedText, setExtractedText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [textRegions, setTextRegions] = useState<Array<{
    bbox: [number, number, number, number];
    text: string;
  }>>([]);
  const [bestImageVariant, setBestImageVariant] = useState<string | null>(null);

  // Preload the model when the hook is initialized
  useEffect(() => {
    loadModels().catch(err => {
      console.error('Failed to load TensorFlow models:', err);
      setError('Failed to load text detection models');
    });
    
    // Initialize Tesseract workers
    initializeWorkers().catch(err => {
      console.error('Failed to initialize Tesseract workers:', err);
    });
    
    // Cleanup scheduler on unmount
    return () => {
      scheduler.terminate();
    };
  }, []);
  
  // Convert image data URL to an HTML image element
  const createImageElement = (imageData: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageData;
    });
  };

  // Function to detect text regions in an image
  const detectTextRegions = async (img: HTMLImageElement): Promise<cocoSsd.DetectedObject[]> => {
    if (!cocoModel) {
      cocoModel = await loadModels();
    }
    
    // Detect objects in the image
    const predictions = await cocoModel.detect(img, 20); // Increase detection confidence
    
    // Filter for objects which might contain text
    const textRelatedObjects = predictions.filter(prediction => 
      ['book', 'cell phone', 'laptop', 'tv', 'remote', 'keyboard', 'mouse', 'monitor'].includes(prediction.class)
    );
    
    // If no text-related objects found, try to detect areas that might contain text
    // by analyzing the image for high-contrast areas or rectangular shapes
    if (textRelatedObjects.length === 0) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Simple edge detection to find rectangular areas that might contain text
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const potentialTextRegions = detectPotentialTextAreas(imageData, canvas.width, canvas.height);
        
        // Convert our detected regions to the format expected by the caller
        return potentialTextRegions.map(region => ({
          bbox: [region.x, region.y, region.width, region.height] as [number, number, number, number],
          class: 'potential-text',
          score: 0.5
        }));
      }
    }
    
    return textRelatedObjects;
  };
  
  // Function to detect potential text areas by analyzing image structure
  const detectPotentialTextAreas = (
    imageData: ImageData, 
    width: number, 
    height: number
  ): Array<{x: number, y: number, width: number, height: number}> => {
    const regions: Array<{x: number, y: number, width: number, height: number}> = [];
    const data = imageData.data;
    
    // Simple approach: divide the image into a grid and check for high-contrast areas
    const gridSize = 4; // Divide the image into a 4x4 grid
    const cellWidth = Math.floor(width / gridSize);
    const cellHeight = Math.floor(height / gridSize);
    
    for (let gx = 0; gx < gridSize; gx++) {
      for (let gy = 0; gy < gridSize; gy++) {
        const cellX = gx * cellWidth;
        const cellY = gy * cellHeight;
        
        // Calculate contrast in this cell
        let totalPixels = 0;
        let sumBrightness = 0;
        let sumVariance = 0;
        
        for (let y = cellY; y < cellY + cellHeight && y < height; y++) {
          for (let x = cellX; x < cellX + cellWidth && x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const brightness = (r + g + b) / 3;
            
            sumBrightness += brightness;
            totalPixels++;
          }
        }
        
        const avgBrightness = sumBrightness / totalPixels;
        
        // Calculate variance (measure of contrast)
        for (let y = cellY; y < cellY + cellHeight && y < height; y++) {
          for (let x = cellX; x < cellX + cellWidth && x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const brightness = (r + g + b) / 3;
            
            sumVariance += Math.pow(brightness - avgBrightness, 2);
          }
        }
        
        const variance = Math.sqrt(sumVariance / totalPixels);
        
        // If cell has high variance (contrast), it might contain text
        if (variance > 40) { // Threshold determined empirically
          regions.push({
            x: cellX,
            y: cellY,
            width: cellWidth,
            height: cellHeight
          });
        }
      }
    }
    
    // Merge adjacent regions
    const mergedRegions = mergeAdjacentRegions(regions);
    return mergedRegions;
  };
  
  // Helper function to merge adjacent regions
  const mergeAdjacentRegions = (
    regions: Array<{x: number, y: number, width: number, height: number}>
  ): Array<{x: number, y: number, width: number, height: number}> => {
    if (regions.length <= 1) return regions;
    
    const result: Array<{x: number, y: number, width: number, height: number}> = [];
    let merged = true;
    
    // Start with the first region
    result.push(regions[0]);
    
    // Try to merge regions until no more merges are possible
    while (merged) {
      merged = false;
      
      for (let i = 0; i < result.length; i++) {
        for (let j = 0; j < regions.length; j++) {
          const r1 = result[i];
          const r2 = regions[j];
          
          // Skip if identical
          if (r1.x === r2.x && r1.y === r2.y && r1.width === r2.width && r1.height === r2.height) {
            continue;
          }
          
          // Check if regions overlap or are adjacent
          const overlapX = (r1.x < r2.x + r2.width) && (r1.x + r1.width > r2.x);
          const overlapY = (r1.y < r2.y + r2.height) && (r1.y + r1.height > r2.y);
          
          if (overlapX && overlapY) {
            // Merge the regions
            const minX = Math.min(r1.x, r2.x);
            const minY = Math.min(r1.y, r2.y);
            const maxX = Math.max(r1.x + r1.width, r2.x + r2.width);
            const maxY = Math.max(r1.y + r1.height, r2.y + r2.height);
            
            r1.x = minX;
            r1.y = minY;
            r1.width = maxX - minX;
            r1.height = maxY - minY;
            
            // Remove the second region from the array
            regions.splice(j, 1);
            j--;
            
            merged = true;
          }
        }
      }
    }
    
    return result;
  };

  // Advanced text extraction with multi-variant processing
  const extractTextFromImage = useCallback(async (imageData: string) => {
    setIsExtracting(true);
    setProgress(0);
    setError(null);
    setTextRegions([]);
    setBestImageVariant(null);
    
    try {
      // Start progress indication
      setProgress(5);
      
      // Create enhanced image variants
      setProgress(10);
      const imageVariants = await createEnhancedImageVariants(imageData);
      setProgress(15);
      
      // Load the original image
      const img = await createImageElement(imageData);
      
      // Detect regions in the original image
      setProgress(20);
      const regions = await detectTextRegions(img);
      setProgress(25);
      
      // Extract text from each variant
      const variantResults = [];
      let bestVariantIndex = 0;
      let bestTextLength = 0;
      let bestConfidence = 0;
      
      // Ensure workers are initialized
      if (!workersInitialized) {
        await initializeWorkers();
      }
      
      // Process full image variants
      for (let i = 0; i < imageVariants.length; i++) {
        setProgress(Math.round(25 + (i / imageVariants.length) * 40)); // 25-65%
        
        try {
          // Process this variant with Tesseract
          const variantResult = await Tesseract.recognize(imageVariants[i], 'eng', {
            logger: (m: any) => {
              if (m.status === 'recognizing text' && m.progress !== undefined) {
                // Only update progress for the first variant to avoid jumpy progress
                if (i === 0) {
                  const adjustedProgress = Math.round(25 + (m.progress * 20)); // Scale to fit our progress range
                  setProgress(adjustedProgress);
                }
              }
            }
          });
          
          const text = variantResult.data.text.trim();
          const confidence = variantResult.data.confidence || 0;
          
          // Assess quality of the result
          const textQuality = text.length * confidence;
          
          // Track best variant
          if (textQuality > bestTextLength * bestConfidence) {
            bestTextLength = text.length;
            bestConfidence = confidence;
            bestVariantIndex = i;
            
            // Save the best variant image for display
            setBestImageVariant(imageVariants[i]);
          }
          
          variantResults.push({
            text,
            confidence,
            variant: i
          });
        } catch (e) {
          console.warn('Error processing image variant:', e);
          // Continue with other variants
        }
      }
      
      // Process detected regions if any
      const regionTexts = [];
      
      if (regions.length > 0) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // For each region, try the best variant
          for (let i = 0; i < regions.length; i++) {
            setProgress(Math.round(65 + (i / regions.length) * 25)); // 65-90%
            
            const region = regions[i];
            const [x, y, width, height] = region.bbox;
            
            // Skip if region is too small
            if (width < 20 || height < 20) continue;
            
            // Set canvas to region size
            canvas.width = width;
            canvas.height = height;
            
            try {
              // Use the best variant for this region
              const bestVariantImg = await createImageElement(imageVariants[bestVariantIndex]);
              
              // Draw the region from the best variant
              ctx.drawImage(
                bestVariantImg, 
                x, y, width, height,
                0, 0, width, height
              );
              
              // Get the region as data URL
              const regionDataUrl = canvas.toDataURL('image/jpeg');
              
              // Extract text from the region using Tesseract directly
              const regionResult = await Tesseract.recognize(regionDataUrl, 'eng');
              const regionText = regionResult.data.text.trim();
              
              if (regionText) {
                regionTexts.push({
                  bbox: region.bbox,
                  text: regionText
                });
              }
            } catch (e) {
              console.warn('Error processing region:', e);
              // Continue with other regions
            }
          }
        }
      }
      
      // Determine the best result
      let finalText = '';
      
      // Get the best full image result
      const bestFullVariant = variantResults.length > 0 
        ? variantResults.reduce((best, current) => 
            (current.text.length * current.confidence > best.text.length * best.confidence) 
              ? current : best, variantResults[0])
        : null;
      
      // Choose between full image or regions
      if (regionTexts.length > 0) {
        const regionText = regionTexts.map(r => r.text).join('\n\n');
        
        // If regions have substantial text, use that, otherwise use best full variant
        if (regionText.length > 0 && bestFullVariant && 
            regionText.length > bestFullVariant.text.length * 0.5) {
          finalText = regionText;
        } else if (bestFullVariant) {
          finalText = bestFullVariant.text;
        }
        
        // Save the regions for visualization
        setTextRegions(regionTexts);
      } else if (bestFullVariant) {
        finalText = bestFullVariant.text;
      }
      
      // Save the best image variant
      if (bestVariantIndex >= 0 && bestVariantIndex < imageVariants.length) {
        setBestImageVariant(imageVariants[bestVariantIndex]);
      }
      
      setProgress(95);
      
      // Apply post-processing to improve text quality
      finalText = postProcessText(finalText);
      
      setExtractedText(finalText);
      setIsExtracting(false);
      setProgress(100);
      
      return finalText;
    } catch (err) {
      console.error('Text extraction error:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract text');
      setIsExtracting(false);
      return '';
    }
  }, []);
  
  // Function to clean up and improve extracted text
  const postProcessText = (text: string): string => {
    if (!text) return '';
    
    // Remove extra whitespace
    let processed = text.replace(/\s+/g, ' ');
    
    // Fix common OCR errors
    processed = processed
      .replace(/[|]l/g, 'I') // Fix pipe + l to I
      .replace(/[0O](?=[a-z])/g, 'O') // Fix digit 0 to letter O when followed by lowercase
      .replace(/l(?=[0-9])/g, '1') // Fix l to 1 when followed by a number
      .replace(/\bI\b(?!\s*[a-z])/g, '1') // Fix I to 1 when not followed by lowercase
      .replace(/S(?=[0-9])/g, '5') // Fix S to 5 when followed by a number
      .replace(/Z(?=[0-9])/g, '2') // Fix Z to 2 when followed by a number
      .replace(/[!](?=[0-9])/g, '1'); // Fix ! to 1 when followed by a number
    
    // Trim and return
    return processed.trim();
  };

  return {
    extractedText,
    isExtracting,
    progress,
    error,
    textRegions,
    bestImageVariant,
    extractTextFromImage
  };
}