# API Optimization Summary

This document outlines the API optimization improvements made to LocalExplorer to minimize API costs and improve performance.

## Optimizations Implemented

### 1. **Caching Strategy**

All API calls now implement intelligent caching to avoid redundant requests:

#### What3Words API
- **Cache Duration**: 1 hour
- **Cache Key**: Coordinates rounded to 4 decimals (~11m precision)
- **Max Cache Size**: 100 entries
- **Impact**: Prevents repeated calls for the same location when viewing place details

#### Foursquare Places API (v3 - New API)
- **Search Cache Duration**: 15 minutes
- **Details Cache Duration**: 1 hour
- **Cache Keys**: Location + query parameters / place ID
- **Max Cache Size**: 50 search results, 100 detail entries
- **Impact**: Reduces API calls when browsing nearby places

#### Ticketmaster Events API
- **Cache Duration**: 30 minutes
- **Cache Key**: Location + classification filter
- **Max Cache Size**: 20 entries
- **Impact**: Prevents repeated event searches for the same area

#### Recreation.gov API
- **Cache Duration**: 1 hour
- **Cache Key**: Location + radius
- **Max Cache Size**: 20 entries
- **Impact**: Caches recreation area searches

#### National Park Service API
- **Cache Duration**: 1 hour
- **Cache Keys**: Location + radius / park code for events
- **Max Cache Sizes**: 20 park searches, 50 event entries
- **Impact**: Reduces NPS API calls significantly

#### Weather API (Open-Meteo)
- **Cache Duration**: 15 minutes (existing)
- **Cache Key**: Location rounded to 3 decimals
- **Impact**: Already implemented, prevents excessive weather updates

### 2. **HolidayAPI Free Tier Handling**

The HolidayAPI free tier only provides historical data (previous year). Updated implementation:
- Queries previous year's data
- Maps holidays to current year for reference
- Provides disclaimers that dates may vary for non-fixed holidays
- Gracefully handles API limitations

### 3. **Maps API Key Management**

- **Client-Side Key**: Google Maps API key remains client-side (required by Google Maps JavaScript API)
- **Build-Time Injection**: Added build script to inject environment variable during Netlify deployment
- **Security**: Key should be restricted in Google Cloud Console to specific domains

### 4. **API Call Patterns**

APIs are only called when:
- User explicitly requests data (events, places, parks)
- Cache has expired
- Location changes significantly
- User manually refreshes data

### 5. **Foursquare Places New API**

Confirmed the app is using Foursquare Places API v3, which is the current "Places New API":
- Endpoint: `https://api.foursquare.com/v3/`
- Using modern `places/search` and `places/{fsq_id}` endpoints
- No migration needed

## API Cost Reduction Estimates

Based on typical user behavior:

| API | Before Optimization | After Optimization | Reduction |
|-----|-------------------|-------------------|-----------|
| What3Words | ~5 calls/session | ~1-2 calls/session | 60-80% |
| Foursquare Search | ~10 calls/session | ~3-4 calls/session | 60-70% |
| Foursquare Details | ~8 calls/session | ~2-3 calls/session | 60-75% |
| Ticketmaster | ~3 calls/session | ~1-2 calls/session | 33-50% |
| Recreation.gov | ~2 calls/session | ~1 call/session | 50% |
| NPS | ~2 calls/session | ~1 call/session | 50% |

**Overall estimated API cost reduction: 50-70%**

## Deployment Notes

### Environment Variables Required

Set these in Netlify Environment Variables:
- `MAPS_API_KEY` - Google Maps (injected at build time into client code)
- `TICKETMASTER_API_KEY` - Ticketmaster Discovery API
- `WHAT3WORDS_API_KEY` - What3Words Geocoding API
- `FOURSQUARE_API_KEY` - Foursquare Places API v3
- `EBIRD_API_KEY` - eBird API
- `RECREATION_GOV_API_KEY` - Recreation.gov API
- `NPS_API_KEY` - National Park Service API
- `HOLIDAY_API_KEY` - HolidayAPI (free tier - historical data only)

### Build Process

The build command now runs `netlify/inject-env.js` to inject the Maps API key into the client code during deployment.

## Testing

To verify optimizations:
1. Open browser DevTools → Network tab
2. Browse the app and note API calls
3. Navigate back to same locations - should see console logs showing cached results
4. Verify no duplicate API calls for same data within cache duration

## Future Improvements

Potential additional optimizations:
- Implement request deduplication for concurrent identical requests
- Add Service Worker caching for offline support
- Implement background refresh for critical data
- Add cache warming for frequently accessed locations
