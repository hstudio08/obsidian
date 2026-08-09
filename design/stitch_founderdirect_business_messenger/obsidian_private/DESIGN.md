---
name: Obsidian Private
colors:
  surface: '#fcf8f9'
  surface-dim: '#dcd9da'
  surface-bright: '#fcf8f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f4'
  surface-container: '#f0edee'
  surface-container-high: '#eae7e8'
  surface-container-highest: '#e4e2e3'
  on-surface: '#1b1b1c'
  on-surface-variant: '#45474c'
  inverse-surface: '#303031'
  inverse-on-surface: '#f3f0f1'
  outline: '#75777c'
  outline-variant: '#c5c6cc'
  surface-tint: '#575f6d'
  primary: '#040b16'
  on-primary: '#ffffff'
  primary-container: '#1a222e'
  on-primary-container: '#818998'
  inverse-primary: '#bfc7d7'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#130900'
  on-tertiary: '#ffffff'
  tertiary-container: '#2c1f0e'
  on-tertiary-container: '#9a856e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe3f3'
  primary-fixed-dim: '#bfc7d7'
  on-primary-fixed: '#141c28'
  on-primary-fixed-variant: '#3f4754'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#f7dec4'
  tertiary-fixed-dim: '#dac3a9'
  on-tertiary-fixed: '#261909'
  on-tertiary-fixed-variant: '#544430'
  background: '#fcf8f9'
  on-background: '#1b1b1c'
  surface-variant: '#e4e2e3'
typography:
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  message-text:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 1rem
  gutter: 1rem
  stack-sm: 0.5rem
  stack-md: 1rem
  message-gap: 0.25rem
  max-width-desktop: 1200px
---

## Brand & Style
The design system is anchored in the concept of **Discrete Authority**. It is built for high-stakes business communication where privacy and speed are the ultimate luxuries. The aesthetic is a blend of **High-End Minimalism** and **Corporate Modernism**, eschewing decorative flourishes in favor of precision and clarity.

The interface must evoke a sense of a "closed-door boardroom"—quiet, secure, and intentional. Every pixel serves a functional purpose, utilizing heavy whitespace to reduce cognitive load and emphasize the importance of the dialogue.

## Colors
The palette is centered on **Deep Slate Blue** for primary actions and brand presence, signaling stability and institutional trust. 

- **Primary:** Deep Slate (#1A222E) used for headers, primary buttons, and active states.
- **Secondary:** Muted Silver/Charcoal (#64748B) for metadata and secondary iconography.
- **Unread State:** A vibrant **Electric Blue** (#3B82F6) is reserved exclusively for unread indicators to ensure high glanceability without breaking the minimalist aesthetic.
- **Surfaces:** Use high-token neutrals. In light mode, surfaces use a pure white background with a subtle "Slate 50" border. In dark mode, surfaces are "Obsidian" (#0F1115).

## Typography
This design system utilizes **Geist** for its technical precision and neutral character, ensuring that business communication remains the focus. 

- **Restraint:** Headlines never exceed 24px to maintain a sophisticated, non-aggressive tone.
- **Clarity:** Message text is optimized at 15px with a generous 1.5x line-height to ensure long-form private memos remain legible.
- **Technical Detail:** **JetBrains Mono** is used sparingly for timestamps and metadata (e.g., "SENT," "ENCRYPTED") to reinforce the feeling of a secure, engineered platform.

## Layout & Spacing
The layout follows a **Mobile-First, Content-Centric** model. 

- **Messaging Grid:** In the chat view, a 16px horizontal margin is maintained. Message bubbles are aligned to a tight 4px vertical gap when from the same sender, and 12px when the sender changes.
- **Desktop Reflow:** On larger screens, the app utilizes a fixed three-pane layout (Navigation | Thread List | Active Chat). The active chat pane is centered with a max-width of 800px to keep line lengths readable.
- **Rhythm:** An 8px base grid is strictly followed for all padding and margins to ensure visual harmony.

## Elevation & Depth
Depth is communicated through **Tonal Layering** rather than shadows. 

- **Borders:** Use 1px solid borders with low contrast (e.g., `Slate-200` in light mode, `Slate-800` in dark mode).
- **Z-Axis:** Instead of shadows, elevated elements (like modals or drawers) use a slight background color shift or a high-blur backdrop filter (glassmorphism) with 0.8 opacity to maintain context of the layer beneath.
- **Interactive States:** Buttons do not "lift" on hover; instead, they undergo a subtle background color shift (e.g., from Slate-900 to Slate-800).

## Shapes
The shape language is **Structured and Professional**. 

- **Standard Radius:** 8px (`rounded-md`) is the default for input fields and smaller cards.
- **Large Radius:** 12px (`rounded-lg`) is reserved for message bubbles and main containers.
- **Avatars:** Avatars are strictly geometric (circles) containing initials. The background of avatars should be a deterministic generated color based on the user's ID, using a muted, professional palette (Deep Teal, Navy, Burgundy).

## Components
- **Message Bubbles:** Tailored for readability. Recipient bubbles use a light gray/obsidian background; sender bubbles use the Primary Slate. No directional "tails" on bubbles; use consistent 12px rounding on all corners.
- **Navigation:** A simplified bottom bar on mobile with two primary destinations: *Chats* and *Settings*. Use 24px stroke-based icons with 2px weight.
- **Inputs:** The message composer is a "borderless" style text area that expands vertically. A subtle 1px top border separates it from the chat history.
- **Chips:** Used for "Tags" or "Priority" indicators. These should be pill-shaped with the `label-caps` typography and a light background tint of the status color.
- **Transitions:** Use `ease-out` for all transforms. Transitions must be exactly 200ms for a "snappy" and high-performance feel. Only `opacity` and `translate-y` (for modals) are permitted.
- **Background Pattern:** Use a faint, low-opacity (2-5%) SVG dot grid pattern on the main background to add a tactile, "blueprint" quality to the workspace.