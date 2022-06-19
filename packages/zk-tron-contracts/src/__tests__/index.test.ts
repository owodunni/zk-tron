import { contracts } from "..";

describe("index", () => {
  test("contracts", () => {
    expect(contracts()).toBe("World");
  });
});
