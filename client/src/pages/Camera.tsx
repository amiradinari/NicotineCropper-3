import { useEffect } from "react";
import { useLocation } from "wouter";
import CameraView from "@/components/CameraView";
import StepIndicator from "@/components/StepIndicator";
import { useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Camera() {
  const [, setLocation] = useLocation();
  const { setStep, photoData, setPhotoData } = useAppContext();
  const { toast } = useToast();

  useEffect(() => {
    setStep(1);
  }, [setStep]);

  const handleCapture = (imageData: string) => {
    if (!imageData) {
      toast({
        variant: "destructive",
        title: "Error capturing photo",
        description: "Please try again or check camera permissions",
      });
      return;
    }

    // Create an image object to get dimensions
    const img = new Image();
    img.onload = () => {
      setPhotoData({
        imageData,
        width: img.width,
        height: img.height,
      });
      setLocation("/crop");
    };
    img.onerror = () => {
      toast({
        variant: "destructive",
        title: "Image Error",
        description: "Failed to process the captured image. Please try again.",
      });
    };
    img.src = imageData;
  };

  return (
    <div className="flex-1 flex flex-col">
      <StepIndicator currentStep={1} totalSteps={3} />
      
      <div className="p-4 text-center mb-2">
        <p className="text-gray-700">Position the nicotine pouch in the circle</p>
      </div>
      
      <div className="flex-1 flex flex-col p-4">
        <CameraView onCapture={handleCapture} />
      </div>
    </div>
  );
}
