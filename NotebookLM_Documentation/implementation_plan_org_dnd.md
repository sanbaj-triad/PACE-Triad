# Goal Description

The objective is to introduce a seamless Drag-and-Drop capability to the Organization Chart, allowing Administrators to dynamically restructure personnel hierarchies visually without needing to jump to individual User Edit forms.

## User Review Required

> [!WARNING]
> Drag-and-Drop restructuring mutates the database directly. To prevent accidental reorganization, this feature will be hidden behind formal "Edit Mode" which must be explicitly toggled on by an Administrator (or user with Admin/Financial roles). Is there a specific logic condition you prefer for granting access to this UI feature instead of just matching standard admin roles?

## Proposed Changes

### Frontend Implementation

#### [MODIFY] [OrgChart.jsx](file:///c:/Apps/python/Invoice_Project_Lead/frontend/src/pages/OrgChart.jsx)
- **Role Validation**: Add conditional rendering logic (`user?.role === 'admin' || user?.has_financial_access`) to expose an "Edit Hierarchy" toggle button in the header.
- **State Logic**: 
  - `isEditMode`: Boolean to track if the chart is interactively receptive to drops.
  - `draggedNodeId`: React state (or DataTransfer payload) to track the Node actively being moved.
- **Event Listeners**: Map native HTML5 drag events onto the `<OrgNode />` wrapper:
  - `draggable={isEditMode}`
  - `onDragStart`: Captures identity of the dragged employee.
  - `onDragOver`: Enables drop-zone highlighting.
  - `onDrop`: Validates and captures the manager assignment.
- **Validation**: Implement an anti-cycle structural algorithm during the `onDrop` event to strictly forbid users from dragging a manager underneath one of their own direct/nested reports (which would create an infinite tree loop).
- **Network Operation**: If validation passes, emit an HTTP `PUT` request targeting `/users/<dragged_user_id>` with the updated `manager_id: target_user_id` payload.
- **Auto-Refresh**: Invoke the existing `fetchUsers()` trigger upon network success so the chart visibly shifts structure live.

## Open Questions

> [!IMPORTANT]
> If a user is dragged onto the "Company Directory" root node, should they be evaluated as having NO manager (i.e. becoming a top-tier Company Executive), passing `manager_id: null` to the database?

## Verification Plan

### Automated Tests
- Build and spin up the frontend Docker container to test JSX payload handling.

### Manual Verification
- We will manually authenticate as `Fthoresen`, enable "Edit Hierarchy", and attempt to drag an active user to a new manager.
- We will attempt (and fail) to drag a manager onto one of their own reports to verify cycle protections.
- We will attempt (and succeed) to drop a user onto the Company Directory root and verify they move to the executive tier.
