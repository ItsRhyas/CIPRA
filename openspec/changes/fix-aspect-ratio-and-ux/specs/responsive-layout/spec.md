# Spec: responsive-layout

## Purpose

Layout behavior of the CIPRA frontend across mobile, tablet, and desktop breakpoints, ensuring controls remain usable at small viewport sizes and the preview/viewer relationship stays clear.

## Requirements

### Requirement: Breakpoint Layout

The frontend MUST render a layout that adapts to viewport width using three Tailwind breakpoints:
- Desktop (≥768px): two-column grid with preview/viewer on the left and parameter panel + actions on the right.
- Tablet (≥640px and <768px): single column with the parameter panel placed below the preview.
- Mobile (<640px): single stacked column with full-width controls.

The layout MUST NOT require horizontal scrolling on any supported viewport.

#### Scenario: desktop two-column grid

- GIVEN a viewport width of 1280px
- WHEN the main page renders
- THEN the preview/viewer appears in the left grid column and the parameter panel plus Convert action appear in the right grid column

#### Scenario: tablet single column

- GIVEN a viewport width of 700px
- WHEN the main page renders
- THEN the layout is a single column with the parameter panel stacked below the preview

#### Scenario: mobile stacked full-width

- GIVEN a viewport width of 375px
- THEN every control spans the full container width
- AND no horizontal scrollbar is present

### Requirement: Parameter Panel Placement

The `ParameterPanel` MUST appear adjacent to the Convert action button (not below the preview) so the user adjusts parameters and triggers conversion without scrolling past the preview.

#### Scenario: parameter panel near convert button

- GIVEN the page is rendered on a desktop viewport
- WHEN the user inspects the DOM order
- THEN the `ParameterPanel` and the Convert button share the same grid column and appear within the same visible region

#### Scenario: parameter panel reachable on mobile

- GIVEN the page is rendered on a mobile viewport
- WHEN the user scrolls past the preview
- THEN the parameter panel and the Convert button appear together immediately below the preview

### Requirement: Canvas Scaling

The preview canvas / `GCodeViewer` MUST scale its width to the container width while maintaining the work-area aspect ratio.

#### Scenario: canvas follows container width

- GIVEN a desktop viewport resized from 1024px to 800px
- WHEN the layout reflows
- THEN the canvas width shrinks proportionally with its container
- AND the canvas height adjusts to preserve the work-area aspect ratio