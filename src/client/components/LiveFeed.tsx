export interface FeedEntry {
	id: string;
	message: string;
	type: 'info' | 'success' | 'error' | 'warning';
	timestamp: Date;
}

interface LiveFeedProps {
	entries: FeedEntry[];
}

const typeStyles: Record<FeedEntry['type'], string> = {
	info: 'text-cyan-400',
	success: 'text-emerald-400',
	error: 'text-red-400',
	warning: 'text-amber-400',
};

export default function LiveFeed({ entries }: LiveFeedProps) {
	return (
		<div>
			<label className="block text-base font-medium text-slate-300 mb-3">
				Live Feed
			</label>
			<div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 h-96 overflow-y-auto font-mono text-base">
				{entries.length === 0 ? (
					<p className="text-slate-500 text-center py-12 text-lg">
						Waiting to start...
					</p>
				) : (
					<div className="space-y-2">
						{entries.map((entry) => (
							<div
								key={entry.id}
								className={`${typeStyles[entry.type]} leading-relaxed`}
							>
								<span className="text-slate-500">
									[{entry.timestamp.toLocaleTimeString()}]
								</span>{' '}
								{entry.message}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}