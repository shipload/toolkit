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
	const prefix = e.with_recharge ? "Estimate (with recharge):" : "Estimate:";
	const headerParts: string[] = [`duration ${formatDuration(e.duration_s)}`];
	if (e.energy_cost !== 0) headerParts.push(`energy ${signed(-e.energy_cost)}`);

	if (e.craft) {
		const lines: string[] = [`${prefix} ${headerParts.join(", ")}`, "Inputs:"];
		for (const slot of e.craft.slots) {
			const total = slot.contributions.reduce((s, c) => s + c.qty, 0);
			const itemName = formatItem(slot.itemId);
			if (slot.contributions.length === 1) {
				const c = slot.contributions[0];
				lines.push(`  ${itemName} ×${total}  (from stack ${c.stackId})`);
			} else if (slot.contributions.length === 0) {
				lines.push(`  ${itemName} ×${slot.requiredQty}  (no inputs supplied)`);
			} else {
				const breakdown = slot.contributions
					.map((c) => `${c.qty} from stack ${c.stackId}`)
					.join(" + ");
				lines.push(`  ${itemName} ×${total}  (= ${breakdown})`);
			}
		}
		lines.push(`Output:`, `  ${formatItem(e.craft.outputItemId)} ×${e.craft.outputQty}`);
		const body = lines.join("\n");
		return e.feasibility.issues.length === 0
			? body
			: `${renderIssues(e.feasibility.issues)}\n${body}`;
	}

	for (const [itemIdStr, qty] of Object.entries(e.cargo_delta)) {
		const id = Number(itemIdStr);
		headerParts.push(`cargo ${signed(qty)} ${formatItem(id)}`);
	}
	const summary = `${prefix} ${headerParts.join(", ")}`;
	if (e.feasibility.issues.length === 0) return summary;
	return `${renderIssues(e.feasibility.issues)}\n${summary}`;
}
