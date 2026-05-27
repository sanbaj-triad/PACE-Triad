# Drag-And-Drop Regional Org Chart UI

Successfully integrated native HTML5 visual hierarchy mapping into the `OrgChart` React component. 

## Features Implemented
- **Edit Hierarchy Mode (Admin Gated)**: Exclusively presented to authenticated Admins or personnel with explicit Financial privileges. Clicking the "Edit Hierarchy" button switches the OrgChart from a static view into interactive edit mode.
- **Dynamic CSS & Drag Ghosts**: Dragged nodes dynamically outline with dashed blue trails and ghosted opacities, displaying standard operating system move UI pointers.
- **Drop Processing**: Dropping an employee node instantly resolves the target element to execute a RESTful API HTTP `PUT` mutating the `manager_id` backend schema to precisely snap onto the visually targeted profile.
- **Anti-Cyclic Tree Parsing Enforcement**: Before any dropped HTTP mutation fires, an algorithmic parser rigorously checks if placing a user underneath the `targetNode` would result in an infinite loop hierarchy. If detected, it entirely blocks the HTTP mutation. 

> [!TIP]
> Dragging any user laterally onto the `Company Directory` mega-root node safely cascades their `manager_id` to `null`, instantly promoting them out of localized regions onto the top-deck Company Executive lateral hierarchy!
