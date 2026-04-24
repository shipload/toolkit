import type { EstimateResult } from "./estimate";
import { renderIssues } from "./feasibility";
import { formatItem } from "./format";

function signed(n: number): string {
	return n >= 0 ? `+${n}` : `${n}`;
}

function formatDuration(s: number): string {
	if (s < 60) return `${Math.round(s)}s`;
	if (s < 3600) return `${Math.round(s / 60)}m`;
	const h = Math.floor(s / 3600);
	const m = Math.round((s % 3600) / 60);
	return `${h}h${m}m`;
}

export function renderEstimate(e: EstimateResult): string {
	const parts: string[] = [];
	parts.push(`duration ${formatDuration(e.duration_s)}`);
	if (e.energy_cost !== 0) parts.push(`energy ${signed(-e.energy_cost)}`);
	for (const [itemIdStr, qty] of Object.entries(e.cargo_delta)) {
		const id = Number(itemIdStr);
		parts.push(`cargo ${signed(qty)} ${formatItem(id)}`);
	}
	const prefix = e.with_recharge ? "Estimate (with recharge):" : "Estimate:";
	const summary = `${prefix} ${parts.join(", ")}`;
	if (e.feasibility.issues.length === 0) return summary;
	return `${renderIssues(e.feasibility.issues)}\n${summary}`;
}
