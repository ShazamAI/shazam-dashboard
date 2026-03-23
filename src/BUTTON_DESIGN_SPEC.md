# Dashboard Button Design Specification

## 1. Component Standard: `AppButton` (`src/components/common/Button.vue`)

All interactive action buttons MUST use the `AppButton` component. Native `<button>` elements are only acceptable for specialized UI controls (toggles, pagination, tree navigation, tabs, dismiss icons, layout chrome).

### Props API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'ghost' \| 'success' \| 'warning' \| 'info'` | `'primary'` | Visual style |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `loading` | `boolean` | `false` | Shows spinner, disables interaction |
| `disabled` | `boolean` | `false` | Disables the button |
| `iconOnly` | `boolean` | `false` | Square padding for icon buttons |
| `as` | `'button' \| 'a'` | `'button'` | Rendered element |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML type attribute |
| `block` | `boolean` | `false` | Full-width button |

---

## 2. Variant Usage Guidelines

| Variant | Semantic Purpose | Example Actions |
|---------|-----------------|-----------------|
| **primary** | Main CTA, affirmative actions | Create, Save, Submit, Start, Resume |
| **secondary** | Auxiliary, non-critical actions | Cancel, Refresh, Switch, Expand/Collapse |
| **danger** | Destructive or stop actions | Delete, Reject, Stop |
| **ghost** | Minimal/tertiary, inline actions | Edit, Delete (inline table), Close |
| **success** | Positive confirmations | Approve |
| **warning** | Caution-required actions | Pause, Retry |
| **info** | Informational batch actions | Approve All |

### Color Tokens

| Variant | Background | Text | Hover | Focus Ring |
|---------|-----------|------|-------|------------|
| primary | `bg-shazam-500` | `text-gray-950` | `bg-shazam-400` | `ring-shazam-400` |
| secondary | `border-gray-700 bg-transparent` | `text-gray-300` | `bg-gray-800` | `ring-gray-500` |
| danger | `bg-red-600/20` | `text-red-300` | `bg-red-600/30` | `ring-red-500` |
| ghost | `bg-transparent` | `text-gray-400` | `bg-gray-800` | `ring-gray-500` |
| success | `bg-emerald-600/20` | `text-emerald-300` | `bg-emerald-600/30` | `ring-emerald-500` |
| warning | `bg-yellow-600/20` | `text-yellow-300` | `bg-yellow-600/30` | `ring-yellow-500` |
| info | `bg-purple-600/20` | `text-purple-300` | `bg-purple-600/30` | `ring-purple-500` |

---

## 3. Size Guidelines

| Size | Padding | Font | Use Case |
|------|---------|------|----------|
| `xs` | `px-2 py-1` | `text-[10px]` | Inline table actions (compact rows) |
| `sm` | `px-2.5 py-1.5` | `text-xs` | Card actions, secondary page actions, toolbar |
| `md` | `px-4 py-2` | `text-sm` | Page-level CTAs, form submit, modal actions |
| `lg` | `px-5 py-2.5` | `text-base` | Hero/empty state actions (rarely used) |

### Context Rules
- **Table inline actions (desktop):** `size="xs"`
- **Table inline actions (mobile cards):** `size="sm"`
- **Page header actions:** `size="sm"`
- **Form submit/cancel:** `size="md"` (default) or `size="sm"` for compact forms
- **Modal actions:** `size="md"` (default)
- **StatusBar actions:** `size="sm"` with icon + text
- **Empty state CTA:** `size="md"` (default)
- **Retry on error:** `size="md"` (default)

---

## 4. Behavioral Standards

### Loading States
- Use `:loading="isSubmitting"` for async operations
- Button text should change to reflect state: `'Saving...'`, `'Creating...'`, `'Approving...'`
- Truncated forms acceptable in compact contexts: `'...'`

### Disabled States
- Use `:disabled` for form validation (e.g., empty required fields)
- Use `:disabled` when another action on the same entity is in progress

### Accessibility
- Always include descriptive text or `title` attribute for compact buttons
- Form buttons must specify `type="submit"` or `type="button"` explicitly
- Icon-only buttons must have `aria-label`

---

## 5. Buttons That Should NOT Use AppButton

These are specialized UI controls where native `<button>` with Tailwind is appropriate:

| Control Type | Component | Reason |
|-------------|-----------|--------|
| Pagination prev/next/page | `Pagination.vue` | Custom grid layout, fixed sizing |
| Tab navigation | `ConfigPage.vue` | Active state highlight pattern |
| Toggle switches | `ConfigRalphTab.vue` | Custom toggle UI |
| Tree node toggle/select | `MemoryTreeNode.vue` | Tree-specific interaction |
| Dismiss/close icons | `ErrorBoundary.vue`, `ToastContainer.vue` | Minimal icon-only dismiss |
| Sidebar collapse | `SidebarNav.vue` | Layout chrome |
| Mobile hamburger | `TopHeader.vue` | Layout chrome |
| Entity links | `TaskTable.vue`, `RecentTasks.vue` | Inline text links with `entity-link` class |
| Filter stat cards | `TasksPage.vue` | Card-as-button pattern |
| Org chart nodes | `OrgTreeNode.vue` | Visual node selection (div) |
| Agent list items | `AgentList.vue` | List item interaction |

---

## 6. Current Inconsistencies Found

### Issue 1: CSS utility `btn-ghost` used instead of AppButton
- **File:** `TaskDetailPanel.vue` line 50
- **Current:** `<button class="btn-ghost ml-2 shrink-0 !p-1.5" @click="emit('close')">`
- **Fix:** Replace with `<AppButton variant="ghost" size="sm" icon-only @click="emit('close')">`

### Issue 2: Duplicate button system (CSS utilities + component)
- **File:** `src/styles/main.css` lines 47-77
- **Current:** `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`, `.btn-success`, `.btn-warning`, `.btn-info`, `.btn-xs`, `.btn-sm` CSS classes defined but only used in 1 place
- **Fix:** Remove all `.btn-*` CSS classes from `main.css` after fixing Issue 1. The AppButton component is the single source of truth.

### Issue 3: Modal close button in AgentsPage uses native button
- **File:** `AgentsPage.vue` line 164
- **Current:** `<button class="absolute right-4 top-4 text-gray-500 transition hover:text-white" @click="closeForm">`
- **Status:** Acceptable — this is a dismiss icon button, same pattern as ErrorBoundary/Toast. No change needed.

### Issue 4: Tool toggle buttons in AgentsPage use native button
- **File:** `AgentsPage.vue` line 227
- **Current:** Native `<button>` with inline conditional Tailwind classes for multi-select toggle
- **Status:** Acceptable — this is a multi-select chip pattern, not an action button.

---

## 7. Action Items

### Required Fixes (2 items)

| Priority | File | Action |
|----------|------|--------|
| **P1** | `TaskDetailPanel.vue:50` | Replace `btn-ghost` native button with `AppButton variant="ghost" icon-only` |
| **P1** | `src/styles/main.css:47-77` | Remove all `.btn-*` CSS utility classes (dead code after P1 fix above) |

### Already Standardized (no changes needed)

| File | Status |
|------|--------|
| `AgentsPage.vue` | ✅ All action buttons use AppButton |
| `TasksPage.vue` | ✅ All action buttons use AppButton |
| `ConfigPage.vue` | ✅ Retry button uses AppButton; tabs are native (correct) |
| `SessionsPage.vue` | ✅ Retry + Refresh use AppButton |
| `MemoryBrowserPage.vue` | ✅ Expand/Collapse use AppButton |
| `MetricsPage.vue` | ✅ No action buttons (display-only page) |
| `OrgChartPage.vue` | ✅ No action buttons |
| `DashboardPage.vue` | ✅ No direct buttons (delegates to child components) |
| `StatusBar.vue` | ✅ All 4 action buttons use AppButton |
| `EventFeed.vue` | ✅ Scroll-to-bottom uses AppButton |
| `TaskTable.vue` | ✅ All CRUD actions use AppButton (xs for desktop, sm for mobile) |
| `TaskDetailPanel.vue` | ✅ All CRUD actions use AppButton (except close — see Issue 1) |
| `TaskCreateForm.vue` | ✅ Cancel + Create use AppButton |
| `ConfigWorkspacesTab.vue` | ✅ Switch button uses AppButton |
| `ConfigPluginsTab.vue` | ✅ Reload button uses AppButton |
| `ConfigRalphTab.vue` | ✅ Save button uses AppButton |

---

## 8. Summary

- **Total files with buttons:** 21
- **Files using AppButton correctly:** 16
- **Files with native buttons (acceptable):** 9 (pagination, tabs, toggles, tree, layout, links)
- **Files needing fixes:** 1 (`TaskDetailPanel.vue`)
- **Dead CSS to remove:** 1 (`main.css` btn-* classes)
- **Button variants in use:** All 7 (primary, secondary, danger, ghost, success, warning, info)
- **Button sizes in use:** All 4 (xs, sm, md; lg available but unused)
