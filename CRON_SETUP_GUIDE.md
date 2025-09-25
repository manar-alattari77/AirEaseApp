# Free Flight Update System Setup Guide

## 🎯 Overview
This guide sets up automatic flight status updates using cron-job.org as a free alternative to Firebase scheduled functions.

## 📋 Prerequisites
- Firebase project with Firestore "flights" collection
- Either Firebase Blaze plan OR Vercel account (free)

## 🚀 Option 1: Firebase Functions (Requires Blaze Plan)

### Step 1: Upgrade to Blaze Plan
1. Go to [Firebase Console](https://console.firebase.google.com/project/aireaseapp-78/usage/details)
2. Upgrade to Blaze (pay-as-you-go) plan
3. Set up billing (you can set spending limits)

### Step 2: Deploy Function
```bash
firebase deploy --only functions
```

### Step 3: Get Function URL
Your function URL will be:
```
https://us-central1-aireaseapp-78.cloudfunctions.net/manualFlightUpdate
```

## 🆓 Option 2: Vercel (Free Alternative)

### Step 1: Deploy to Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Go to `vercel-alternative` directory
3. Run: `vercel --prod`
4. Set environment variables in Vercel dashboard:
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

### Step 2: Get Vercel URL
Your function URL will be:
```
https://your-project.vercel.app/api/flight-update
```

## ⏰ cron-job.org Setup

### Step 1: Create Account
1. Go to [cron-job.org](https://cron-job.org)
2. Sign up for free account
3. Verify email

### Step 2: Create Cron Job
1. Click "Create cronjob"
2. Fill in the form:

```
Title: Flight Status Updates
URL: [Your function URL from above]
Method: GET
Schedule: */2 * * * *    (every 2 minutes)
Timezone: [Your timezone]
```

### Step 3: Advanced Settings
```
Timeout: 30 seconds
User Agent: cron-job.org/1.0
Retry on failure: 3 times
```

### Step 4: Save and Activate
1. Click "Create cronjob"
2. Toggle the job to "Active"
3. Monitor the "Last execution" column

## 🧪 Testing Steps

### Step 1: Add Test Flight
1. Go to [Firestore Console](https://console.firebase.google.com/project/aireaseapp-78/firestore)
2. Navigate to "flights" collection
3. Add a new document with ID: `TEST-2025-09-20`
4. Set these fields:

```json
{
  "flightNumber": "TEST",
  "date": "2025-09-20",
  "status": "scheduled",
  "gate": "A1",
  "terminal": "T1",
  "scheduledDeparture": "2025-09-20T14:30:00Z",
  "actualDeparture": null,
  "updatedAt": 1695123456789
}
```

### Step 2: Wait for Updates
1. **First 2 minutes**: Status should change from "scheduled" → "delayed" with random gate
2. **Next 2 minutes**: Status should change from "delayed" → "departed" with actualDeparture time

### Step 3: Test Postponed Flights
1. Add another document: `POSTPONED-2025-09-20`
2. Set status to "postponed"
3. Wait 2 minutes: Gate should change to "TBD"

### Step 4: Monitor cron-job.org
1. Go to your cron-job.org dashboard
2. Check "Last execution" shows recent times
3. Click on job to see execution logs
4. Verify successful HTTP 200 responses

## 🔍 Verification Checklist

### ✅ Firestore Updates
- [ ] Flight status changes from "scheduled" → "delayed" → "departed"
- [ ] Gate changes to random values (A1, B2, C3, D4, E5)
- [ ] actualDeparture timestamp is set when status becomes "departed"
- [ ] updatedAt timestamp updates with each change
- [ ] Postponed flights get gate = "TBD"

### ✅ cron-job.org Monitoring
- [ ] Job shows "Active" status
- [ ] "Last execution" updates every 2 minutes
- [ ] Execution logs show HTTP 200 responses
- [ ] No error messages in logs

### ✅ App Integration
- [ ] React Native app receives real-time updates
- [ ] Notifications appear for status changes
- [ ] UI updates instantly when Firestore changes

## 🚨 Troubleshooting

### Common Issues
1. **Function not responding**: Check Firebase/Vercel logs
2. **Cron job failing**: Verify URL and check execution logs
3. **No updates in Firestore**: Check function permissions and Firestore rules
4. **App not updating**: Verify Firestore listeners are working

### Debug Steps
1. Test function manually: `curl [your-function-url]`
2. Check cron-job.org execution logs
3. Monitor Firebase/Vercel function logs
4. Verify Firestore security rules allow updates

## 📊 Expected Results

After setup, you should see:
- Flights automatically updating every 2 minutes
- Real-time notifications in your React Native app
- No manual intervention required
- Free alternative to Firebase scheduled functions
