import { KenzoGreeting } from "./KenzoGreeting";
import { StartForm } from "./StartForm";

export function StartScreen() {
  return (
    <main className="app-grid-background flex min-h-svh items-center px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-[54.125rem] flex-col gap-8 md:-translate-y-2">
        {/* <header className="px-0.5 sm:px-0 md:-ml-2 md:-translate-y-1.5" aria-label="Single Grain">
          <p className="text-[1.05rem] font-bold leading-none tracking-[-0.02em] text-on-surface">
            Single Grain
          </p>
        </header> */}

        <section
          className="grid min-h-[31.375rem] overflow-hidden rounded-[1.25rem] border border-outline-variant/55 bg-surface-container-lowest shadow-[var(--shadow-card)] md:grid-cols-[41.75%_58.25%]"
          aria-labelledby="start-heading"
        >
          <KenzoGreeting />
          <div className="flex items-center bg-surface-container-lowest px-6 py-10 sm:px-10 md:px-10 md:py-12">
            <div className="w-full md:max-w-[23.25rem] md:translate-y-1">
              <h2 id="start-heading">Let&apos;s see if we&apos;re a good fit.</h2>
              <p className="mt-1.5">First, tell Kenzo who he&apos;s speaking with.</p>
              <StartForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
