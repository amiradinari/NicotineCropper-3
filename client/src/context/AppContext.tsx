import { createContext, useContext, useState, ReactNode } from "react";

// Define Area type here since the import from react-easy-crop/types is causing issues
interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

type PhotoData = {
  imageData: string;
  width: number;
  height: number;
} | null;

interface AppContextType {
  step: number;
  setStep: (step: number) => void;
  photoData: PhotoData;
  setPhotoData: (data: PhotoData) => void;
  croppedAreaPixels: Area | null;
  setCroppedAreaPixels: (area: Area | null) => void;
  extractedText: string;
  setExtractedText: (text: string) => void;
  isTextExtractionEnabled: boolean;
  setIsTextExtractionEnabled: (enabled: boolean) => void;
  isFrontCamera: boolean;
  setIsFrontCamera: (isFront: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(1);
  const [photoData, setPhotoData] = useState<PhotoData>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isTextExtractionEnabled, setIsTextExtractionEnabled] = useState<boolean>(false);
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(true); // Default to front camera

  return (
    <AppContext.Provider
      value={{
        step,
        setStep,
        photoData,
        setPhotoData,
        croppedAreaPixels,
        setCroppedAreaPixels,
        extractedText,
        setExtractedText,
        isTextExtractionEnabled,
        setIsTextExtractionEnabled,
        isFrontCamera,
        setIsFrontCamera,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
