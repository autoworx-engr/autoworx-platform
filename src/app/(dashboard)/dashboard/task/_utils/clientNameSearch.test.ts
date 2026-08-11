import { clientNameFilter, searchWords } from "./clientNameSearch";

describe("searchWords", () => {
  it.each([
    ["tammy", ["tammy"]],
    ["tammy c", ["tammy", "c"]],
    // Collapses padding and repeated spaces so the filter stays stable while
    // the user is still typing.
    ["  tammy   c  ", ["tammy", "c"]],
    ["", []],
    ["   ", []],
  ])("splits %j into words", (term, expected) => {
    expect(searchWords(term)).toEqual(expected);
  });
});

describe("clientNameFilter", () => {
  it("returns undefined for a blank term so the clause can be omitted", () => {
    expect(clientNameFilter("")).toBeUndefined();
    expect(clientNameFilter("   ")).toBeUndefined();
  });

  it("matches a single word against either name column", () => {
    expect(clientNameFilter("tammy")).toEqual({
      AND: [
        {
          OR: [
            { firstName: { contains: "tammy", mode: "insensitive" } },
            { lastName: { contains: "tammy", mode: "insensitive" } },
          ],
        },
      ],
    });
  });

  // The original bug: "tammy c" was matched as one string against firstName and
  // lastName separately, and no single column contains it, so search broke as
  // soon as the user typed past the first name.
  it("requires every word to match, letting words hit different columns", () => {
    expect(clientNameFilter("tammy c")).toEqual({
      AND: [
        {
          OR: [
            { firstName: { contains: "tammy", mode: "insensitive" } },
            { lastName: { contains: "tammy", mode: "insensitive" } },
          ],
        },
        {
          OR: [
            { firstName: { contains: "c", mode: "insensitive" } },
            { lastName: { contains: "c", mode: "insensitive" } },
          ],
        },
      ],
    });
  });

  it("handles names with more than two words", () => {
    const filter = clientNameFilter("mary jane watson");
    expect(filter?.AND).toHaveLength(3);
  });
});
