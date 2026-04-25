import type { EstimateResult, TravelSummary } from "./estimate";
import { renderIssues } from "./feasibility";
import { formatDuration, formatItem } from "./format";

function signed(n: number): string {
	return n >= 0 ? `+${n}` : `${n}`;
}

function tileDistance(origin: { x: number; y: number }, dest: { x: number; y: number }): string {
	const dx = dest.x - origin.x;
	const dy = dest.y - origin.y;
	const d = Math.sqrt(dx * dx + dy * dy);
	if (d === 0) return "0 tiles";
	const formatted = d < 10 ? d.toFixed(1) : Math.round(d).toString();
	return `${formatted} ${d < 1.5 ? "tile" : "tiles"}`;
}

export function renderTravelSummary(t: TravelSummary, shipId: bigint | number): string {
	const lines = [`Travel: ship ${shipId}`];
	const originSuffix = t.originIsProjected ? " (after pending tasks)" : "";
	lines.push(
		`  Route:    (${t.origin.x}, ${t.origin.y})${originSuffix} → (${t.destination.x}, ${t.destination.y})  ·  ${tileDistance(t.origin, t.destination)}`,
	);
	if (t.rechargeDuration_s > 0) {
		const total = t.flightDuration_s + t.rechargeDuration_s;
		lines.push(
			`  Duration: ${formatDuration(total)}  (recharge ${formatDuration(t.rechargeDuration_s)} + flight ${formatDuration(t.flightDuration_s)})`,
		);
	} else {
		lines.push(`  Duration: ${formatDuration(t.flightDuration_s)}`);
	}
	const delta = t.endEnergy - t.startEnergy;
	const energySuffix = t.startEnergyIsProjected ? " (after pending tasks)" : "";
	lines.push(`  Energy:   ${t.startEnergy} → ${t.endEnergy} (${signed(delta)})${energySuffix}`);
	return lines.join("\n");
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
