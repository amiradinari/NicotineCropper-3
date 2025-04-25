import { useState } from "react";
import { useTensorflowTextExtraction } from "@/hooks/useTensorflowTextExtraction";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader, Copy, FileText, Zap, ImageOff, Check, Settings } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAppContext } from "@/context/AppContext";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TensorflowTextExtractionPanelProps {
  imageData: string;
}

export default function TensorflowTextExtractionPanel({ imageData }: TensorflowTextExtractionPanelProps) {
  const { extractedText, setExtractedText } = useAppContext();
  const { 
    isExtracting, 
    progress, 
    error, 
    textRegions, 
    bestImageVariant, 
    extractTextFromImage 
  } = useTensorflowTextExtraction();
  const [showText, setShowText] = useState(false);
  const [showEnhancedPreview, setShowEnhancedPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("text");
  const { toast } = useToast();

  const handleExtractText = async () => {
    setShowText(true);
    
    if (extractedText) {
      // Text is already extracted
      return;
    }
    
    try {
      toast({
        title: "Enhanced AI Text Extraction",
        description: "Using multiple image enhancement techniques to improve extraction accuracy...",
      });
      
      const text = await extractTextFromImage(imageData);
      setExtractedText(text);
      
      if (text.trim()) {
        toast({
          title: "Text Extracted",
          description: "AI successfully extracted text with improved accuracy.",
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

  const toggleEnhancedPreview = () => {
    setShowEnhancedPreview(!showEnhancedPreview);
  };

  return (
    <div className="mt-6 flex flex-col bg-white rounded-lg shadow-sm p-4">
      <div className="flex flex-col">
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
              {showText ? "Hide AI Text Analysis" : "Enhanced AI Text Extraction"}
            </>
          )}
        </Button>
        
        <div className="text-xs text-center mt-1 text-gray-500">
          Using image enhancement & multi-variant processing for better accuracy
        </div>
      </div>

      {isExtracting && (
        <div className="mt-3">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center mt-1 text-gray-500">{progress}% complete</p>
          <div className="mt-2 text-center text-xs text-gray-500">
            {progress < 15 && "Creating enhanced image variants..."}
            {progress >= 15 && progress < 25 && "Detecting text regions in image..."}
            {progress >= 25 && progress < 65 && "Testing multiple image processing techniques..."}
            {progress >= 65 && progress < 90 && "Extracting text from optimal regions..."}
            {progress >= 90 && "Post-processing and finalizing results..."}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 text-red-500 text-sm p-2 bg-red-50 rounded border border-red-100">
          {error}
        </div>
      )}

      {showText && (extractedText || bestImageVariant) && (
        <div className="mt-4">
          <Tabs defaultValue="text" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Extracted Text
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs">
                <Settings className="h-3 w-3 mr-1" />
                Enhanced Image
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="text" className="mt-2">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-gray-700">Detected Text</h3>
                  {textRegions.length > 0 && (
                    <Badge variant="outline" className="ml-2 text-xs bg-blue-50">
                      {textRegions.length} region{textRegions.length !== 1 ? 's' : ''} analyzed
                    </Badge>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleCopyText}
                  className="h-8 px-2 text-gray-500 hover:text-gray-700"
                  disabled={!extractedText}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
              
              {extractedText ? (
                <div className="bg-gray-50 p-3 rounded border text-sm text-gray-800 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {extractedText}
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded border text-sm text-center text-gray-500">
                  No text was found in the image.
                </div>
              )}
              
              {extractedText && (
                <div className="mt-2 text-xs text-gray-500">
                  <p className="flex items-center">
                    <Check className="h-3 w-3 mr-1 text-green-500" />
                    Auto-corrected common OCR errors
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="preview" className="mt-2">
              <div className="flex flex-col">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Enhanced Image for OCR</h3>
                
                {bestImageVariant ? (
                  <div className="border rounded overflow-hidden bg-gray-50">
                    <img 
                      src={bestImageVariant} 
                      alt="Enhanced for text extraction" 
                      className="w-full object-contain max-h-40"
                    />
                    <div className="p-2 text-xs text-gray-500">
                      Image enhanced with optimal settings for text detection
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 border rounded bg-gray-50">
                    <ImageOff className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No enhanced image available</p>
                  </div>
                )}
                
                <div className="mt-2 text-xs text-gray-500">
                  <p>Image optimization techniques applied:</p>
                  <ul className="list-disc list-inside ml-1 mt-1">
                    <li>Contrast & brightness adjustment</li>
                    <li>Grayscale conversion</li>
                    <li>Edge enhancement</li>
                    <li>Noise reduction</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {showText && !extractedText && !bestImageVariant && !isExtracting && (
        <div className="mt-4 text-center py-6">
          <ImageOff className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No text was detected in the image</p>
          <p className="text-xs text-gray-400 mt-1">Try a different image with clearer text</p>
        </div>
      )}
    </div>
  );
}