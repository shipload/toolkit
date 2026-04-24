import type { Command } from "commander";
import { type EntityTypeName, parseEntityType } from "../../lib/args";
import { server } from "../../lib/client";
import { formatEntity, formatOutput } from "../../lib/format";
import { getAccountName } from "../../lib/session";

interface EntitySummary {
	type: string;
	id: bigint;
	entity_name: string;
	is_idle: boolean;
}

export function renderSummaries(owner: string, rows: EntitySummary[]): string {
	const lines = [`Entities for ${owner} (${rows.length}):`];
	for (const r of rows) {
		const status = r.is_idle ? "idle" : "busy";
		lines.push(
			`  ${String(r.type).padEnd(10)} [${r.id}]  ${r.entity_name.padEnd(20)} ${status}`,
		);
	}
	return lines.join("\n");
}

export function renderFull(owner: string, rows: any[]): string {
	const header = `Entities for ${owner} (${rows.length}):`;
	if (rows.length === 0) return header;
	return [header, ...rows.map((r) => formatEntity(r))].join("\n\n");
}

export function register(program: Command): void {
	program
		.command("entities")
		.description("List entities for an owner (defaults to self)")
		.argument("[owner]", "account name")
		.option("--type <t>", "filter by entity type (ship/warehouse/container)", parseEntityType)
		.option("--full", "show full entity state instead of summaries")
		.option("--json", "emit JSON instead of formatted text")
		.action(
			async (
				owner: string | undefined,
				options: { type?: EntityTypeName; full?: boolean; json?: boolean },
			) => {
				const target = owner ?? getAccountName();
				const action = options.full ? "getentities" : "getsummaries";
				const params: Record<string, unknown> = { owner: target };
				if (options.type) params.entity_type = options.type;
				const result = (await server.readonly(action, params as unknown as any)) as any;
				const rows: any[] = Array.isArray(result) ? result : (result?.entities ?? result);
				if (options.full) {
					console.log(
						formatOutput(rows, { json: Boolean(options.json) }, (r) =>
							renderFull(target, r),
						),
					);
				} else {
					console.log(
						formatOutput(rows, { json: Boolean(options.json) }, (r) =>
							renderSummaries(target, r),
						),
					);
				}
			},
		);
}
