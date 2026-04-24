import { expect, test } from "bun:test";
import { render } from "../../../src/commands/query/entity";

test("entity renders info via formatEntity", () => {
	const out = render({
		id: 9,
		entity_name: "Depot",
		owner: "alice",
		type: "warehouse",
		is_idle: true,
		coordinates: { x: 0, y: 0 },
		cargo: [],
		pending_tasks: [],
		current_task_remaining: 0,
	} as any);
	expect(out).toContain("Depot");
	expect(out).toContain("warehouse");
	expect(out).toContain("9");
});
