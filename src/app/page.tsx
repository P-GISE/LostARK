const highlights = [
  "Track raid schedules and missing responses",
  "Compare member availability by day and time",
  "Manage roster, characters, templates, and reminders",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Fixed raid group planner
          </p>
          <h1 className="text-4xl font-semibold">Lost Ark Party Planner</h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            A private operating dashboard for raid leaders and members to plan
            availability, schedule raids, assign characters, and send Discord
            reminders.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {highlights.map((highlight) => (
            <div
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              key={highlight}
            >
              <p className="text-sm font-medium text-slate-800">{highlight}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
