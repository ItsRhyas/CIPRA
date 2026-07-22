# auto-preview Specification

## Purpose

Show the selected image in the preview tab immediately on file selection, independent of the Convert action.

## Requirements

### Requirement: Immediate Image Preview

The system MUST render the selected image in the preview tab as soon as a file is selected or dropped, WITHOUT requiring a Convert action.

- GIVEN no file has been selected yet
- WHEN the user selects or drops an image file
- THEN the preview tab displays that image immediately
- AND no Convert request is triggered by the preview itself

#### Scenario: file changed replaces preview

- GIVEN the preview tab is showing image A
- WHEN the user selects a different image B
- THEN the preview updates to show image B

#### Scenario: file removed clears preview

- GIVEN the preview tab is showing an image
- WHEN the user clears or deselects the file
- THEN the preview tab shows no image

### Requirement: Object URL Lifecycle

The system MUST create an object URL via `URL.createObjectURL` for preview rendering and MUST revoke it on unmount or file change to prevent memory leaks.

- GIVEN an image is being previewed
- WHEN the component unmounts or the file changes
- THEN the previously created object URL is revoked via `URL.revokeObjectURL`

#### Scenario: rapid file changes leak no URLs

- GIVEN the user selects three images in quick succession
- WHEN each new object URL is created
- THEN all but the latest object URL are revoked
- AND only one active object URL remains