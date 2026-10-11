# SIMS Design System: 1b "Green as brand"

Colors and typography only.

## Colors: light mode

### Brand
| Token | Hex | Use |
|---|---|---|
| brand | `#1C3B32` | Sidebar, portal header, primary buttons, page titles |
| brand-hover | `#2A4D42` | Hover on dark brand surfaces |
| accent | `#2E5E4E` | Active nav item, highlight card, links, focus ring |
| tint | `#E6EFEB` | Secondary buttons, table headers, selected chips |
| tint-hover | `#D6E6DE` | Hover on tint surfaces |
| tint-border | `#A9C9BB` | Chip borders, secondary chart bars |

### On brand (text on dark green)
| Token | Hex | Use |
|---|---|---|
| on-brand | `#FFFFFF` | Primary text |
| on-brand-muted | `#DCEBE4` | Nav items, secondary text |
| on-brand-subtle | `#C9DDD5` | Captions, labels |
| on-brand-label | `#A9C9BB` | Nav group headings |
| brand-divider | `#33574B` | Dividers on brand surfaces |

### Neutrals
| Token | Hex | Use |
|---|---|---|
| canvas | `#F3F6F5` | App background, search fields |
| surface | `#FFFFFF` | Cards, panels, dialogs |
| surface-hover | `#F8FAF9` | Table row hover |
| border | `#D8E0DD` | Card and panel borders |
| border-subtle | `#EDF1F3` | Row dividers |
| border-input | `#C5CED5` | Input and select borders |
| ink | `#16212B` | Primary text |
| ink-secondary | `#36434E` | Secondary text |
| ink-muted | `#4B5966` | Captions, helper text |

### Status
| Status | Background | Text |
|---|---|---|
| Success | `#E3F1EA` | `#1E4D3E` |
| Warning | `#FBF1DC` | `#6B4A00` (banner text `#4A3300`, border `#EBD3A0`) |
| Error | `#FBE7E7` | `#8A1C1C` (banner text `#6E1515`, border `#EBBDBD`) |
| Neutral | `#E8ECEF` | `#36434E` |

Error red `#8A1C1C` is also used for destructive buttons and field error borders.

## Colors: dark mode
| Token | Hex |
|---|---|
| brand | `#0A1F19` |
| accent | `#8FD0B4` |
| tint | `#183229` |
| canvas | `#0D1714` |
| surface | `#14211D` |
| ink | `#E4EDE9` |

## Typography

### Families
- **Inter** (400, 500, 600, 700): all text, including student numbers, IDs and course codes (tabular figures for alignment).

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Scale
| Role | Size / weight | Notes |
|---|---|---|
| Page title | 26–28px / 700 | Letter-spacing −0.01em, color `brand` |
| Key figure | 28–30px / 700 | Dashboard numbers |
| Section heading | 18px / 600 | |
| Card heading | 16px / 600 | |
| Body | 14px / 400 | Line-height 1.5 |
| Label | 13–13.5px / 600 | Form labels |
| Caption | 12.5px / 400 | Color `ink-muted` |
| Table header | 12px / 600 | Uppercase, letter-spacing 0.04em |
| Mono ID | 13px / 400 | Inter, tabular figures |
