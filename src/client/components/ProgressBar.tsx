interface ProgressBarProps {
	current: number;
	total: number;
	success: number;
	failed: number;
}

export default function ProgressBar({
	current,
	total,
	success,
	failed,
}: ProgressBarProps) {
	const percentage = total > 0 ? (current / total) * 100 : 0;

	return (
		<div>
			<div className="flex justify-between text-base mb-3">
				<span className="text-slate-300">
					Progress: {current}/{total}
				</span>
				<div className="flex gap-6">
					<span className="text-emerald-400 font-medium">Success: {success}</span>
					<span className="text-red-400 font-medium">Failed: {failed}</span>
				</div>
			</div>
			<div className="h-4 bg-slate-800/50 border border-slate-700 rounded-full overflow-hidden">
				<div
					className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 ease-out"
					style={{ width: `${percentage}%` }}
				/>
			</div>
		</div>
	);
}