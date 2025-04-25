interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="step-indicator flex justify-center my-4">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={`w-2 h-2 mx-1 rounded-full transition-all duration-200 ${
            index + 1 === currentStep
              ? "bg-primary scale-125"
              : "bg-gray-300"
          }`}
        />
      ))}
    </div>
  );
}
