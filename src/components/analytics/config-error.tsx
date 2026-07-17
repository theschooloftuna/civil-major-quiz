function ConfigError() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-3xl font-normal text-foreground">Analytics unavailable</h1>
      <p className="text-lg text-muted-foreground">
        <code>SUPABASE_SERVICE_ROLE_KEY</code> isn&apos;t configured for this environment. Set
        it in <code>.env.local</code> (see <code>.env.example</code>) to enable the analytics
        dashboard.
      </p>
    </div>
  );
}

export { ConfigError };
