import { evaluateFlag } from "../src/utils/evaluate";

describe("evaluateFlag", () => {
  test("boolean enabled", () => {
    expect(
      evaluateFlag({
        enabled: true,
        strategyType: "boolean",
        strategyConfig: {},
      })
    ).toBe(true);
    expect(
      evaluateFlag({
        enabled: false,
        strategyType: "boolean",
        strategyConfig: {},
      })
    ).toBe(false);
  });

  test("percentage requires userId", () => {
    expect(
      evaluateFlag({
        enabled: true,
        strategyType: "percentage",
        strategyConfig: { rolloutPercentage: 50 },
      })
    ).toBe(false);
  });

  test("targeting allow/deny", () => {
    expect(
      evaluateFlag({
        enabled: true,
        strategyType: "targeting",
        strategyConfig: { allow: ["u1"] },
        userId: "u1",
      })
    ).toBe(true);
    expect(
      evaluateFlag({
        enabled: true,
        strategyType: "targeting",
        strategyConfig: { deny: ["u2"] },
        userId: "u2",
      })
    ).toBe(false);
  });
});
