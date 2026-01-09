interface UserIdListProps {
	value: string;
	onChange: (value: string) => void;
	disabled: boolean;
}

export default function UserIdList({ value, onChange, disabled }: UserIdListProps) {
	const lineCount = value.split('\n').filter((line) => line.trim()).length;

	return (
		<div>
			<label
				htmlFor="userIds"
				className="block text-base font-medium text-slate-300 mb-3"
			>
				User IDs{' '}
				<span className="text-slate-500">
					({lineCount} user{lineCount !== 1 ? 's' : ''})
				</span>
			</label>
			<textarea
				id="userIds"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
				rows={10}
				placeholder="Enter user IDs, one per line"
				className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none font-mono text-base transition-all duration-200"
			/>
		</div>
	);
}