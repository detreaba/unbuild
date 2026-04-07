interface StatBarProps {
  stats: { label: string; value: string }[];
}

export function StatBar({ stats }: StatBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4 pt-4 border-t border-border">
      {stats.map((stat) => (
        <div key={stat.label}>
          <p className="text-xs text-muted">{stat.label}</p>
          <p className="font-medium text-sm mt-0.5 truncate">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
