/**
 * Buddy tool definitions for OpenAI / Anthropic tool calling.
 *
 * These replace the fragile [ACTION:foo] regex-tag system with native
 * structured tool calls. The model picks a tool when it needs to trigger
 * an in-app action; plain text responses need no tool call.
 *
 * Tool format follows OpenAI function-calling JSON Schema.
 * The llm-proxy normalises Anthropic tool_use blocks to this same shape.
 */

import type { ToolDefinition } from "./llm";

export const buddyTools: ToolDefinition[] = [
  // ── Navigation / screen actions ───────────────────────────────────────────
  {
    name: "go_home",
    description: "Navigate the user to the home screen of the app.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "open_profile",
    description: "Open the user's profile and settings screen.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "show_journeys",
    description: "Show the user's travel footprints and past journeys screen.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "show_calendar",
    description: "Open the travel calendar to show upcoming bookings and events.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "check_budget",
    description: "Open the budget tracker to show the user their spending and remaining budget.",
    parameters: { type: "object", properties: {} },
  },

  // ── Planning / booking ────────────────────────────────────────────────────
  {
    name: "plan_trip",
    description: "Start the trip planning flow so the user can plan a new trip with AI-powered suggestions.",
    parameters: {
      type: "object",
      properties: {
        destination: {
          type: "string",
          description: "Optional destination the user mentioned, e.g. 'Tokyo' or 'Paris'.",
        },
      },
    },
  },
  {
    name: "find_hotels",
    description: "Open the hotel search / booking flow.",
    parameters: {
      type: "object",
      properties: {
        destination: { type: "string", description: "City or region to search hotels in." },
      },
    },
  },
  {
    name: "find_flights",
    description: "Open the flight search / booking flow.",
    parameters: {
      type: "object",
      properties: {
        destination: { type: "string", description: "Destination airport or city." },
        origin: { type: "string", description: "Departure airport or city." },
      },
    },
  },
  {
    name: "find_trains",
    description: "Open the train / rail search and booking flow.",
    parameters: {
      type: "object",
      properties: {
        destination: { type: "string", description: "Destination station or city." },
      },
    },
  },
  {
    name: "find_restaurants",
    description: "Search for restaurants matching the user's preferences near their current location or a specified place.",
    parameters: {
      type: "object",
      properties: {
        cuisine: { type: "string", description: "Optional cuisine type, e.g. 'Italian', 'sushi'." },
        location: { type: "string", description: "Optional location if different from current position." },
      },
    },
  },
  {
    name: "find_activities",
    description: "Find things to do, tours, or experiences near the user or at a destination.",
    parameters: {
      type: "object",
      properties: {
        category: { type: "string", description: "Optional activity category, e.g. 'museums', 'hiking'." },
        location: { type: "string", description: "Optional location if different from current position." },
      },
    },
  },

  // ── Nearby discovery ──────────────────────────────────────────────────────
  {
    name: "nearby_food",
    description: "Show food and drink options nearby the user's current location.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "nearby_things",
    description: "Show things to do and attractions near the user's current location.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "hidden_gems",
    description: "Show lesser-known, off-the-beaten-path places near the user.",
    parameters: { type: "object", properties: {} },
  },

  // ── Navigation / directions ───────────────────────────────────────────────
  {
    name: "navigate_to",
    description:
      "Show a route on the in-app map between two or more locations. " +
      "Use this when the user asks for directions or how to get somewhere. " +
      "Always include the user's current position as the first waypoint with label 'You'.",
    parameters: {
      type: "object",
      properties: {
        waypoints: {
          type: "array",
          description: "Ordered list of GPS waypoints for the route, minimum 2.",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Human-readable name for the waypoint." },
              lat:   { type: "number", description: "Latitude in decimal degrees." },
              lng:   { type: "number", description: "Longitude in decimal degrees." },
            },
            required: ["label", "lat", "lng"],
          },
          minItems: 2,
        },
      },
      required: ["waypoints"],
    },
  },
];
