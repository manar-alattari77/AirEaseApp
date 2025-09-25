# Firebase Cloud Functions Deployment Guide

## Prerequisites
1. Firebase CLI installed globally: `npm install -g firebase-tools`
2. Logged into Firebase: `firebase login`
3. Firebase project configured: `firebase use aireaseapp-78`

## Deployment Steps

### 1. Login to Firebase (if not already logged in)
```bash
firebase login
```

### 2. Set the Firebase Project
```bash
firebase use aireaseapp-78
```

### 3. Deploy Functions
```bash
firebase deploy --only functions
```

## Cloud Functions Created

### 1. `updateFlightStatuses` (Scheduled Function)
- **Trigger**: Runs every 2 minutes
- **Purpose**: Automatically updates flight statuses
- **Logic**:
  - `scheduled` → `delayed` (with random gate)
  - `delayed` → `departed` (with actual departure time)
  - `postponed` → keeps postponing (gate = "TBD")

### 2. `manualFlightUpdate` (HTTP Function)
- **Trigger**: HTTP request
- **Purpose**: Manual testing of flight updates
- **URL**: `https://us-central1-aireaseapp-78.cloudfunctions.net/manualFlightUpdate`

## Testing

### Test the Scheduled Function
1. Add a flight document in Firestore with `status: "scheduled"`
2. Wait 2 minutes for the function to run
3. Check that the status changed to `delayed` with a random gate

### Test the Manual Function
```bash
curl https://us-central1-aireaseapp-78.cloudfunctions.net/manualFlightUpdate
```

## Monitoring

View function logs:
```bash
firebase functions:log
```

View specific function logs:
```bash
firebase functions:log --only updateFlightStatuses
```
