export default function GridBackground({ children }) {
  return (
    <div className="min-h-screen w-full relative bg-background">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(0.90 0.005 270) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(0.90 0.005 270) 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px",
          backgroundPosition: "0 0, 0 0",
          maskImage: `
            repeating-linear-gradient(
              to right,
              white 0px,
              white 3px,
              transparent 3px,
              transparent 10px
            ),
            repeating-linear-gradient(
              to bottom,
              white 0px,
              white 3px,
              transparent 3px,
              transparent 10px
            )
          `,
          WebkitMaskImage: `
            repeating-linear-gradient(
              to right,
              white 0px,
              white 3px,
              transparent 3px,
              transparent 10px
            ),
            repeating-linear-gradient(
              to bottom,
              white 0px,
              white 3px,
              transparent 3px,
              transparent 10px
            )
          `,
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
