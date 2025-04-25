import { useState } from "react";
import { useTextExtraction } from "@/hooks/useTextExtraction";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader, Copy, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAppContext } from "@/context/AppContext";

interface TextExtractionPanelProps {
  imageData: string;
}

export default function TextExtractionPanel({ imageData }: TextExtractionPanelProps) {
  const { extractedText, setExtractedText } = useAppContext();
  const { isExtracting, progress, error, extractTextFromImage } = useTextExtraction();
  const [showText, setShowText] = useState(false);
  const { toast } = useToast();

  const handleExtractText = async () => {
    setShowText(true);
    
    if (extractedText) {
      // Text is already extracted
      return;
    }
    
    try {
      const text = await extractTextFromImage(imageData);
      setExtractedText(text);
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
            Extracting Text...
          </>
        ) : (
          <>
            <FileText className="mr-2 h-4 w-4" />
            {showText ? "Hide Extracted Text" : "Extract Text from Image"}
          </>
        )}
      </Button>

      {isExtracting && (
        <div className="mt-3">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center mt-1 text-gray-500">{progress}% complete</p>
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
            <h3 className="text-sm font-medium text-gray-700">Extracted Text</h3>
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