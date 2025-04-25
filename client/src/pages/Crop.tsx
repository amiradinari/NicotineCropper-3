import { useEffect } from "react";
import { useLocation } from "wouter";
import StepIndicator from "@/components/StepIndicator";
import { useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import ImageCropper from "@/components/ImageCropper";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function Crop() {
  const [, setLocation] = useLocation();
  const { step, setStep, photoData, croppedAreaPixels, setCroppedAreaPixels } = useAppContext();
  const { toast } = useToast();

  useEffect(() => {
    setStep(2);
    
    // If no photo data, redirect back to camera
    if (!photoData) {
      toast({
        variant: "destructive",
        title: "No photo data",
        description: "Please take a photo first",
      });
      setLocation("/");
    }
  }, [photoData, setStep, setLocation, toast]);

  const handleRetake = () => {
    setLocation("/");
  };

  const handleConfirm = () => {
    if (!croppedAreaPixels) {
      toast({
        variant: "destructive",
        title: "Crop Error",
        description: "Please adjust the crop position first",
      });
      return;
    }
    setLocation("/result");
  };

  if (!photoData) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="flex-1 flex flex-col">
      <StepIndicator currentStep={2} totalSteps={3} />
      
      <div className="p-4 text-center mb-2">
        <p className="text-gray-700">Adjust the crop position</p>
      </div>
      
      <div className="flex-1 flex flex-col p-4">
        <div className="crop-container flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center relative">
          <ImageCropper 
            imageSrc={photoData.imageData} 
            onCropComplete={(_, croppedAreaPixelsValue) => setCroppedAreaPixels(croppedAreaPixelsValue)}
          />
        </div>
        
        <div className="mt-6 flex justify-between">
          <Button 
            variant="outline" 
            onClick={handleRetake}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retake
          </Button>
          
          <Button 
            onClick={handleConfirm}
            className="flex items-center"
          >
            Confirm
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
