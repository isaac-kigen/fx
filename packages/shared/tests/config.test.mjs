import assert from "node:assert/strict";
import { SYMBOLS, TIMEFRAMES, STRATEGY_CONFIG } from "../src/index.js";

test("symbols and timeframes are locked", () => {
  assert.deepEqual(TIMEFRAMES, ["H1", "H4"]);
  assert.equal(SYMBOLS.length, 6);
  assert.ok(SYMBOLS.includes("EURUSD"));
  assert.ok(SYMBOLS.includes("AUDUSD"));
});

test("strategy config defaults", () => {
  assert.equal(STRATEGY_CONFIG.minRR, 2.5);
  assert.equal(STRATEGY_CONFIG.riskPerTrade, 0.005);
});
