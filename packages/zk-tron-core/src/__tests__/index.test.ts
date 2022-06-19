import { core } from "..";

describe("index", () => {
  test("contracts", () => {
    expect(core()).toBe("Hello2 World2");
  });
});
