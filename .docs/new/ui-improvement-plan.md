# Nexus UI Improvement Plan

## Goal Description
Transform the current Nexus web application into a premium, modern, and highly engaging user experience. The goal is to elevate the aesthetics beyond a functional MVP by introducing polished interactions, cohesive theming, and modern design principles (glassmorphism, micro-animations, refined typography).

## Proposed Changes

### 1. Color Palette & Theming (globals.css)
- **Deep Slate Dark Mode:** Shift the dark mode background from a flat dark gray to a richer, deep slate/blue-gray tone (e.g., `oklch(0.18 0.015 260)`) to feel more premium.
- **Glassmorphism:** Apply glassmorphism selectively to overlays, dialogs, dropdowns, and floating panels. Avoid excessive blur on primary content areas. Implement `backdrop-blur-md` with translucent backgrounds (`bg-background/80`) on fixed elements like the `NavigationRail`, Global Headers, and modal overlays to create visual depth.
- **Performance Fallbacks:** Ensure glassmorphism effects degrade gracefully without causing rendering lag on older or low-power devices.

### 2. Modals and Overlays
- **Eradicate Native Dialogs:** Replace all browser-native `alert()` and `confirm()` dialogs with custom Shadcn `Dialog` and `AlertDialog` components.
- **Unified Transitions:** Ensure all modals use `animate-in fade-in zoom-in-95` for smooth appearances.
- **Mobile-Specific Interactions:** Transition to using slide-up "Bottom Sheets" instead of centered dialogs on mobile screens for better touch ergonomics.

### 3. Micro-animations and Interactions
- **Hover States:** Enhance button and list item hover states with `transition-all duration-200 ease-in-out` and subtle scaling (`hover:scale-[1.02]`).
- **Message Bubbles:**
  - Use professional message bubbles with moderate border radius.
  - Distinguish sent and received messages through subtle color differences.
  - Maintain consistent max-width constraints.
  - Improve spacing between message groups.
  - Preserve readability on both light and dark themes.
  - Add a subtle slide-up animation for incoming messages.
- **Active States:** Provide clear visual feedback when an item in the sidebar is active (e.g., using a vibrant primary left-border or distinct background).

### 4. Typography & Layout
- **Hierarchy:** Enforce strict typography hierarchy using **Geist** (preferred) or **Inter** as the primary application font, with tighter tracking for headings (`tracking-tight`) and relaxed line-heights for message readability.
- **Scrollbars:** Implement a custom, thin, rounded scrollbar across the application to replace the chunky default browser scrollbars.
- **Touch Targets:** Ensure all interactive elements meet minimum touch target size requirements (e.g., 44x44px) to optimize the mobile experience.

### 5. Accessibility (a11y) & States
- **Contrast Ratios:** Validate and enforce WCAG-compliant contrast ratios across the app, taking special care where translucent glassmorphism backgrounds are used.
- **Keyboard Navigation:** Implement clear, visually appealing `:focus-visible` states so the application remains fully accessible via keyboard.
- **Loading & Empty States:** Replace basic spinners with smooth **Skeleton Loaders** during data fetching, and introduce beautifully designed **Empty States** for scenarios like empty inboxes or zero workspaces.

### 6. Appearance Settings
- Create a dedicated Appearance section in Settings.
- Support:
  - Light Theme
  - Dark Theme
  - System Theme
- Add a color picker allowing users to customize the chat area background color.
- Persist preferences across sessions.
- Ensure message readability regardless of selected background color.
- Include a "Reset to Default" option.

### 7. Sidebar & Navigation
- Improve active workspace and channel indicators.
- Refine hover states.
- Add smoother expand/collapse animations.
- Improve spacing and alignment consistency.
- Ensure unread states are visually distinct.

### 8. Notification Dropdown
- Modern notification dropdown panel.
- Unread indicators and badges.
- Smooth open/close animations.
- Clear read/unread states.
- Mobile responsive behavior.

### 9. Design System Consistency
- Standardize spacing scale.
- Standardize border radius values.
- Standardize shadows.
- Standardize icon sizes.
- Standardize transition durations.

## Verification Plan
### Manual Verification
- Test all interactive elements (hover states, modal transitions) across desktop and mobile views.
- Ensure that the glassmorphism effects perform smoothly without lag, verifying on lower-end devices if possible.
- Verify that no native `alert()` or `confirm()` dialogs remain in the application flow.
- Run an accessibility audit to confirm contrast ratios and tab-based keyboard navigation functionality.
- Trigger empty and loading states to verify the skeleton loaders and empty state UI render as expected.
- Verify appearance settings persist and properly toggle between light, dark, and system themes.
- Ensure notification dropdown renders correctly and responds to mobile breakpoints.
