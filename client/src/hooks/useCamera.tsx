import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

type FacingMode = "user" | "environment";

export function useCamera() {
  const [hasPermission, setHasPermission] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const { toast } = useToast();

  // Check if camera is supported
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsSupported(false);
    }
  }, []);

  // Request camera permission
  const requestCameraPermission = useCallback(async () => {
    if (!isSupported) return;

    try {
      // Request camera access
      await navigator.mediaDevices.getUserMedia({
        video: { facingMode }
      });
      
      setHasPermission(true);
    } catch (error) {
      console.error("Camera permission error:", error);
      
      toast({
        variant: "destructive",
        title: "Camera Permission Error",
        description: "Unable to access the camera. Please ensure you have granted permission.",
      });
      
      setHasPermission(false);
    }
  }, [isSupported, facingMode, toast]);

  // Toggle between front and back cameras
  const toggleFacingMode = useCallback(() => {
    setFacingMode(prevMode => 
      prevMode === "user" ? "environment" : "user"
    );
  }, []);

  return {
    hasPermission,
    isSupported,
    facingMode,
    requestCameraPermission,
    toggleFacingMode,
  };
}
