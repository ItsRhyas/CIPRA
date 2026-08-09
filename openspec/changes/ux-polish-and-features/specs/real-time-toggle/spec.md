# real-time-toggle Specification

## Purpose

Allow automatic re-conversion whenever parameters or the selected file change, with debounce and in-flight request cancellation to prevent stale results and wasted work.

## Requirements

### Requirement: Real-Time Toggle Component

The system MUST provide a toggle switch component built with custom CSS (no external dependencies), off by default, controlling auto-conversion behavior.

- GIVEN the application has loaded
- WHEN the user views ParameterPanel
- THEN the real-time toggle is visible and in the OFF position

#### Scenario: toggle state is ephemeral

- GIVEN the real-time toggle is ON
- WHEN the page is reloaded
- THEN the toggle returns to OFF and the state is not sent to the backend

### Requirement: Debounced Auto-Conversion

When the toggle is ON, any change to parameters OR the selected file MUST trigger an automatic conversion after a 500ms debounce. Each new change MUST reset the debounce timer so only the last change within 500ms triggers a conversion.

- GIVEN the real-time toggle is ON
- WHEN the user changes a slider
- THEN no conversion starts for 500ms
- AND a conversion starts using the latest parameter values

#### Scenario: rapid slider drag triggers single conversion

- GIVEN the toggle is ON
- WHEN the user drags a slider across many values within 500ms
- THEN only one conversion is triggered, using the final slider value

#### Scenario: toggle OFF disables auto-conversion

- GIVEN the real-time toggle is OFF
- WHEN the user changes a parameter
- THEN no automatic conversion is triggered and manual Convert is required

### Requirement: In-Flight Request Cancellation

The system MUST cancel any in-flight conversion request via AbortController when a new conversion starts, and MUST discard stale responses using a request ID counter.

- GIVEN a conversion request is in flight
- WHEN the user changes a parameter causing a new conversion to start
- THEN the previous request is aborted via AbortController
- AND if the previous request's response arrives after the new request's, it is discarded by mismatched request ID

### Requirement: Auto-Conversion Visual Indicator

While an auto-conversion is in flight, the system MUST show a subtle visual indicator (spinner or "Generating..." text).

- GIVEN the toggle is ON and a conversion is in flight
- WHEN the user views the UI
- THEN a spinner or "Generating..." indicator is visible until the response resolves