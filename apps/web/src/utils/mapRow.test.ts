import { describe, it, expect } from "vitest";
import { mapTrip, mapExpense, mapCalendarEvent, mapJournalEntry } from "./mapRow";

describe("mapTrip", () => {
  it("maps snake_case DB row to camelCase Trip", () => {
    const row = {
      id: "t1",
      user_id: "u1",
      title: "Bali",
      status: "active" as const,
      start_date: "2025-01-01",
      end_date: "2025-01-10",
      cover_image: "https://img.test/bali.jpg",
      description: "A trip",
      created_at: "2025-01-01T00:00:00Z",
    };
    const trip = mapTrip(row);
    expect(trip.userId).toBe("u1");
    expect(trip.startDate).toBe("2025-01-01");
    expect(trip.coverImage).toBe("https://img.test/bali.jpg");
    expect(trip.createdAt).toBeTypeOf("number");
  });
});

describe("mapExpense", () => {
  it("maps snake_case DB row to camelCase Expense", () => {
    const row = {
      id: "e1",
      trip_id: "t1",
      amount: 25,
      currency: "IDR",
      converted_amount: 1.58,
      category: "food",
      description: "Nasi goreng",
      location: "Ubud",
      timestamp: 1700000000000,
      buddy_suggested: false,
    };
    const expense = mapExpense(row);
    expect(expense.tripId).toBe("t1");
    expect(expense.convertedAmount).toBe(1.58);
    expect(expense.buddySuggested).toBe(false);
  });
});

describe("mapCalendarEvent", () => {
  it("defaults conflictsWith to empty array", () => {
    const row = {
      id: "c1",
      user_id: "u1",
      trip_id: null,
      source: "omnitrip",
      title: "Dinner",
      description: null,
      start_time: "2025-01-01T18:00:00",
      end_time: "2025-01-01T20:00:00",
      type: "personal",
      conflicts_with: [] as string[],
      buddy_resolution: null,
    };
    const event = mapCalendarEvent(row);
    expect(event.conflictsWith).toEqual([]);
    expect(event.startTime).toBe("2025-01-01T18:00:00");
  });
});

describe("mapJournalEntry", () => {
  it("maps optional fields to undefined when null", () => {
    const row = {
      id: "j1",
      trip_id: "t1",
      date: "2025-01-05",
      text: "Beautiful sunset",
      photo_url: null,
      location_name: null,
      buddy_badge: null,
    };
    const entry = mapJournalEntry(row);
    expect(entry.photoUrl).toBeUndefined();
    expect(entry.locationName).toBeUndefined();
    expect(entry.buddyBadge).toBeUndefined();
  });
});
