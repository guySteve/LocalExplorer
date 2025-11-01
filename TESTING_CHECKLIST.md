# Testing Checklist for LocalExplorer

This document outlines the manual testing required to verify all button clicks and features work correctly.

## Button Click Testing

### Header
- [ ] Settings button (⚙️) opens the Settings modal

### Primary Actions
- [ ] "📋 My Collection" button opens the Collection modal
- [ ] "🧭 Compass" button opens the Compass overlay

### Weather Widget
- [ ] "📊" (history) button displays year comparison
- [ ] "📅" (forecast) button opens 7-day forecast modal
- [ ] "↻" (refresh) button reloads weather data

### Settings Modal
- [ ] Theme dropdown changes theme when selected
- [ ] "Bird Sightings" toggle enables/disables bird facts
- [ ] "Voice Navigation" toggle enables/disables voice guidance
- [ ] Voice selection dropdown changes navigation voice
- [ ] Close button (×) closes the modal

### Compass Overlay
- [ ] Opens automatically requesting sensor permissions
- [ ] "🛰️ Activate Sensors" button (if needed) requests permissions
- [ ] Close button (×) closes the compass
- [ ] "🎙️ Start Voice Navigation" starts turn-by-turn guidance (if destination set)
- [ ] "🔇 Stop Navigation" stops voice guidance
- [ ] "⏭️ Next Step" advances to next navigation instruction

### Filter Grid
- [ ] Each category button triggers search (Events, Parks, etc.)
- [ ] Buttons have proper hover states

### Results Modal
- [ ] Close button (×) closes the modal
- [ ] Individual result items are clickable and open details

### Details Sheet
- [ ] "Get Directions" button opens Google Maps directions
- [ ] "Navigate with Compass" button opens compass to destination
- [ ] "Save to Collection" button saves the place
- [ ] Close button (×) closes the details

### Collection Modal
- [ ] Saved items display correctly
- [ ] Delete buttons remove items from collection
- [ ] Close button (×) closes the modal

### Forecast Modal
- [ ] Displays 7-day forecast correctly
- [ ] Close button (×) closes the modal

### SubMenu Modal
- [ ] Sub-category buttons trigger searches
- [ ] Close button (×) closes the modal

### Donate Modal
- [ ] External links work correctly
- [ ] Close button (×) closes the modal

## Feature Testing

### Weather Comparison
- [ ] "Compared to Last Year" section displays when history button clicked
- [ ] Shows correct date from last year
- [ ] Temperature comparison is accurate (hotter/colder/similar)
- [ ] Color indicators work (🔥 red for hotter, ❄️ blue for colder, 👍 neutral)
- [ ] Mobile layout stacks properly

### Compass Functionality
- [ ] Compass automatically requests sensor permissions when opened
- [ ] Compass dial rotates based on device orientation
- [ ] GPS location accuracy is displayed
- [ ] Speed is tracked and displayed
- [ ] Bearing to destination is calculated (if set)
- [ ] Voice navigation respects settings toggle

### Location Services
- [ ] Location permission is requested
- [ ] Current location is displayed
- [ ] Location updates when moving
- [ ] Reverse geocoding shows readable address

### Search and Discovery
- [ ] Unified search finds places correctly
- [ ] Category filters work for all types
- [ ] Results display with proper information
- [ ] Map markers appear for results

### Theme System
- [ ] All 23 themes can be selected
- [ ] Theme changes apply immediately
- [ ] Theme preference persists after page reload
- [ ] CSS custom properties update correctly

### PWA Features
- [ ] App can be installed
- [ ] App works offline (with service worker)
- [ ] App icon displays correctly
- [ ] Manifest is valid

## Responsive Design
- [ ] Desktop layout works properly (>768px)
- [ ] Tablet layout works properly (768px)
- [ ] Mobile layout works properly (<768px)
- [ ] Touch interactions work on mobile
- [ ] Buttons are appropriately sized for touch

## Error Handling
- [ ] Missing API keys show appropriate messages
- [ ] Network errors are handled gracefully
- [ ] Location permission denial is handled
- [ ] Sensor permission denial is handled
- [ ] Invalid searches return helpful messages

## Performance
- [ ] Page loads quickly
- [ ] Animations are smooth
- [ ] No console errors in normal operation
- [ ] Service worker caches properly
- [ ] Weather data caches for 10 minutes

## Accessibility
- [ ] All buttons have proper labels
- [ ] Keyboard navigation works
- [ ] Focus states are visible
- [ ] Screen reader compatibility (basic)

## Notes
- Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- Test on multiple devices (Desktop, Tablet, Mobile)
- Test with and without API keys configured
- Test in airplane mode for offline functionality
- Test with location services disabled
