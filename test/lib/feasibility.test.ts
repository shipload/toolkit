import { describe, expect, test } from "bun:test";
import type { FeasibilityIssue } from "../../src/lib/feasibility";
import {
	checkCargoCapacity,
	checkEnergyAvailable,
	checkEnergyCapacity,
	checkOriginEqualsTarget,
	checkReserve,
	checkTravelDuration,
	collectIssues,
	renderIssues,
} from "../../src/lib/feasibility";

describe("FeasibilityIssue shape", () => {
	test("has required fields", () => {
		const issue: FeasibilityIssue = {
			code: "energy_capacity_exceeded",
			severity: "error",
			message: "test",
		};
		expect(issue.code).toBe("energy_capacity_exceeded");
		expect(issue.severity).toBe("error");
	});
});

describe("checkEnergyCapacity", () => {
	test("returns null when required fits in capacity", () => {
		expect(checkEnergyCapacity(500, 400, "travel")).toBeNull();
	});
	test("returns issue when required exceeds capacity", () => {
		const issue = checkEnergyCapacity(383, 387, "travel");
		expect(issue).not.toBeNull();
		expect(issue?.code).toBe("energy_capacity_exceeded");
		expect(issue?.severity).toBe("error");
		expect(issue?.message).toContain("387");
		expect(issue?.message).toContain("383");
		expect(issue?.message).toContain("travel");
	});
});

describe("checkEnergyAvailable", () => {
	test("returns null when current >= required", () => {
		expect(checkEnergyAvailable(400, 300, "gather")).toBeNull();
		expect(checkEnergyAvailable(400, 400, "gather")).toBeNull();
	});
	test("returns issue when current < required", () => {
		const issue = checkEnergyAvailable(82, 387, "travel");
		expect(issue?.code).toBe("insufficient_energy");
		expect(issue?.message).toContain("travel");
		expect(issue?.message).toContain("387");
		expect(issue?.message).toContain("82");
	});
});

describe("checkCargoCapacity", () => {
	test("null when delta fits", () => {
		expect(checkCargoCapacity(1000, 500)).toBeNull();
		expect(checkCargoCapacity(1000, -200)).toBeNull();
	});
	test("issue when positive delta exceeds available", () => {
		const issue = checkCargoCapacity(100, 500);
		expect(issue?.code).toBe("insufficient_cargo_capacity");
		expect(issue?.message).toContain("500");
		expect(issue?.message).toContain("100");
	});
});

describe("checkReserve", () => {
	test("null when requested ≤ remaining", () => {
		expect(checkReserve(56, 56)).toBeNull();
		expect(checkReserve(56, 10)).toBeNull();
	});
	test("issue when requested > remaining", () => {
		const issue = checkReserve(12, 34);
		expect(issue?.code).toBe("insufficient_reserve");
		expect(issue?.message).toContain("12");
		expect(issue?.message).toContain("34");
	});
});

describe("checkTravelDuration", () => {
	test("null when under limit", () => {
		expect(checkTravelDuration(3600)).toBeNull();
	});
	test("issue when at/over 86400", () => {
		const issue = checkTravelDuration(86500);
		expect(issue?.code).toBe("excessive_travel_duration");
	});
});

describe("checkOriginEqualsTarget", () => {
	test("null when different", () => {
		expect(checkOriginEqualsTarget(0, 0, 1, 0)).toBeNull();
	});
	test("issue when same", () => {
		const issue = checkOriginEqualsTarget(3, -4, 3, -4);
		expect(issue?.code).toBe("origin_equals_target");
	});
});

describe("collectIssues", () => {
	test("drops nulls, keeps issues in order", () => {
		const issues = collectIssues(
			null,
			checkEnergyCapacity(383, 387, "gather"),
			null,
			checkReserve(12, 34),
		);
		expect(issues.length).toBe(2);
		expect(issues[0].code).toBe("energy_capacity_exceeded");
		expect(issues[1].code).toBe("insufficient_reserve");
	});
});

describe("renderIssues", () => {
	test("renders error with ❌, warning with ⚠️", () => {
		const out = renderIssues([
			{ code: "energy_capacity_exceeded", severity: "error", message: "err-msg" },
			{ code: "origin_equals_target", severity: "warning", message: "warn-msg" },
		]);
		expect(out).toContain("❌ err-msg");
		expect(out).toContain("⚠️  warn-msg");
	});
});

describe("checkEnergyAvailable — copy-paste suggestion", () => {
	test("without entity arg, falls back to short message", () => {
		const issue = checkEnergyAvailable(82, 690, "gather");
		expect(issue?.message).toBe("gather needs 690 energy, entity has 82 — recharge first");
	});
	test("with entity arg, includes runnable suggestions", () => {
		const issue = checkEnergyAvailable(82, 690, "gather", {
			entityType: "ship",
			entityId: 1n,
		});
		expect(issue?.message).toContain("`shiploadcli ship 1 recharge`");
		expect(issue?.message).toContain("--recharge");
	});
});
