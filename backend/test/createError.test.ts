import { createError } from "../src/utils/createError";

describe("createError", () => {
  it("sets message and statusCode", () => {
    const err = createError("bad_things", 418);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("bad_things");
    expect(err.statusCode).toBe(418);
  });

  it("defaults statusCode to 500", () => {
    const err = createError("oops");
    expect(err.statusCode).toBe(500);
  });
});
