import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import StepIndicator from "@/components/StepIndicator";
import { useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { createCircleCrop } from "@/lib/imageUtils";
import { useToast } from "@/hooks/use-toast";
import { Download, Eye, EyeOff } from "lucide-react";
import TextExtractionPanel from "@/components/TextExtractionPanel";

export default function Result() {
  const [, setLocation] = useLocation();
  const { setStep, photoData, croppedAreaPixels, isTextExtractionEnabled, setIsTextExtractionEnabled, isFrontCamera } = useAppContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [croppedImageData, setCroppedImageData] = useState<string | null>(null);
  const { toast } = useToast();

  // Generate the cropped image when the component mounts
  useEffect(() => {
    setStep(3);
    
    // If no photo data or crop info, redirect back
    if (!photoData || !croppedAreaPixels) {
      toast({
        variant: "destructive",
        title: "Missing data",
        description: "Photo data is missing. Please take a photo first.",
      });
      setLocation("/");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderCroppedImage = async () => {
      try {
        await createCircleCrop(
          photoData.imageData,
          croppedAreaPixels,
          canvas
        );
        
        // Save cropped image data URL for text extraction
        setCroppedImageData(canvas.toDataURL("image/png"));
      } catch (error) {
        console.error("Error creating circular crop:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create the cropped image. Please try again.",
        });
        setLocation("/");
      }
    };

    renderCroppedImage();
  }, [photoData, croppedAreaPixels, setStep, setLocation, toast]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Create a download link
      const link = document.createElement("a");
      link.download = "nicotine-pouch-image.png";
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: "Image downloaded successfully",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        variant: "destructive",
        title: "Download Error",
        description: "Failed to download the image. Please try again.",
      });
    }
  };

  const handleStartOver = () => {
    setLocation("/");
  };

  const toggleTextExtraction = () => {
    setIsTextExtractionEnabled(!isTextExtractionEnabled);
  };

  if (!photoData || !croppedAreaPixels) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="flex-1 flex flex-col">
      <StepIndicator currentStep={3} totalSteps={3} />
      
      <div className="p-4 text-center mb-2">
        <h2 className="text-xl font-semibold text-gray-800">Your Cropped Image</h2>
        <p className="text-gray-600 text-sm">Perfect for your nicotine pouch</p>
      </div>
      
      <div className="flex-1 flex flex-col p-4">
        <div className="result-container flex-1 flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden p-8">
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-xs w-full">
            <div className="relative w-full pt-[100%] bg-gray-50 rounded-lg overflow-hidden">
              <canvas 
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full rounded-full"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex flex-col gap-3">
          <Button 
            onClick={handleDownload}
            className="py-3 flex items-center justify-center"
          >
            <Download className="mr-2 h-5 w-5" />
            Save Image
          </Button>
          
          <Button 
            variant="outline"
            onClick={toggleTextExtraction}
            className="border border-gray-300 text-gray-700 py-3 flex items-center justify-center"
          >
            {isTextExtractionEnabled ? (
              <>
                <EyeOff className="mr-2 h-5 w-5" />
                Hide Text Extraction
              </>
            ) : (
              <>
                <Eye className="mr-2 h-5 w-5" />
                Extract Text from Image
              </>
            )}
          </Button>
          
          {isTextExtractionEnabled && croppedImageData && (
            <TextExtractionPanel imageData={croppedImageData} />
          )}
          
          <Button 
            variant="outline"
            onClick={handleStartOver}
            className="border border-gray-300 text-gray-700 py-3"
          >
            Take Another Photo
          </Button>
        </div>
      </div>
    </div>
  );
}
