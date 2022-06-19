import { core } from "..";

describe("index", () => {
  test("contracts", () => {
    expect(core()).toBe("Hello World");
  });
});
