import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center bg-mist-100 px-5 text-center">
      <div>
        <div className="font-display text-[120px] font-extrabold leading-none text-gradient">404</div>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-navy-700">
          This road leads nowhere
        </h1>
        <p className="mt-3 text-ink-500">The page you’re looking for has driven off.</p>
        <ButtonLink to="/" className="mt-6">Back to Home</ButtonLink>
      </div>
    </div>
  );
}
