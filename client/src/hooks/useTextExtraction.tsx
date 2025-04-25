import { useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';

interface ProgressData {
  progress: number;
  status: string;
}

export function useTextExtraction() {
  const [extractedText, setExtractedText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const extractTextFromImage = useCallback(async (imageData: string) => {
    setIsExtracting(true);
    setProgress(0);
    setError(null);
    
    try {
      // Use the Tesseract.recognize method directly
      const result = await Tesseract.recognize(
        imageData,
        'eng',
        {
          logger: (m: any) => {
            if (m.status === 'recognizing text' && m.progress !== undefined) {
              setProgress(Math.round(m.progress * 100));
            }
          }
        }
      );
      
      // Set the extracted text
      const extractedText = result.data.text;
      setExtractedText(extractedText);
      setIsExtracting(false);
      
      return extractedText;
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
    extractTextFromImage
  };
}