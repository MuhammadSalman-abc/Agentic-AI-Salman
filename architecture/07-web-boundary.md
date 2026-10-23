# 7. Web and Health-Page Boundary

## 7.1 Health page

The existing health page is operational information. Remove the current product/planning UI
from that page and leave one clear “Open Agentic AI” button that navigates to the dedicated
Agentic AI route. Do not put the chat, project management, planning tree, or generation state
on the health page. Health status content and operational diagnostics remain owned by the
health experience.

## 7.2 Dedicated planning experience

The new route owns the product UI. Its first version should contain:

- Project selection/creation and context.
- Chat transcript and requirement composer.
- Generation state with stage, elapsed/terminal status, retry-safe action, and cancellation.
- A plan navigation panel with expandable Feature → Story → Task levels.
- Requirement coverage, assumptions, open questions, warnings, and dependency/order details.
- Version history and actions for edit, compare, accept, and regenerate.

Selecting a Feature expands only its Stories; selecting a Story expands only its Tasks. Keep
the hierarchy keyboard accessible and expose expanded/collapsed state to assistive technology.
Do not render all Tasks as an unstructured flat list by default.

## 7.3 Web/API boundary

The web app consumes documented shared API types and calls the Express API using validated
`NEXT_PUBLIC_API_BASE_URL`. It never imports server implementation, Mongo models, LLM code,
or provider credentials. Run polling must be bounded and stop on terminal states or page
cleanup. Mutations use idempotency keys where required and surface stable API error messages.

UI implementation begins only after backend release gates in document 06 are met. Existing
web layout/style choices are not fixed by this backend architecture; visual design will be
specified separately within the web feature and the repository's UI composition rules.
