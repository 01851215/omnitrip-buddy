import Dexie, { type Table } from "dexie";
import type {
  User,
  Trip,
  Destination,
  ItineraryDay,
  Activity,
  Expense,
  CalendarEvent,
  TravelProfile,
  TripReflection,
  JournalEntry,
  Budget,
  DreamTrip,
} from "../types";

export class OmniTripDB extends Dexie {
  users!: Table<User, string>;
  trips!: Table<Trip, string>;
  destinations!: Table<Destination, string>;
  itineraryDays!: Table<ItineraryDay, string>;
  activities!: Table<Activity, string>;
  budgets!: Table<Budget, string>;
  expenses!: Table<Expense, string>;
  calendarEvents!: Table<CalendarEvent, string>;
  travelProfiles!: Table<TravelProfile, string>;
  tripReflections!: Table<TripReflection, string>;
  journalEntries!: Table<JournalEntry, string>;
  dreamTrips!: Table<DreamTrip, string>;

  constructor() {
    super("omnitrip");

    this.version(1).stores({
      users: "id, email",
      trips: "id, userId, status",
      destinations: "id, tripId",
      itineraryDays: "id, tripId, date",
      activities: "id, dayId, tripId, startTime",
      budgets: "tripId",
      expenses: "id, tripId, category, timestamp",
      calendarEvents: "id, tripId, startTime, type",
      travelProfiles: "userId",
      tripReflections: "tripId",
      journalEntries: "id, tripId, date",
      dreamTrips: "id, userId",
    });
  }
}

export const db = new OmniTripDB();
