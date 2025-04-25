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
    
    // First approach: Use a finer grid to detect small text areas
    const fineGridSize = 8; // Divide the image into an 8x8 grid for finer detection
    const fineCellWidth = Math.floor(width / fineGridSize);
    const fineCellHeight = Math.floor(height / fineGridSize);
    
    // Lower variance threshold for detecting smaller text
    const smallTextThreshold = 25; // Lower threshold for small text detection
    
    // First pass - detect small text regions with a finer grid
    for (let gx = 0; gx < fineGridSize; gx++) {
      for (let gy = 0; gy < fineGridSize; gy++) {
        const cellX = gx * fineCellWidth;
        const cellY = gy * fineCellHeight;
        
        // Calculate contrast in this cell
        let totalPixels = 0;
        let sumBrightness = 0;
        let sumVariance = 0;
        
        for (let y = cellY; y < cellY + fineCellHeight && y < height; y++) {
          for (let x = cellX; x < cellX + fineCellWidth && x < width; x++) {
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
        for (let y = cellY; y < cellY + fineCellHeight && y < height; y++) {
          for (let x = cellX; x < cellX + fineCellWidth && x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const brightness = (r + g + b) / 3;
            
            sumVariance += Math.pow(brightness - avgBrightness, 2);
          }
        }
        
        const variance = Math.sqrt(sumVariance / totalPixels);
        
        // If cell has sufficient variance (contrast), it might contain text
        if (variance > smallTextThreshold) {
          regions.push({
            x: cellX,
            y: cellY,
            width: fineCellWidth,
            height: fineCellHeight
          });
        }
      }
    }
    
    // Second approach: Add specific edge regions to ensure we capture text at the edges
    // Top region
    regions.push({
      x: 0,
      y: 0,
      width: width,
      height: Math.floor(height * 0.2) // Top 20%
    });
    
    // Bottom region - often contains flavor text or product details
    regions.push({
      x: 0,
      y: Math.floor(height * 0.8),
      width: width,
      height: Math.floor(height * 0.2) // Bottom 20%
    });
    
    // Left region
    regions.push({
      x: 0,
      y: 0,
      width: Math.floor(width * 0.2),
      height: height
    });
    
    // Right region
    regions.push({
      x: Math.floor(width * 0.8),
      y: 0,
      width: Math.floor(width * 0.2),
      height: height
    });
    
    // Third approach: also add the entire image as a region to ensure we don't miss anything
    regions.push({
      x: 0,
      y: 0,
      width: width,
      height: height
    });
    
    // Merge adjacent regions to avoid duplicate processing
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
      
      // For nicotine pouches, we want to capture ALL text, so we'll combine regional 
      // and full-image results with special handling for the bottom text (flavor, product name)
      
      // Process all region text first
      const allRegionTexts: string[] = [];
      
      if (regionTexts.length > 0) {
        // Save the regions for visualization
        setTextRegions(regionTexts);
        
        // Group regions by position (top, bottom, middle, etc.)
        const bottomRegions = regionTexts.filter(r => {
          const [,y,,] = r.bbox;
          const isInBottomHalf = y > img.height / 2;
          return isInBottomHalf;
        });
        
        const topRegions = regionTexts.filter(r => {
          const [,y,,] = r.bbox;
          const isInTopHalf = y < img.height / 2;
          return isInTopHalf;
        });
        
        // Extract text from each region group and add to our list
        if (topRegions.length > 0) {
          const topText = topRegions.map(r => r.text).join(' ').trim();
          if (topText) allRegionTexts.push(topText);
        }
        
        if (bottomRegions.length > 0) {
          const bottomText = bottomRegions.map(r => r.text).join(' ').trim();
          if (bottomText) allRegionTexts.push(bottomText);
        }
      }
      
      // Get the full-image text if available
      const fullImageText = bestFullVariant ? bestFullVariant.text.trim() : '';
      
      // Combine all text, prioritizing region detection for specific areas
      if (allRegionTexts.length > 0 && fullImageText) {
        // Include ALL text we found, from both regions and full image
        // This ensures we don't miss anything, including the small text on the bottom
        finalText = [...allRegionTexts, fullImageText]
          .filter(Boolean)  // Remove any empty strings
          .join('\n\n');
          
        // Remove duplicates (full image might contain some of the same text as regions)
        finalText = removeDuplicateLines(finalText);
      } 
      else if (allRegionTexts.length > 0) {
        // We only have region text
        finalText = allRegionTexts.join('\n\n');
      }
      else if (fullImageText) {
        // We only have full image text
        finalText = fullImageText;
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
  
  // Helper function to remove duplicate lines when combining text from multiple sources
  const removeDuplicateLines = (text: string): string => {
    if (!text) return '';
    
    const lines = text.split('\n');
    const uniqueLines: string[] = [];
    const seenLines: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines
      if (!trimmed) continue;
      
      // Normalize the line for comparison (lowercase, remove extra spaces)
      const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');
      
      // Check if we've seen a similar line
      let isDuplicate = false;
      for (let i = 0; i < seenLines.length; i++) {
        const seen = seenLines[i];
        // Check for near duplicates (one might be a substring of the other)
        if (normalized.includes(seen) || seen.includes(normalized)) {
          // If the current line is longer, replace the shorter one
          if (trimmed.length > uniqueLines[i].length) {
            // Replace the shorter line with this one
            uniqueLines[i] = trimmed;
            seenLines[i] = normalized;
          }
          // Either way, it's a duplicate or we've replaced it
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        uniqueLines.push(trimmed);
        seenLines.push(normalized);
      }
    }
    
    return uniqueLines.join('\n');
  };
  
  // Function to clean up and improve extracted text
  const postProcessText = (text: string): string => {
    if (!text) return '';
    
    // Split into lines, process each line separately
    const lines = text.split('\n');
    const processedLines = lines.map(line => {
      // Remove extra whitespace within each line
      let processed = line.trim().replace(/\s+/g, ' ');
      
      // Fix common OCR errors
      processed = processed
        .replace(/[|]l/g, 'I') // Fix pipe + l to I
        .replace(/[0O](?=[a-z])/g, 'O') // Fix digit 0 to letter O when followed by lowercase
        .replace(/l(?=[0-9])/g, '1') // Fix l to 1 when followed by a number
        .replace(/\bI\b(?!\s*[a-z])/g, '1') // Fix I to 1 when not followed by lowercase
        .replace(/S(?=[0-9])/g, '5') // Fix S to 5 when followed by a number
        .replace(/Z(?=[0-9])/g, '2') // Fix Z to 2 when followed by a number
        .replace(/[!](?=[0-9])/g, '1') // Fix ! to 1 when followed by a number
        .replace(/rn/g, 'm') // Fix 'rn' to 'm' (common OCR error)
        .replace(/cl/g, 'd') // Fix 'cl' to 'd' (common OCR error)
        .replace(/nn/g, 'nn') // Fix 'nn' issues
        .replace(/ii/g, 'n'); // Fix 'ii' to 'n' (common OCR error)
      
      return processed;
    });
    
    // Filter out empty lines and join
    return processedLines.filter(line => line.trim()).join('\n');
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