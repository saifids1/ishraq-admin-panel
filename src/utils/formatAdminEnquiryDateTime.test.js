import formatAdminEnquiryDateTime from "./formatAdminEnquiryDateTime";

describe("formatAdminEnquiryDateTime", () => {
  test("formats submitted timestamps as dd-mm-yyyy,hh:mm", () => {
    expect(
      formatAdminEnquiryDateTime(new Date(2026, 9, 23, 19, 7)),
    ).toBe("23-10-2026,07:07 PM");
  });

  test("uses midnight for date-only values", () => {
    expect(formatAdminEnquiryDateTime("2026-10-23")).toBe(
      "23-10-2026,12:00 AM",
    );
  });

  test("formats noon using 12-hour time", () => {
    expect(
      formatAdminEnquiryDateTime(new Date(2026, 9, 23, 12, 5)),
    ).toBe("23-10-2026,12:05 PM");
  });

  test("returns a dash for missing, invalid, and sentinel dates", () => {
    expect(formatAdminEnquiryDateTime(null)).toBe("-");
    expect(formatAdminEnquiryDateTime("not-a-date")).toBe("-");
    expect(formatAdminEnquiryDateTime("0001-01-01T00:00:00")).toBe("-");
  });
});
