import { describe, expect, test } from "bun:test";
import { getItem, itemIds } from "../data/catalog";
import { ITEM_BATTERY_T1, ITEM_GENERATOR_T1 } from "../data/item-ids";
import { getEntityLayout, getRecipe } from "../data/recipes-runtime";
import * as capabilities from "../derivation/capabilities";
import {
    BATTERY_CAPACITY_TIER_PCT,
    computeBaseCapacity,
    computeBatteryCapabilities,
    computeEntityCapabilities,
    computeGeneratorCapabilities,
    GENERATOR_CAPACITY_TIER_PCT,
    GENERATOR_RECHARGE_TIER_PCT,
    MODULE_MAX_TIER,
} from "../derivation/capabilities";
import { encodeStats } from "../derivation/crafting";
import { deriveResourceStats } from "../derivation/stratum";
import {
    applySlotMultiplierUint32,
    getSlotAmp,
    type InstalledModule,
} from "../entities/slot-multiplier";
import { calc_rechargetime } from "../travel/travel";
import { MASS_UNITS_PER_TONNE } from "../types";

const tonnes = (mass: number) => mass / MASS_UNITS_PER_TONNE;

const rawCache = new Map<number, number>();
function rawResourceMass(itemId: number): number {
    const cached = rawCache.get(itemId);
    if (cached !== undefined) return cached;
    const item = getItem(itemId);
    const total =
        item.type === "resource"
            ? item.mass
            : getRecipe(itemId)!.inputs.reduce(
                  (sum, i) => sum + rawResourceMass(i.itemId) * i.quantity,
                  0,
              );
    rawCache.set(itemId, total);
    return total;
}

const SEED_COUNT = 1_000_000;
let meanStatValue: number | undefined;
function meanStat(): number {
    if (meanStatValue !== undefined) return meanStatValue;
    let sum = 0;
    for (let i = 1; i <= SEED_COUNT; i++) {
        const s = deriveResourceStats(BigInt(i) * 7919n + 12345n);
        sum += s.stat1 + s.stat2 + s.stat3;
    }
    meanStatValue = sum / (SEED_COUNT * 3);
    return meanStatValue;
}

const gCap = (s: number) =>
    Math.min(s, 213) * 500 + Math.max(0, s - 213) * 1000;
const eff = (s: number) =>
    s <= 213 ? s : 213 + Math.floor(((s - 213) * 40) / 100);
const generatorCapacity = (stat0: number, tier: number) =>
    Math.floor(
        ((1_300_000 + gCap(stat0)) * GENERATOR_CAPACITY_TIER_PCT[tier - 1]) /
            100,
    );
const generatorRecharge = (stat1: number, tier: number) =>
    Math.floor(
        ((2000 + 6 * eff(stat1)) * GENERATOR_RECHARGE_TIER_PCT[tier - 1]) / 100,
    );
const batteryCapacity = (stat0: number, tier: number) =>
    Math.floor(
        ((2_500_000 + Math.floor((stat0 * 7_500_000) / 999)) *
            BATTERY_CAPACITY_TIER_PCT[tier - 1]) /
            100,
    );

describe("WP-CP-14 module tier tables run to tier 10", () => {
    test("WP-CP-14-tiers every module tier table has 10 entries and resources run T1 to T10", () => {
        expect(MODULE_MAX_TIER).toBe(10);
        const tables = Object.entries(capabilities).filter(([name]) =>
            name.endsWith("_TIER_PCT"),
        );
        const names = tables.map(([name]) => name);
        for (const expected of [
            "ENGINE_THRUST_TIER_PCT",
            "GENERATOR_CAPACITY_TIER_PCT",
            "GENERATOR_RECHARGE_TIER_PCT",
            "CRAFTER_SPEED_TIER_PCT",
            "BUILDER_SPEED_TIER_PCT",
            "WARP_RANGE_TIER_PCT",
            "BATTERY_CAPACITY_TIER_PCT",
            "LOADER_THRUST_TIER_PCT",
            "CARGO_BAY_CAPACITY_TIER_PCT",
        ]) {
            expect(names).toContain(expected);
        }
        for (const [, table] of tables)
            expect((table as readonly number[]).length).toBe(10);

        const resources = itemIds
            .map((id) => getItem(id))
            .filter((i) => i.type === "resource");
        expect(resources.length).toBe(50);
        expect(new Set(resources.map((r) => r.category)).size).toBe(5);
        expect(
            [...new Set(resources.map((r) => r.tier))].sort((a, b) => a - b),
        ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        const perCategory = new Map<string, number>();
        for (const r of resources)
            perCategory.set(
                r.category!,
                (perCategory.get(r.category!) ?? 0) + 1,
            );
        for (const count of perCategory.values()) expect(count).toBe(10);
    });
});

describe("WP-GM-35 Power Core and Battery Bank formulas", () => {
    const stats = [213, 606, 999];

    test("WP-GM-35-generator capacity and recharge follow the stated formulas at tiers 1 and 2", () => {
        for (const tier of [1, 2]) {
            for (const s of stats) {
                const caps = computeGeneratorCapabilities(
                    { reflectivity: s, resonance: s },
                    tier,
                );
                expect(caps.capacity).toBe(generatorCapacity(s, tier));
                expect(caps.recharge).toBe(generatorRecharge(s, tier));
            }
        }
        const t1 = computeGeneratorCapabilities(
            { reflectivity: 213, resonance: 213 },
            1,
        );
        expect(t1.capacity).toBe(1_406_500);
        expect(t1.recharge).toBe(3278);
    });

    test("WP-GM-35-battery capacity follows the stated formula at tiers 1 and 2", () => {
        for (const tier of [1, 2]) {
            for (const s of stats) {
                const caps = computeBatteryCapabilities(
                    { saturation: s },
                    tier,
                );
                expect(caps.capacity).toBe(batteryCapacity(s, tier));
            }
        }
        expect(
            computeBatteryCapabilities({ saturation: 213 }, 1).capacity,
        ).toBe(4_099_099);
    });

    test("WP-GM-35-recharge-time a full recharge from empty at T1 mean rolls floors to 429 s", () => {
        const caps = computeGeneratorCapabilities(
            { reflectivity: 213, resonance: 213 },
            1,
        );
        expect(
            calc_rechargetime(caps.capacity, 0, caps.recharge).toNumber(),
        ).toBe(Math.floor(1_406_500 / 3278));
        expect(Math.floor(1_406_500 / 3278)).toBe(429);
        expect(Math.ceil(1_406_500 / 3278)).toBe(430);
    });

    test("WP-GM-35-battery-needs-core a Battery Bank adds energy capacity only beside a Power Core", () => {
        const itemId = 10210;
        const layout = getEntityLayout(itemId)!.slots;
        const generatorSlot = layout.findIndex((s) => s.type === "generator");
        const otherSlot = layout.findIndex(
            (s, i) => i !== generatorSlot && s.type === "any",
        );
        expect(generatorSlot).toBeGreaterThanOrEqual(0);
        expect(otherSlot).toBeGreaterThanOrEqual(0);
        const moduleStats = encodeStats([213, 213, 213, 213, 213, 213]);
        const hull = { a: 213, b: 213, c: 213, d: 213, e: 213 };
        const battery: InstalledModule = {
            slotIndex: otherSlot,
            itemId: ITEM_BATTERY_T1,
            stats: moduleStats,
        };
        const core: InstalledModule = {
            slotIndex: generatorSlot,
            itemId: ITEM_GENERATOR_T1,
            stats: moduleStats,
        };

        const batteryOnly = computeEntityCapabilities(
            hull,
            itemId,
            [battery],
            layout,
        );
        expect(batteryOnly.generator).toBeUndefined();

        const coreOnly = computeEntityCapabilities(
            hull,
            itemId,
            [core],
            layout,
        );
        const both = computeEntityCapabilities(
            hull,
            itemId,
            [core, battery],
            layout,
        );
        const coreAmp = getSlotAmp(layout, generatorSlot);
        const batteryAmp = getSlotAmp(layout, otherSlot);
        const coreCap = applySlotMultiplierUint32(
            generatorCapacity(213, 1),
            coreAmp,
        );
        const batteryCap = applySlotMultiplierUint32(
            batteryCapacity(213, 1),
            batteryAmp,
        );
        expect(coreOnly.generator!.capacity).toBe(coreCap);
        expect(both.generator!.capacity).toBe(coreCap + batteryCap);
        expect(both.generator!.recharge).toBe(coreOnly.generator!.recharge);
    });
});

describe("WP-GM-36 storage per tonne burned", () => {
    test("WP-GM-36-warehouse a T2 Warehouse and a T2 Container ratio of capacity to tonnes burned", () => {
        const mean = Math.round(meanStat());
        const stats = {
            a: mean,
            b: mean,
            c: mean,
            d: mean,
            e: mean,
            strength: mean,
            hardness: mean,
        };
        const report = (itemId: number) => {
            const raw = tonnes(rawResourceMass(itemId));
            const kept = tonnes(getItem(itemId).mass);
            const burned = raw - kept;
            const capacity = tonnes(computeBaseCapacity(itemId, stats));
            return {
                raw,
                components: tonnes(
                    getRecipe(itemId)!.inputs.reduce(
                        (s, i) =>
                            s +
                            (getItem(i.itemId).type === "component"
                                ? getItem(i.itemId).mass * i.quantity
                                : 0),
                        0,
                    ),
                ),
                kept,
                burned,
                capacity,
                ratio: capacity / burned,
            };
        };
        const warehouse = report(11202);
        const container = report(11200);
        expect(warehouse.burned).toBe(18_880);
        expect(warehouse.capacity).toBeCloseTo(205_135.1, 1);
        expect(container.burned).toBe(23_300);
        expect(warehouse.ratio).toBeCloseTo(10.9, 1);
        expect(container.ratio).toBeCloseTo(1.0, 1);
    });
});
