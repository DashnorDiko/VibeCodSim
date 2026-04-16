import {
  getUpgradeCost,
  getUpgradeTier,
  getUpgradeTierLabel,
  getTierUnlockRequirement,
  getUpgradeUnlockRequirement,
} from "../utils/scaling";

describe("getUpgradeTier", () => {
  it("returns tier 1 for levels 0-19", () => {
    expect(getUpgradeTier(0)).toBe(1);
    expect(getUpgradeTier(19)).toBe(1);
  });

  it("returns tier 2 for levels 20-39", () => {
    expect(getUpgradeTier(20)).toBe(2);
    expect(getUpgradeTier(39)).toBe(2);
  });

  it("returns tier 3 for levels 40+", () => {
    expect(getUpgradeTier(40)).toBe(3);
  });
});

describe("getUpgradeTierLabel", () => {
  it("returns T1 for level 0", () => {
    expect(getUpgradeTierLabel(0)).toBe("T1");
  });

  it("returns T2 for level 25", () => {
    expect(getUpgradeTierLabel(25)).toBe("T2");
  });
});

describe("getTierUnlockRequirement", () => {
  it("requires 0 for tier 1", () => {
    expect(getTierUnlockRequirement(1)).toBe(0);
  });

  it("requires 50,000 for tier 2", () => {
    expect(getTierUnlockRequirement(2)).toBe(50_000);
  });

  it("requires 250,000 for tier 3", () => {
    expect(getTierUnlockRequirement(3)).toBe(250_000);
  });
});

describe("getUpgradeCost", () => {
  it("returns at least 1", () => {
    expect(getUpgradeCost(0)).toBeGreaterThanOrEqual(1);
  });

  it("costs increase with level", () => {
    const cost0 = getUpgradeCost(0);
    const cost5 = getUpgradeCost(5);
    const cost10 = getUpgradeCost(10);
    expect(cost5).toBeGreaterThan(cost0);
    expect(cost10).toBeGreaterThan(cost5);
  });

  it("applies cost multiplier", () => {
    const base = getUpgradeCost(5);
    const doubled = getUpgradeCost(5, { costMultiplier: 2 });
    expect(doubled).toBeGreaterThan(base);
    expect(doubled).toBeLessThanOrEqual(base * 2 + 1);
  });

  it("applies meta discount", () => {
    const base = getUpgradeCost(10);
    const discounted = getUpgradeCost(10, { metaDiscount: 0.12 });
    expect(discounted).toBeLessThan(base);
  });

  it("caps discount at 50%", () => {
    const base = getUpgradeCost(10);
    const maxDiscount = getUpgradeCost(10, { metaDiscount: 0.8 });
    const halfDiscount = getUpgradeCost(10, { metaDiscount: 0.5 });
    expect(maxDiscount).toBe(halfDiscount);
  });

  it("handles negative levels", () => {
    expect(getUpgradeCost(-5)).toEqual(getUpgradeCost(0));
  });
});

describe("getUpgradeUnlockRequirement", () => {
  it("returns empty for autoCoder", () => {
    expect(getUpgradeUnlockRequirement("autoCoder")).toEqual({});
  });

  it("returns lifetime loc for aiPair", () => {
    expect(getUpgradeUnlockRequirement("aiPair")).toEqual({ lifetimeLoc: 500 });
  });

  it("returns both for ciPipeline", () => {
    expect(getUpgradeUnlockRequirement("ciPipeline")).toEqual({
      lifetimeLoc: 250_000,
      rebootCount: 1,
    });
  });
});
