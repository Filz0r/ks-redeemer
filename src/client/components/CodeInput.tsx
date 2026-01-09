interface CodeInputProps {
	value: string;
	onChange: (value: string) => void;
	disabled: boolean;
}

export default function CodeInput({ value, onChange, disabled }: CodeInputProps) {
	return (
		<div>
			<label
				htmlFor="giftCode"
				className="block text-base font-medium text-slate-300 mb-3"
			>
				Gift Code
			</label>
			<input
				type="text"
				id="giftCode"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
				placeholder="Enter gift code"
				className="w-full px-5 py-4 text-lg bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
			/>
		</div>
	);
}