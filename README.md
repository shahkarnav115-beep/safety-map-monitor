AI Safety Map Monitor
Overview

AI Safety Map Monitor is a web-based prototype designed to explore real-time safety awareness using live geolocation data, dynamic geofencing, and AI-assisted reasoning. The system evaluates a user’s immediate surroundings and classifies areas into Safe, Moderate, or Danger zones, updating continuously as the user moves.

The project is implemented as a front-end–heavy MVP with Firebase-backed persistence and a Gemini-powered reasoning interface to explain safety classifications.

System Architecture

The application follows a client-driven architecture optimized for rapid prototyping:

Browser (HTML/CSS/JS)
  ├── Google Maps API (visualization, geofencing)
  ├── Geolocation API (live position tracking)
  ├── Local state (risk score, zone, context)
  ├── Gemini API (AI explanations)
  └── Firebase Firestore (emergency contacts)


Emergency notification logic is architected to be server-driven (via Firebase Cloud Functions) but may be simulated during demos.

Core Components
1. Location Tracking and Geofencing

Uses the browser Geolocation API with high-accuracy mode

Computes distance using the Haversine formula

Maintains a dynamic safety boundary around the user

Updates safety state on each location update

2. Safety Classification Engine

Classifies zones into Safe, Moderate, or Danger

Produces a normalized safety score

Designed to be extensible for additional signals such as AQI, time-based risk, and movement patterns

3. AI Reasoning Layer

Integrates Google Gemini via the Generative Language API

Provides natural-language explanations for safety classifications

Uses live contextual inputs (score, zone, time, user query)

Implemented as a conversational interface for transparency and interpretability

4. Emergency SOS Workflow

Manual SOS trigger via UI

Automatic trigger hooks designed for critical physical anomalies

Emergency contacts stored in Firebase Firestore

SMS delivery architecture supported via Firebase Cloud Functions

Data Flow

User location is obtained from the browser

Distance and zone classification are computed client-side

Safety score and risk level are persisted locally

Gemini receives contextual prompts for explanation

SOS workflow accesses contacts from Firestore when triggered

Technology Stack

Google Maps JavaScript API

Google Gemini Generative Language API

Firebase Firestore

Firebase Cloud Functions (architecture-ready)

HTML, CSS, JavaScript

Security and Privacy Considerations

No continuous background tracking outside active monitoring

No API keys committed to version control

Emergency contacts stored securely in Firestore

Client-side Gemini usage limited to MVP scope

Project Status

This project is a hackathon MVP and research prototype. Certain components, including risk models and emergency messaging, are simplified to demonstrate system design rather than full production readiness.

Future Work

Integration of environmental data sources (AQI, weather)

More robust risk scoring models

Backend enforcement and authentication

Expanded emergency communication channels

City-scale analytics dashboards

License

MIT License
