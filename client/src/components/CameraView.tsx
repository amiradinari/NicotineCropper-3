import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import Webcam from "react-webcam";
import CircleOverlay from "./CircleOverlay";
import { useCamera } from "@/hooks/useCamera";
import { useToast } from "@/hooks/use-toast";
import { Loader, RefreshCw } from "lucide-react";

interface CameraViewProps {
  onCapture: (imageData: string) => void;
}

export default function CameraView({ onCapture }: CameraViewProps) {
  const webcamRef = useRef<Webcam>(null);
  const { toast } = useToast();
  const [isCameraLoading, setIsCameraLoading] = useState(true);
  
  const {
    hasPermission,
    isSupported,
    facingMode,
    requestCameraPermission,
    toggleFacingMode,
  } = useCamera();

  useEffect(() => {
    // Auto-request camera permission when component mounts
    if (isSupported && !hasPermission) {
      requestCameraPermission();
    }
    
    // Cleanup timeout for camera loading state
    const timeoutId = setTimeout(() => {
      setIsCameraLoading(false);
    }, 3000);
    
    return () => clearTimeout(timeoutId);
  }, [isSupported, hasPermission, requestCameraPermission]);

  const handleCapture = () => {
    if (!webcamRef.current) return;
    
    const imageSrc = webcamRef.current.getScreenshot();
    
    if (!imageSrc) {
      toast({
        variant: "destructive",
        title: "Capture Error",
        description: "Failed to capture image. Please try again.",
      });
      return;
    }
    
    onCapture(imageSrc);
  };

  if (!isSupported) {
    return (
      <div className="camera-container flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center p-6 text-white">
          <div className="mb-4 text-6xl">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Camera Not Supported</h2>
          <p className="mb-4">Your device or browser doesn't support camera access.</p>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="camera-container flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center p-6 text-white">
          <div className="mb-4 text-6xl">📷</div>
          <h2 className="text-xl font-semibold mb-2">Camera Access Needed</h2>
          <p className="mb-4">We need permission to use your camera to take the photo.</p>
          <Button onClick={requestCameraPermission}>
            Enable Camera
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="camera-container flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center relative">
        {isCameraLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <Loader className="h-8 w-8 text-white animate-spin" />
          </div>
        )}
        
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }}
          mirrored={facingMode === "user"}
          onUserMedia={() => setIsCameraLoading(false)}
          onUserMediaError={(error) => {
            console.error("Camera error:", error);
            toast({
              variant: "destructive",
              title: "Camera Error",
              description: "Failed to access camera. Please check permissions.",
            });
            setIsCameraLoading(false);
          }}
          className="w-full h-auto"
        />
        
        <CircleOverlay size={240} />
      </div>
      
      <div className="mt-6 flex justify-center items-center">
        <Button 
          onClick={handleCapture}
          className="capture-btn bg-white border-4 border-primary rounded-full w-16 h-16 flex items-center justify-center p-0"
        >
          <div className="bg-primary rounded-full w-12 h-12"></div>
        </Button>
      </div>
      
      <div className="mt-4 flex justify-center">
        <Button 
          variant="ghost" 
          onClick={toggleFacingMode}
          className="flex items-center justify-center py-2 px-4 text-gray-600"
        >
          <span className="mr-2">Switch Camera</span>
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>
    </>
  );
}
