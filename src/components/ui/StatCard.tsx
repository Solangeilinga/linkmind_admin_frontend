interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  color?: "indigo" | "green" | "red" | "amber" | "blue" | "purple";
  sub?: string;
}

const colors: Record<string, string> = {
  indigo: "bg-indigo-50 text-indigo-600",
  green:  "bg-green-50  text-green-600",
  red:    "bg-red-50    text-red-600",
  amber:  "bg-amber-50  text-amber-600",
  blue:   "bg-blue-50   text-blue-600",
  purple: "bg-purple-50 text-purple-600",
};

export default function StatCard({ label, value, icon, color = "indigo", sub }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1.5 leading-none">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
