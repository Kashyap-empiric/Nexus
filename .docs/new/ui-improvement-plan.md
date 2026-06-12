# Nexus UI Improvement Plan

## Goal Description
Transform the current Nexus web application into a premium, modern, and highly engaging user experience. The goal is to elevate the aesthetics beyond a functional MVP by introducing polished interactions, cohesive theming, and modern design principles (glassmorphism, micro-animations, refined typography).

## Proposed Changes

### 1. Color Palette & Theming (globals.css)
- **Deep Slate Dark Mode:** Shift the dark mode background from a flat dark gray to a richer, deep slate/blue-gray tone (e.g., `oklch(0.18 0.015 260)`) to feel more premium.
- **Glassmorphism:** Implement `backdrop-blur-md` with translucent backgrounds (`bg-background/80`) on fixed elements like the `NavigationRail`, Global Headers, and modal overlays to create visual depth.

### 2. Modals and Overlays
- **Eradicate Native Dialogs:** Replace all browser-native `alert()` and `confirm()` dialogs with custom Shadcn `Dialog` and `AlertDialog` components.
- **Unified Transitions:** Ensure all modals use `animate-in fade-in zoom-in-95` for smooth appearances.

### 3. Micro-animations and Interactions
- **Hover States:** Enhance button and list item hover states with `transition-all duration-200 ease-in-out` and subtle scaling (`hover:scale-[1.02]`).
- **Message Bubbles:** Add a subtle slide-up animation for incoming messages.
- **Active States:** Provide clear visual feedback when an item in the sidebar is active (e.g., using a vibrant primary left-border or distinct background).

### 4. Typography & Layout
- **Hierarchy:** Enforce strict typography hierarchy using `Google Sans` with tighter tracking for headings (`tracking-tight`) and relaxed line-heights for message readability.
- **Scrollbars:** Implement a custom, thin, rounded scrollbar across the application to replace the chunky default browser scrollbars.

## Verification Plan
### Manual Verification
- Test all interactive elements (hover states, modal transitions) across desktop and mobile views.
- Ensure that the glassmorphism effects perform smoothly without lag.
- Verify that no native `alert()` or `confirm()` dialogs remain in the application flow.
