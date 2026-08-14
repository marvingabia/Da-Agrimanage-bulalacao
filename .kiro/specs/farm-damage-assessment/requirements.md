# Requirements Document

## Introduction

This document defines the requirements for seven new feature modules added to **DA-AgriManage**, the Department of Agriculture farm management system used by admin, staff, farmer, and technician roles. The features are:

1. **AI-Powered Farm Damage Photo Assessment** — the system automatically identifies damage type and severity from uploaded/captured photos, without requiring manual input from the farmer.
2. **Land Title & Authorization Document Management** — farmers can attach a scanned xerox copy of their land title to their farm profile; tenants (nangungupahan) can also attach or generate an authorization letter from the land owner (may-ari ng lupa).
3. **Weather Condition Integration** — a weather widget on the dashboard shows current and forecast weather for the farmer's barangay, relevant to farm and damage reporting contexts.
4. **Real-time Damage Report Feed with Notifications** — the damage reports section updates in real-time across all roles without requiring a manual page refresh, and sends push notifications to relevant users when reports are submitted or updated.
5. **Benefits Announcement System** — admin/MAO can announce available government benefits to farmers after damage verification, and farmers receive notifications about benefits they qualify for.
6. **Technician Role and Field Inspection Assignment** — a new technician role allows on-site damage inspection, with assignment workflow and mobile-friendly inspection tools.
7. **Push Notification System** — real-time in-app notifications for damage report submissions, status updates, benefit announcements, and technician assignments.

The system is built on Node.js/Express with MySQL, uses the custom `.xian` (Handlebars-based) template engine, and supports four roles: `admin`, `staff`, `farmer`, and `technician`.

---

## Glossary

- **AI_Damage_Classifier**: The server-side AI/ML component (or third-party vision API integration) that analyzes a farm damage photo and returns a predicted damage type and severity score.
- **Damage_Report**: A record in the `damage_reports` MySQL table representing a farmer's submitted crop damage incident.
- **Land_Title_Document**: A scanned or photographed copy (xerox copy / Titulo) of the official land title for a farm plot, stored as a file attachment linked to the farmer's profile or damage report.
- **Authorization_Letter**: A document (generated or uploaded) from the land owner (may-ari ng lupa) authorizing a tenant farmer (nangungupahan) to transact on the land owner's behalf within the system.
- **Weather_Widget**: A UI component on the farmer/staff/admin dashboard that displays current and short-range forecast weather data for the farmer's registered barangay.
- **Weather_Service**: The external weather API (e.g., Open-Meteo or OpenWeatherMap) consumed by the backend to retrieve weather data.
- **Realtime_Feed**: The server-sent events (SSE) or polling mechanism that pushes new Damage_Report entries to connected clients without a full page reload.
- **SSE_Endpoint**: A `/api/damage-reports/stream` HTTP endpoint that keeps a long-lived connection open and pushes events when new reports arrive.
- **Farmer**: A registered user with role `farmer` in the `users` MySQL table.
- **Staff**: A registered user with role `staff`.
- **Admin**: A registered user with role `admin`.
- **Technician**: A registered user with role `technician` who is assigned to inspect damage reports on-site.
- **MAO**: Municipal Agriculture Office - refers to admin and staff users responsible for managing agricultural programs.
- **Benefits_Announcement**: A record linking approved damage reports to available government assistance programs (seed subsidy, fertilizer aid, cash assistance, etc.).
- **Dashboard**: The main authenticated view (`/dashboard`) rendered from `views/dashboard.xian`.
- **Barangay**: The smallest local government unit; farmers are registered to a specific barangay which is used for weather lookups and report filtering.
- **Push_Notification**: In-app notification sent to users in real-time when events occur (new damage report, status update, benefit announcement, technician assignment).

---

## Requirements

### Requirement 1: AI-Powered Farm Damage Photo Assessment

**User Story:** As a farmer, I want the system to automatically identify the type and severity of crop damage from a photo I upload or take, so that I do not have to manually guess and select the correct damage type.

#### Acceptance Criteria

1. WHEN a farmer uploads or captures a photo in the damage report form, THE System SHALL first validate that the image contains agricultural content (crops, plants, farm field) with at least 60% confidence BEFORE attempting damage analysis.

2. IF the uploaded image does not contain agricultural content (e.g., person's face, building, indoor scene), THE System SHALL reject the analysis and display an error message: "Hindi ko ma-identify ang damage dahil ang larawan ay hindi tanim o bukid. Mangyaring kumuha ng larawan ng inyong pananim."

3. WHEN a farmer uploads a photo, THE System SHALL extract or request GPS coordinates (latitude and longitude) from either the photo's EXIF metadata or the device's geolocation API.

4. IF GPS coordinates are provided, THE System SHALL validate that the coordinates are within 500 meters of the farmer's registered farm location stored in the database.

5. IF GPS coordinates are outside the farm boundary, THE System SHALL display a warning message but allow submission with a "Requires Staff Review" flag, and staff shall be notified to verify the location.

6. IF GPS coordinates are unavailable, THE System SHALL display a warning and allow manual submission, but the report shall be flagged for staff verification.

7. WHEN the image passes crop detection and location validation, THE AI_Damage_Classifier SHALL analyze the image and return:
   - **Crop Type** with 70% minimum confidence: Palay (Rice), Mais (Corn), Saging (Banana), Niyog (Coconut), Gulay (Vegetables), Prutas (Fruits), Root Crops, Legumes, or Other
   - **Damage Type**: Pest Infestation, Flood, Drought, Disease Outbreak, Typhoon, Fire, or Landslide
   - **Severity Score** between 0 and 100
   - All within 15 seconds of image submission

8. WHEN the AI_Damage_Classifier successfully identifies the crop type with ≥70% confidence, THE System SHALL automatically populate the `cropType` field in the damage report form.

9. IF the AI_Damage_Classifier identifies the crop type with <70% confidence, THE System SHALL display the detected crop type with a "(Not sure)" label and allow the farmer to manually select the correct crop type from a dropdown.

10. WHEN the AI_Damage_Classifier returns a prediction, THE System SHALL automatically populate the `disasterType`, `cropType`, and `damagePercentage` fields in the damage report form with the predicted values.

3. WHEN the AI_Damage_Classifier returns a prediction, THE System SHALL display the predicted **crop type** (e.g., "Palay", "Mais", "Saging"), **damage type** label, and **confidence percentages** for both crop and damage detection to the farmer in a clearly visible result panel before the form is submitted.

4. WHEN the farmer views the auto-filled fields, THE System SHALL allow the farmer to manually override the auto-filled `cropType`, `disasterType`, and `damagePercentage` values before final submission.

5. IF the AI_Damage_Classifier returns an error or fails to produce a prediction within 15 seconds, THEN THE System SHALL display an error message to the farmer and keep the `cropType`, `disasterType` and `damagePercentage` fields editable for manual entry.

6. IF the uploaded image file size exceeds 5 MB or is not a JPEG, PNG, or WEBP format, THEN THE System SHALL reject the file and display a descriptive validation error to the farmer before any analysis is attempted.

7. THE AI_Damage_Classifier SHALL accept only images uploaded through the authenticated farmer session; unauthenticated requests to the analysis endpoint SHALL be rejected with HTTP 401.

8. WHEN a damage photo is successfully analyzed, THE System SHALL store the uploaded image file path, GPS coordinates, and the AI prediction metadata (`predictedDamageType`, `predictedCropType`, `confidenceScore`, `isCropDetected`, `gpsValidated`) alongside the Damage_Report record in MySQL.

---

### Requirement 2: Land Title & Authorization Document Management

**User Story:** As a farmer (or tenant farmer), I want to upload a scanned copy of my land title and, if I am a tenant, attach or generate an authorization letter from the land owner, so that my damage report and insurance applications are supported with proper documentation.

#### Acceptance Criteria

1. WHEN a farmer accesses their profile or damage report form, THE System SHALL provide a file upload control that accepts PDF, JPEG, or PNG files up to 10 MB for attaching a Land_Title_Document.

2. WHEN a farmer successfully uploads a Land_Title_Document, THE System SHALL store the file in the server file system under a farmer-specific directory and persist the file path, upload timestamp, and uploader `farmerId` in a `land_title_documents` MySQL table.

3. WHEN a staff or admin user views a farmer's submitted damage report or profile, THE System SHALL display a link or thumbnail to the attached Land_Title_Document if one is present.

4. WHILE a farmer's account type is set to `tenant`, THE System SHALL display an Authorization Letter section in the damage report form offering two options: upload an existing authorization letter file, or generate a pre-filled authorization letter template.

5. WHEN a tenant farmer requests a generated Authorization_Letter, THE System SHALL produce a printable HTML document pre-filled with the farmer's name, barangay, land owner name (if provided), and current date, and THE System SHALL allow the farmer to download the document as a PDF.

6. WHEN a tenant farmer uploads an existing authorization letter file, THE System SHALL accept PDF, JPEG, or PNG files up to 10 MB, store the file, and link it to the farmer's record in the `authorization_letters` MySQL table.

7. IF a file upload for a Land_Title_Document or Authorization_Letter fails due to a server error, THEN THE System SHALL return a descriptive error message to the farmer and SHALL NOT partially save the record.

8. THE System SHALL restrict access to Land_Title_Document and Authorization_Letter files so that only the owning farmer, staff, and admin roles can retrieve the files; unauthenticated or unauthorized requests SHALL receive HTTP 403.

---

### Requirement 3: Weather Condition Integration

**User Story:** As a farmer (or staff/admin monitoring farmer areas), I want to see current and forecast weather conditions for the relevant barangay on my dashboard, so that I can make informed decisions about farm activities and correlate weather events with damage reports.

#### Acceptance Criteria

1. THE Weather_Widget SHALL be displayed on the Dashboard for all authenticated roles (farmer, staff, admin).

2. WHEN the Dashboard loads for a farmer, THE Weather_Widget SHALL fetch and display the current temperature (°C), weather condition description (e.g., "Partly Cloudy"), wind speed (km/h), and a 3-day forecast for the farmer's registered Barangay.

3. WHEN the Dashboard loads for a staff or admin user, THE Weather_Widget SHALL display weather data for the municipality or province covering all active barangays, or allow the user to select a specific barangay from a dropdown.

4. WHEN the Weather_Widget fetches data, THE System SHALL call the Weather_Service API from the server side (not directly from the browser) and cache the response for 30 minutes per barangay to avoid exceeding API rate limits.

5. IF the Weather_Service API returns an error or is unreachable, THEN THE System SHALL display a fallback message ("Weather data currently unavailable") in the Weather_Widget without breaking the rest of the Dashboard.

6. WHEN a farmer is filling in a damage report and selects an incident date, THE Weather_Widget SHALL highlight or annotate that date on the forecast panel with available historical or forecast weather data for that day to help contextualize the reported damage.

7. THE Weather_Widget SHALL refresh its data automatically every 30 minutes while the Dashboard page is open, without requiring a full page reload.

---

### Requirement 4: Real-time Damage Report Feed

**User Story:** As a staff or admin user, I want to see new damage reports appear in the damage report table the moment a farmer submits them, without having to manually refresh the page, so that I can respond to urgent situations as quickly as possible.

#### Acceptance Criteria

1. THE System SHALL expose an SSE_Endpoint (`GET /api/damage-reports/stream`) that authenticated staff and admin clients can connect to for real-time Damage_Report updates.

2. WHEN a farmer successfully submits a new Damage_Report, THE System SHALL broadcast a `new_damage_report` server-sent event containing the full report payload to all connected staff and admin SSE clients within 2 seconds of the database INSERT completing.

3. WHEN a farmer successfully submits a new Damage_Report, THE System SHALL send a push notification to all admin and MAO users with the message: "New damage report from [Farmer Name] in [Barangay] - [Damage Type]".

4. WHEN a staff or admin client receives a `new_damage_report` event, THE System SHALL prepend the new report row to the damage reports table in the UI without reloading the page, and SHALL increment the report count badge.

5. WHEN a staff user verifies or rejects a Damage_Report, THE System SHALL broadcast an `update_damage_report` server-sent event with the updated status to all connected clients so that the row status updates in real-time across all open sessions.

6. WHEN an admin or MAO user verifies or approves a Damage_Report, THE System SHALL send a push notification to the farmer who submitted the report with the message: "Your damage report has been [verified/approved] by [Admin Name]".

7. WHILE a staff or admin client is connected to the SSE_Endpoint, THE System SHALL send a `heartbeat` event every 30 seconds to keep the connection alive and detect dropped connections.

8. IF the SSE connection drops on the client side, THE System SHALL attempt to automatically reconnect using the browser's native EventSource reconnection with a retry interval of 5 seconds.

9. WHEN a farmer submits a damage report, THE System SHALL continue to show an optimistic UI row immediately in the farmer's own view, consistent with the existing behavior, independent of the SSE feed.

10. THE SSE_Endpoint SHALL reject connection requests from unauthenticated users and users with the `farmer` role with HTTP 401 and HTTP 403 respectively, as the real-time feed is intended for staff and admin monitoring only.

11. WHEN the damage reports section becomes visible in the dashboard (section tab activated), THE System SHALL perform a one-time data fetch to synchronize any reports submitted while the section was hidden, before SSE takes over for subsequent updates.

---

### Requirement 5: Benefits Announcement System

**User Story:** As an admin or MAO user, after verifying damage reports, I want to announce available government benefits and assistance programs to affected farmers, so that farmers are informed of support they can receive.

#### Acceptance Criteria

1. WHEN an admin or MAO user views a verified Damage_Report, THE System SHALL provide an "Announce Benefits" button or action in the damage report detail view.

2. WHEN the admin clicks "Announce Benefits", THE System SHALL display a form allowing the admin to select one or more benefit programs from a predefined list (e.g., "Seed Subsidy", "Fertilizer Assistance", "Cash Aid", "Crop Insurance Payout", "Calamity Loan").

3. WHEN the admin submits the benefits announcement, THE System SHALL create a Benefits_Announcement record linked to the Damage_Report and save it to the database with the admin's user ID, timestamp, and selected benefits.

4. WHEN a Benefits_Announcement is created, THE System SHALL send a push notification to the farmer who submitted the damage report with the message: "You are eligible for [Benefit Names]. Please visit the MAO office for assistance."

5. WHEN a farmer logs in to their dashboard, THE System SHALL display a "Benefits Announcements" section showing all benefit announcements related to their damage reports, sorted by date descending.

6. THE System SHALL allow farmers to mark benefits announcements as "Claimed" or "Acknowledged" after receiving the assistance.

7. THE System SHALL provide a report view for admin/MAO to track which farmers have claimed which benefits, for auditing and budget tracking purposes.

---

### Requirement 6: Technician Role and Field Assignment

**User Story:** As an admin or MAO user, I want to assign technicians to inspect damage reports on-site, and technicians should be able to update report status from the field, so that damage verification is more accurate and efficient.

#### Acceptance Criteria

1. THE System SHALL add a new user role called `technician` in addition to the existing `farmer`, `staff`, and `admin` roles.

2. WHEN a technician user logs in, THE System SHALL display a "Assigned Inspections" dashboard showing damage reports assigned to them, with status, location, and farmer contact information.

3. WHEN an admin or MAO user views a pending Damage_Report, THE System SHALL provide an "Assign Technician" button that opens a dropdown list of available technicians.

4. WHEN the admin assigns a technician to a damage report, THE System SHALL update the `assignedTechnicianId` field in the Damage_Report record and set the status to "assigned_for_inspection".

5. WHEN a technician is assigned to a damage report, THE System SHALL send a push notification to the technician with the message: "New inspection assigned: [Farmer Name] in [Barangay] - [Damage Type]. Tap to view details."

6. WHEN a technician views an assigned damage report, THE System SHALL display the farm location on a map with GPS directions, farmer contact number, and crop details.

7. WHILE a technician is on-site, THE System SHALL allow the technician to update the damage report with field notes, take additional photos, update the damage percentage estimate, and change the status to "inspection_completed".

8. WHEN a technician completes the inspection and submits the updated report, THE System SHALL send a push notification to the admin/MAO user who assigned the inspection with the message: "Inspection completed by [Technician Name] for [Farmer Name]'s damage report."

9. THE System SHALL track inspection history with timestamps and technician comments for each damage report for auditing purposes.

10. THE System SHALL restrict technicians from accessing benefit announcements, inventory management, and user management features, limiting their access to assigned inspections only.
