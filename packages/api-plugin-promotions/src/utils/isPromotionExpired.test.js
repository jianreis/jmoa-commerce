import isPromotionExpired from "./isPromotionExpired";

beforeAll(() => {
  jest.spyOn(Date, "now").mockImplementation(() => new Date(2022, 1, 1).getTime());
});

test("returns true if promotion is expired", () => {
  const currentTime = new Date(2018, 1, 1);
  const promotion = {
    endDate: new Date("2018-01-01")
  };
  expect(isPromotionExpired(currentTime, promotion)).toBe(true);
});

test("returns false if promotion is not expired", () => {
  const currentTime = new Date(2018, 1, 1);
  const promotion = {
    endDate: new Date("2022-02-01")
  };
  expect(isPromotionExpired(currentTime, promotion)).toBe(false);
});
