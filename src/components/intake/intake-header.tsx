/** The business's name (and logo, if it set one) at the top of its intake form. */
export function IntakeHeader({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <header className="flex flex-col gap-3">
      {logoUrl ? (
        // A plain <img>, not next/image: the logo is an arbitrary URL the
        // business pastes in (so it can't be optimized through remotePatterns),
        // and next/image's unoptimized mode adds an inline style the nonce CSP
        // blocks. Decorative: the name below carries it, so alt is empty.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" width={160} height={48} className="h-12 w-auto self-start object-contain" />
      ) : null}
      <div>
        <h1 className="display text-4xl">{name}</h1>
        <p className="mt-2 text-sm text-mute">New client intake · about 5 minutes</p>
      </div>
    </header>
  );
}
