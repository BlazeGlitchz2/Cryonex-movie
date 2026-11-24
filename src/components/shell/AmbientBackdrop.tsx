import { useAppearanceStore } from "../../store/useAppearanceStore";

// Desktop-only projector haze behind the window glass. Hidden below lg
// so phones and tablets never pay the large-blur GPU cost.
export function AmbientBackdrop() {
  const ambientBackdrop = useAppearanceStore((state) => state.ambientBackdrop);

  if (!ambientBackdrop) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden lg:block"
    >
      <div
        className="ambient-blob-a absolute -left-[8%] -top-[24%] h-[75vh] w-[55vw] rounded-full opacity-[0.12] blur-[110px]"
        style={{
          background:
            "radial-gradient(circle at 40% 40%, #2E9E4F, transparent 70%)",
        }}
      />
      <div
        className="ambient-blob-b absolute right-[-12%] top-[8%] h-[65vh] w-[45vw] rounded-full opacity-[0.07] blur-[120px]"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, #F5F5F7, transparent 70%)",
        }}
      />
      <div
        className="ambient-blob-c absolute bottom-[-30%] left-[18%] h-[70vh] w-[50vw] rounded-full opacity-[0.09] blur-[110px]"
        style={{
          background:
            "radial-gradient(circle at 45% 55%, #2E9E4F, transparent 72%)",
        }}
      />
    </div>
  );
}

export default AmbientBackdrop;
