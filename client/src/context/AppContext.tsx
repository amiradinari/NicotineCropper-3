import { createContext, useContext, useState, ReactNode } from "react";
import { Area } from "react-easy-crop/types";

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(1);
  const [photoData, setPhotoData] = useState<PhotoData>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  return (
    <AppContext.Provider
      value={{
        step,
        setStep,
        photoData,
        setPhotoData,
        croppedAreaPixels,
        setCroppedAreaPixels,
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
