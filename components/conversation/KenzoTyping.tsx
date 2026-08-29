import Image from "next/image";

export function KenzoTyping() {
  return (
    <div className="flex items-center gap-3 px-1" role="status" aria-live="polite">
      <Image
        src="/kenzo_genereating_response.png"
        alt=""
        width={237}
        height={256}
        className="h-10 w-auto object-contain"
      />
      <div className="flex items-center gap-1 rounded-full bg-surface-container px-3 py-2" aria-hidden="true">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/65 [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/65 [animation-delay:-0.1s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/65" />
      </div>
      <span className="sr-only">Kenzo is preparing a response.</span>
    </div>
  );
}
