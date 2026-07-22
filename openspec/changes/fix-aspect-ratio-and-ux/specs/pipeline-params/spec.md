# Delta Spec: pipeline-params

## MODIFIED Requirements

### Requirement: Coordinate Scaling

The system MUST preserve image aspect ratio when mapping pixels to work-area millimeters by applying a single uniform `fit` factor to both X and Y, then MUST center the image inside the work area, and MUST finally apply the user-supplied `scale` parameter as a post-multiply on both axes.

`fit = min(work_area_w / image_w, work_area_h / image_h)`
`offset_x = (work_area_w - image_w * fit) / 2`
`offset_y = (work_area_h - image_h * fit) / 2`
`mm_x = (offset_x + px * fit) * scale`
`mm_y = (work_area_h - (offset_y + py * fit)) * scale`

The X and Y scale factors MUST be equal for any combination of image and work-area dimensions.

(Previously: independent `scale_x = work_area_w / image_w` and `scale_y = work_area_h / image_h`, which stretched images whose aspect ratio mismatched the work area.)

#### Scenario: square image on A4 work area

- GIVEN an image of 200x200 px and a 210x297 mm work area
- WHEN the pipeline emits coordinates
- THEN the X and Y scale factors are equal (no stretch)
- AND the image is centered with equal left/right and top/bottom letterbox margins

#### Scenario: landscape image on A4 work area

- GIVEN a 400x200 px image and a 210x297 mm work area
- WHEN the pipeline emits coordinates
- THEN fit is limited by the X axis
- AND top and bottom letterbox margins center the image vertically

#### Scenario: portrait image on A4 work area

- GIVEN a 200x400 px image and a 210x297 mm work area
- WHEN the pipeline emits coordinates
- THEN fit is limited by the Y axis
- AND left and right letterbox margins center the image horizontally

#### Scenario: image larger than work area fits inside

- GIVEN a 1000x1000 px image and a 210x297 mm work area
- WHEN the pipeline emits coordinates
- THEN fit < 1 and the scaled output fits entirely inside the work area
- AND no coordinate lies outside `[0, work_area_w] x [0, work_area_h]`

#### Scenario: scale still post-multiplies

- GIVEN `params.scale = 2.0`
- WHEN the pipeline emits coordinates
- THEN every fit-and-centered `(mm_x, mm_y)` is multiplied by 2.0 before formatting

#### Scenario: identical aspect ratio fills work area exactly

- GIVEN a 200x200 px image and a 100x100 mm work area
- WHEN the pipeline emits coordinates
- THEN fit = 0.5, offsets are zero, and output spans the entire work area with no letterbox