# copy-feedback Specification

## Purpose

Provide transient inline feedback on the GCode output Copy button so the user knows the copy action succeeded or failed.

## Requirements

### Requirement: Copy Success Feedback

The system MUST replace the Copy button label with "Copied!" for 1.5 seconds after a successful clipboard write, then revert the label to "Copy".

- GIVEN the GCodeOutput Copy button displays "Copy"
- WHEN the user clicks Copy and `navigator.clipboard.writeText()` resolves
- THEN the button label becomes "Copied!"
- AND after 1.5 seconds the label reverts to "Copy"

#### Scenario: copy failure feedback

- GIVEN the user clicks Copy
- WHEN `navigator.clipboard.writeText()` rejects
- THEN the button label becomes "Copy failed"
- AND after 1.5 seconds the label reverts to "Copy"

#### Scenario: rapid double-click cancels previous timeout

- GIVEN the user clicks Copy and the label briefly shows "Copied!"
- WHEN the user clicks Copy again before 1.5 seconds elapse
- THEN the pending revert timeout from the first click is cancelled
- AND a new feedback cycle begins for the second click