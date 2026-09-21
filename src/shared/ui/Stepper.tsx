import { CheckIcon } from './icons';

export function Stepper({ steps, currentIndex }: { steps: string[]; currentIndex: number }) {
  return (
    <div className="flex items-center">
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold ${
                  done
                    ? 'border-accent bg-accent text-white'
                    : active
                      ? 'border-accent bg-white text-accent'
                      : 'border-border bg-white text-text-faint'
                }`}
              >
                {done ? <CheckIcon width={13} height={13} /> : i + 1}
              </div>
              <span className={`whitespace-nowrap text-[11px] font-semibold ${active ? 'text-accent' : done ? 'text-text' : 'text-text-faint'}`}>
                {step}
              </span>
            </div>
            {i < steps.length - 1 && <div className={`mx-2 h-0.5 w-10 ${done ? 'bg-accent' : 'bg-border'}`} />}
          </div>
        );
      })}
    </div>
  );
}
