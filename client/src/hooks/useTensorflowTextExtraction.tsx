import { useState, useCallback, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import Tesseract from 'tesseract.js';

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

  // Preload the model when the hook is initialized
  useEffect(() => {
    loadModels().catch(err => {
      console.error('Failed to load TensorFlow models:', err);
      setError('Failed to load text detection models');
    });
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
    const predictions = await cocoModel.detect(img);
    
    // Filter for text and book objects which might contain text
    return predictions.filter(prediction => 
      ['book', 'cell phone', 'laptop', 'tv', 'remote'].includes(prediction.class)
    );
  };

  // Enhanced text extraction using TensorFlow.js and Tesseract
  const extractTextFromImage = useCallback(async (imageData: string) => {
    setIsExtracting(true);
    setProgress(0);
    setError(null);
    setTextRegions([]);
    
    try {
      // Start progress indication
      setProgress(10);
      
      // Load the image
      const img = await createImageElement(imageData);
      
      // First approach: Process the entire image with Tesseract
      // This will run in parallel with the region detection
      const fullImagePromise = Tesseract.recognize(
        imageData,
        'eng',
        {
          logger: (m: any) => {
            if (m.status === 'recognizing text' && m.progress !== undefined) {
              setProgress(Math.round(10 + m.progress * 40)); // 10-50% for full image
            }
          }
        }
      );
      
      // Second approach: Try to detect text regions
      setProgress(55);
      const regions = await detectTextRegions(img);
      setProgress(60);
      
      // If regions were found, create a canvas to extract each region
      const regionTexts = [];
      if (regions.length > 0) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          for (let i = 0; i < regions.length; i++) {
            const region = regions[i];
            const [x, y, width, height] = region.bbox;
            
            // Set canvas to region size
            canvas.width = width;
            canvas.height = height;
            
            // Draw the region to the canvas
            ctx.drawImage(
              img, 
              x, y, width, height,
              0, 0, width, height
            );
            
            // Get the region as data URL
            const regionDataUrl = canvas.toDataURL('image/jpeg');
            
            // Extract text from the region
            setProgress(Math.round(60 + (i / regions.length) * 30)); // 60-90%
            try {
              const regionResult = await Tesseract.recognize(
                regionDataUrl,
                'eng',
                {
                  logger: () => {} // Suppress region-specific logs
                }
              );
              
              if (regionResult.data.text.trim()) {
                regionTexts.push({
                  bbox: region.bbox,
                  text: regionResult.data.text.trim()
                });
              }
            } catch (e) {
              console.warn('Error processing region:', e);
              // Continue with other regions
            }
          }
        }
      }
      
      // Get the full image result
      const fullImageResult = await fullImagePromise;
      const fullText = fullImageResult.data.text.trim();
      
      // Determine which result to use and combine if necessary
      let finalText = '';
      
      if (regionTexts.length > 0) {
        // Get text from regions
        const regionText = regionTexts.map(r => r.text).join('\n\n');
        
        // If regions have substantial text, use that, otherwise use full image
        if (regionText.length > fullText.length * 0.3) {
          finalText = regionText;
        } else {
          finalText = fullText;
        }
        
        // Save the regions
        setTextRegions(regionTexts);
      } else {
        // Use the full image text
        finalText = fullText;
      }
      
      setProgress(95);
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

  return {
    extractedText,
    isExtracting,
    progress,
    error,
    textRegions,
    extractTextFromImage
  };
}