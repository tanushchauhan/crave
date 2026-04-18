# CRAVE — Design Screen Specifications

**Overview**
CRAVE consists of two apps: a consumer-facing React Native mobile app (dark-mode-first to match the sleek voice-agent demo aesthetic) and a Next.js B2B dashboard for partner restaurants (clean, data-dense product feel; light or dark theme left to design team discretion). The goal for the hackathon is to produce a highly polished, interactive demo targeting four specific tracks by highlighting our AI conversational voice agent, grouped context recommendation, receipt-based bill splitting, and rich B2B analytics/ad generation.

**How to read this doc**
Every screen below follows a strict structure. All copy and sample data provided (like restaurant names, prices, and user names) should be used as realistic starting points in your mockups. The design team has full creative liberty over the UI execution.

---

## Table of Contents

### 1. Mobile App Screens (Consumer)

- [CRAVE — Design Screen Specifications](#crave--design-screen-specifications)
  - [Table of Contents](#table-of-contents)
    - [1. Mobile App Screens (Consumer)](#1-mobile-app-screens-consumer)
    - [2. B2B Dashboard Screens (Restaurant)](#2-b2b-dashboard-screens-restaurant)
  - [1. Mobile App Screens (Consumer)](#1-mobile-app-screens-consumer-1)
    - [Phone-OTP Login \& Code Entry](#phone-otp-login--code-entry)
    - [Onboarding Cuisine Sweeps](#onboarding-cuisine-sweeps)
    - [Home / Voice-Agent Hub](#home--voice-agent-hub)
    - [Recommendations Result](#recommendations-result)
    - [Restaurant Detail (Partner vs. Non-Partner)](#restaurant-detail-partner-vs-non-partner)
    - [Booking Confirmation](#booking-confirmation)
    - [Group Creation \& Management](#group-creation--management)
    - [SMS-Invited Member Web Flow](#sms-invited-member-web-flow)
    - [Bill Split: Receipt Capture](#bill-split-receipt-capture)
    - [Bill Split: Item Assignment](#bill-split-item-assignment)
    - [Bill Split: Tip, Tax, \& Summary](#bill-split-tip-tax--summary)
    - [Bill Split: Confirmation \& Feedback](#bill-split-confirmation--feedback)
    - [Bookings History](#bookings-history)
    - [Settings](#settings)
    - [Stretch: Group Builder Playground](#stretch-group-builder-playground)
  - [2. B2B Dashboard Screens (Restaurant)](#2-b2b-dashboard-screens-restaurant-1)
    - [Restaurant Sign-In](#restaurant-sign-in)
    - [Dashboard Shell / Navigation](#dashboard-shell--navigation)
    - [Home ("Ask Crave!")](#home-ask-crave)
    - [Live Bookings Feed](#live-bookings-feed)
    - [Menu Performance](#menu-performance)
    - [Customer Insights (Personas)](#customer-insights-personas)
    - [Competitive View](#competitive-view)
    - [Ad Campaign Studio](#ad-campaign-studio)
    - [Trend Radar](#trend-radar)
    - [Dashboard Settings](#dashboard-settings)

### 2. B2B Dashboard Screens (Restaurant)

- [Restaurant Sign-In](#restaurant-sign-in)
- [Dashboard Shell / Navigation](#dashboard-shell--navigation)
- [Home ("Ask Crave!")](#home-ask-crave)
- [Live Bookings Feed](#live-bookings-feed)
- [Menu Performance](#menu-performance)
- [Customer Insights (Personas)](#customer-insights-personas)
- [Competitive View](#competitive-view)
- [Ad Campaign Studio](#ad-campaign-studio)
- [Trend Radar](#trend-radar)
- [Settings](#dashboard-settings)

---

## 1. Mobile App Screens (Consumer)

### Phone-OTP Login & Code Entry

**Purpose:** Authenticate the user quickly using their phone number, enabling SMS invites and group features.
**Entry points:** Opening the app unauthenticated.
**Exit points:** Onboarding (if new), Home (if returning).
**Layout regions:**

- Hero graphic/Logo: CRAVE branding.
- Input field: Formatted phone number input.
- CTA Button: "Send Code" / "Verify"
- Footer terms: standard terms of service text.
  **Sample data:** `(512) 555-0199`
  **States to design:** Default, Invalid Number, Loading (sending code), Code Entry view, Error (wrong code).
  **Key interactions / animations:** Smooth transition from phone input to 6-digit code entry view. Keyboard auto-focus.
  **Notes for designers:** Keep it minimal and visually striking to set the tone for the AI-heavy application.

### Onboarding Cuisine Sweeps

**Purpose:** Seed the user's initial preference vector through a quick, engaging Tinder-like swipe interaction.
**Entry points:** Successful OTP login (first-time users).
**Exit points:** Home / Voice-Agent Hub.
**Layout regions:**

- Progress indicator: e.g., 1 of 6.
- Main card: Large, high-quality image of food, title of cuisine/vibe.
- Action Buttons: Skip (X), Like (Heart) - though swiping is preferred.
  **Sample data:**
- Card 1: "Spicy & Searing" (Photo of Birria Tacos)
- Card 2: "Pasta & Wine" (Photo of Cacio e Pepe)
- Card 3: "Sushi Night" (Photo of Wagyu Tataki)
  **States to design:** Default, Swiping (left/right tilt).
  **Key interactions / animations:** Spring physics on the card swipe.
  **Notes for designers:** The images need to look incredibly appetizing to pull the user in.

### Home / Voice-Agent Hub

**Purpose:** The central interaction point for the consumer app, focused on the conversational voice agent.
**Entry points:** App launch (authenticated), returning from a booking or split.
**Exit points:** Recommendations Result, Bookings History, Settings, Group Creation.
**Layout regions:**

- Top bar: User avatar profile, active group selector ("Going out with the boys").
- Center stage: Large, pulsing ambient orb or microphone indicator representing the AI.
- Subtitle: Transcript overlay or prompt suggestion ("Tap to speak: 'Find us a spot for tonight'").
- Bottom sheet/nav: Quick access to upcoming reservations or past groups.
  **Sample data:** Group: "The Boys" (Avatars for Alex, Mike, Jordan). Prompt: "I'm going out with the boys tonight, looking for something casual around East Austin."
  **States to design:**
- Idle (pulsing slowly or resting)
- Listening (active wave or expanding orb)
- Thinking (spinning/processing animation)
- Speaking (reactive wave synced to audio)
- Permission-denied (microphone disabled error)
  **Key interactions / animations:** The AI orb/wave is the star of the show; it needs to feel alive and responsive. Transcript text should fade in smoothly if shown.
  **Notes for designers:** Decide if the transcript is persistent or only appears dynamically when talking.

### Recommendations Result

**Purpose:** Surface the top 3 recommended restaurants based on the user's prompt and group constraints.
**Entry points:** Voice-Agent Hub (after AI finishes processing).
**Exit points:** Restaurant Detail, Home (restart search).
**Layout regions:**

- Context Header: Summarized intent (e.g., "Casual night out in East Austin for 4").
- Recommendation Cards (Top 3):
  - Image carousel or hero image.
  - Restaurant Name, Cuisine, Price Tier, Rating.
  - AI reasoning snippet ("Why this works").
    **Sample data:**
- Rec 1: "Nixta Taqueria" · Mexican · $$ · "Great casual vibe, hits everyone's marks, and they have that mezcal margarita Sarah likes."
- Rec 2: "Kemuri Tatsu-ya" · Izakaya · $$$.
  **States to design:** Loading (skeleton cards while LLM re-ranks), Results, Empty/Error (if constraints are too strict).
  **Key interactions / animations:** Smooth slide-up of the cards once the AI finishes speaking.
  **Notes for designers:** AI reasoning should look distinct from standard Yelp-style reviews.

### Restaurant Detail (Partner vs. Non-Partner)

**Purpose:** Provide full details and facilitate booking. Showcases the two-sided network difference.
**Entry points:** Tapping a Recommendation Card or Search result.
**Exit points:** Booking Confirmation.
**Layout regions:**

- Hero Images: Edge-to-edge swipeable photos.
- Info Header: Name, Tags, Distance, Price.
- AI Context: "Why CRAVE picked this for your group."
- Meta details: Address (map snippet), Hours.
- Action Bar (Sticky at bottom):
  - _Partner Variant:_ "Book Table" button, selectable time slots.
  - _Non-Partner Variant:_ "Call to Book" button + Script Card ("Say: 'Hi, looking for a table for 4 at 7 PM for Alex'").
    **Sample data:** Nixta Taqueria (Partner) vs. Franklin Barbecue (Non-Partner). 123 East 12th St.
    **States to design:** Partner layout, Non-Partner layout with Script Card expanded.
    **Notes for designers:** No menu browsing here! Keep it focused on the recommendation and the booking action.

### Booking Confirmation

**Purpose:** Confirm the reservation and surface post-booking actions (sharing).
**Entry points:** Completing action on Restaurant Detail.
**Exit points:** Home.
**Layout regions:**

- Status graphic: Big checkmark or celebratory animation.
- Booking details: Restaurant name, Time, Party size.
- Context: "Shared with The Boys."
- Action Bar: "Back to Home", "View Receipts" (if past booking).
  **Sample data:** "Confirmed for tonight at 7:30 PM at Nixta Taqueria."
  **States to design:** Success Partner (auto-confirmed), Success Non-Partner (manual confirmation "We're going here!").

### Group Creation & Management

**Purpose:** Build a dining group by pulling from device contacts.
**Entry points:** Top bar on Home, or during prompt processing.
**Exit points:** Home.
**Layout regions:**

- Header: Group Name input.
- Contact List: Searchable list of device contacts with avatars.
- Selected members: Horizontal scroll of added members at the top.
- Action Button: "Create Group & Invite".
  **Sample data:** Group Name: "Date Night". Contacts: Sarah Rodriguez (CRAVE user logo), Mike Thompson (SMS).
  **States to design:** Empty, Search Active, Selected partial, Permission-denied (contacts).
  **Key interactions / animations:** Tapping a contact pops them into the selected row.
  **Notes for designers:** Differentiate between existing CRAVE users and those who will receive an SMS.

### SMS-Invited Member Web Flow

**Purpose:** Lightweight mobile web screen for non-users to join the group and provide basic preferences without downloading the app.
**Entry points:** Tapping SMS link.
**Exit points:** "You're in!" success screen.
**Layout regions:**

- Header: "Alex invited you to dinner."
- Input: Name field, dietary constraints checkboxes (Vegan, Gluten-Free).
- Action: "Join Group."
  **Sample data:** "Alex Chen invited you to join 'The Boys'."
  **States to design:** Form view, Success state.
  **Notes for designers:** Needs to feel incredibly fast and frictionless.

### Bill Split: Receipt Capture

**Purpose:** Camera view to snap the physical receipt.
**Entry points:** Tapping "Split the bill" on a past/current booking.
**Exit points:** OCR Processing.
**Layout regions:**

- Camera viewfinder (full screen).
- Framing overlay: Rectangular guide "Align receipt here".
- Shutter button.
- Flash toggle, Cancel.
  **States to design:** Camera active, Permission denied.
  **Notes for designers:** Ensure the framing guide hints at a long vertical receipt.

### Bill Split: Item Assignment

**Purpose:** The core interaction loop. Assign OCR-extracted line items to group members seamlessly.
**Entry points:** Successful receipt capture and OCR.
**Exit points:** Tip & Tax Summary.
**Layout regions:**

- Top Bar: Subtotal rolling counter ($0.00).
- Unassigned Items Area (Top/Middle): Draggable chips for each menu item.
- Group Members (Bottom row): Avatars acting as drop targets.
- Shared Bucket: A specific target for items everyone split.
  **Sample data:**
- Chips: "Wagyu Tataki · $18", "Al Pastor Tacos · $14", "Mezcal Marg · $12".
- Members: Alex, Sarah, Mike, Jordan.
  **States to design:** Default (items stacked), Dragging (item hovering over avatar with highlight), All Assigned (Show "Review Split" CTA).
  **Key interactions / animations:** Tactile haptic feedback on drop; items snapping satisfyingly into avatars; running totals updating instantly.
  **Notes for designers:** This is the most important UX innovation in the demo. Make the drag-and-drop look incredibly polished.

### Bill Split: Tip, Tax, & Summary

**Purpose:** Finalize the math before requesting money.
**Entry points:** All items assigned in previous step.
**Exit points:** Split Sent Confirmation / Feedback.
**Layout regions:**

- Breakdown list: Shows each user's assigned items and total.
- Control row: Tip slider (e.g., 15% - 25%).
- Tax row: Proportional tax amount displayed.
- Action Bar: "Send Venmo/CashApp Requests".
  **Sample data:** Subtotal: $128.40. Sarah owes $32.10 (Food) + $2.64 (Tax) + $6.42 (Tip) = $41.16.
  **States to design:** Default.
  **Notes for designers:** Decide if the tip slider is continuous or snaps to standard percentages. It should default to 20%.

### Bill Split: Confirmation & Feedback

**Purpose:** Piggyback on the payment success to capture ground-truth preference data.
**Entry points:** Sending the split.
**Exit points:** Home.
**Layout regions:**

- Top: Success confirmation (Checkmark + "Requests Sent!").
- Main Content: 1-3 swipe cards asking "How were these?" for items assigned to the active user.
- Actions: Swipe Right (Hit), Swipe Left (Miss). Skip text button.
  **Sample data:** Card shows "Mezcal Marg".
  **States to design:** Request sent animation leading directly into the feedback cards.
  **Key interactions / animations:** Payment success graphic transforms or slides away smoothly to reveal the swipe cards to avoid context-switching fatigue.

### Bookings History

**Purpose:** View past reservations (to trigger bill split or see history) and upcoming plans.
**Entry points:** Home (nav or bottom sheet).
**Exit points:** Bill Split, Home.
**Layout regions:**

- Segmented Control: "Upcoming" / "Past"
- List view of cards: Date, Restaurant, Group, Status (Confirmed, Split).
  **Sample data:** Past: "Yesterday, Nixta Taqueria, The Boys. Status: Bill Split."

### Settings

**Purpose:** Manage constraints and payment connections.
**Entry points:** Home Profile Avatar.
**Exit points:** Home.
**Layout regions:**

- Profile Section: Avatar, Phone, Name.
- Payment Setup: Venmo Handle input, CashApp handle input.
- Dietary preferences: Toggles (Vegetarian, Halal, Allergy text input).
- Logout button.

### Stretch: Group Builder Playground

**Purpose:** A flashy, purely visual group creation interaction (Apple-style orbit).
**Entry points:** Alternate entry from Home.
**Exit points:** Home (Group selected).
**Layout regions:**

- Center: Pulsing blur / AI node.
- Orbit: Floating bubbles representing contacts.
  **Key interactions / animations:** Tapping a bubble pulls it into the center orbit with fluid spring physics.

---

## 2. B2B Dashboard Screens (Restaurant)

### Restaurant Sign-In

**Purpose:** Secure entry for restaurant partners.
**Entry points:** Web root.
**Exit points:** Dashboard Home.
**Layout regions:**

- Branding: CRAVE B2B.
- Form: Email/Password.
- Demo helper: "Sign in with Demo Partner (Nixta Taqueria)".

### Dashboard Shell / Navigation

**Purpose:** Provide consistent framing and navigation for the web app.
**Entry points:** After sign-in.
**Layout regions:**

- Sidebar (recommended for data apps):
  - Brand Logo top left.
  - Links: Home, Live Bookings, Menu Performance, Customer Insights, Competitive View, Ad Studio, Trend Radar, Settings.
- Top Header: Restaurant Name ("Nixta Taqueria"), Current Status (Online), Notification bell.
  **Notes for designers:** Can be light or dark theme based on what makes the data easiest to read.

### Home ("Ask Crave!")

**Purpose:** Chat-forward landing page summarizing the business.
**Entry points:** Default post-login.
**Exit points:** Chat interactions, or deep links to side navigation.
**Layout regions:**

- Top Half (Chat/Search): Prominent search bar "Ask Crave anything about your restaurant..." OR large chat window with suggested prompts (e.g., "How did my pasta do this week?").
- KPI Strip: Today's Bookings (42), Average Party (3.2), Sentiment Score (94%).
- Split Bottom View:
  - Left Feed: Recent Bookings (minimal lines).
  - Right Feed: Recent Item Feedback ("Sarah 👍 Mezcal Marg").
    **States to design:** Default, Chat Active (with inline chart rendered in a chat bubble).
    **Notes for designers:** The chat interface needs to accommodate inline Recharts/visual graphs in its responses.

### Live Bookings Feed

**Purpose:** Real-time visibility into incoming CRAVE reservations.
**Entry points:** Sidebar navigation.
**Layout regions:**

- Header: Filter by Today, Upcoming, Custom.
- Main Table/List:
  - Time, Party Size, Context Tag ("With the boys", "Date night"), Source (App vs Phone), Dietary Notes.
    **Sample data:** 7:30 PM, Party of 4, "Date Night", Source: Crave App, Note: "1 Gluten Free".
    **States to design:** Empty, Populating (row highlights green when newly added).
    **Key interactions / animations:** New rows must animate in visually to emphasize the "Realtime" aspect for judges.

### Menu Performance

**Purpose:** Granular data on how items perform based on receipt feedback.
**Entry points:** Sidebar navigation.
**Layout regions:**

- Top KPI: Top rated item, most ordered.
- Data Table:
  - Column 1: Item Name.
  - Column 2: Impressions (seen in recommendations).
  - Column 3: Orders (verified via receipt).
  - Column 4: Sentiment (Thumbs Up / Down ratio bar).
  - Column 5: Trend Sparkline.
    **Sample data:** "Birria Tacos", 1240 views, 340 orders, 98% Positive.
    **States to design:** Default view, Expanded row (showing snippets of which segments liked it, e.g., "Popular with 'With the boys'").

### Customer Insights (Personas)

**Purpose:** Show restaurant owners who their diners are based on anonymized aggregated data.
**Entry points:** Sidebar navigation.
**Layout regions:**

- Grid of Persona Cards.
- Each Card: Visually distinct archetype.
  - Title: "The Tuesday Crew"
  - Data: Avg $35/head, Context: "With the boys". Top items ordered.
    **Sample data:** "Weekend Daters": Avg $85/head. Top Items: Wagyu Tataki, Wine.

### Competitive View

**Purpose:** Show cross-restaurant consideration graphs (who else they looked at).
**Entry points:** Sidebar navigation.
**Layout regions:**

- Main Visualization: Network graph, Venn diagram, or simple "Also Viewed" bar charts.
- Stats: "You won 42% of sessions against Kemuri Tatsu-ya."
  **Sample data:** Competitors: Kemuri Tatsu-ya, Suerte.
  **Notes for designers:** Keep the visualization clean and easy to read quickly on stage.

### Ad Campaign Studio

**Purpose:** Multimodal AI generation for Instagram/social ads.
**Entry points:** Sidebar navigation.
**Layout regions:**

- Left Panel (Workspace):
  - Prompt input: "Generate an ad for our new Mezcal Margarita."
  - Optional upload: Reference photo dropzone.
  - CTA: "Generate Campaign".
- Right Panel (Preview Output):
  - Carousel of 3 generated images mapped closely to Instagram feed UI.
  - Generated caption text box.
  - Target Hashtags.
  - "Generate Video Variant" button.
- Bottom Panel: Saved previous campaigns horizontal scroll.
  **States to design:** Empty, Generating (Loading skeletons/spinners), Results view.
  **Key interactions / animations:** The Instagram feed preview should look authentic to sell the generated asset's viability.

### Trend Radar

**Purpose:** City-wide anonymized trend data.
**Entry points:** Sidebar navigation.
**Layout regions:**

- Interactive Map or Bubble Chart of Austin.
- Highlights: "'Birria' is up 40% in search intent in East Austin."
  **Sample data:** Rising tags: "Natural Wine", "Patio".

### Dashboard Settings

**Purpose:** Manage restaurant profile and the vital partner toggle.
**Entry points:** Bottom of sidebar.
**Layout regions:**

- Profile details: Address, Operating hours.
- Demo Toggle: Large, obvious switch labeled "Enable CRAVE Partner Status (Accept instant in-app bookings)".
  **Notes for designers:** This is a key hackathon demo switch to show what happens when a restaurant goes from non-partner to partner. Make it prominent.
