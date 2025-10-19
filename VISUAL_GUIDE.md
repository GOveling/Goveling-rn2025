# 🎯 Visual Guide - "Grupo" Feature Implementation

## 📱 What Users Will See

### BEFORE (Original)
```
┌─────────────────────────────────────┐
│  TRIP CARD                          │
├─────────────────────────────────────┤
│  🏕️ Mountain Adventure              │
│  Dec 1 - Dec 8                      │
│                                     │
│  Grupo ← STATIC TEXT (no interaction)
│  [Details] [Save]                   │
└─────────────────────────────────────┘
```

### AFTER (New ✨)
```
┌─────────────────────────────────────┐
│  TRIP CARD                          │
├─────────────────────────────────────┤
│  🏕️ Mountain Adventure              │
│  Dec 1 - Dec 8                      │
│                                     │
│  [Grupo] ← INTERACTIVE BUTTON! 💙
│  [Details] [Save]                   │
└─────────────────────────────────────┘
         ↓ TAP!
    ┌──────────────────────┐
    │MODAL SLIDES UP 📈     │
    └──────────────────────┘
```

---

## 🎬 User Interaction Flow

### Scenario 1: Solo Trip (1 person)
```
User opens trip card
         ↓
   See "Grupo" button
         ↓
   Button is GRAY
         ↓
   Button is DISABLED
         ↓
   Tapping does NOTHING
         ↓
   Message (implied): "Add collaborators to unlock"
```

### Scenario 2: Group Trip (2+ people) ✅
```
User opens trip card
         ↓
   See "Grupo" button
         ↓
   Button is BLUE/PURPLE
         ↓
   Button is ENABLED
         ↓
   User TAPS the button
         ↓
   ✨ MODAL SLIDES UP FROM BOTTOM ✨
         ↓
   Modal shows tabs & features
```

---

## 📲 Modal Interface

### Full Modal View
```
┌─────────────────────────────────────────┐
│                                         │
│  ╔═════════════════════════════════╗   │
│  ║ Opciones del Grupo        [✕]  ║   │ ← Header
│  ║ 4 participantes               ║   │
│  ╠═════════════════════════════════╣   │
│  ║ 💰 Gastos │ 🗳️ Decisiones    ║   │ ← Tabs
│  ╠═════════════════════════════════╣   │
│  ║                               ║   │
│  ║  ✨ Features in development  ║   │ ← Content
│  ║                               ║   │
│  ║  • Shared expense tracking    ║   │
│  ║  • Group voting system        ║   │
│  ║  • Balance calculator         ║   │
│  ║                               ║   │
│  ╚═════════════════════════════════╝   │
│                                         │
└─────────────────────────────────────────┘
     ↑ Tap outside or ✕ to close
```

### Tab 1: Gastos (Split Costs)
```
┌─────────────────────────────┐
│ 💰 Gastos │ Decisiones      │ ← Active tab (underline)
├─────────────────────────────┤
│                             │
│  🍕 Lunch at Restaurant     │ ← Expense 1
│  €45.00 paid by John        │
│  Split with: Mary, Paul     │
│  [Edit] [Delete]            │
│                             │
│  🚕 Taxi to airport         │ ← Expense 2
│  €32.50 paid by Mary        │
│  Split with: John, Paul     │
│  [Edit] [Delete]            │
│                             │
│  [+ Add Expense]            │ ← Action button
│                             │
│  BALANCE:                   │ ← Calculator
│  John: owes €15.00          │
│  Mary: is owed €5.00        │
│  Paul: owes €10.00          │
│                             │
└─────────────────────────────┘
```

### Tab 2: Decisiones (Decisions)
```
┌─────────────────────────────┐
│ Gastos │ 🗳️ Decisiones      │ ← Active tab (underline)
├─────────────────────────────┤
│                             │
│  Where to eat tomorrow?     │ ← Decision 1
│  ⭕ Pizza         (2 votes)  │
│  ⭕ Sushi         (1 vote)   │
│  ⭕ Tacos         (0 votes)  │
│  [Your vote: Pizza]         │
│                             │
│  When to check out?         │ ← Decision 2
│  ⭕ 10:00 AM      (2 votes)  │
│  ⭕ 11:00 AM      (1 vote)   │
│  [Your vote: 11:00 AM]      │
│                             │
│  [+ Create Decision]        │ ← Action button
│                             │
└─────────────────────────────┘
```

---

## 🔄 Data Flow Architecture

### Creating an Expense
```
User taps [+ Add Expense]
         ↓
   ExpenseForm modal opens
         ↓
   User fills form
   • Description: "Lunch"
   • Amount: €45.00
   • Paid by: Mary
   • Split with: John, Paul
         ↓
   User taps "Save"
         ↓
   useSupabaseTripExpenses.createExpense()
         ↓
   Supabase client.insert()
         ↓
   PostgreSQL database
         ↓
   RLS check: Is Mary a trip member? ✅
         ↓
   Data saved to trip_expenses table
         ↓
   Auto-trigger: Set updated_at timestamp
         ↓
   Real-time broadcast to all connected users
         ↓
   ExpensesTab re-renders
         ↓
   All users see: NEW EXPENSE! 💰
```

### Voting on a Decision
```
User sees decision
   "Where to eat?"
   ⭕ Pizza
   ⭕ Sushi (user hovers over)
         ↓
   User taps "Sushi"
         ↓
   useSupabaseTripDecisions.vote()
         ↓
   Supabase client.upsert()
         ↓
   PostgreSQL database
         ↓
   RLS check:
   • Is user in selected_participants? ✅
   • Is decision still open? ✅
         ↓
   Check UNIQUE constraint
   • Does user already have a vote? 
   • If YES: UPDATE vote
   • If NO: INSERT vote
         ↓
   Real-time broadcast to all connected users
         ↓
   DecisionsTab updates vote counts
         ↓
   All users see: VOTE CHANGED! 🗳️
```

---

## 📊 Database Schema Visualization

### trip_expenses Table
```
┌──────────────────────────────────────────────────────────────┐
│  trip_expenses                                               │
├──────────────────────────────────────────────────────────────┤
│  id (uuid)          │ a1b2c3d4-e5f6-7890-abcd-ef1234567890   │
│  trip_id (uuid)     │ xyz1234-xyz5678-xyz9012-xyz3456       │
│  description (text) │ "Lunch at restaurant"                  │
│  amount (numeric)   │ 45.50                                  │
│  paid_by (uuid[])   │ {user_mary, user_john}                │
│  split_between(...) │ {user_mary, user_john, user_paul}    │
│  created_by (uuid)  │ user_mary                             │
│  created_at (ts)    │ 2025-01-27 14:30:00                   │
│  updated_at (ts)    │ 2025-01-27 14:30:00                   │
└──────────────────────────────────────────────────────────────┘
```

### trip_decisions Table
```
┌──────────────────────────────────────────────────────────────┐
│  trip_decisions                                              │
├──────────────────────────────────────────────────────────────┤
│  id (uuid)                   │ a1b2c3d4-e5f6-...              │
│  trip_id (uuid)              │ xyz1234-xyz5678-...            │
│  title (text)                │ "Where to eat tomorrow?"        │
│  options (text[])            │ {Pizza, Sushi, Tacos}         │
│  status (text)               │ "open"                         │
│  selected_participants (...) │ {user_mary, user_john, ...}   │
│  created_by (uuid)           │ user_mary                      │
│  created_at (ts)             │ 2025-01-27 14:00:00            │
│  updated_at (ts)             │ 2025-01-27 14:00:00            │
└──────────────────────────────────────────────────────────────┘
```

### trip_decision_votes Table
```
┌──────────────────────────────────────────────────────────────┐
│  trip_decision_votes                                         │
├──────────────────────────────────────────────────────────────┤
│  id (uuid)       │ a1b2c3d4-e5f6-...                         │
│  decision_id ... │ (ref to trip_decisions)                   │
│  user_id (uuid)  │ user_john                                 │
│  option_index    │ 0  (Pizza - index 0 of options array)   │
│  created_at      │ 2025-01-27 14:05:00                      │
│  updated_at      │ 2025-01-27 14:05:00                      │
│                  │                                           │
│  CONSTRAINT:     │ UNIQUE(decision_id, user_id)            │
│                  │ ↓                                         │
│                  │ Only ONE vote per person per decision!   │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security: RLS (Row-Level Security)

### Example: View Expenses
```
User wants to see expenses for trip
         ↓
   SQL: SELECT * FROM trip_expenses 
        WHERE trip_id = '123'
         ↓
   RLS Policy checks:
   "Is this user a trip member?"
         ↓
   Check 1: Is user the trip owner?
   auth.uid() == trips.user_id
   ✅ YES → Show expenses
   ❌ NO → Check next
         ↓
   Check 2: Is user in trip_collaborators?
   user_id IN (SELECT * FROM trip_collaborators)
   ✅ YES → Show expenses
   ❌ NO → Access denied!
         ↓
   Result: ONLY trip members see the data
```

### Example: Edit Expense
```
User wants to edit an expense
         ↓
   SQL: UPDATE trip_expenses 
        SET amount = 50 
        WHERE id = 'exp1'
         ↓
   RLS Policy checks:
   "Is this the expense creator?"
         ↓
   created_by == auth.uid()?
   ✅ YES → Allow update
   ❌ NO → Access denied!
         ↓
   Result: Only the creator can edit
```

### Example: Vote
```
User wants to vote on a decision
         ↓
   SQL: INSERT INTO trip_decision_votes (...)
         ↓
   RLS Policy checks:
   1. Is decision still open? ✅
   2. Is user in selected_participants? ✅
         ↓
   DB Constraint checks:
   3. UNIQUE(decision_id, user_id)
      Does this (decision, user) combo exist?
      • If NO: Allow INSERT ✅
      • If YES: Reject (prevent duplicate) ❌
         ↓
   If allowed: INSERT vote
   If not: UPDATE existing vote (upsert)
         ↓
   Result: Each person votes once, vote can change
```

---

## 🎨 Component Tree with Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ App / Navigation                                        │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│ TripsScreen / TripsTab                                  │
└─────────────────────────────────────────────────────────┘
              ↓
    ┌─────────────────────────┐
    │ TripCard (rendered ×N)   │
    │ for each trip            │
    └─────────────────────────┘
         │
         ├─ state: showGroupModal
         ├─ state: showTripDetails
         └─ state: showEditForm
              │
              ├─ If trip.collaboratorsCount > 1:
              │  └─ Show interactive [Grupo] button
              │     └─ Tap → setShowGroupModal(true)
              │
              └─ Render:
                 ├─ TripDetailsModal (if showTripDetails)
                 ├─ EditTripForm (if showEditForm)
                 │
                 └─ GroupOptionsModal (if showGroupModal)
                    │
                    ├─ state: activeTab
                    ├─ state: allParticipants
                    │
                    └─ If activeTab === 'expenses':
                    │  └─ ExpensesTab (future)
                    │     ├─ hook: useSupabaseTripExpenses
                    │     ├─ shows: list of expenses
                    │     ├─ has: [+ Add Expense] button
                    │     └─ children: ExpenseCard ×N
                    │
                    └─ If activeTab === 'decisions':
                       └─ DecisionsTab (future)
                          ├─ hook: useSupabaseTripDecisions
                          ├─ shows: list of decisions
                          ├─ has: [+ Create Decision] button
                          └─ children: DecisionCard ×N
```

---

## 🚀 Deployment Steps (Visual)

```
STEP 1: PREPARE
┌─────────────────────────────────────┐
│ Code is already written             │
│ • GroupOptionsModal.tsx ✅          │
│ • useSupabaseTripExpenses.ts ✅     │
│ • useSupabaseTripDecisions.ts ✅    │
│ • TripCard updated ✅               │
│ • Migration SQL ready ✅            │
└─────────────────────────────────────┘
         ↓ (5 min)
STEP 2: DEPLOY DATABASE
┌─────────────────────────────────────┐
│ Go to Supabase SQL Editor           │
│ Copy migration file                 │
│ Execute query                       │
│ ✅ Tables created                   │
│ ✅ Policies activated               │
│ ✅ Triggers enabled                 │
└─────────────────────────────────────┘
         ↓ (2 min)
STEP 3: VERIFY DEPLOYMENT
┌─────────────────────────────────────┐
│ Check Supabase Dashboard            │
│ ✅ trip_expenses table visible      │
│ ✅ trip_decisions table visible     │
│ ✅ trip_decision_votes visible      │
│ ✅ RLS policies active              │
└─────────────────────────────────────┘
         ↓ (1 min)
STEP 4: TEST IN APP
┌─────────────────────────────────────┐
│ Open app in Expo                    │
│ Navigate to a group trip            │
│ Tap [Grupo] button                  │
│ ✅ Modal opens and slides up        │
│ ✅ Tabs work (click to switch)      │
│ ✅ Close button (X) works           │
│ ✅ No console errors                │
└─────────────────────────────────────┘
         ↓
      SUCCESS! 🎉
```

---

## 📈 Progress Timeline

```
HOUR 0:   Phase 1 - Database ✅ DONE
├─ Create SQL tables (trip_expenses, trip_decisions, votes)
├─ Write RLS policies (12 total)
├─ Add triggers (3 total)
└─ Create indexes (4 total)

HOUR 2:   Phase 2 - Hooks ✅ DONE
├─ useSupabaseTripExpenses hook
├─ useSupabaseTripDecisions hook
├─ Real-time subscriptions
└─ Error handling

HOUR 4:   Phase 3 - UI Shell ✅ DONE
├─ GroupOptionsModal component
├─ Tab interface
├─ TripCard integration
└─ Button logic

HOUR 5:   Database Deployment ⏳ NEXT
└─ Execute migration in Supabase

HOUR 6:   Phase 4 - Tab Components ⏳ TODO
├─ ExpensesTab component
├─ DecisionsTab component
├─ Sub-components (Card, Form)
└─ Features (balance, voting)

HOUR 10:  Full Feature Launch 🚀 ESTIMATED
└─ Everything working end-to-end!
```

---

## ✨ Final Architecture

```
FRONTEND LAYER (React Native)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TripCard
      ↓
   [Grupo Button]
      ↓
   GroupOptionsModal
      ├─ ExpensesTab (future)
      └─ DecisionsTab (future)

APPLICATION LAYER (React Hooks)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   useSupabaseTripExpenses
   useSupabaseTripDecisions
   useAuth

API LAYER (Supabase Client)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CRUD operations
   Real-time subscriptions
   User authentication

DATABASE LAYER (PostgreSQL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   trip_expenses
   trip_decisions
   trip_decision_votes
   (with RLS, triggers, indexes)
```

---

**Visual Guide Complete! Ready to deploy! 🎉**
