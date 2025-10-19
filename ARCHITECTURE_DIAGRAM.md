# 🏗️ Group Features Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE APP (React Native)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    TripCard Component                       │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  • Shows trip info with "Grupo" button                     │ │
│  │  • Button only active if collaborators > 1                 │ │
│  │  • Opens GroupOptionsModal on tap                          │ │
│  │  ✅ Component: src/components/TripCard.tsx                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            ↓                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │            GroupOptionsModal Component                      │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  • Slide-up modal with tabs                                │ │
│  │  • Header: "Opciones del Grupo" + count                    │ │
│  │  • Tab 1: 💰 Gastos (Expenses)                            │ │
│  │  • Tab 2: 🗳️ Decisiones (Decisions)                      │ │
│  │  ✅ Component: src/components/GroupOptionsModal.tsx        │ │
│  └────────────────────────────────────────────────────────────┘ │
│         ↙                                    ↘                    │
│  ┌───────────────────────┐          ┌──────────────────────┐   │
│  │  ExpensesTab (WIP)    │          │ DecisionsTab (WIP)   │   │
│  ├───────────────────────┤          ├──────────────────────┤   │
│  │ • List expenses       │          │ • List decisions     │   │
│  │ • Add expense btn     │          │ • Add decision btn   │   │
│  │ • Edit/Delete expense │          │ • Vote on decisions  │   │
│  │ • Show balance        │          │ • View results       │   │
│  └───────────────────────┘          └──────────────────────┘   │
│         ↓                                    ↓                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │            React Hooks (Custom)                            │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │                                                            │  │
│  │  useSupabaseTripExpenses            useSupabaseTripDecisions
│  │  ├─ fetchExpenses()                 ├─ fetchDecisions()     │
│  │  ├─ createExpense()                 ├─ createDecision()    │
│  │  ├─ updateExpense()                 ├─ updateDecision()    │
│  │  ├─ deleteExpense()                 ├─ deleteDecision()    │
│  │  └─ Real-time subscription          ├─ vote()              │
│  │                                      └─ Real-time subscription
│  │                                                            │  │
│  │  ✅ src/hooks/useSupabaseTripExpenses.ts                │  │
│  │  ✅ src/hooks/useSupabaseTripDecisions.ts               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            ↓                                      │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE (Backend)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  PostgreSQL Database                                             │
│  ├─ public.trip_expenses                                        │
│  │  ├─ id (uuid, pk)                                           │
│  │  ├─ trip_id (uuid, fk)                                      │
│  │  ├─ amount (numeric)                                        │
│  │  ├─ paid_by (uuid[])      ← Array of payers                │
│  │  ├─ split_between (uuid[]) ← Array of splitters            │
│  │  └─ created_by (uuid)                                       │
│  │                                                               │
│  ├─ public.trip_decisions                                       │
│  │  ├─ id (uuid, pk)                                           │
│  │  ├─ trip_id (uuid, fk)                                      │
│  │  ├─ title (text)                                            │
│  │  ├─ options (text[])      ← Voting options                 │
│  │  ├─ status (text)         ← 'open' or 'closed'            │
│  │  └─ selected_participants (uuid[])                          │
│  │                                                               │
│  └─ public.trip_decision_votes                                  │
│     ├─ id (uuid, pk)                                           │
│     ├─ decision_id (uuid, fk)                                  │
│     ├─ user_id (uuid, fk)                                      │
│     ├─ option_index (integer)                                  │
│     └─ UNIQUE(decision_id, user_id) ← One vote per person    │
│                                                               │
│  Real-time Subscriptions                                        │
│  ├─ supabase.channel('trip_expenses_${tripId}')               │
│  │  └─ Listens for INSERT, UPDATE, DELETE events             │
│  │                                                               │
│  └─ supabase.channel('trip_decisions_${tripId}')              │
│     └─ Listens for INSERT, UPDATE, DELETE events             │
│                                                               │
│  Row-Level Security (RLS)                                       │
│  ├─ trip_expenses                                              │
│  │  ├─ SELECT: Only trip members                              │
│  │  ├─ INSERT: Only trip members                              │
│  │  ├─ UPDATE: Only expense creator                           │
│  │  └─ DELETE: Only expense creator                           │
│  │                                                               │
│  ├─ trip_decisions                                             │
│  │  ├─ SELECT: Only trip members                              │
│  │  ├─ INSERT: Only trip members                              │
│  │  ├─ UPDATE: Only decision creator                          │
│  │  └─ DELETE: Only decision creator                          │
│  │                                                               │
│  └─ trip_decision_votes                                        │
│     ├─ SELECT: User can see their votes and public results    │
│     ├─ INSERT: Only on selected_participants list             │
│     ├─ UPDATE: Only your own votes                            │
│     └─ DELETE: Only your own votes                            │
│                                                                   │
│  Auto-update Triggers                                           │
│  ├─ update_trip_expenses_updated_at                            │
│  ├─ update_trip_decisions_updated_at                           │
│  └─ update_trip_decision_votes_updated_at                      │
│                                                                   │
│  Performance Indexes                                            │
│  ├─ idx_trip_expenses_trip_id                                 │
│  ├─ idx_trip_decisions_trip_id                                │
│  └─ idx_trip_decision_votes_decision_id                       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Creating an Expense
```
User Action
    ↓
[ExpenseForm Component]
    ↓
useSupabaseTripExpenses.createExpense()
    ↓
supabase.from('trip_expenses').insert({...})
    ↓
PostgreSQL: INSERT INTO trip_expenses
    ↓
RLS Check: Is user a trip member?
    ├─ YES ✅ → Accept insert
    └─ NO ❌ → Reject with error
    ↓
Auto-trigger: Set updated_at timestamp
    ↓
Real-time: supabase.channel() emits 'INSERT' event
    ↓
[All Connected Users] Receive real-time update
    ↓
ExpensesTab re-renders with new expense
```

### Voting on a Decision
```
User Action: Tap vote button
    ↓
[DecisionCard Component]
    ↓
useSupabaseTripDecisions.vote(decisionId, optionIndex)
    ↓
supabase.from('trip_decision_votes').upsert({...})
    ↓
PostgreSQL: INSERT OR UPDATE trip_decision_votes
    ↓
RLS Check:
    ├─ Is user in selected_participants? 
    ├─ Is decision still open?
    └─ Both ✅ → Accept
    
RLS Check: UNIQUE constraint
    ├─ If vote exists: UPDATE
    └─ If new: INSERT
    ↓
Auto-trigger: Set updated_at timestamp
    ↓
Real-time: supabase.channel() emits 'INSERT' or 'UPDATE' event
    ↓
DecisionsTab fetches updated decision with aggregated votes
    ↓
Vote counts and progress bars update
```

---

## Component Dependency Tree

```
TripCard
│
├── (State)
│   ├─ showGroupModal: boolean
│   └─ tripData: TripStats
│
└── GroupOptionsModal
    │
    ├── (Props)
    │   ├─ visible: boolean
    │   ├─ onClose: () => void
    │   └─ trip: TripData
    │
    ├── (State)
    │   ├─ activeTab: 'expenses' | 'decisions'
    │   └─ allParticipants: Collaborator[]
    │
    └── (Children - To be implemented)
        ├── ExpensesTab (when activeTab === 'expenses')
        │   └── Uses: useSupabaseTripExpenses hook
        │       ├── ExpenseCard (for each expense)
        │       └── ExpenseForm (create/edit modal)
        │
        └── DecisionsTab (when activeTab === 'decisions')
            └── Uses: useSupabaseTripDecisions hook
                ├── DecisionCard (for each decision)
                └── CreateDecisionModal (create new decision)
```

---

## Hook Data Structure

### useSupabaseTripExpenses
```typescript
Interface TripExpense {
  id: string;
  trip_id: string;
  description: string;
  amount: number;
  paid_by: string[];        // Array of user IDs
  split_between: string[];  // Array of user IDs
  created_by: string;
  created_at: string;
  updated_at: string;
}

Return {
  expenses: TripExpense[] | null;
  expensesLoading: boolean;
  createExpense: (expense: TripExpense) => Promise<void>;
  updateExpense: (id: string, updates: Partial<TripExpense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}
```

### useSupabaseTripDecisions
```typescript
Interface TripDecisionVote {
  id: string;
  decision_id: string;
  user_id: string;
  option_index: number;
  created_at: string;
}

Interface TripDecision {
  id: string;
  trip_id: string;
  title: string;
  description?: string;
  options: string[];           // Voting options
  end_date: string;
  status: 'open' | 'closed';
  selected_participants: string[];  // Who can vote
  created_by: string;
  created_at: string;
  updated_at: string;
  votes: TripDecisionVote[];    // Joined data
}

Return {
  decisions: TripDecision[] | null;
  decisionsLoading: boolean;
  createDecision: (decision: TripDecision) => Promise<void>;
  updateDecision: (id: string, updates: Partial<TripDecision>) => Promise<void>;
  deleteDecision: (id: string) => Promise<void>;
  vote: (decisionId: string, optionIndex: number) => Promise<void>;
}
```

---

## Security Model

### RLS Policy Example (trip_expenses)

```sql
-- SELECT policy: Users can see expenses from their trips
CREATE POLICY "Users can view trip expenses"
  ON public.trip_expenses
  FOR SELECT
  USING (
    trip_id IN (
      SELECT trips.id FROM public.trips
      WHERE trips.user_id = auth.uid()
      OR trips.id IN (
        SELECT tc.trip_id FROM public.trip_collaborators tc
        WHERE tc.user_id = auth.uid()
      )
    )
  );

-- INSERT policy: Trip members can create expenses
CREATE POLICY "Trip members can create expenses"
  ON public.trip_expenses
  FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT trips.id FROM public.trips
      WHERE trips.user_id = auth.uid()
      OR trips.id IN (
        SELECT tc.trip_id FROM public.trip_collaborators tc
        WHERE tc.user_id = auth.uid()
      )
    )
    AND created_by = auth.uid()
  );

-- UPDATE policy: Only expense creator can modify
CREATE POLICY "Users can update own expenses"
  ON public.trip_expenses
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- DELETE policy: Only expense creator can delete
CREATE POLICY "Users can delete own expenses"
  ON public.trip_expenses
  FOR DELETE
  USING (created_by = auth.uid());
```

---

## State Management Flow

```
┌─────────────────────────────────────────────┐
│    User Interaction (UI Event)              │
└────────────┬────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────┐
│    Component State Update (setState)        │
└────────────┬────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────┐
│    Hook Function Call                       │
│    (e.g., createExpense())                  │
└────────────┬────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────┐
│    Supabase Client Operation                │
│    (e.g., .insert(), .update())             │
└────────────┬────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────┐
│    PostgreSQL Database                      │
│    (RLS checks, triggers, constraints)      │
└────────────┬────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────┐
│    Real-time Channel Broadcast              │
│    (to all subscribed clients)              │
└────────────┬────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────┐
│    All Users Receive Update                 │
│    (via subscription callback)              │
└────────────┬────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────┐
│    Components Re-render with New Data       │
│    (React's automatic re-render)            │
└─────────────────────────────────────────────┘
```

---

## Integration Checklist

### Phase 1: Backend ✅ COMPLETE
- [x] SQL Migration created
- [x] Tables with constraints
- [x] RLS Policies
- [x] Triggers and indexes
- [x] Migration ready for execution

### Phase 2: Hooks ✅ COMPLETE
- [x] useSupabaseTripExpenses
- [x] useSupabaseTripDecisions
- [x] Real-time subscriptions
- [x] CRUD operations
- [x] Error handling

### Phase 3: UI Shell ✅ COMPLETE
- [x] GroupOptionsModal
- [x] Tab interface
- [x] TripCard integration
- [x] Button conditional rendering
- [x] Participant loading

### Phase 4: Tab Components ⏳ IN PROGRESS
- [ ] ExpensesTab component
- [ ] DecisionsTab component
- [ ] ExpenseCard component
- [ ] DecisionCard component
- [ ] ExpenseForm modal
- [ ] CreateDecisionModal

### Phase 5: Features ⏳ TODO
- [ ] Balance calculator
- [ ] Payment history
- [ ] Vote progress bars
- [ ] Animations
- [ ] Error boundaries

### Phase 6: Polish & Testing ⏳ TODO
- [ ] Mobile testing
- [ ] Accessibility
- [ ] Performance optimization
- [ ] User feedback/confirmation messages
- [ ] Documentation

---

**Architecture Status**: ✅ PHASE 3 COMPLETE
**Next**: Implement Tab Components (Phase 4)
