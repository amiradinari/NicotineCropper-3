import { useState } from "react";
import { useTensorflowTextExtraction } from "@/hooks/useTensorflowTextExtraction";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader, Copy, FileText, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAppContext } from "@/context/AppContext";
import { Badge } from "@/components/ui/badge";

interface TensorflowTextExtractionPanelProps {
  imageData: string;
}

export default function TensorflowTextExtractionPanel({ imageData }: TensorflowTextExtractionPanelProps) {
  const { extractedText, setExtractedText } = useAppContext();
  const { isExtracting, progress, error, textRegions, extractTextFromImage } = useTensorflowTextExtraction();
  const [showText, setShowText] = useState(false);
  const { toast } = useToast();

  const handleExtractText = async () => {
    setShowText(true);
    
    if (extractedText) {
      // Text is already extracted
      return;
    }
    
    try {
      toast({
        title: "AI Text Extraction",
        description: "Using TensorFlow.js to analyze and extract text from your image...",
      });
      
      const text = await extractTextFromImage(imageData);
      setExtractedText(text);
      
      if (text.trim()) {
        toast({
          title: "Text Extracted",
          description: "AI successfully found and extracted text from your image.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "No Text Found",
          description: "The AI couldn't find any readable text in this image.",
        });
      }
    } catch (err) {
      console.error("Failed to extract text:", err);
      toast({
        variant: "destructive",
        title: "Extraction Failed",
        description: "Could not extract text from the image. Please try again.",
      });
    }
  };

  const handleCopyText = () => {
    if (!extractedText) return;
    
    navigator.clipboard.writeText(extractedText)
      .then(() => {
        toast({
          title: "Text Copied",
          description: "Text has been copied to clipboard.",
        });
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Copy Failed",
          description: "Failed to copy text to clipboard.",
        });
      });
  };

  return (
    <div className="mt-6 flex flex-col bg-white rounded-lg shadow-sm p-4">
      <Button 
        variant={showText ? "secondary" : "default"}
        onClick={handleExtractText}
        className="flex items-center justify-center"
        disabled={isExtracting}
      >
        {isExtracting ? (
          <>
            <Loader className="mr-2 h-4 w-4 animate-spin" />
            AI Analyzing Image...
          </>
        ) : (
          <>
            <Zap className="mr-2 h-4 w-4" />
            {showText ? "Hide AI Text Analysis" : "AI-Powered Text Extraction"}
          </>
        )}
      </Button>

      {isExtracting && (
        <div className="mt-3">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center mt-1 text-gray-500">{progress}% complete</p>
          <div className="mt-2 text-center text-xs text-gray-500">
            {progress < 20 && "Loading AI models..."}
            {progress >= 20 && progress < 50 && "Processing full image..."}
            {progress >= 50 && progress < 70 && "Detecting text regions..."}
            {progress >= 70 && progress < 90 && "Recognizing text content..."}
            {progress >= 90 && "Finalizing results..."}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 text-red-500 text-sm p-2 bg-red-50 rounded border border-red-100">
          {error}
        </div>
      )}

      {showText && extractedText && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <h3 className="text-sm font-medium text-gray-700">Extracted Text</h3>
              {textRegions.length > 0 && (
                <Badge variant="outline" className="ml-2 text-xs bg-blue-50">
                  {textRegions.length} region{textRegions.length !== 1 ? 's' : ''} detected
                </Badge>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCopyText}
              className="h-8 px-2 text-gray-500 hover:text-gray-700"
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
          </div>
          <div className="bg-gray-50 p-3 rounded border text-sm text-gray-800 whitespace-pre-wrap max-h-40 overflow-y-auto">
            {extractedText || "No text was found in the image."}
          </div>
        </div>
      )}

      {showText && !extractedText && !isExtracting && (
        <div className="mt-4 text-center text-sm text-gray-500">
          No text was found in the image.
        </div>
      )}
    </div>
  );
}